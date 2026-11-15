import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {hourlySlot,nextAutomationDelivery,validateSchedule} from '../server/automations-store.js';
import {createAutomations} from '../server/automations.js';
import {briefingKey} from '../server/briefing-store.js';
import {createUrgentMonitor} from '../server/urgent-monitor.js';
const hourly={enabled:true,time:'09:00',timezone:'Asia/Seoul',repeat:'hourly',startHour:9,endHour:18,weekdaysOnly:true,providers:[],aiConsent:true};
const monday=Date.parse('2026-11-16T00:00:00Z');
async function setup(){const dir=await mkdtemp(join(tmpdir(),'duck-assistant-briefing-'));let store=await openStore(dir);const account=await store.register('briefing@example.test','fixture-password-123');store.queueAccountMail(account.user.id,'verify');const mail=store.claimMail();store.verifyEmail(account.user.id,/인증번호: (\d{6})/.exec(mail.message.text)[1]);return {dir,user:account.user.id,get store(){return store;},async restart(){store.close();store=await openStore(dir);},async close(){store.close();await rm(dir,{recursive:true,force:true});}};}
test('hourly windows honor weekdays, inclusive end hour, DST identity and invalid ranges',()=>{
 assert.equal(new Date(nextAutomationDelivery(hourly,Date.parse('2026-11-13T09:00:00Z'))).toISOString(),'2026-11-16T00:00:00.000Z');
 assert.equal(hourlySlot(hourly,Date.parse('2026-11-14T00:00:00Z')),null);
 assert.equal(hourlySlot(hourly,Date.parse('2026-11-16T09:59:00Z')),'2026-11-16T18');
 assert.equal(hourlySlot(hourly,Date.parse('2026-11-16T10:00:00Z')),null);
 const dst={...hourly,timezone:'America/New_York',startHour:0,endHour:23,weekdaysOnly:false};
 assert.equal(hourlySlot(dst,Date.parse('2026-11-01T05:00:00Z')),hourlySlot(dst,Date.parse('2026-11-01T06:00:00Z')));
 for(const patch of [{startHour:20,endHour:9},{repeat:'minute'},{weekdaysOnly:'yes'},{urgentAlerts:'yes'}])assert.throws(()=>validateSchedule('briefing',{...hourly,...patch}));
 assert.throws(()=>validateSchedule('weather',{...hourly,providers:[],city:'seoul'}));
});
test('hourly messages carry unfinished items, skip completed/excluded, and persist one Todo identity across hours/restarts',async()=>{
 const h=await setup();try{
  let clock=monday,calls=0;const source={ref:'notion:connection:page:source',title:'資料',text:'검토 요청',provider:'notion'};
  const assistant={async chat(){calls++;return {answer:'문서를 확인해보세요.',warnings:[],sources:[source],proposals:[{operation:'todo.create',args:{title:'문서 확인',dueDate:null},sourceRefs:[source.ref]}]};}};
  h.store.configureAutomation(h.user,'briefing',hourly,clock-60000);
  const due=h.store.create(h.user,{title:'기존 할 일',notes:'메모',dueDate:'2026-11-16',category:'일상'});
  const engine=()=>createAutomations(h.store,assistant,()=>{throw Error('not used');},{now:()=>clock});
  await Promise.all([engine().tick(),engine().tick()]);assert.equal(calls,1);
  let first=h.store.assistantMessages(h.user)[0];assert.equal(first.items.length,2);assert.equal(first.items[0].todoId,due.id);assert.equal(h.store.list(h.user).length,1);
  const item=first.items.find(i=>!i.todoId);
  assert.throws(()=>h.store.applyBriefingItem('other',first.id,item.key,'complete'),e=>e.status===404);
  assert.throws(()=>h.store.applyBriefingItem(h.user,first.id,briefingKey('missing'),'complete'),e=>e.status===404);
  h.store.applyBriefingItem(h.user,first.id,item.key,'exclude');assert.equal(h.store.list(h.user).length,1);
  h.store.applyBriefingItem(h.user,first.id,item.key,'restore');
  const completed=h.store.applyBriefingItem(h.user,first.id,item.key,'complete');assert.equal(completed.todo.done,true);assert.ok(completed.todo.completedAt);assert.equal(h.store.list(h.user).filter(t=>!t.done).length,1);
  assert.equal(h.store.applyBriefingItem(h.user,first.id,item.key,'complete').todo.id,completed.todo.id);assert.equal(h.store.list(h.user).length,2);
  await h.restart();clock+=3600000;await engine().tick();let next=h.store.assistantMessages(h.user).at(-1);assert.equal(next.items.length,1,JSON.stringify({items:next.items,states:h.store.briefingItemState(h.user,item.key),todos:h.store.list(h.user)}));assert.equal(next.items[0].todoId,due.id);
  const restored=h.store.applyBriefingItem(h.user,first.id,item.key,'todo');assert.equal(restored.todo.id,completed.todo.id);assert.equal(restored.todo.done,false);
  clock+=3600000;await engine().tick();next=h.store.assistantMessages(h.user).at(-1);assert.equal(next.items.filter(i=>i.todoId===restored.todo.id).length,1);
  h.store.remove(h.user,restored.todo.id);assert.throws(()=>h.store.applyBriefingItem(h.user,first.id,item.key,'todo'),e=>e.status===409);assert.equal(h.store.list(h.user).length,1);
  assert.ok(h.store.exportAssistantMessages(h.user).length>=3);
 }finally{await h.close();}
});
test('urgent watcher establishes baseline, notices addressed changes, deduplicates across workers/restarts and honors revocation',async()=>{
 const h=await setup();try{
  let clock=monday,reads=0,classified=0,release;const scopes={todo:'todo-v1',google:'scope1'};
  let sources=[{ref:'google:account:gmail:one',provider:'google',title:'새 요청',text:'내용1',completed:false,kind:'mail'}];
  const assistant={status:()=>({consentScopes:scopes}),async context(){reads++;return {sources,warnings:[],partial:true};},async urgentRequests(user,selected){classified++;return [{ref:selected[0].ref,reason:'지정된 확인 요청이 도착했어요.'}];}};
  h.store.configureAutomation(h.user,'briefing',{...hourly,urgentAlerts:true,providers:['google']},clock,scopes);
  const monitor=()=>createUrgentMonitor(h.store,assistant,{now:()=>clock});
  await Promise.all([monitor().tick(),monitor().tick()]);assert.equal(reads,1);assert.equal(classified,0);assert.equal(h.store.assistantMessages(h.user).length,0);
  clock+=60000;sources=[{...sources[0],text:'내용2'}];await monitor().tick();assert.equal(classified,1);assert.equal(h.store.assistantMessages(h.user).length,1);
  await h.restart();clock+=60000;await monitor().tick();assert.equal(h.store.assistantMessages(h.user).length,1);assert.equal(classified,1);
  const todo=h.store.create(h.user,{title:'곧 할 일',notes:'',category:'일상',dueDate:null,reminderAt:new Date(clock+5*60000).toISOString()});
  const workingClassifier=assistant.urgentRequests;assistant.urgentRequests=async()=>{throw Error('quota');};sources[0]={...sources[0],text:'내용-오류 중'};sources.push({ref:'todo:'+todo.id,provider:'todo',kind:'todo',title:todo.title,text:'',completed:false,locator:{id:todo.id}});clock+=60000;await monitor().tick();assert.equal(h.store.assistantMessages(h.user).length,2);assert.match(h.store.assistantMonitorStatus(h.user).error,/AI가 새 요청/);assistant.urgentRequests=workingClassifier;
  clock+=60000;await monitor().tick();assert.equal(h.store.assistantMessages(h.user).length,2,'same imminent occurrence is sent once');
  clock+=5*60000;assistant.context=()=>new Promise(done=>{release=done;});const running=monitor().tick();await new Promise(resolve=>setImmediate(resolve));h.store.configureAutomation(h.user,'briefing',{...hourly,urgentAlerts:false},clock,scopes);release({sources:[{...sources[0],text:'내용3'}],warnings:[]});await running;assert.equal(h.store.assistantMessages(h.user).length,2,'late result after disabling is discarded');
  assert.equal(h.store.dueAssistantMonitors(clock+3600000).length,0);const event=h.store.assistantMessages(h.user)[0].eventKey;assert.equal(await h.store.deleteAccount(h.user,'fixture-password-123'),true);assert.equal(h.store.assistantMessages(h.user).length,0);assert.equal(h.store.hasAssistantAlert(h.user,event),false);assert.equal(h.store.assistantMonitorStatus(h.user),null);
 }finally{await h.close();}
});

test('delivery limits do not let old alert keys starve later imminent items',async()=>{
 const h=await setup();try{
  let clock=monday;const scopes={todo:'todo-v1'};const sources=Array.from({length:7},(_,n)=>{const todo=h.store.create(h.user,{title:'임박한 일 '+n,notes:'',category:'일상',dueDate:null,reminderAt:new Date(clock+10*60000).toISOString()});return {ref:'todo:'+todo.id,provider:'todo',kind:'todo',title:todo.title,text:'',completed:false,locator:{id:todo.id}};});
  const assistant={status:()=>({consentScopes:scopes}),async context(){return {sources,warnings:[]};}};h.store.configureAutomation(h.user,'briefing',{...hourly,urgentAlerts:true},clock,scopes);const monitor=createUrgentMonitor(h.store,assistant,{now:()=>clock});await monitor.tick();assert.equal(h.store.assistantMessages(h.user).length,5);clock+=60000;await monitor.tick();assert.equal(h.store.assistantMessages(h.user).length,7);clock+=60000;await monitor.tick();assert.equal(h.store.assistantMessages(h.user).length,7);
 }finally{await h.close();}
});
