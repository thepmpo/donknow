import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';
import {openStore} from '../server/store.js';
import {createIntegrations} from '../server/integrations.js';
import {createTodoMembership} from '../server/todo-membership.js';

test('membership routes accept only the current owner and preserve local order, dates and completion',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified('move-owner@example.test'),other=await h.verified('move-other@example.test');
  const task=(await h.request('/api/todos','POST',{title:'자료 확인',category:'일상',dueDate:'2026-11-26'},owner.token)).data;
  const options=await h.request('/api/todo-membership/options','POST',{ids:[task.id]},owner.token);
  assert.equal(options.status,200);
  assert.deepEqual(options.data.items.map(item=>[item.title,item.current]),[['일상',true],['업무',false],['건강',false]]);
  const path='/api/todos/'+task.id+'/membership';
  assert.equal((await h.request(path,'POST',{destination:'업무'},other.token)).status,404);
  assert.equal((await h.request(path,'POST',{destination:'a-remote-list'},owner.token)).status,400);
  const result=await h.request(path,'POST',{destination:'업무'},owner.token);
  assert.equal(result.status,200);
  assert.deepEqual(result.data,{...task,category:'업무'});
 }finally{await h.close();}
});

test('Google Tasks list move uses the original account and keeps both import keys attached to one Docen task',async()=>{
 const h=await apiHarness();
 const store=await openStore(h.dir);
 try{
  const user=(await h.verified('move-google@example.test')).user.id,env={PUBLIC_ORIGIN:'https://fixture.test',GOOGLE_CLIENT_ID:'example',GOOGLE_CLIENT_SECRET:'example'};
  for(const connectionId of ['one','other'])store.saveGoogleAccount(user,{connectionId,accountId:connectionId,features:['tasks','tasksWrite'],accessToken:'provider-'+connectionId},connectionId);
  const source='one:tasks:inbox:task',newSource='one:tasks:work:task';
  store.cacheResources(user,'google',[{id:source,title:'자료 확인',dueDate:'2026-11-26'}]);
  const todo=store.importResources(user,'google',[source])[0].todo;
  store.cacheResources(user,'google',[{id:'other:tasks:inbox:task',title:'다른 계정'}]);
  const other=store.importResources(user,'google',['other:tasks:inbox:task'])[0].todo;
  const fetches=[];
  const integration=createIntegrations(store,env,async(input,options)=>{
   const url=new URL(input);fetches.push([url,options.method??'GET']);
   assert.equal(options.headers.Authorization,'Bearer provider-one');
   if(url.pathname.endsWith('/@me/lists'))return Response.json({items:[{id:'inbox',title:'받은 할 일'},{id:'work',title:'업무 목록'}]});
   if(url.pathname.endsWith('/@me/lists/work'))return Response.json({id:'work',title:'업무 목록'});
   if(url.pathname.endsWith('/move')){
    assert.equal(url.searchParams.get('destinationTasklist'),'work');
    assert.equal(options.method,'POST');
   }
   return Response.json({id:'task'});
  });
  const moves=createTodoMembership(store,integration);
  await assert.rejects(moves.options(user,[todo.id,other.id]),error=>error.status===400);
  assert.equal(fetches.length,0);
  assert.deepEqual((await moves.options(user,[todo.id])).items.map(item=>[item.id,item.current]),[['inbox',true],['work',false]]);
  await assert.rejects(moves.move(user,todo.id,{destination:'work',connectionId:'other'}),error=>error.status===400);
  const moved=await moves.move(user,todo.id,{destination:'work',connectionId:'one'});
  assert.deepEqual(moved,{...todo,source:{provider:'google',externalId:newSource,listId:'work',listTitle:'업무 목록'}});
  await moves.move(user,todo.id,{destination:'work',connectionId:'one'});
  assert.equal(fetches.filter(([,method])=>method==='POST').length,1);
  store.cacheResources(user,'google',[{id:newSource,title:'다시 가져오기'}]);
  assert.deepEqual(store.importResources(user,'google',[source,newSource]).map(item=>[item.todo.id,item.created]),[[todo.id,false],[todo.id,false]]);
 }finally{store.close();await h.close();}
});
