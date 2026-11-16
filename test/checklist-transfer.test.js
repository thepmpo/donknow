import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {checklistKey} from '../server/briefing-store.js';
import {apiHarness} from '../test-support/api.js';
const source={ref:'slack:connection:channel:message',title:'주간 회의 요청',provider:'slack',locator:{channel:'channel',ts:'message'}},proposal={operation:'todo.create',args:{title:'회의 자료 정리',notes:'회의 전에 자료를 확인해주세요.',dueDate:'2026-11-17'},sourceRefs:[source.ref],section:'회의 준비'};
test('real authenticated receipt endpoint validates ownership, supports long notes, and repeats the returned Todo ID',async()=>{
 const h=await apiHarness();let store;try{
  const a=await h.register('receipt-api@example.test');await h.request('/api/account/verification/send','POST',{},a.token);const mail=await h.mail(a.user.email,'이메일 인증번호'),code=/\d{6}/.exec(mail.text)[0];assert.equal((await h.request('/api/account/verification/confirm','POST',{code},a.token)).status,200);
  store=await openStore(h.dir,{env:{...process.env,NODE_ENV:'test'}});const item=store.checklistResult(a.user.id,{proposals:[{...proposal,args:{...proposal.args,notes:'긴 메모 '.repeat(700)}}],sources:[source]}).items[0];
  const body={token:item.token,key:item.key,action:'todo'};assert.equal((await h.request('/api/assistant/checklist','POST',body)).status,401);
  const first=await h.request('/api/assistant/checklist','POST',body,a.token);assert.equal(first.status,200);assert.equal(first.data.todo.notes.length,3500);const next=await h.request('/api/assistant/checklist','POST',body,a.token);assert.equal(next.data.todoId,first.data.todoId);
  const invalid=await h.request('/api/assistant/checklist','POST',{...body,token:item.token.slice(0,-4)+'xxxx'},a.token);assert.equal(invalid.status,400);
 }finally{store?.close();await h.close();}
});
test('task receipt has owner-bound identity without storing chat; source transfer/completion/exclusion stay handled across restart while derived work remains distinct',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-checklist-'));let store=await openStore(dir,{env:{NODE_ENV:'test'}});
 try{
  const a=await store.register('checklist@example.test','fixture-password-123'),b=await store.register('other@example.test','fixture-password-123'),user=a.user.id;
  const receipt=()=>store.checklistResult(user,{proposals:[proposal],sources:[source]}).items[0],first=receipt();
  assert.equal(store.memorySettings(user).enabled,false);assert.equal(store.exportAssistantMemory(user).turns.length,0);
  assert.throws(()=>store.applyBriefingItem(b.user.id,first.token,first.key,'todo',undefined,'token'),e=>e.status===404);
  assert.throws(()=>store.applyBriefingItem(user,first.token+'invalid',first.key,'todo',undefined,'token'));
  const saved=store.applyBriefingItem(user,first.token,first.key,'todo',undefined,'token');assert.equal(saved.todo.done,false);assert.equal(store.list(user).length,1);
  assert.equal(store.isBriefingHandled(user,first),true,'unfinished transferred work is handled in the briefing');
  const again=receipt();assert.equal(again.key,first.key);assert.equal(store.applyBriefingItem(user,again.token,again.key,'todo',undefined,'token').todo.id,saved.todo.id);
  assert.equal(checklistKey({...proposal,args:{...proposal.args,title:' 회의  자료 정리! '}}),first.key);
  store.applyBriefingItem(user,again.token,again.key,'complete',undefined,'token');assert.equal(store.get(user,saved.todo.id).done,true);
  store.close();store=await openStore(dir,{env:{NODE_ENV:'test'}});assert.equal(store.isBriefingHandled(user,first),true);store.remove(user,saved.todo.id);assert.equal(store.isBriefingHandled(user,first),true,'deleting a transferred task must not recreate it');
  const next=store.checklistResult(user,{proposals:[{...proposal,args:{...proposal.args,title:'회의 후 결과 공유'}}],sources:[source]}).items[0];assert.notEqual(next.key,first.key);assert.equal(store.isBriefingHandled(user,next),false);store.applyBriefingItem(user,next.token,next.key,'exclude',undefined,'token');assert.equal(store.isBriefingHandled(user,next),true);
  const manual=()=>store.checklistResult(user,{proposals:[{...proposal,sourceRefs:[]}],sources:[]}).items[0];assert.notEqual(manual().key,manual().key,'unrelated same-title tasks without source identity are not merged');
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
test('calendar preparation is claimed before async work; lost replies reconcile the same owned action and unknown writes cannot create a second event',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-calendar-receipt-'));const store=await openStore(dir,{env:{NODE_ENV:'test'}});
 try{
  const user=(await store.register('calendar-receipt@example.test','fixture-password-123')).user.id,item=store.checklistResult(user,{proposals:[proposal],sources:[source]}).items[0];
  const claim=store.claimBriefingCalendar(user,item.token,item.key,'token');assert.ok(claim.lease);assert.throws(()=>store.claimBriefingCalendar(user,item.token,item.key,'token'),e=>e.status===409);
  const action=store.createAssistantAction(user,{operation:'calendar.create',label:'일정 추가',args:{title:item.title,allDay:true,startDate:'2026-11-17',endDate:'2026-11-18',calendarId:'primary'}});store.linkBriefingCalendar(user,item.key,claim.lease,action);
  assert.equal(store.claimBriefingCalendar(user,item.token,item.key,'token').existing.id,action.id);assert.equal(store.isBriefingHandled(user,item),false,'preview alone is not completion');
  store.claimAssistantAction(user,action.id);store.finishAssistantAction(user,action.id,'unknown',{message:'network reply missing'});assert.equal(store.claimBriefingCalendar(user,item.token,item.key,'token').existing.status,'unknown');
  // Reconcile a verified provider result through the existing action completion path.
  const secondItem=store.checklistResult(user,{proposals:[{...proposal,args:{...proposal.args,title:'검토 회의'}}],sources:[source]}).items[0],second=store.claimBriefingCalendar(user,secondItem.token,secondItem.key,'token');
  const confirmed=store.createAssistantAction(user,{operation:'calendar.create',label:'일정 추가',args:{title:secondItem.title}});store.linkBriefingCalendar(user,secondItem.key,second.lease,confirmed);store.claimAssistantAction(user,confirmed.id);store.finishAssistantAction(user,confirmed.id,'succeeded',{id:'verified-provider-event'});store.resolveBriefingCalendar(user,confirmed.id);
  assert.equal(store.isBriefingHandled(user,secondItem),true);assert.throws(()=>store.claimBriefingCalendar(user,secondItem.token,secondItem.key,'token'),e=>e.status===409);assert.equal(store.list(user).length,0,'calendar transfer does not create a Todo');
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
