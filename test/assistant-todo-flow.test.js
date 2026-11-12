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
