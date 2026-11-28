import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';
test('owned create receipts identify committed writes and repeating the same request cannot duplicate a Todo',async()=>{
 const h=await apiHarness();try{
  const owner=await h.verified(),other=await h.verified('other-receipt@example.test'),key='todo-fixture-request-1234567890',body={title:'A receipt-backed task',dueDate:'2026-11-16',clientRequestKey:key};
  const saved=await h.request('/api/todos','POST',body,owner.token);assert.equal(saved.status,201);
  const repeated=await h.request('/api/todos','POST',body,owner.token);assert.equal(repeated.data.id,saved.data.id);assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,1);
  assert.equal((await h.request('/api/todo-writes/'+key,'GET',undefined,owner.token)).data.todo.id,saved.data.id);
  assert.equal((await h.request('/api/todo-writes/'+key,'GET',undefined,other.token)).data.todo,null);
  assert.equal((await h.request('/api/todos/'+saved.data.id,'GET',undefined,other.token)).status,404);
  assert.equal((await h.request('/api/todos/'+saved.data.id,'GET',undefined,owner.token)).data.id,saved.data.id);
  assert.equal((await h.request('/api/todos','POST',{...body,clientRequestKey:'bad'},owner.token)).status,400);
 }finally{await h.close();}
});

test('a cancelled create cannot be replayed and another account can still use the same request key',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified(),other=await h.verified('other-cancel@example.test'),key='todo-cancel-fixture-1234567890';
  const body={title:'Cancelled Ticket',clientRequestKey:key};
  const cancel=()=>h.request('/api/todo-create-cancellations','POST',{requestKey:key},owner.token);
  assert.deepEqual((await cancel()).data,{todo:null});
  assert.equal((await h.request('/api/todos','POST',body,owner.token)).status,410);
  assert.equal((await h.request('/api/todos','POST',body,other.token)).status,201);
  const accepted=await h.request('/api/todos','POST',{...body,clientRequestKey:key+'-accepted',deliveryTarget:{provider:'apple-reminders',listId:'inbox'}},owner.token);
  assert.equal(accepted.data.delivery.state,'queued');
  const receipt=await h.request('/api/todo-create-cancellations','POST',{requestKey:key+'-accepted'},owner.token);
  assert.equal(receipt.data.todo.id,accepted.data.id);
  assert.equal(receipt.data.todo.delivery.state,'blocked');
  const deleted=await h.request('/api/todo-deletions','POST',{id:accepted.data.id,sourceId:null},owner.token);
  assert.equal(deleted.status,200);
  assert.equal((await h.request('/api/todos','POST',{...body,clientRequestKey:key+'-accepted'},owner.token)).status,410);
 }finally{await h.close();}
});
