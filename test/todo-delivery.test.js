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
  const duringDelivery=await h.request('/api/todos/'+data.id,'PATCH',{title:'미리알림 편집'},owner.token);
  assert.equal(duringDelivery.status,409);
  assert.equal(duringDelivery.data.code,'todo-delivery-in-progress');
  assert.equal((await h.request('/api/todos/'+data.id,'DELETE',undefined,owner.token)).status,409);
  const receipt={attempt:claim.data.attempt,externalId:'apple-reminder-id',listId:'list-a',listTitle:'개인'};
  const native={id:receipt.externalId,listId:receipt.listId,title:body.title,notes:'',dueDate:body.dueDate,dueTime:body.dueTime,completed:false};
  const refresh=()=>h.request('/api/integrations/apple-reminders/refresh','POST',{items:[native]},owner.token);
  assert.deepEqual((await refresh()).data,{changed:0,items:[],deferred:[native.id]});
  assert.equal((await h.request(path+'receipt','POST',{...receipt,listId:'list-b'},owner.token)).status,409);
  const first=await h.request(path+'receipt','POST',receipt,owner.token);
  const replay=await h.request(path+'receipt','POST',receipt,owner.token);
  assert.equal(first.status,200);assert.deepEqual(replay.data,first.data);
  assert.equal(first.data.delivery.state,'synced');
  assert.equal(first.data.source.externalId,receipt.externalId);
  const refreshed=await refresh();
  assert.equal(refreshed.status,200);
  assert.ok(refreshed.data.items.every(item=>item.id===data.id));
  const list=(await h.request('/api/todos','GET',undefined,owner.token)).data;
  assert.equal(list.length,1);assert.equal(list[0].id,data.id);
  const edit=await h.request('/api/todos/'+data.id,'PATCH',{title:'미리알림 편집',deviceEditBase:{
   sourceId:receipt.externalId,fields:{title:body.title},editedAt:new Date().toISOString(),
  }},owner.token);
  assert.equal(edit.status,200);
  assert.equal(edit.data.sourceSync.state,'device-required');
 }finally{await h.close();}
});

test('switching a Ticket from Apple to Google preserves its Docen ID and suppresses the previous source after confirmation',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified();
  const request=(path,method,body)=>h.request(path,method,body,owner.token);
  const apple={id:'native-ticket',listId:'inbox',title:'원본 Ticket',notes:'메모',dueDate:'2026-11-28',completed:false};
  const original=await request('/api/integrations/apple-reminders/refresh','POST',{items:[apple]});
  const {id}=original.data.items[0];
  const target={provider:'google',connectionId:'google-account',listId:'work'};
  const queued=await request('/api/todos/'+id+'/destination','POST',target);
  assert.equal(queued.status,200);
  assert.equal(queued.data.id,id);
  assert.equal(queued.data.delivery.state,'queued');
  assert.equal(queued.data.source.externalId,apple.id);
  const replay=await request('/api/todos/'+id+'/destination','POST',target);
  assert.equal(replay.data.delivery.state,'queued');
  const list=await request('/api/todos');
  assert.equal(list.data.length,1);
 }finally{await h.close();}
 const dir=await mkdtemp(join(tmpdir(),'docen-transfer-')),store=await openStore(dir);
 try{
  const {user}=await store.register('transfer@example.test','fixture-password-123');
  const [original]=store.syncTaskResources(user.id,'apple-reminders',[
   {id:'native-id',listId:'inbox',title:'원본 Ticket',notes:'메모',dueDate:'2026-11-28',completed:false},
  ],{returnItems:true}).items;
  store.todoDelivery.switchTarget(user.id,original.id,{provider:'google',connectionId:'google-account',listId:'work'});
  const attempt=store.todoDelivery.claim(user.id,original.id,'google');
  const source={provider:'google',externalId:'google-account:tasks:work:remote',listId:'work',connectionId:'google-account'};
  const saved=store.todoDelivery.finish(user.id,original.id,attempt,source);
  assert.equal(saved.id,original.id);
  assert.equal(saved.notes,original.notes);
  assert.deepEqual(saved.source,source);
  const pulled=store.syncTaskResources(user.id,'apple-reminders',[{id:'native-id',title:'이전 원본'}],{returnItems:true});
  assert.deepEqual(pulled,{changed:0,items:[],suppressed:['native-id']});
  assert.equal(store.list(user.id).length,1);
  store.todoDelivery.switchTarget(user.id,original.id,{provider:'apple-reminders',listId:'another-list'});
  const appleAttempt=store.todoDelivery.claim(user.id,original.id,'apple-reminders');
  const movedBack=store.todoDelivery.appleReceipt(user.id,original.id,{attempt:appleAttempt,externalId:'new-native-id',listId:'another-list',listTitle:'새 목록'});
  assert.equal(movedBack.id,original.id);
  assert.equal(movedBack.source.listTitle,'새 목록');
  assert.equal(store.syncTaskResources(user.id,'google',[{id:source.externalId,title:'이전 Google 원본'}]),0);
  assert.equal(store.list(user.id).length,1);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});

