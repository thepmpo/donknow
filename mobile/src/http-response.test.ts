import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJsonResponse,InvalidJsonResponseError,calendarReadTimeout,validCalendarPage} from './http-response.ts';
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
