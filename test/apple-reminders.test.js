import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiHarness } from '../test-support/api.js';
test('selected Apple reminders require auth, validate input, deduplicate by owner and retain source', async () => {
 const h=await apiHarness();try {
  const path='/api/integrations/apple-reminders/import';
  const body={items:[{id:'device-reminder-1',title:'기획안 보내기',completed:false,dueDate:'2030-01-01'}]};
  assert.equal((await h.request(path,'POST',body)).status,401);
  const owner=await h.register();
  assert.equal((await h.request(path,'POST',null,owner.token)).status,400);
  const result=await h.request(path,'POST',body,owner.token);assert.equal(result.status,200);assert.equal(result.data.results[0].created,true);
  assert.equal(result.data.results[0].todo.source.provider,'apple-reminders');
  assert.equal((await h.request(path,'POST',body,owner.token)).data.results[0].created,false);
  for(const items of [[],Array(21).fill(body.items[0]),[{id:'x',title:'잘못된 날짜',dueDate:'2030-02-30'}],[{id:'x',title:''}],[{...body.items[0],completed:true}],[{id:'missing-state',title:'상태 누락'}],[null]]) assert.equal((await h.request(path,'POST',{items},owner.token)).status,400);
  const other=await h.register('apple-other@example.test');
  const second=await h.request(path,'POST',body,other.token);assert.equal(second.status,200);assert.equal(second.data.results[0].created,true);assert.notEqual(second.data.results[0].todo.id,result.data.results[0].todo.id);
  assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,1);
 }finally{await h.close();}
});

test('whole-library client imports 125 through the real owned API and reconciles a lost response without duplicates',async()=>{const {importReminderItems}=await import('../mobile/src/apple-reminder-import.ts');const h=await apiHarness();try{const owner=await h.register('bulk-apple@example.test'),items=Array.from({length:125},(_,i)=>({id:'bulk-'+i,title:'미리 알림 '+i,completed:false,dueDate:null,dueTime:null,notes:'원본 메모'}));let calls=0;const request=async batch=>{const response=await h.request('/api/integrations/apple-reminders/import','POST',{items:batch},owner.token);assert.equal(response.status,200);if(++calls===3)throw Error('reply lost after commit');return response.data;};const first=await importReminderItems(items,request,()=>true);assert.equal(first.processedIds.length,40);assert.equal(first.remaining.length,85);const resumed=await importReminderItems(first.remaining,request,()=>true);assert.equal(resumed.existing,20);assert.equal(resumed.created,65);const list=await h.request('/api/todos','GET',undefined,owner.token);assert.equal(list.data.length,125);assert.ok(list.data.every(t=>t.source.provider==='apple-reminders'&&t.notes==='원본 메모'&&!t.done));}finally{await h.close();}});