test('new Google approval resumes rejected task creates only for that connection',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'docen-todo-reauthorize-')),store=await openStore(dir);
 try{
  const {user}=await store.register('resume@example.test','fixture-password-123');
  const draft={title:'할 일',notes:'',dueDate:null,category:'일상'};
  const add=connectionId=>store.create(user.id,draft,{requestKey:'stable-request-'+connectionId,target:{provider:'google',connectionId,listId:'list'}});
  const first=add('first'),second=add('second');
  const calls=[];
  const worker=createTodoDelivery(store,{async createGoogleTask(userId,target,claim){
   if(!calls.length||target.connectionId==='second'){
    calls.push('rejected');
    throw Object.assign(Error('expired'),{status:409,code:'integration-reauthorization'});
   }
   assert.ok(claim());
   calls.push(target.connectionId);
   return {provider:'google',externalId:'first:tasks:list:created'};
  }},{background:false});
  await worker.tick();
  assert.equal(store.todoDelivery.status(user.id,first.id).state,'blocked');
  assert.equal(store.todoDelivery.status(user.id,second.id).state,'blocked');
  store.todoDelivery.resumeGoogle(user.id,'first');
  await worker.tick();
  assert.deepEqual(calls,['rejected','rejected','first']);
  assert.equal(store.todoDelivery.status(user.id,first.id).state,'synced');
  assert.equal(store.todoDelivery.status(user.id,second.id).state,'blocked');
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});

test('linked Ticket deletion is durable, idempotent and isolated to its account',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'docen-todo-delete-')),store=await openStore(dir);
 try{
  const {user}=await store.register('delete@example.test','fixture-password-123');
  const {user:other}=await store.register('other-delete@example.test','fixture-password-123');
  const sourceId='google-test:tasks:chosen:linked';
  store.saveGoogleAccount(user.id,{connectionId:'google-test',accountId:'identity',features:['tasks','tasksWrite'],accessToken:'fixture'},'개인');
  store.syncTaskResources(user.id,'google',[{id:sourceId,title:'삭제할 Ticket',listId:'chosen',completed:false}]);
  const [todo]=store.todoDelivery.list(user.id);
  store.todoDelivery.deleteLinked(other.id,{id:todo.id,sourceId});
  assert.ok(store.get(user.id,todo.id));
  assert.throws(()=>store.todoDelivery.deleteLinked(user.id,{id:todo.id,sourceId:'stale'}),{status:409});
  store.todoDelivery.deleteLinked(user.id,{id:todo.id,sourceId});
  store.todoDelivery.deleteLinked(user.id,{id:todo.id,sourceId});
  assert.equal(store.todoDelivery.list(user.id).length,0);
  assert.equal(store.syncTaskResources(user.id,'google',[{id:sourceId,title:'삭제 직전 응답',completed:false}]),0);
  const requests=[];
  const adapter=createIntegrations(store,{PUBLIC_ORIGIN:'https://fixture.test'},async(url,options)=>{
   requests.push([new URL(url).pathname,options.method]);
   return new Response(null,{status:204});
  });
  const worker=createTodoDelivery(store,adapter,{background:false});
  await worker.tick();
  await worker.tick();
  assert.deepEqual(requests,[['/tasks/v1/lists/chosen/tasks/linked','DELETE']]);
  assert.equal(store.todoDelivery.pendingSourceDeletes().length,0);
  const apple={id:'deleted-before-import',title:'미리알림',completed:false,listId:'inbox'};
  store.todoDelivery.deleteLinked(user.id,{id:null,sourceId:apple.id,appleId:apple.id});
  assert.deepEqual(store.syncTaskResources(user.id,'apple-reminders',[apple],{returnItems:true}).suppressed,[apple.id]);
  const another={...apple,id:'another-reminder'};
  store.syncTaskResources(user.id,'apple-reminders',[another]);
  const [imported]=store.todoDelivery.list(user.id);
  assert.throws(()=>store.todoDelivery.deleteLinked(user.id,{id:imported.id,sourceId:another.id}),{status:403});
  store.todoDelivery.deleteLinked(user.id,{id:null,sourceId:another.id,appleId:another.id});
  assert.equal(store.todoDelivery.list(user.id).length,0);
  const deletedByGoogle={id:'google-test:tasks:chosen:remote-delete',title:'Google에서 삭제',completed:false};
  store.syncTaskResources(user.id,'google',[deletedByGoogle]);
  assert.equal(store.syncTaskResources(user.id,'google',[{...deletedByGoogle,deleted:true}]),1);
  assert.equal(store.todoDelivery.list(user.id).length,0);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
