import {createHash} from 'node:crypto';
import {fail} from './secrets.js';
import {validateAction} from './provider-actions.js';
export const briefingKey=(value)=>createHash('sha256').update(value).digest('hex');
export function briefingStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS briefing_item_states(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item_key TEXT NOT NULL,todo_id TEXT,state TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,item_key));`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const state=(user,key)=>db.prepare('SELECT todo_id AS todoId,state FROM briefing_item_states WHERE user_id=? AND item_key=?').get(user,key);
 function save(user,key,todoId,excluded){db.prepare('INSERT INTO briefing_item_states VALUES (?,?,?,?,?) ON CONFLICT(user_id,item_key) DO UPDATE SET todo_id=excluded.todo_id,state=excluded.state,updated_at=excluded.updated_at').run(user,key,todoId??null,excluded?'excluded':'active',Date.now());}
 return {
  briefingItemState(user,key){return state(user,key)??null;},
  decorateBriefings(user,messages){
   const states=new Map(db.prepare('SELECT item_key,todo_id,state FROM briefing_item_states WHERE user_id=?').all(user).map(r=>[r.item_key,r]));
   const todos=new Map(db.prepare('SELECT id,data FROM todos WHERE user_id=?').all(user).map(r=>[r.id,JSON.parse(r.data)]));
   return messages.map(message=>!Array.isArray(message.items)?message:{...message,items:message.items.map(item=>{const s=states.get(item.key),todoId=s?.todo_id??item.todoId;return {...item,todoId:todoId??null,excluded:s?.state==='excluded',todo:todoId?todos.get(todoId)??null:null};})});
  },
  outstandingBriefingItems(user){
   const rows=db.prepare('SELECT payload FROM assistant_messages WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 20').all(user),items=new Map();
   const decorated=this.decorateBriefings(user,rows.map(row=>box.open(row.payload)));
   for(const m of decorated)for(const item of m.items??[])if(!items.has(item.key))items.set(item.key,item);
   return [...items.values()].filter(item=>!item.excluded&&!item.todo?.done).slice(0,40);
  },
  applyConversationItem(user,messageId,key,action,args,options){return this.applyBriefingItem(user,messageId,key,action,args,true,options);},
  applyBriefingItem(user,messageId,key,action,args,conversation=false,{allowCreate=true}={}){
   if(!['complete','todo','exclude','restore'].includes(action)||typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))throw fail(400,'체크리스트 동작을 확인해주세요.');
   const row=db.prepare('SELECT payload FROM '+(conversation?'assistant_conversations':'assistant_messages')+' WHERE id=? AND user_id=?').get(messageId,user);
   if(!row)throw fail(404,'내 브리핑을 찾을 수 없어요.');
   const payload=box.open(row.payload),item=payload.items?.find(i=>i.key===key);if(!item)throw fail(404,'이 브리핑의 항목이 아니에요.');
   let linked=state(user,key)?.todoId??item.todoId??null;
   if(action==='exclude'||action==='restore'){save(user,key,linked,action==='exclude');return {todoId:linked,excluded:action==='exclude',todo:linked?this.get(user,linked):null};}
   const done=action==='complete';
   // The mapping and first insert share one transaction: a lost reply or another
   // device cannot create a second Todo for this briefing key.
   tx(()=>{linked=state(user,key)?.todoId??item.todoId??null;if(!linked){if(!allowCreate)throw fail(403,'받은 내용을 할 일로 보내는 기능은 프로에서 제공해요. 기존 할 일과 원본 자료는 계속 사용할 수 있어요.');const draft=validateAction('todo.create',args??{title:item.title,notes:item.notes??'',dueDate:item.dueDate??null});const origin=(payload.sources??[]).find(s=>item.sourceRefs?.includes(s.ref)&&['google','slack','notion','naver'].includes(s.provider)&&s.ref.startsWith(s.provider+':')),source=origin?{provider:origin.provider,externalId:origin.ref.slice(origin.provider.length+1),...(origin.locator?.calendarId?{calendarId:origin.locator.calendarId,eventId:origin.locator.id}:{}),...(origin.locator?.connectionId?{connectionId:origin.locator.connectionId}:{})}:null;const todo=this.create(user,{...(source?{source}:{}),title:draft.title,notes:draft.notes??'',dueDate:draft.dueDate??null,reminderAt:null,category:'일상'},{done});linked=todo.id;}if(!this.get(user,linked))throw fail(409,'연결된 할 일이 삭제됐어요. 기존 항목을 다시 생성하지 않아요.');save(user,key,linked,false);});
   let todo=this.get(user,linked);if(todo.done!==done)todo=this.update(user,linked,{done});
   return {todoId:linked,excluded:false,todo};
  },
 };
}
