import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createAutomations} from '../server/automations.js';
import {nextDelivery,validateSchedule} from '../server/automations-store.js';
import {apiHarness} from '../test-support/api.js';
const config={enabled:true,time:'08:00',timezone:'Asia/Seoul',city:'seoul',providers:['google'],aiConsent:true};
const morning=Date.parse('2026-11-14T23:00:00Z');
async function verified(store,email){const result=await store.register(email,'fixture-password-123');store.queueAccountMail(result.user.id,'verify');const queued=store.claimMail();assert.equal(store.verifyEmail(result.user.id,/인증번호: (\d{6})/.exec(queued.message.text)[1]),true);store.mailSucceeded(queued.id);return result;}
const forecast={city:'서울',temperature:12,low:8,high:14,rain:20,observedAt:'2026-11-15T08:00'};
test('schedule validation requires explicit AI consent, supported sources/city and a real time zone',()=>{
 assert.equal(validateSchedule('briefing',config).enabled,true);
 for(const input of [{...config,aiConsent:false},{...config,time:'25:00'},{...config,timezone:'Fake/Zone'},{...config,city:'external-url'},{...config,providers:['unknown']},{...config,enabled:'true'},{...config,secret:'no'}])assert.throws(()=>validateSchedule('briefing',input));
 assert.equal(validateSchedule('briefing',{...config,enabled:false,aiConsent:false}).enabled,false);
 assert.throws(()=>validateSchedule('weather',config));assert.equal(validateSchedule('weather',{...config,providers:[],aiConsent:false}).enabled,true);
});
test('daily wall-clock scheduling handles DST gaps and repeated hours',()=>{
 assert.equal(new Date(nextDelivery('02:30','America/New_York',Date.parse('2026-03-08T06:59:00Z'))).toISOString(),'2026-03-09T06:30:00.000Z');
 assert.equal(new Date(nextDelivery('01:30','America/New_York',Date.parse('2026-11-01T05:30:00Z'))).toISOString(),'2026-11-01T06:30:00.000Z');
});
test('real DB/HTTP inbox: verified opt-in, once-only parallel delivery, privacy, reading and persistence',async()=>{
 const h=await apiHarness();let store;try{
  const a=await h.register('scheduled-owner@example.test'),b=await h.register('scheduled-other@example.test');
  assert.equal((await h.request('/api/automations/briefing','POST',config,a.token)).status,403);
  await h.request('/api/account/verification/send','POST',{},a.token);const mail=await h.mail(a.user.email,'이메일 인증');await h.request('/api/account/verification/confirm','POST',{code:/인증번호: (\d{6})/.exec(mail.text)[1]},a.token);
  assert.equal((await h.request('/api/automations/briefing','POST',{...config,aiConsent:false},a.token)).status,400);
  assert.equal((await h.request('/api/automations/briefing','POST',config,a.token)).status,200);
  store=await openStore(h.dir);store.configureAutomation(a.user.id,'briefing',config,morning-60000);
  store.create(a.user.id,{title:'개인 자료 검토',dueDate:'2026-11-15',category:'업무',notes:'사적인 메모'});
  let calls=0;const assistant={async chat(user,body,clock){assert.deepEqual(clock,{today:'2026-11-15',timezone:'Asia/Seoul'});calls++;assert.equal(user,a.user.id);assert.equal(body.consent,true);assert.deepEqual(body.providers,['google']);return {answer:'오늘은 개인 자료 검토를 먼저 해보세요.',warnings:[]};}};
  const first=createAutomations(store,assistant,async()=>forecast,{now:()=>morning}),second=createAutomations(store,assistant,async()=>forecast,{now:()=>morning});
  await Promise.all([first.tick(),second.tick()]);assert.equal(calls,1);assert.equal(store.list(a.user.id).length,1,'delivery never creates or modifies Todo');
  const inbox=(await h.request('/api/assistant/messages','GET',undefined,a.token)).data.messages;assert.equal(inbox.length,1);assert.match(inbox[0].text,/개인 자료/);assert.match(inbox[0].text,/서울 날씨/);assert.equal(inbox[0].readAt,null);assert.equal((await h.request('/api/assistant/messages?after='+inbox[0].id,'GET',undefined,a.token)).data.messages.length,0);assert.equal((await h.request('/api/assistant/messages?after='+inbox[0].id,'GET',undefined,b.token)).status,404);
  assert.equal((await h.request('/api/assistant/messages','GET',undefined,b.token)).data.messages.length,0);
  assert.equal((await h.request('/api/assistant/messages/read','POST',{through:inbox[0].id},b.token)).status,404);
  assert.equal((await h.request('/api/assistant/messages/read','POST',{through:inbox[0].id},a.token)).status,200);
  store.close();store=await openStore(h.dir);assert.ok(store.assistantMessages(a.user.id)[0].readAt);await createAutomations(store,assistant,async()=>forecast,{now:()=>morning+60000}).tick();assert.equal(calls,1,'restart never duplicates the message');
  const bytes=await readFile(join(h.dir,'duckduck.sqlite'));assert.equal(bytes.includes(Buffer.from('오늘은 개인 자료')),false,'chat message payload is encrypted at rest');
  const exported=(await h.request('/api/account/export','GET',undefined,a.token)).data;assert.equal(exported.assistantMessages.length,1);assert.equal(exported.automationSchedules.find(s=>s.kind==='briefing').enabled,true);
  assert.equal((await h.request('/api/automations/tick','POST',{})).status,401);
  assert.equal((await h.request('/api/account','DELETE',{password:'fixture-password-123',confirmation:'DELETE'},a.token)).status,200);assert.equal(store.assistantMessages(a.user.id).length,0);assert.equal((await h.request('/api/assistant/messages','GET',undefined,a.token)).status,401);
 }finally{store?.close();await h.close();}
});
test('turning a schedule off during generation discards its late result; weather remains independent',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-schedule-cancel-'));let store;try{store=await openStore(dir);const a=await verified(store,'cancel@example.test');store.configureAutomation(a.user.id,'briefing',config,morning-60000);
 let release,started;const pending=new Promise(r=>started=r);const engine=createAutomations(store,{chat:()=>{started();return new Promise(r=>release=r);}},async()=>forecast,{now:()=>morning});
 const running=engine.tick();await pending;store.configureAutomation(a.user.id,'briefing',{...config,enabled:false},morning);release({answer:'취소 후 나타나면 안 되는 답변',warnings:[]});await running;assert.equal(store.assistantMessages(a.user.id).length,0);
 store.configureAutomation(a.user.id,'weather',{...config,providers:[],aiConsent:false},morning-60000);let aiCalls=0;await createAutomations(store,{chat(){aiCalls++;throw Error();}},async()=>forecast,{now:()=>morning}).tick();assert.equal(aiCalls,0);assert.equal(store.assistantMessages(a.user.id)[0].kind,'weather');
 }finally{store?.close();await rm(dir,{recursive:true,force:true});}
});
test('stopped worker lease is recovered once, and provider failure gives an honest Todo fallback',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-schedule-recover-'));let store;try{store=await openStore(dir);const a=await verified(store,'recover@example.test');store.configureAutomation(a.user.id,'briefing',config,morning-60000);const candidate=store.dueAutomations(morning)[0];assert.ok(store.claimAutomation(candidate,morning));
 let calls=0;const engine=createAutomations(store,{async chat(){calls++;throw Error('provider unavailable');}},async()=>{throw Error();},{now:()=>morning+600001});await engine.tick();assert.equal(calls,1);const messages=store.assistantMessages(a.user.id);assert.equal(messages.length,1);assert.match(messages[0].warnings.join(' '),/AI 요약을 만들지 못해/);assert.match(messages[0].warnings.join(' '),/날씨를 읽지 못/);await engine.tick();assert.equal(calls,1);
 }finally{store?.close();await rm(dir,{recursive:true,force:true});}
});
test('repeated DST hour still delivers only once per local day',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-dst-once-'));let store;try{store=await openStore(dir);const a=await verified(store,'dst@example.test');const first=Date.parse('2026-11-01T05:30:00Z');store.configureAutomation(a.user.id,'weather',{enabled:true,time:'01:30',timezone:'America/New_York',city:'seoul',providers:[],aiConsent:false},first-60000);
 let now=first;const engine=createAutomations(store,{},async()=>forecast,{now:()=>now});await engine.tick();now+=3600000;await engine.tick();assert.equal(store.assistantMessages(a.user.id).length,1);
 }finally{store?.close();await rm(dir,{recursive:true,force:true});}
});
test('a long server sleep skips yesterday rather than sending today before its selected time',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-missed-day-'));let store;try{store=await openStore(dir);const a=await verified(store,'missed@example.test');store.configureAutomation(a.user.id,'weather',{enabled:true,time:'08:00',timezone:'Asia/Seoul',city:'seoul',providers:[],aiConsent:false},morning-60000);const before=morning+20*3600000;let calls=0;await createAutomations(store,{},async()=>{calls++;return forecast;},{now:()=>before}).tick();assert.equal(calls,0);assert.equal(store.assistantMessages(a.user.id).length,0);assert.equal(store.automationSettings(a.user.id).find(s=>s.kind==='weather').nextAt,morning+24*3600000);
 }finally{store?.close();await rm(dir,{recursive:true,force:true});}
});
