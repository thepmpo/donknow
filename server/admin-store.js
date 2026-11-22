import {randomUUID} from 'node:crypto';
import {accountAccess} from './plans.js';
import {fail} from './secrets.js';

// Metadata only: never select password/session material, encrypted payloads or user content.
export function adminStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS admin_access_log(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,operation TEXT NOT NULL,subject_id TEXT REFERENCES users(id) ON DELETE SET NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS admin_access_created ON admin_access_log(created_at);`);
 const toMember=row=>({id:row.id,email:row.email,joinedAt:row.created_at,emailVerified:!!row.email_verified_at,status:row.email_verified_at?'verified':'unverified',access:accountAccess()});
 const member=id=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw fail(404,'회원을 찾을 수 없어요.');const row=db.prepare('SELECT id,email,created_at,email_verified_at FROM users WHERE id=?').get(id);if(!row)throw fail(404,'회원을 찾을 수 없어요.');return toMember(row);};
 return {
  adminMembers({query='',offset=0}={}){
   if(typeof query!=='string'||query.length>100||!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw fail(400,'검색 범위를 확인해주세요.');
   query=query.trim().toLowerCase();const match='%'+query.replace(/[\\%_]/g,v=>'\\'+v)+'%',where="WHERE lower(email) LIKE ? ESCAPE '\\' OR lower(id) LIKE ? ESCAPE '\\'";
   const total=db.prepare('SELECT COUNT(*) AS count FROM users '+where).get(match,match).count;
   const rows=db.prepare('SELECT id,email,created_at,email_verified_at FROM users '+where+' ORDER BY created_at DESC,id LIMIT 25 OFFSET ?').all(match,match,offset);
   return {items:rows.map(toMember),total,offset,nextOffset:offset+rows.length<total?offset+rows.length:null};
  },
  adminOverview(){const month=new Date().toISOString().slice(0,7);return {members:db.prepare('SELECT COUNT(*) AS total,SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified FROM users').get(),connections:db.prepare('SELECT COUNT(*) AS total FROM integrations').get().total,agentTurns:db.prepare('SELECT COALESCE(SUM(turns),0) AS total FROM agent_usage WHERE substr(day,1,7)=?').get(month).total,period:month,access:accountAccess(),billing:{available:false,reason:'payment-integration-not-configured'}};},
  adminMember(id){
   const current=member(id),month=new Date().toISOString().slice(0,7);
   const counts=db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN json_extract(data,'$.done')=1 THEN 1 ELSE 0 END),0) AS completed FROM todos WHERE user_id=?").get(id);
   const connections=db.prepare('SELECT provider,label,updated_at FROM integrations WHERE user_id=? ORDER BY provider LIMIT 50').all(id).map(row=>({provider:row.provider.startsWith('google:')?'google':row.provider,label:row.label,updatedAt:row.updated_at,state:'saved',lastSyncAt:null}));
   const source=db.prepare('SELECT status,COUNT(*) AS count FROM source_edit_outbox WHERE user_id=? GROUP BY status').all(id),tasks=db.prepare('SELECT status,COUNT(*) AS count FROM task_sync WHERE user_id=? GROUP BY status').all(id);
   const budget=db.prepare('SELECT (SELECT COALESCE(SUM(credit_milli),0) FROM ai_funding WHERE user_id=? AND period=?) AS funded,(SELECT COALESCE(SUM(amount_milli),0) FROM ai_costs WHERE user_id=? AND period=?) AS used,(SELECT COALESCE(SUM(turns),0) FROM agent_usage WHERE user_id=? AND substr(day,1,7)=?) AS turns').get(id,month,id,month,id,month);
   return {...current,todos:counts,entitlements:[{id:'current-access-policy',plan:current.access.plan,mode:current.access.mode,status:'active',source:'current-policy',startsAt:null,endsAt:null}],billing:{available:false,items:[],reason:'payment-integration-not-configured'},connections,sync:{source:source.map(r=>({status:r.status,count:r.count})),tasks:tasks.map(r=>({status:r.status,count:r.count}))},usage:{period:month,agentTurns:budget.turns,limitKrw:budget.funded/1000,usedAndReservedKrw:budget.used/1000,remainingKrw:Math.max(0,budget.funded-budget.used)/1000}};
  },
  adminAudit(){return {items:db.prepare('SELECT a.id,a.operation,a.subject_id AS subjectId,a.created_at AS createdAt,u.email AS actorEmail FROM admin_access_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC,a.id LIMIT 50').all()};},
  recordAdminAccess(actor,operation,subjectId=null){if(!['session','overview','members','member','audit'].includes(operation))throw fail(400,'잘못된 운영 조회예요.');db.prepare('INSERT INTO admin_access_log VALUES (?,?,?,?,?)').run(randomUUID(),actor,operation,subjectId,Date.now());}
 };
}
