import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';

const validId=value=>typeof value==='string'&&value.length>0&&value.length<=512&&!/[\x00-\x1f\x7f]/.test(value);
export function todoTarget(input){
 if(input==null)return undefined;
 if(!input||typeof input!=='object'||!validId(input.listId))throw fail(400,'저장할 목록을 확인해주세요.');
 const {provider,listId,connectionId}=input;
 if(provider==='apple-reminders')return {provider,listId};
 if(provider==='google'&&validId(connectionId)&&!connectionId.includes(':')&&!listId.includes(':'))return {provider,listId,connectionId};
 throw fail(400,'저장할 서비스 계정을 확인해주세요.');
}

export function todoDeliveryStore(db,get){
 db.exec(`CREATE TABLE IF NOT EXISTS todo_delivery (
  todo_id TEXT PRIMARY KEY REFERENCES todos(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id), provider TEXT NOT NULL,
  target TEXT NOT NULL, state TEXT NOT NULL, attempt TEXT, next_at INTEGER NOT NULL
 ); CREATE INDEX IF NOT EXISTS todo_delivery_pending ON todo_delivery(provider,state,next_at);
 CREATE INDEX IF NOT EXISTS todo_delivery_owner ON todo_delivery(user_id);`);
 const row=(user,id)=>db.prepare('SELECT * FROM todo_delivery WHERE user_id=? AND todo_id=?').get(user,id);
 const view=r=>r?{...JSON.parse(r.target),state:r.state==='sending'&&r.next_at<Date.now()?'checking':r.state==='reauthorize'?'blocked':r.state}:undefined;
 const current=(user,id)=>get(user,id);
 function decorate(user,todo){
  const delivery=todo&&view(row(user,todo.id));
  return delivery?{...todo,delivery}:todo;
 }
 function state(user,id,status,expected,attempt,nextAt=Date.now()){
  return db.prepare(`UPDATE todo_delivery SET state=?,next_at=? WHERE user_id=? AND todo_id=? AND state=?
    AND attempt IS ?`).run(status,nextAt,user,id,expected,attempt).changes>0;
 }
 return {
  enqueue(user,id,target){
   db.prepare("INSERT INTO todo_delivery VALUES(?,?,?,?,'queued',NULL,?)").run(id,user,target.provider,JSON.stringify(target),Date.now());
  },
  decorate,
  list(user){
   return db.prepare(`SELECT todos.data,delivery.target,delivery.state,delivery.next_at FROM todos
    LEFT JOIN todo_delivery AS delivery ON delivery.todo_id=todos.id AND delivery.user_id=todos.user_id
    WHERE todos.user_id=? ORDER BY todos.rowid`).all(user).map(row=>{
    const todo=JSON.parse(row.data);
    return row.target?{...todo,delivery:view(row)}:todo;
   });
  },
  pendingGoogle(){
   return db.prepare("SELECT * FROM todo_delivery WHERE provider='google' AND state='queued' AND next_at<=? ORDER BY next_at LIMIT 8").all(Date.now());
  },
  claim(user,id,provider){
   const attempt=randomUUID();
   const result=db.prepare("UPDATE todo_delivery SET state='sending',attempt=?,next_at=? WHERE user_id=? AND todo_id=? AND provider=? AND state='queued' AND next_at<=?")
    .run(attempt,Date.now()+120000,user,id,provider,Date.now());
   return result.changes?attempt:null;
  },
  block(job,status='blocked',delay=0){
   return state(job.user_id,job.todo_id,status,'queued',job.attempt,Date.now()+delay);
  },
  settle(user,id,attempt,status,delay=0){
   return state(user,id,status,'sending',attempt,Date.now()+delay);
  },
  resumeGoogle(user,connectionId){
   db.prepare(`UPDATE todo_delivery SET state='queued',next_at=? WHERE user_id=? AND provider='google'
    AND state='reauthorize' AND json_extract(target,'$.connectionId')=?`).run(Date.now(),user,connectionId);
  },
  retry(user,id){
   const result=db.prepare("UPDATE todo_delivery SET state='queued',next_at=? WHERE user_id=? AND todo_id=? AND state IN ('blocked','reauthorize')").run(Date.now(),user,id);
   if(!result.changes)throw fail(409,'다시 보낼 수 있는 할 일이 없어요.');
   return decorate(user,current(user,id));
  },
  status(user,id){return view(row(user,id));},
  appleReceipt(user,id,input){
   const job=row(user,id);
   if(job?.provider!=='apple-reminders'||job.attempt!==input?.attempt||!validId(input?.externalId))throw fail(409,'원본 미리 알림 저장 결과를 확인해주세요.');
   const {listId}=JSON.parse(job.target);
   if(input.listId!==listId)throw fail(409,'선택한 미리 알림 목록이 달라요.');
   return this.finish(user,id,job.attempt,{
    provider:'apple-reminders',externalId:input.externalId,listId,
    listTitle:typeof input.listTitle==='string'?input.listTitle.slice(0,200):'미리알림',
   });
  },
  finish(user,id,attempt,source){
   db.exec('BEGIN IMMEDIATE');
   try{
    const job=row(user,id),todo=current(user,id);
    if(!job||job.attempt!==attempt||!todo)throw fail(409,'전송할 할 일을 다시 확인해주세요.');
    if(job.state==='synced'){
     if(todo.source?.externalId!==source.externalId)throw fail(409,'원본 연결이 바뀌었어요.');
    }else{
     if(job.state!=='sending')throw fail(409,'전송 상태가 바뀌었어요.');
     const alias=db.prepare('SELECT todo_id FROM imported_resources WHERE user_id=? AND provider=? AND resource_key=?')
      .get(user,source.provider,source.externalId);
     if(alias&&alias.todo_id!==id&&current(user,alias.todo_id))throw fail(409,'이 원본은 이미 다른 도슨 할 일에 연결돼 있어요.');
     db.prepare('UPDATE todos SET data=? WHERE user_id=? AND id=?').run(JSON.stringify({...todo,source}),user,id);
     db.prepare('INSERT INTO imported_resources VALUES (?,?,?,?) ON CONFLICT(user_id,provider,resource_key) DO UPDATE SET todo_id=excluded.todo_id')
      .run(user,source.provider,source.externalId,id);
     state(user,id,'synced','sending',attempt);
    }
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   return decorate(user,current(user,id));
  },
 };
}
