import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJsonResponse,InvalidJsonResponseError,calendarReadTimeout,validCalendarPage,connectionRead,cancelledTransport} from './http-response.ts';
test('Calendar body read timeout retains AbortError rather than reporting malformed JSON',async()=>{
 const response={status:200,ok:true,json:async()=>{throw new DOMException('aborted','AbortError');}} as unknown as Response;
 await assert.rejects(readJsonResponse(response),{name:'AbortError'});
});
test('non-JSON proxy responses never expose private HTML and carry safe status',async()=>{
 await assert.rejects(readJsonResponse(new Response('<html>private proxy trace</html>',{status:503})),e=>e instanceof InvalidJsonResponseError&&e.status===503&&!e.message.includes('private'));
 assert.deepEqual(await readJsonResponse(Response.json({items:[]})),{items:[]});
 await assert.rejects(readJsonResponse(Response.json({error:'읽기 권한을 확인해주세요.'},{status:403})),/읽기 권한/);
});
test('longer timeout/recovery eligibility includes Calendar reads only, never confirms or writes',()=>{
 assert.equal(calendarReadTimeout('/api/calendar/events?v=2','GET'),true);
 assert.equal(calendarReadTimeout('/api/calendar/calendars','GET'),true);
 for(const [path,method] of [['/api/calendar/events','POST'],['/api/assistant/actions/id/confirm','POST'],['/api/auth/login','POST'],['/api/calendar/events-untrusted','GET']])assert.equal(calendarReadTimeout(path,method),false);
});
test('malformed successful payload cannot be mistaken for an empty calendar',()=>{
 for(const payload of [{},null,{items:null},{items:[{}]},{items:[{id:'e',title:'일정'}],nextCursor:45}])assert.equal(validCalendarPage(payload),false);
 assert.equal(validCalendarPage({items:[],nextCursor:null}),true);
 assert.equal(validCalendarPage({items:[{id:'e',title:'일정'}]}),true);
});

test('cold-start and cancelled native reads can recover without replaying writes or logging out',()=>{
 for(const path of ['/api/todos','/api/integrations','/api/capabilities','/api/calendar/events?v=2'])assert.equal(connectionRead(path,'GET'),true);
 for(const method of ['POST','PATCH','DELETE'])assert.equal(connectionRead('/api/integrations/google',method),false);
 assert.equal(connectionRead('/api/assistant/actions/id/confirm','POST'),false);
 assert.equal(cancelledTransport(new Error('fetch failed: Fetch request has been canceled.')),true);
 assert.equal(cancelledTransport(new Error('invalid session')),false);
});

test('assistant settings reads can recover, while authorization and every write remain excluded',()=>{
 for(const path of ['/api/assistant/status','/api/assistant/actions','/api/assistant/memory/settings','/api/agent/profile','/api/agent/files','/api/automations'])assert.equal(connectionRead(path,'GET'),true,path);
 for(const path of ['/api/integrations/google/authorize','/api/assistant/actions/id/confirm','/api/agent/profile/untrusted','/api/agent/contacts/code'])assert.equal(connectionRead(path,'GET'),false,path);
 for(const method of ['POST','PATCH','DELETE'])for(const path of ['/api/agent/profile','/api/assistant/chat','/api/assistant/memory/settings'])assert.equal(connectionRead(path,method),false,path+' '+method);
});


test('a valid error response retains HTTP status for recovery without treating it as lost authentication',async()=>{await assert.rejects(readJsonResponse(new Response(JSON.stringify({error:'자료 연결이 바뀌었어요.'}),{status:409})),e=>e instanceof Error&&'status' in e&&e.status===409&&e.message==='자료 연결이 바뀌었어요.');});

test('integration imports, authorization and diagnostics wait for readiness but never become retryable writes',async()=>{const {connectionWrite}=await import('./http-response.ts');for(const path of ['/api/todos/11111111-1111-4111-8111-111111111111','/api/integrations/apple-reminders/import','/api/integrations/google/authorize','/api/integrations/slack/diagnose','/api/integrations/google/task-sync/pull']){assert.equal(connectionWrite(path,'POST'),true);assert.equal(connectionRead(path,'POST'),false);}assert.equal(connectionWrite('/api/integrations/google/authorize-untrusted','POST'),false);});

test('only transient calendar create errors are safe to retry with the same request ID',async()=>{
 const {retryableDocenCalendarCreate,HttpResponseError,InvalidJsonResponseError,TransportResponseError}=await import('./http-response.ts');
 assert.ok(retryableDocenCalendarCreate(new TransportResponseError('Failed to fetch')));
 assert.ok(retryableDocenCalendarCreate(new HttpResponseError(503,'booting')));
 assert.ok(retryableDocenCalendarCreate(new InvalidJsonResponseError(200)));
 assert.equal(retryableDocenCalendarCreate(new HttpResponseError(403,'permission')),false);
 assert.equal(retryableDocenCalendarCreate(new HttpResponseError(409,'conflict')),false);
 assert.equal(retryableDocenCalendarCreate(new Error('account changed')),false);
});

test('Docen calendar saves, Apple delivery and reconciliation wait for the server',async()=>{
 const {connectionWrite}=await import('./http-response.ts');
 const path='/api/calendar/docen/event-date-random-suffix';
 assert.equal(connectionWrite(path,'PUT'),true);
 assert.equal(connectionWrite(path+'/apple-delivery','POST'),true);
 assert.equal(connectionWrite(path+'/reconcile','POST'),true);
 assert.equal(connectionRead(path,'GET'),true);
});
