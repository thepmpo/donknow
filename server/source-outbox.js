import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';

/** Provider writes have a durable ledger independent of request lifetime. An
 * action ID is committed before confirmation, so a crashed worker reads its
 * receipt rather than repeating an uncertain external write. */
export function sourceOutbox(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS source_edit_outbox(
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  todo_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,revision INTEGER NOT NULL,
  payload TEXT NOT NULL,status TEXT NOT NULL,action_id TEXT,lease TEXT,lease_until INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,
  UNIQUE(todo_id,revision));
  CREATE INDEX IF NOT EXISTS source_edit_due ON source_edit_outbox(status,created_at);`);
 let maintenanceAt=0;
 const row=r=>r?{id:r.id,userId:r.user_id,todoId:r.todo_id,revision:r.revision,payload:box.open(r.payload),status:r.status,actionId:r.action_id,lease:r.lease,leaseUntil:r.lease_until}:null;
 function transaction(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}}
 return {
  queueSourceEdit(user,before,patch,pending){return transaction(()=>{
   const current=db.prepare('SELECT data FROM todos WHERE user_id=? AND id=?').get(user,before.id);
   if(!current||current.data!==JSON.stringify(before))throw fail(409,'다른 변경이 있어 저장하지 않았어요. 목록을 새로 확인해주세요.');
   const ledger=db.prepare("SELECT COALESCE(MAX(revision),0) AS revision,MAX(CASE WHEN status='unknown' THEN 1 ELSE 0 END) AS uncertain FROM source_edit_outbox WHERE user_id=? AND todo_id=?").get(user,before.id);
   const revision=Math.max(before.sourceSync?.revision??0,ledger.revision)+1,now=Date.now(),next={...before,...patch,...('done' in patch?{completedAt:patch.done?(before.done&&before.completedAt?before.completedAt:new Date().toISOString()):null}:{}),sourceSync:{state:ledger.uncertain?'unknown':'queued',revision,at:now,patch:pending}};
   db.prepare('UPDATE todos SET data=? WHERE user_id=? AND id=?').run(JSON.stringify(next),user,before.id);
   // Only unclaimed jobs are coalesced. Running/uncertain writes retain receipts.
   db.prepare("UPDATE source_edit_outbox SET status='superseded' WHERE user_id=? AND todo_id=? AND status='queued'").run(user,before.id);
   db.prepare('INSERT INTO source_edit_outbox(id,user_id,todo_id,revision,payload,status,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(),user,before.id,revision,box.seal({todo:{id:next.id,title:next.title,dueDate:next.dueDate,dueTime:next.dueTime,source:next.source},patch:pending}),'queued',now);
   return next;
  });},
  claimSourceEdit(now=Date.now()){if(now-maintenanceAt>3600000){db.prepare("DELETE FROM source_edit_outbox WHERE status IN('succeeded','failed','superseded','cancelled') AND created_at<?").run(now-7*86400000);maintenanceAt=now;}return transaction(()=>{
   const found=db.prepare(`SELECT * FROM source_edit_outbox job WHERE (job.status='queued' OR (job.status='running' AND job.lease_until<?))
    AND NOT EXISTS(SELECT 1 FROM source_edit_outbox prior WHERE prior.todo_id=job.todo_id AND prior.revision<job.revision AND prior.status IN('running','unknown'))
    ORDER BY job.created_at,job.revision LIMIT 1`).get(now);
   if(!found)return null;const lease=randomUUID(),until=now+300000;
   db.prepare("UPDATE source_edit_outbox SET status='running',lease=?,lease_until=? WHERE id=?").run(lease,until,found.id);return row({...found,status:'running',lease,lease_until:until});
  });},
  sourceEditCurrent(job){return !!db.prepare("SELECT 1 FROM source_edit_outbox WHERE id=? AND user_id=? AND lease=? AND status='running' AND lease_until>?").get(job.id,job.userId,job.lease,Date.now());},
  sourceEditAction(job,id){if(db.prepare("UPDATE source_edit_outbox SET action_id=? WHERE id=? AND user_id=? AND lease=? AND status='running'").run(id,job.id,job.userId,job.lease).changes!==1)throw fail(409,'이 원본 작업이 중지됐어요.');},
  finishSourceEdit(job,status,limited=false){return transaction(()=>{
   const result=db.prepare("UPDATE source_edit_outbox SET status=?,lease=NULL,lease_until=0 WHERE id=? AND user_id=? AND lease=? AND status='running'").run(status,job.id,job.userId,job.lease);
   if(!result.changes)return null;
   const current=db.prepare('SELECT data FROM todos WHERE id=? AND user_id=?').get(job.todoId,job.userId);if(!current)return null;const todo=JSON.parse(current.data);
   if(todo.sourceSync?.revision===job.revision)todo.sourceSync=status==='succeeded'&&!limited?{state:'succeeded',revision:job.revision}:limited?{state:'failed',revision:job.revision,at:Date.now(),patch:{done:job.payload.patch.done},reason:'completion-unsupported'}:{...todo.sourceSync,state:status==='unknown'?'unknown':'failed',at:Date.now()};
   else if(status==='unknown'&&todo.sourceSync)todo.sourceSync={...todo.sourceSync,state:'unknown',at:Date.now()};
   db.prepare('UPDATE todos SET data=? WHERE id=? AND user_id=?').run(JSON.stringify(todo),job.todoId,job.userId);return todo;
  });}
 };
}
