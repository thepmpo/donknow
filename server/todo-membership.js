import {fail} from './secrets.js';

const categories=['일상','업무','건강'];
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\x00-\x1f\x7f]/.test(value);
const validGoogleId=value=>validId(value)&&!value.includes(':');

export function createTodoMembership(store,integrations){
 const moving=new Set();
 const find=(user,id)=>{
  const todo=validId(id)&&store.get(user,id);
  if(!todo||todo.done)throw fail(404,'이동할 할 일을 찾지 못했어요.');
  return todo;
 };
 function scope(todo){
  const {source}=todo;
  if(!source)return {kind:'local'};
  if(source.provider==='apple-reminders')return {kind:'apple'};
  const task=source.provider==='google'&&/^([^:]+):tasks:([^:]+):([^:]+)$/.exec(source.externalId);
  if(task&&task[1]!=='legacy')return {kind:'google',connectionId:task[1],listId:task[2],taskId:task[3]};
  throw fail(422,'이 항목은 원본 앱에서 소속을 변경해주세요.');
 }
 function sameSelection(user,ids){
  if(!Array.isArray(ids)||!ids.length||ids.length>200||new Set(ids).size!==ids.length)throw fail(400,'이동할 할 일을 선택해주세요.');
  const todos=ids.map(id=>find(user,id)),source=scope(todos[0]);
  for(const todo of todos){
   const current=scope(todo);
   if(current.kind!==source.kind||current.connectionId!==source.connectionId)throw fail(400,'같은 서비스와 계정에 속한 할 일을 선택해주세요.');
  }
  return {todos,source};
 }
 return {
  async options(user,ids,cursor){
   const {todos,source}=sameSelection(user,ids);
   if(source.kind==='local')return {kind:'local',items:categories.map(id=>({id,title:id,current:todos.every(todo=>todo.category===id)}))};
   if(source.kind==='apple')return {kind:'apple',items:[]};
   const page=await integrations.taskMoveLists(user,source.connectionId,cursor);
   return {kind:'google',connectionId:source.connectionId,items:page.items.map(item=>({...item,current:todos.every(todo=>scope(todo).listId===item.id)})),nextCursor:page.nextCursor};
  },
  isMoving:(user,id)=>moving.has(user+':'+id),
  async move(user,id,input){
   const todo=find(user,id),source=scope(todo),{destination,apple}=input,key=user+':'+id;
   const delivery=store.todoDelivery.status(user,id);
   if(moving.has(key)||todo.sourceSync?.patch||delivery&&['queued','sending','checking'].includes(delivery.state))throw fail(409,'원본 변경이 끝나면 다시 이동해주세요.');
   if(source.kind==='local'){
    if(apple||!categories.includes(destination))throw fail(400,'이동할 분류를 확인해주세요.');
    return store.update(user,id,{category:destination});
   }
   if(source.kind==='apple'){
    if(!validId(destination)||!apple||!validId(apple.originalId)||!validId(apple.id)||typeof apple.title!=='string'||!apple.title.trim()||apple.title.length>200)throw fail(400,'미리 알림의 이동 결과를 확인해주세요.');
    const modifiedAt=typeof apple.modifiedAt==='string'&&Number.isFinite(Date.parse(apple.modifiedAt))?new Date(apple.modifiedAt).toISOString():undefined;
    return store.relocateTodoSource(user,id,apple.originalId,{...todo.source,externalId:apple.id,listId:destination,listTitle:apple.title,...(modifiedAt?{modifiedAt}:{})});
   }
   if(apple||!validGoogleId(destination)||input.connectionId!==source.connectionId)throw fail(400,'같은 Google 계정에서 목록을 선택해주세요.');
   if(source.listId===destination)return todo;
   moving.add(key);
   try{
    const result=await integrations.moveTaskBetweenLists(user,source,destination);
    if(!validGoogleId(result.id))throw fail(502,'이동한 Google 할 일의 번호를 확인하지 못했어요.');
    const nextSource={...todo.source,externalId:source.connectionId+':tasks:'+destination+':'+result.id,listId:destination,listTitle:result.title};
    delete nextSource.url;
    return store.relocateTodoSource(user,id,todo.source.externalId,nextSource);
   }finally{moving.delete(key);}
  },
 };
}
