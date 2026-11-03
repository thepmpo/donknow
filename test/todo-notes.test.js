import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';
test('Todo notes persist with completion, are exported only to owner, validate length/type and can be cleared',async()=>{
 const h=await apiHarness();try{
  assert.equal((await h.request('/api/capabilities')).data.todoNotes,true);
  const a=await h.register('notes-owner@example.test'),b=await h.register('notes-other@example.test');
  const created=await h.request('/api/todos','POST',{title:'메모 있는 일정',dueDate:'2030-01-01',notes:'• 준비물\n• 자료'},a.token);assert.equal(created.status,201);const path='/api/todos/'+created.data.id;
  assert.equal((await h.request(path,'PATCH',{done:true},a.token)).data.notes,'• 준비물\n• 자료');
  assert.equal((await h.request(path,'PATCH',{notes:'남의 수정'},b.token)).status,404);
  assert.equal((await h.request('/api/account/export','GET',undefined,b.token)).data.todos.length,0);
  assert.equal((await h.request('/api/account/export','GET',undefined,a.token)).data.todos[0].notes,'• 준비물\n• 자료');
  for(const notes of [42,{},'가'.repeat(4001)])assert.equal((await h.request(path,'PATCH',{notes},a.token)).status,400);
  assert.equal((await h.request('/api/todos','POST',{title:'길이 확인',notes:'가'.repeat(4000)},a.token)).status,201);
  assert.equal((await h.request(path,'PATCH',{notes:''},a.token)).data.notes,'');
  assert.equal((await h.request('/api/todos','GET',undefined,a.token)).data.find(todo=>todo.id===created.data.id).notes,'');
 }finally{await h.close();}
});
