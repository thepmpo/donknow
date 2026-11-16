import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {openStore} from '../server/store.js';
import {createIntegrations} from '../server/integrations.js';
import {createAssistant} from '../server/assistant.js';
import {createSourceEdits} from '../server/source-edits.js';
import {suspendRestoredAssistant} from '../server/assistant-restore.js';
import {todoWire} from '../server/todo-wire.js';

async function setup(){
 const directory=await mkdtemp(join(tmpdir(),'duck-source-outbox-'));let store,edits,assistant,integrations,user,hold=false,release,fail=false;const writes=[];
 const fetcher=async(url,options={})=>{
  if(options.method==='PATCH'){writes.push(JSON.parse(options.body));if(hold)await new Promise(r=>{release=r;});if(fail)throw Error('fixture lost reply after provider accepted write');return new Response(JSON.stringify({id:'task',etag:'version-'+writes.length}));}
  return new Response(JSON.stringify({id:'task',etag:'version-'+writes.length,title:'previous'}));
 };
 async function start(){store=await openStore(directory);integrations=createIntegrations(store,{},fetcher);assistant=createAssistant(store,integrations,{},fetch);edits=createSourceEdits({store,assistant,integrations,deferred:true});}
 await start();const account=await store.register('outbox@example.test','fixture-password-123');user=account.user.id;store.queueAccountMail(user,'verify');store.verifyEmail(user,/인증번호: (\d{6})/.exec(store.claimMail().message.text)[1]);store.saveConnection(user,'google',{accessToken:'fixture-access',connectionId:'c',features:['tasks','tasksWrite']},'Google');store.cacheResources(user,'google',[{id:'c:tasks:list:task',title:'previous',notes:'before',dueDate:'2026-11-16'}]);const todo=store.importResources(user,'google',['c:tasks:list:task'])[0].todo;
 return {directory,user,todo,writes,get store(){return store;},get edits(){return edits;},get assistant(){return assistant;},hold(){hold=true;},release(){hold=false;release?.();},fail(){fail=true;},async restart(){store.close();await start();},async expireLease(){const db=new DatabaseSync(join(directory,'duckduck.sqlite'));db.exec('UPDATE source_edit_outbox SET lease_until=0');db.close();},async close(){release?.();store.close();await rm(directory,{recursive:true,force:true});}};
}
test('queued original writes return before provider work, survive restart and coalesce unsent desired fields',async()=>{
 const h=await setup();try{
  const first=await h.edits.save(h.user,h.todo.id,{title:'queued title'});assert.equal(first.sourceSync.state,'queued');assert.equal(h.writes.length,0);
  await h.edits.save(h.user,h.todo.id,{notes:'latest notes'});await h.restart();await h.edits.tick();
  assert.equal(h.writes.length,1);assert.deepEqual(h.writes[0],{title:'queued title',notes:'latest notes'});assert.equal(h.store.get(h.user,h.todo.id).sourceSync.state,'succeeded');
  await assert.rejects(h.edits.save('other-owner',h.todo.id,{title:'foreign'}),error=>error.status===404);assert.equal(h.writes.length,1);
 }finally{await h.close();}
});
test('a later local edit survives an older in-flight original write and is applied afterward',async()=>{
 const h=await setup();try{
  await h.edits.save(h.user,h.todo.id,{title:'first edit'});h.hold();const running=h.edits.tick();
  while(!h.writes.length)await new Promise(r=>setTimeout(r,5));
  const second=await h.edits.save(h.user,h.todo.id,{title:'newest edit'});assert.equal(second.title,'newest edit');assert.equal(second.sourceSync.state,'queued');h.release();await running;
  assert.equal(h.writes.length,2);assert.equal(h.writes[1].title,'newest edit');assert.equal(h.store.get(h.user,h.todo.id).title,'newest edit');assert.equal(h.store.get(h.user,h.todo.id).sourceSync.state,'succeeded');
 }finally{await h.close();}
});
test('lost external write replies remain unknown across restarts and block automatic later writes',async()=>{
 const h=await setup();try{
  await h.edits.save(h.user,h.todo.id,{title:'accepted without reply'});h.fail();await h.edits.tick();assert.equal(h.writes.length,1);assert.equal(h.store.get(h.user,h.todo.id).sourceSync.state,'unknown');
  await h.restart();await h.edits.tick();assert.equal(h.writes.length,1);
  const later=await h.edits.save(h.user,h.todo.id,{notes:'retain a later local intention'});assert.equal(later.sourceSync.state,'unknown');await h.edits.tick();assert.equal(h.writes.length,1);assert.equal(h.store.get(h.user,h.todo.id).notes,'retain a later local intention');
 }finally{await h.close();}
});
test('a durable succeeded action receipt settles an expired lease without repeating a provider write',async()=>{
 const h=await setup();try{
  await h.edits.save(h.user,h.todo.id,{title:'receipt survives crash'});const job=h.store.claimSourceEdit();
  const draft=await h.assistant.prepare(h.user,'tasks.update',{connectionId:'c',list:'list',id:'task',title:'receipt survives crash'});h.store.sourceEditAction(job,draft.id);await h.assistant.confirm(h.user,draft.id,true);
  await h.expireLease();await h.restart();await h.edits.tick();assert.equal(h.writes.length,1);assert.equal(h.store.get(h.user,h.todo.id).sourceSync.state,'succeeded');
 }finally{await h.close();}
});
test('restore suspends queued writes; old installed clients still read the original source state schema',async()=>{
 const h=await setup();try{
  const todo=await h.edits.save(h.user,h.todo.id,{title:'do not replay after restore'});assert.equal(todoWire(todo,false).sourceSync.state,'unknown');assert.equal(todoWire(todo,true).sourceSync.state,'queued');
  const db=new DatabaseSync(join(h.directory,'duckduck.sqlite'));suspendRestoredAssistant(db);db.close();await h.edits.tick();assert.equal(h.writes.length,0);assert.equal(h.store.get(h.user,h.todo.id).sourceSync.state,'unknown');
 }finally{await h.close();}
});
