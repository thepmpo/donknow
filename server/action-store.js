import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';
export function actionStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS assistant_actions(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,status TEXT NOT NULL,expires_at INTEGER NOT NULL,updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS assistant_actions_owner ON assistant_actions(user_id,updated_at);`);
 const publicRow=row=>{if(!row)return null;const p=box.open(row.payload);return {id:row.id,operation:p.operation,label:p.label,args:p.args,targetTitle:p.preview?.targetTitle??null,accountLabel:p.preview?.accountLabel??null,recipient:p.preview?.extra?.to??null,status:row.status,expiresAt:row.expires_at,updatedAt:row.updated_at,result:p.result??null};};
 function prune(){db.prepare('DELETE FROM assistant_actions WHERE updated_at<?').run(Date.now()-7*86400000);db.prepare("UPDATE assistant_actions SET status='unknown',updated_at=? WHERE status='running' AND updated_at<?").run(Date.now(),Date.now()-120000);}
 return {
  createAssistantAction(user,payload){prune();if(db.prepare("SELECT COUNT(*) AS n FROM assistant_actions WHERE user_id=? AND status='pending' AND expires_at>?").get(user,Date.now()).n>=40)throw fail(429,'대기 중인 작업을 먼저 정리해주세요.');const id=randomUUID(),now=Date.now();db.prepare('INSERT INTO assistant_actions VALUES(?,?,?,?,?,?)').run(id,user,box.seal(payload),'pending',now+10*60000,now);return this.assistantAction(user,id);},
  assistantAction(user,id){prune();return publicRow(db.prepare('SELECT * FROM assistant_actions WHERE id=? AND user_id=?').get(id,user));},
  assistantActions(user){prune();return db.prepare('SELECT * FROM assistant_actions WHERE user_id=? ORDER BY updated_at DESC LIMIT 40').all(user).map(publicRow);},
  claimAssistantAction(user,id){prune();const changed=db.prepare("UPDATE assistant_actions SET status='running',updated_at=? WHERE id=? AND user_id=? AND status='pending' AND expires_at>?").run(Date.now(),id,user,Date.now()).changes;if(!changed)return null;const row=db.prepare('SELECT * FROM assistant_actions WHERE id=? AND user_id=?').get(id,user);return box.open(row.payload);},
  finishAssistantAction(user,id,status,result){const row=db.prepare("SELECT * FROM assistant_actions WHERE id=? AND user_id=? AND status='running'").get(id,user);if(!row)return;const payload=box.open(row.payload);payload.result=result;db.prepare("UPDATE assistant_actions SET status=?,payload=?,updated_at=? WHERE id=? AND user_id=? AND status='running'").run(status,box.seal(payload),Date.now(),id,user);},
  cancelAssistantAction(user,id){return db.prepare("UPDATE assistant_actions SET status='cancelled',updated_at=? WHERE id=? AND user_id=? AND status='pending'").run(Date.now(),id,user).changes>0;},
  exportAssistantActions(user){prune();return db.prepare('SELECT * FROM assistant_actions WHERE user_id=? ORDER BY updated_at DESC').all(user).map(publicRow);},
 };
}
