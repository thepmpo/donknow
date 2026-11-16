import {createHash,randomUUID} from 'node:crypto';
import {fail} from './secrets.js';
import {validateAction} from './provider-actions.js';
export const briefingKey=(value)=>createHash('sha256').update(value).digest('hex');
const normalized=value=>String(value??'').normalize('NFKC').toLocaleLowerCase('ko').replace(/[\s\p{P}\p{S}]+/gu,'');
export const checklistKey=item=>briefingKey([...new Set(item.sourceRefs??[])].sort().join('|')+':'+normalized(item.title??item.args?.title));
export function briefingStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS briefing_item_states(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,item_key TEXT NOT NULL,todo_id TEXT,state TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,item_key));`);
 const columns=new Set(db.prepare('PRAGMA table_info(briefing_item_states)').all().map(c=>c.name));
 for(const column of ['action_id','details'])if(!columns.has(column))db.exec('ALTER TABLE briefing_item_states ADD COLUMN '+column+' TEXT');
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(error){db.exec('ROLLBACK');throw error;}};
 const state=(user,key)=>db.prepare('SELECT todo_id AS todoId,state,action_id AS calendarActionId FROM briefing_item_states WHERE user_id=? AND item_key=?').get(user,key);
 function save(user,key,todoId,excluded){db.prepare('INSERT INTO briefing_item_states(user_id,item_key,todo_id,state,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id,item_key) DO UPDATE SET todo_id=excluded.todo_id,state=excluded.state,updated_at=excluded.updated_at').run(user,key,todoId??null,excluded?'excluded':'active',Date.now());}
 function owned(user,messageId,key,conversation){let value;if(conversation==='token'){try{value=box.open(messageId);}catch{throw fail(400,'할 일 제안을 다시 확인해주세요.');}if(value.owner!==user||value.expiresAt<Date.now())throw fail(404,'내 할 일 제안이 아니거나 만료됐어요.');}else{const row=db.prepare('SELECT payload FROM '+(conversation?'assistant_conversations':'assistant_messages')+' WHERE id=? AND user_id=?').get(messageId,user);if(!row)throw fail(404,'내 브리핑을 찾을 수 없어요.');value=box.open(row.payload);}const item=value.items?.find(i=>i.key===key);if(!item)throw fail(404,'이 브리핑의 항목이 아니에요.');return {value,item};}
 function remember(user,item){db.prepare('UPDATE briefing_item_states SET details=? WHERE user_id=? AND item_key=?').run(box.seal({key:item.key,title:item.title,sourceRefs:item.sourceRefs??[],section:item.section??null}),user,item.key);}
 return {
  briefingPayload(user,messageId,key,conversation=false){return owned(user,messageId,key,conversation);},
  handledBriefingItems(user){const saved=db.prepare("SELECT item_key,details FROM briefing_item_states WHERE user_id=? AND (todo_id IS NOT NULL OR state IN ('excluded','calendar')) ORDER BY updated_at DESC LIMIT 200").all(user).map(r=>r.details?{...box.open(r.details),key:r.item_key}:{key:r.item_key});const imported=db.prepare('SELECT data FROM todos WHERE user_id=?').all(user).map(r=>JSON.parse(r.data)).filter(t=>t.source).map(t=>({title:t.title,sourceRefs:[t.source.provider+':'+t.source.externalId]})).map(t=>({...t,key:checklistKey(t)}));return [...saved,...imported].slice(0,400);},
  isBriefingHandled(user,item,known){const s=state(user,item.key);if(s&&(s.todoId||['excluded','calendar'].includes(s.state)))return true;return !!item.sourceRefs?.length&&(known??this.handledBriefingItems(user)).some(old=>old.title&&checklistKey(old)===checklistKey(item));},
  checklistResult(user,result){const items=(result.proposals??[]).flatMap((p,i)=>['todo.create','calendar.create'].includes(p.operation)?[{key:p.sourceRefs?.length?checklistKey(p):briefingKey('chat:'+randomUUID()),proposalIndex:i,title:p.args.title,notes:p.args.notes??'',dueDate:p.args.dueDate??p.args.startDate??null,...(p.operation==='calendar.create'?{suggestedCalendar:p.args}:{}),sourceRefs:p.sourceRefs??[],sources:(result.sources??[]).filter(s=>p.sourceRefs?.includes(s.ref)).slice(0,3).map(({ref,title,provider})=>({ref,title,provider})),section:p.section??null}]:[]);return {...result,items:items.map(item=>({...item,token:box.seal({owner:user,expiresAt:Date.now()+30*86400000,items:[{...item,sources:undefined}],sources:(result.sources??[]).filter(s=>item.sourceRefs.includes(s.ref)).map(({ref,title,provider,locator})=>({ref,title,provider,locator}))})}))};},
  claimBriefingCalendar(user,messageId,key,conversation=false){const {item}=owned(user,messageId,key,conversation);return tx(()=>{const old=state(user,key);if(old?.state==='calendar')throw fail(409,'이미 캘린더로 보낸 일이에요. 원본 일정을 확인해주세요.');if(old?.calendarActionId&&!old.calendarActionId.startsWith('preparing:')){const action=this.assistantAction(user,old.calendarActionId);if(!action||!['failed','cancelled','expired','restored-cancelled'].includes(action.status)&&!(action.status==='pending'&&action.expiresAt<Date.now()))return {existing:action,blocked:!action};}if(old?.state==='calendar-preparing'&&db.prepare('SELECT updated_at FROM briefing_item_states WHERE user_id=? AND item_key=?').get(user,key).updated_at>Date.now()-60000)throw fail(409,'일정의 저장 전 확인을 준비 중이에요. 잠시 뒤 다시 확인해주세요.');const lease='preparing:'+randomUUID();if(!old)save(user,key,null,false);db.prepare("UPDATE briefing_item_states SET state='calendar-preparing',action_id=?,updated_at=? WHERE user_id=? AND item_key=?").run(lease,Date.now(),user,key);remember(user,item);return {lease};});},
  linkBriefingCalendar(user,key,lease,action){if(action.operation!=='calendar.create'||!this.assistantAction(user,action.id))throw fail(400,'내 일정 초안을 확인해주세요.');if(!db.prepare("UPDATE briefing_item_states SET state='calendar-pending',action_id=?,updated_at=? WHERE user_id=? AND item_key=? AND action_id=? AND state='calendar-preparing'").run(action.id,Date.now(),user,key,lease).changes)throw fail(409,'일정 준비 상태가 바뀌었어요. 다시 확인해주세요.');},
  releaseBriefingCalendar(user,key,lease){db.prepare("UPDATE briefing_item_states SET state='active',action_id=NULL WHERE user_id=? AND item_key=? AND action_id=? AND state='calendar-preparing'").run(user,key,lease);},
  resolveBriefingCalendar(user,id){const action=this.assistantAction(user,id);if(action?.status==='succeeded'&&action.operation==='calendar.create')db.prepare("UPDATE briefing_item_states SET state='calendar',updated_at=? WHERE user_id=? AND action_id=?").run(Date.now(),user,id);return action;},
  exportChecklistStates(user){return db.prepare('SELECT item_key,state,todo_id,action_id,details,updated_at FROM briefing_item_states WHERE user_id=?').all(user).map(r=>({...r,details:r.details?box.open(r.details):null}));},
  briefingItemState(user,key){return state(user,key)??null;},
  decorateBriefings(user,messages){
   const states=new Map(db.prepare('SELECT item_key,todo_id,state,action_id,details FROM briefing_item_states WHERE user_id=?').all(user).map(r=>[r.item_key,r]));
   const todos=new Map(db.prepare('SELECT id,data FROM todos WHERE user_id=?').all(user).map(r=>[r.id,JSON.parse(r.data)]));
   return messages.map(message=>!Array.isArray(message.items)?message:{...message,items:message.items.map(item=>{const s=states.get(item.key),todoId=s?.todo_id??item.todoId,calendarAction=s?.action_id&&!s.action_id.startsWith('preparing:')?this.resolveBriefingCalendar(user,s.action_id):null;if(s&&!s.details)remember(user,item);return {...item,todoId:todoId??null,excluded:s?.state==='excluded',calendarAction,calendarAdded:s?.state==='calendar'||calendarAction?.status==='succeeded',todo:todoId?todos.get(todoId)??null:null};})});
  },
  outstandingBriefingItems(user){
   const rows=db.prepare('SELECT payload FROM assistant_messages WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 20').all(user),items=new Map();
   const decorated=this.decorateBriefings(user,rows.map(row=>box.open(row.payload))),known=this.handledBriefingItems(user);
   for(const m of decorated)for(const item of m.items??[])if(!items.has(item.key))items.set(item.key,item);
   return [...items.values()].filter(item=>!this.isBriefingHandled(user,item,known)&&!item.todoId&&!item.calendarAdded).slice(0,40);
  },
  applyConversationItem(user,messageId,key,action,args,options){return this.applyBriefingItem(user,messageId,key,action,args,true,options);},
  applyBriefingItem(user,messageId,key,action,args,conversation=false,{allowCreate=true}={}){
   if(!['complete','todo','exclude','restore'].includes(action)||typeof key!=='string'||!/^[a-f0-9]{64}$/.test(key))throw fail(400,'체크리스트 동작을 확인해주세요.');
   const {value:payload,item}=owned(user,messageId,key,conversation);
   let linked=state(user,key)?.todoId??item.todoId??null;
   if(action==='exclude'||action==='restore'){save(user,key,linked,action==='exclude');remember(user,item);return {todoId:linked,excluded:action==='exclude',todo:linked?this.get(user,linked):null};}
   const done=action==='complete';
   // The mapping and first insert share one transaction: a lost reply or another
   // device cannot create a second Todo for this briefing key.
   tx(()=>{linked=state(user,key)?.todoId??item.todoId??null;if(!linked){if(!allowCreate)throw fail(403,'받은 내용을 할 일로 보내는 기능은 프로에서 제공해요. 기존 할 일과 원본 자료는 계속 사용할 수 있어요.');const draft=validateAction('todo.create',args??{title:item.title,notes:item.notes??'',dueDate:item.dueDate??null});const origin=(payload.sources??[]).find(s=>item.sourceRefs?.includes(s.ref)&&['google','slack','notion','naver'].includes(s.provider)&&s.ref.startsWith(s.provider+':')),source=origin?{provider:origin.provider,externalId:origin.ref.slice(origin.provider.length+1),...(origin.locator?.calendarId?{calendarId:origin.locator.calendarId,eventId:origin.locator.id}:{}),...(origin.locator?.connectionId?{connectionId:origin.locator.connectionId}:{})}:null;const todo=this.create(user,{...(source?{source}:{}),title:draft.title,notes:draft.notes??'',dueDate:draft.dueDate??null,reminderAt:null,category:'일상'},{done});linked=todo.id;}if(!this.get(user,linked))throw fail(409,'연결된 할 일이 삭제됐어요. 기존 항목을 다시 생성하지 않아요.');save(user,key,linked,false);remember(user,item);});
   let todo=this.get(user,linked);if(todo.done!==done)todo=this.update(user,linked,{done});
   return {todoId:linked,excluded:false,todo};
  },
 };
}
