import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createIntegrations} from '../server/integrations.js';
import {createTodoDelivery} from '../server/todo-delivery.js';
import {apiHarness} from '../test-support/api.js';

test('Google creation commits locally first, writes only the chosen list, and holds uncertain POSTs',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'docen-todo-delivery-')),store=await openStore(dir);
 try{
  const {user}=await store.register('delivery@example.test','fixture-password-123');
  store.saveGoogleAccount(user.id,{connectionId:'google-test',accountId:'identity',features:['tasks','tasksWrite'],accessToken:'fixture'},'개인');
  const targets={provider:'google',connectionId:'google-test',listId:'chosen'};
  const draft={title:'기기에 저장한 할 일',notes:'메모',dueDate:'2026-11-26',category:'일상'};
  let uncertain=false,rejectList=false;
  const posts=[];
  const integrations=createIntegrations(store,{PUBLIC_ORIGIN:'https://fixture.test'},async(url,options)=>{
   const path=new URL(url).pathname;
   if(path==='/tasks/v1/users/@me/lists/chosen')return rejectList?Response.json({error:'denied'},{status:403}):Response.json({id:'chosen',title:'팀 할 일'});
   assert.equal(path,'/tasks/v1/lists/chosen/tasks');assert.equal(options.method,'POST');
   posts.push(JSON.parse(options.body));
   if(uncertain)throw Error('lost response');
   return Response.json({id:'external'});
  });
  const worker=createTodoDelivery(store,integrations,{background:false});
  const job=store.create(user.id,draft,{requestKey:'stable-device-request-A',target:targets});
  assert.equal(store.todoDelivery.status(user.id,job.id).state,'queued');
  assert.equal(store.get(user.id,job.id).source,undefined);
  assert.equal(posts.length,0);
  await worker.tick();
  assert.equal(store.get(user.id,job.id).source.externalId,'google-test:tasks:chosen:external');
  assert.equal(store.todoDelivery.status(user.id,job.id).state,'synced');
  assert.equal(store.create(user.id,draft,{requestKey:'stable-device-request-A',target:targets}).id,job.id);
  assert.deepEqual(posts,[{title:draft.title,notes:draft.notes,status:'needsAction',due:'2026-11-26T00:00:00.000Z'}]);

  uncertain=true;
  const other=store.create(user.id,{...draft,dueDate:null},{requestKey:'stable-device-request-B',target:targets});
  await worker.tick();await worker.tick();
  assert.equal(store.todoDelivery.status(user.id,other.id).state,'checking');
  assert.equal(posts.length,2);
  assert.equal('due' in posts[1],false);
  assert.equal(store.get(user.id,other.id).title,draft.title);
  assert.throws(()=>store.todoDelivery.retry(user.id,other.id),error=>error.status===409);

  rejectList=true;
  const blocked=store.create(user.id,draft,{requestKey:'stable-device-request-C',target:targets});
  await worker.tick();
  assert.equal(store.todoDelivery.status(user.id,blocked.id).state,'blocked');
  assert.equal(posts.length,2);
  assert.equal(store.todoDelivery.retry(user.id,blocked.id).delivery.state,'queued');

 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});

test('Apple delivery is claimed once for exactly one owner and list; receipts can be retried',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified(),other=await h.verified('other-delivery@example.test');
  const body={title:'미리알림 생성',dueDate:'2026-11-26',dueTime:'09:00',clientRequestKey:'stable-apple-device-request',deliveryTarget:{provider:'apple-reminders',listId:'list-a'}};
  const {status,data}=await h.request('/api/todos','POST',body,owner.token);
  assert.equal(status,201);assert.equal(data.delivery.state,'queued');
  const path='/api/todos/'+data.id+'/delivery/';
  assert.equal((await h.request(path+'claim','POST',{listId:'list-a'},other.token)).status,404);
  assert.equal((await h.request(path+'claim','POST',{listId:'list-b'},owner.token)).status,409);
  const claim=await h.request(path+'claim','POST',{listId:'list-a'},owner.token);
  assert.equal(claim.status,200);assert.equal(claim.data.todo.dueTime,'09:00');
  assert.equal((await h.request(path+'claim','POST',{listId:'list-a'},owner.token)).status,409);
  assert.equal((await h.request('/api/todos/'+data.id,'DELETE',undefined,owner.token)).status,409);
  const receipt={attempt:claim.data.attempt,externalId:'apple-reminder-id',listId:'list-a',listTitle:'개인'};
  assert.equal((await h.request(path+'receipt','POST',{...receipt,listId:'list-b'},owner.token)).status,409);
  const first=await h.request(path+'receipt','POST',receipt,owner.token);
  const replay=await h.request(path+'receipt','POST',receipt,owner.token);
  assert.equal(first.status,200);assert.deepEqual(replay.data,first.data);
  assert.equal(first.data.delivery.state,'synced');
  assert.equal(first.data.source.externalId,receipt.externalId);
  const list=(await h.request('/api/todos','GET',undefined,owner.token)).data;
  assert.equal(list.length,1);assert.equal(list[0].id,data.id);
 }finally{await h.close();}
});
