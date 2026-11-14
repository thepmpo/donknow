import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createIntegrations} from '../server/integrations.js';
import {createAssistant} from '../server/assistant.js';
import {createAutomations} from '../server/automations.js';
import {createTaskSync} from '../server/task-sync.js';
const env={PUBLIC_ORIGIN:'https://fixture.test',GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture',AI_ENABLED:'true',OPENAI_API_KEY:'fixture',OPENAI_MODEL:'fixture'};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const features=['calendar','calendarWrite','tasks','tasksWrite'];
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'duck-multi-google-')),store=await openStore(dir),a=await store.register('multi@example.test','fixture-password-123'),b=await store.register('other@example.test','fixture-password-123');
 store.queueAccountMail(a.user.id,'verify');const mail=store.claimMail();store.verifyEmail(a.user.id,/인증번호: (\d{6})/.exec(mail.message.text)[1]);store.mailSucceeded(mail.id);
 const calls=[];let failAccount=null,pagination=false;
 const fetcher=async(input,options={})=>{
  const url=new URL(input),method=options.method??'GET',authorization=options.headers?.Authorization??'',who=authorization.includes('two')?'two':'one';calls.push({path:url.pathname,method,who,body:options.body});
  if(url.pathname==='/token'){const body=new URLSearchParams(options.body),account=body.get('code')??(body.get('refresh_token')?.includes('two')?'two':'one');return json({access_token:'access-'+account,refresh_token:'refresh-'+account,expires_in:3600,scope:'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks'});}
  if(url.pathname==='/v1/userinfo')return json({sub:'account-'+who,email:who+'@example.test'});
  if(url.pathname==='/revoke')return json({});
  if(failAccount===who)throw Error('synthetic offline');
  if(url.pathname==='/calendar/v3/users/me/calendarList'&&pagination&&who==='one'&&url.searchParams.get('pageToken'))return json({items:[{id:'extra',summary:'추가 일정',accessRole:'owner'}]});
  if(url.pathname==='/calendar/v3/users/me/calendarList')return json({...((pagination&&who==='one')?{nextPageToken:'more-one'}:{}),items:[{id:who+'@example.test',summary:'개인 일정',primary:true,accessRole:'owner'}]});
  if(url.pathname.includes('/calendarList/'))return json({summary:'개인 일정',accessRole:'owner'});
  if(url.pathname.endsWith('/events'))return json({summary:'개인 일정',accessRole:'owner',items:[{id:'same-event',summary:who+' 일정',etag:'same-etag',start:{date:'2099-11-14'},end:{date:'2099-11-15'}}]});
  if(url.pathname.endsWith('/same-event'))return method==='DELETE'?new Response(null,{status:204}):json({id:'same-event',summary:who+' 일정',etag:'same-etag',start:{date:'2099-11-14'},end:{date:'2099-11-15'}});
  if(url.pathname.includes('/tasks/v1/'))return method==='PATCH'?json({status:JSON.parse(options.body).status}):url.pathname.endsWith('/lists')?json({items:[{id:'same-list',title:who+' 목록'}]}):url.pathname.endsWith('/same-task')?json({id:'same-task',title:who+' 할 일',status:'needsAction',etag:'task-etag'}):json({items:[{id:'same-task',title:who+' 할 일',status:'needsAction'}]});
  throw Error('Unexpected fixture path '+url.pathname);
 };
 const integrations=createIntegrations(store,env,fetcher),user=a.user.id;
 async function add(code,options={mode:'add'}){const {url}=integrations.start(user,'google',features,false,options);return integrations.callback('google',new URLSearchParams({state:new URL(url).searchParams.get('state'),code}));}
 return {dir,store,user,other:b.user.id,calls,integrations,add,fail:who=>{failAccount=who;},paginate:()=>{pagination=true;},close:async()=>{store.close();await rm(dir,{recursive:true,force:true});}};
}
test('OAuth add keeps existing Google accounts; same-account reapproval preserves identity and secrets stay encrypted',async()=>{
 const h=await fixture();try{
  await h.add('one');const first=h.store.connection(h.user,'google');const cached=await h.integrations.resources(h.user,'google','calendar');await h.add('two');assert.equal(h.store.connections(h.user,'google').length,2);assert.equal(h.store.connection(h.user,'google').accountId,first.accountId);assert.equal(h.integrations.import(h.user,'google',[cached.items[0].id]).length,1,'adding an account preserves the first account cache');
  const second=h.store.connections(h.user,'google')[1];await h.add('two',{mode:'reauthorize',connectionId:second.connectionId});assert.equal(h.store.connections(h.user,'google').length,2);assert.equal(h.store.connection(h.user,'google',second.connectionId).accountId,'account-two');
  await assert.rejects(h.add('one',{mode:'reauthorize',connectionId:second.connectionId}),e=>e.status===409);assert.equal(h.store.connection(h.user,'google',second.connectionId).accountId,'account-two');
  assert.equal(h.store.connection(h.other,'google',second.connectionId),null);const publicStatus=h.integrations.status(h.user).find(s=>s.provider==='google');assert.equal(publicStatus.accounts.length,2);assert.doesNotMatch(JSON.stringify(publicStatus),/access-one|refresh-two/);
  const bytes=await readFile(join(h.dir,'duckduck.sqlite'));assert.equal(bytes.includes(Buffer.from('access-one')),false);assert.equal(bytes.includes(Buffer.from('refresh-two')),false);const reopened=await openStore(h.dir);try{assert.equal(reopened.connections(h.user,'google').length,2);}finally{reopened.close();}
  const pending=h.integrations.start(h.user,'google',features,false,{mode:'reauthorize',connectionId:second.connectionId});await h.integrations.disconnect(h.user,'google',second.connectionId);await assert.rejects(h.integrations.callback('google',new URLSearchParams({state:new URL(pending.url).searchParams.get('state'),code:'two'})),e=>e.status===400);assert.equal(h.store.connections(h.user,'google').length,1,'disconnect must cancel stale approval without touching another account');
 }finally{await h.close();}
});
test('calendars and identical event IDs route to the selected account; confirmed delete never touches the other account',async()=>{
 const h=await fixture();try{
  await h.add('one');await h.add('two');const sources=await h.integrations.calendarList(h.user);assert.equal(sources.items.length,2);assert.notEqual(sources.items[0].id,sources.items[1].id);assert.match(sources.items[1].name,/two@example.test/);
  const pages=await Promise.all(sources.items.map(c=>h.integrations.calendar(h.user,'2099-11',null,{calendarId:c.id,timeZone:'Asia/Seoul',start:'2099-11-01',end:'2099-12-01'})));assert.notEqual(pages[0].items[0].id,pages[1].items[0].id);assert.equal(pages[1].items[0].title,'two 일정');
  const event=pages[1].items[0],assistant=createAssistant(h.store,h.integrations,env);await h.integrations.calendarDetails(h.user,{connectionId:event.connectionId,calendarId:event.calendarId,eventId:event.eventId,expectedRevision:0,timeZone:'Asia/Seoul',patch:{reminderMinutes:10}});const reread=await h.integrations.calendar(h.user,'2099-11',null,{calendarId:sources.items[0].id});assert.equal(reread.items[0].duckDetails.revision,0,'same event ID in another account keeps separate metadata');assert.equal((await h.integrations.calendarReminders(h.user)).items.length,1);
  await assert.rejects(assistant.prepare(h.user,'calendar.update',{calendarId:sources.items[0].id,id:event.eventId,expectedETag:event.etag,destinationCalendarId:sources.items[1].id}),e=>e.status===400);const draft=await assistant.prepare(h.user,'calendar.delete',{calendarId:event.calendarId,id:event.eventId,expectedETag:event.etag,connectionId:event.connectionId});assert.equal(h.calls.filter(c=>c.method==='DELETE').length,0);await assistant.confirm(h.user,draft.id,true);await assistant.confirm(h.user,draft.id,true);assert.deepEqual(h.calls.filter(c=>c.method==='DELETE').map(c=>c.who),['two']);
  await assert.rejects(assistant.prepare(h.user,'calendar.delete',{calendarId:event.calendarId,id:event.eventId,expectedETag:event.etag,connectionId:sources.items[0].connectionId}),e=>e.status===409);
  await assert.rejects(h.integrations.calendar(h.other,'2099-11',null,{calendarId:sources.items[1].id}),e=>e.status===409);
 }finally{await h.close();}
});
test('parallel refresh is locked per Google account without overwriting the other token or connection identity',async()=>{
 const h=await fixture();try{
  await h.add('one');await h.add('two');const accounts=h.store.connections(h.user,'google');for(const r of accounts)h.store.saveConnection(h.user,'google',{...r,expiresAt:Date.now()-1},r.label);const before=h.calls.filter(c=>c.path==='/token').length;
  await Promise.all(accounts.flatMap(r=>[h.integrations.diagnose(h.user,'google',r.connectionId),h.integrations.diagnose(h.user,'google',r.connectionId)]));assert.equal(h.calls.filter(c=>c.path==='/token').length-before,2);for(const r of accounts)assert.equal(h.store.connection(h.user,'google',r.connectionId).accountId,r.accountId);assert.equal(h.store.connection(h.user,'google').accountId,'account-one');
 }finally{await h.close();}
});
test('one failed Google account preserves the other calendar list; disconnect removes only the selected account and promotes safely',async()=>{
 const h=await fixture();try{
  await h.add('one');await h.add('two');const accounts=h.store.connections(h.user,'google');h.fail('two');const list=await h.integrations.calendarList(h.user);assert.equal(list.items.length,1);assert.deepEqual(list.failedConnectionIds,[accounts[1].connectionId]);h.fail(null);
  await h.integrations.disconnect(h.user,'google',accounts[0].connectionId);assert.equal(h.store.connections(h.user,'google').length,1);assert.equal(h.store.connection(h.user,'google').accountId,'account-two');assert.equal(h.store.connection(h.user,'google',accounts[0].connectionId),null);
  const selected='@g/'+accounts[1].connectionId+'/primary',preserved=await h.integrations.calendar(h.user,'2099-11',null,{calendarId:selected});assert.equal(preserved.items[0].calendarId,selected,'promoting the remaining default must preserve an existing selected source');await h.integrations.diagnose(h.user,'google',accounts[1].connectionId);await h.integrations.disconnect(h.user,'google',accounts[1].connectionId);assert.equal(h.store.connections(h.user,'google').length,0);
 }finally{await h.close();}
});
test('AI consent fingerprints all connected Google accounts; source locators stay account-specific and old approval cannot read new account',async()=>{
 const h=await fixture();try{
  await h.add('one');let models=0;const assistant=createAssistant(h.store,h.integrations,env,async()=>{models++;return json({output_text:JSON.stringify({answer:'일정을 확인했어요.',suggestions:[]})});}),scopes=assistant.status(h.user).consentScopes;
  await h.add('two');assert.notEqual(assistant.status(h.user).consentScopes.google,scopes.google);const before=h.calls.length;await assert.rejects(assistant.chat(h.user,{message:'오늘 일정',providers:['google'],consent:true,consentScopes:scopes}),e=>e.status===409);assert.equal(models,0);assert.equal(h.calls.length,before);
  const context=await assistant.context(h.user,['google']);const events=context.sources.filter(s=>s.kind==='event');assert.equal(events.length,2);assert.equal(new Set(events.map(s=>s.ref)).size,2);assert.equal(new Set(events.map(s=>s.locator.connectionId)).size,2);
  await assistant.chat(h.user,{message:'오늘 일정',providers:['google'],consent:true,consentScopes:assistant.status(h.user).consentScopes});assert.equal(models,1);
 }finally{await h.close();}
});
test('Google Tasks opt-in and writes remain per account, including the same remote task ID',async()=>{
 const h=await fixture();let sync;try{
  await h.add('one');await h.add('two');const accounts=h.store.connections(h.user,'google');sync=createTaskSync(h.store,h.integrations);sync.configure(h.user,true,accounts[1].connectionId);assert.equal(sync.status(h.user,accounts[0].connectionId).enabled,false);
  const page=await h.integrations.resources(h.user,'google','tasks','same-list',null,'incomplete',undefined,accounts[1].connectionId);const [{todo}]=h.integrations.import(h.user,'google',[page.items[0].id]);h.store.update(h.user,todo.id,{done:true});assert.equal(h.store.taskSyncJobs(h.user).length,1);
  await h.integrations.googleTask(h.user,h.store.get(h.user,todo.id),true);assert.deepEqual(h.calls.filter(c=>c.method==='PATCH').map(c=>c.who),['two']);sync.configure(h.user,false,accounts[0].connectionId);assert.equal(h.store.taskSyncJobs(h.user).length,1,'turning off another account must not cancel this account');
 }finally{sync?.stop();await h.close();}
});
test('scheduled personalized briefings bind consent and request preferences; a newly added account cannot silently broaden a schedule',async()=>{
 const h=await fixture();try{
  await h.add('one');let models=0,lastInput;const assistant=createAssistant(h.store,h.integrations,env,async(_url,o)=>{models++;lastInput=JSON.parse(JSON.parse(o.body).input);return json({output_text:JSON.stringify({answer:'회의 준비부터 해보세요.',suggestions:[]})});});
  const now=Date.parse('2026-11-14T23:00:00Z'),config={enabled:true,time:'08:00',timezone:'Asia/Seoul',city:null,providers:['google'],aiConsent:true,instructions:'회의 준비 위주로 알려줘'};
  h.store.configureAutomation(h.user,'briefing',config,now-60000,assistant.status(h.user).consentScopes);await h.add('two');await createAutomations(h.store,assistant,async()=>null,{now:()=>now}).tick();assert.equal(models,0);assert.match(h.store.assistantMessages(h.user)[0].warnings.join(' '),/다시 동의/);
  const next=now+86400000;h.store.configureAutomation(h.user,'briefing',config,next-60000,assistant.status(h.user).consentScopes);await createAutomations(h.store,assistant,async()=>null,{now:()=>next}).tick();assert.equal(models,1);assert.match(lastInput.request,/회의 준비 위주/);assert.match(lastInput.request,/최대4~6개/);assert.equal(h.store.assistantMessages(h.user).length,2);
 }finally{await h.close();}
});

test('calendar pagination stays on its account, continues to the next account and rejects a changed account set',async()=>{const h=await fixture();try{await h.add('one');await h.add('two');h.paginate();const first=await h.integrations.calendarList(h.user);assert.equal(first.items.length,1);assert.ok(first.nextCursor);const second=await h.integrations.calendarList(h.user,first.nextCursor);assert.equal(second.items.length,2);assert.match(second.items[0].name,/one@example.test/);assert.match(second.items[1].name,/two@example.test/);assert.equal(second.nextCursor,null);await h.integrations.disconnect(h.user,'google',h.store.connections(h.user,'google')[1].connectionId);await assert.rejects(h.integrations.calendarList(h.user,first.nextCursor),e=>e.status===400);}finally{await h.close();}});
