import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';

test('Apple list refresh imports once, applies edits and completion, and respects local conflicts and removals',async()=>{
 const h=await apiHarness();
 try{
  const user=await h.verified('apple-list-refresh@example.test');
  const request=(path,method,body)=>h.request(path,method,body,user.token);
  const original={id:'apple-reminder-1',listId:'list-a',listTitle:'Apple 목록',title:'처음',notes:'',dueDate:null,completed:false,modifiedAt:'2026-11-25T01:00:00Z'};
  const pull=item=>request('/api/integrations/apple-reminders/refresh','POST',{items:[item]});
  const list=async()=>(await request('/api/todos')).data;
  const inserted=await pull(original);
  assert.equal(inserted.status,200,JSON.stringify(inserted.data));
  assert.equal(inserted.data.changed,1);
  assert.equal(inserted.data.items[0].source.listTitle,'Apple 목록');
  assert.equal(inserted.data.items[0].title,original.title);
  assert.equal((await pull(original)).data.changed,0);
  const [{id}]=await list();
  assert.equal((await pull({...original,title:'Apple 수정',completed:true,modifiedAt:'2026-11-25T02:00:00Z'})).data.changed,1);
  assert.equal((await list())[0].done,true);
  assert.equal((await pull(original)).data.changed,0);
  const path='/api/todos/'+id;
  const outdated=await request(path,'PATCH',{title:'기기 편집',deviceEditBase:{fields:{title:'처음'},sourceId:original.id,editedAt:'2026-11-25T01:30:00Z'}});
  assert.equal(outdated.status,409);
  const updated=await request(path,'PATCH',{title:'기기 편집',deviceEditBase:{fields:{title:'처음'},sourceId:original.id,editedAt:'2026-11-25T03:00:00Z'}});
  assert.equal(updated.status,200,JSON.stringify(updated.data));
  assert.equal(updated.data.sourceSync.state,'device-required');
  assert.equal((await pull({...original,title:'뒤늦은 원본 조회',modifiedAt:'2026-11-25T04:00:00Z'})).data.changed,0);
  assert.equal((await list())[0].title,'기기 편집');
  assert.equal((await request(path,'DELETE')).status,200);
  assert.deepEqual((await pull({...original,modifiedAt:'2026-11-25T05:00:00Z'})).data,{changed:0,items:[],suppressed:[original.id]});
  assert.deepEqual(await list(),[]);
 }finally{await h.close();}
});
