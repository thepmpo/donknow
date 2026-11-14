import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';

test('AI pasted candidate persists to real isolated Todo storage only after owner preview and explicit confirmation',async()=>{
 const fixture=new URL('../test-support/assistant-provider-fixture.mjs',import.meta.url).href;
 const h=await apiHarness({NODE_OPTIONS:`--import=${fixture}`,AI_ENABLED:'true',OPENAI_API_KEY:'fixture-todo-flow-key',OPENAI_MODEL:'fixture-model'});
 try{
  const owner=await h.register('flow-owner@example.test'),other=await h.register('flow-other@example.test');
  for(const [account,email] of [[owner,'flow-owner@example.test'],[other,'flow-other@example.test']]){
   await h.request('/api/account/verification/send','POST',{},account.token);
   const message=await h.mail(email,'이메일');
   const code=/인증번호: (\d{6})/.exec(message.text)[1];
   assert.equal((await h.request('/api/account/verification/confirm','POST',{code},account.token)).status,200);
  }
  const body={message:'붙여넣은 내용에서 할 일을 정리해줘',pastedText:'동료: 자료를 검토하고 담당자에게 정리해서 전달해주세요.',providers:[],consent:true};
  const answer=await h.request('/api/assistant/chat','POST',body,owner.token);
  assert.equal(answer.status,200);assert.equal(answer.data.proposals.length,1);
  assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,0);
  assert.equal((await h.request('/api/assistant/actions','GET',undefined,owner.token)).data.actions.length,0);
  const proposal=answer.data.proposals[0];
  const preview=await h.request('/api/assistant/actions','POST',{operation:proposal.operation,args:proposal.args},owner.token);
  assert.equal(preview.status,201);
  assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,0);
  const confirm='/api/assistant/actions/'+preview.data.id+'/confirm';
  assert.equal((await h.request(confirm,'POST',{confirmation:true},other.token)).status,404);
  assert.equal((await h.request(confirm,'POST',{confirmation:false},owner.token)).status,400);
  assert.equal((await h.request(confirm,'POST',{confirmation:true},owner.token)).data.status,'succeeded');
  assert.equal((await h.request(confirm,'POST',{confirmation:true},owner.token)).data.status,'succeeded');
  const saved=(await h.request('/api/todos','GET',undefined,owner.token)).data;
  assert.equal(saved.length,1);assert.equal(saved[0].title,'확인한 자료 검토');
  assert.equal(saved[0].notes,'담당자에게 전달할 내용을 정리하기');
  assert.equal((await h.request('/api/todos','GET',undefined,other.token)).data.length,0);
  const exported=(await h.request('/api/account/export','GET',undefined,owner.token)).data;
  assert.equal(exported.assistantActions.length,1);
  assert.equal(JSON.stringify(exported.assistantActions).includes('동료:'),false,'pasted conversation is not persisted in action records');
 }finally{await h.close();}
});

test('chat complete is atomic, owner-scoped and replay-safe; plain create still starts unfinished',async()=>{
 const h=await apiHarness();try{
  const owner=await h.register('checklist-owner@example.test'),other=await h.register('checklist-other@example.test');
  await h.request('/api/account/verification/send','POST',{},owner.token);const mail=await h.mail('checklist-owner@example.test','이메일');await h.request('/api/account/verification/confirm','POST',{code:/인증번호: (\d{6})/.exec(mail.text)[1]},owner.token);
  assert.equal((await h.request('/api/capabilities')).data.assistantChecklist,1);assert.equal((await h.request('/api/assistant/status','GET',undefined,owner.token)).data.actions.find(a=>a.operation==='todo.create').fields.includes('done'),false,'ordinary manual and model creation catalogs remain unchanged');
  const preview=await h.request('/api/assistant/actions','POST',{operation:'todo.create',args:{title:'채팅에서 끝낸 일',notes:'내용 유지',dueDate:null,done:true}},owner.token);assert.equal(preview.status,201);assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,0);
  const path='/api/assistant/actions/'+preview.data.id+'/confirm';assert.equal((await h.request(path,'POST',{confirmation:true},other.token)).status,403);assert.equal((await h.request(path,'POST',{confirmation:false},owner.token)).status,400);
  const results=await Promise.all([h.request(path,'POST',{confirmation:true},owner.token),h.request(path,'POST',{confirmation:true},owner.token)]);assert.ok(results.some(r=>r.status===200));assert.equal((await h.request(path,'POST',{confirmation:true},owner.token)).status,200);
  const list=(await h.request('/api/todos','GET',undefined,owner.token)).data;assert.equal(list.length,1);assert.equal(list[0].done,true);assert.ok(Number.isFinite(Date.parse(list[0].completedAt)));assert.equal(list[0].notes,'내용 유지');assert.equal((await h.request('/api/todos','GET',undefined,other.token)).data.length,0);
  const plain=await h.request('/api/todos','POST',{title:'일반 할 일',category:'업무',dueDate:null},owner.token);assert.equal(plain.data.done,false);
  assert.equal((await h.request('/api/assistant/actions','POST',{operation:'todo.create',args:{title:'잘못된 상태',done:'yes'}},owner.token)).status,400);
 }finally{await h.close();}
});
