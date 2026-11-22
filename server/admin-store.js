import {randomUUID} from 'node:crypto';
import {accountAccess} from './plans.js';
import {memberAccess,accessFromRecord} from './account-policy.js';
import {adminOperations} from './admin-operations.js';
import {fail} from './secrets.js';

// Metadata only: never select password/session material, encrypted payloads or user content.
export function adminStore(db){
 db.exec(`CREATE TABLE IF NOT EXISTS admin_access_log(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,operation TEXT NOT NULL,subject_id TEXT REFERENCES users(id) ON DELETE SET NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS admin_access_created ON admin_access_log(created_at);
 CREATE TABLE IF NOT EXISTS admin_operator_access_log(id TEXT PRIMARY KEY,actor_id TEXT REFERENCES admin_accounts(id) ON DELETE SET NULL,operation TEXT NOT NULL,subject_id TEXT REFERENCES users(id) ON DELETE SET NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS admin_operator_access_created ON admin_operator_access_log(created_at);`);
 const operations=adminOperations(db);
 const toMember=row=>{const control=row.account_version!==undefined?{status:row.account_status??'active',version:row.account_version??0}:operations.adminControl(row.id);return ({id:row.id,email:row.email,joinedAt:row.created_at,emailVerified:!!row.email_verified_at,status:control.status,version:control.version,access:row.pass_history!==undefined?accessFromRecord(row):memberAccess(db,row.id)});};
 const member=id=>{if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw fail(404,'회원을 찾을 수 없어요.');const row=db.prepare('SELECT id,email,created_at,email_verified_at FROM users WHERE id=?').get(id);if(!row)throw fail(404,'회원을 찾을 수 없어요.');return toMember(row);};
 return {
  ...operations,
  adminMembers({query='',offset=0}={}){
   if(typeof query!=='string'||query.length>100||!Number.isSafeInteger(offset)||offset<0||offset>1000000)throw fail(400,'검색 범위를 확인해주세요.');
   query=query.trim().toLowerCase();const match='%'+query.replace(/[\\%_]/g,v=>'\\'+v)+'%',where="WHERE lower(u.email) LIKE ? ESCAPE '\\' OR lower(u.id) LIKE ? ESCAPE '\\'";
   const total=db.prepare('SELECT COUNT(*) AS count FROM users u '+where).get(match,match).count;
   const rows=db.prepare('SELECT u.id,u.email,u.created_at,u.email_verified_at,c.status AS account_status,c.version AS account_version,(SELECT json_object(\'plan\',e.plan,\'endsAt\',e.ends_at) FROM account_entitlements e WHERE e.user_id=u.id AND e.revoked_at IS NULL AND e.starts_at<=? AND (e.ends_at IS NULL OR e.ends_at>?) ORDER BY e.created_at DESC,e.id DESC LIMIT 1) AS active_pass,EXISTS(SELECT 1 FROM account_entitlements e WHERE e.user_id=u.id) AS pass_history FROM users u LEFT JOIN account_controls c ON c.user_id=u.id '+where+' ORDER BY u.created_at DESC,u.id LIMIT 25 OFFSET ?').all(new Date().toISOString(),new Date().toISOString(),match,match,offset);
   return {items:rows.map(toMember),total,offset,nextOffset:offset+rows.length<total?offset+rows.length:null};
  },
  adminOverview(){const month=new Date().toISOString().slice(0,7);return {members:db.prepare('SELECT COUNT(*) AS total,SUM(CASE WHEN email_verified_at IS NOT NULL THEN 1 ELSE 0 END) AS verified FROM users').get(),connections:db.prepare('SELECT COUNT(*) AS total FROM integrations').get().total,agentTurns:db.prepare('SELECT COALESCE(SUM(turns),0) AS total FROM agent_usage WHERE substr(day,1,7)=?').get(month).total,period:month,access:accountAccess(),billing:{available:false,reason:'payment-integration-not-configured'}};},
  adminMember(id){
   const current=member(id),month=new Date().toISOString().slice(0,7);
   const counts=db.prepare("SELECT COUNT(*) AS total,COALESCE(SUM(CASE WHEN json_extract(data,'$.done')=1 THEN 1 ELSE 0 END),0) AS completed FROM todos WHERE user_id=?").get(id);
   const connections=operations.adminConnectionRows(id).map(c=>({...c,lastSyncAt:null}));
   const source=db.prepare('SELECT status,COUNT(*) AS count FROM source_edit_outbox WHERE user_id=? GROUP BY status').all(id),tasks=db.prepare('SELECT status,COUNT(*) AS count FROM task_sync WHERE user_id=? GROUP BY status').all(id);
   const budget=db.prepare('SELECT (SELECT COALESCE(SUM(credit_milli),0) FROM ai_funding WHERE user_id=? AND period=?) AS funded,(SELECT COALESCE(SUM(amount_milli),0) FROM ai_costs WHERE user_id=? AND period=?) AS used,(SELECT COALESCE(SUM(turns),0) FROM agent_usage WHERE user_id=? AND substr(day,1,7)=?) AS turns').get(id,month,id,month,id,month);
   return {...current,signupAgreements:db.prepare('SELECT terms_version AS termsVersion,privacy_version AS privacyVersion,accepted_at AS acceptedAt,client FROM signup_agreements WHERE user_id=?').get(id)??null,todos:counts,control:operations.adminControl(id),entitlements:operations.adminPasses(id).length?operations.adminPasses(id):[{id:'current-access-policy',plan:current.access.plan,mode:current.access.mode,status:'active',source:'current-policy',startsAt:null,endsAt:null}],jobs:operations.adminSyncJobs(id),billing:{available:false,items:[],reason:'payment-integration-not-configured'},connections,sync:{source:source.map(r=>({status:r.status,count:r.count})),tasks:tasks.map(r=>({status:r.status,count:r.count}))},usage:{period:month,agentTurns:budget.turns,limitKrw:budget.funded/1000,usedAndReservedKrw:budget.used/1000,remainingKrw:Math.max(0,budget.funded-budget.used)/1000}};
  },
  adminAudit(){return {changes:operations.adminOperationHistory(),items:db.prepare("SELECT a.id,a.operation,a.subject_id AS subjectId,a.created_at AS createdAt,u.email AS actorEmail,'admin' AS identity FROM admin_operator_access_log a LEFT JOIN admin_accounts u ON u.id=a.actor_id UNION ALL SELECT a.id,a.operation,a.subject_id AS subjectId,a.created_at AS createdAt,u.email AS actorEmail,'legacy-duck' AS identity FROM admin_access_log a LEFT JOIN users u ON u.id=a.actor_id ORDER BY 4 DESC,1 LIMIT 50").all()};},
  recordAdminAccess(actor,operation,subjectId=null){if(!['session','overview','members','member','audit','operators'].includes(operation))throw fail(400,'잘못된 운영 조회예요.');db.prepare('INSERT INTO admin_operator_access_log VALUES (?,?,?,?,?)').run(randomUUID(),actor,operation,subjectId,Date.now());}
 };
}
