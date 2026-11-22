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
