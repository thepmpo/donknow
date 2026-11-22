import {accountAccess} from './plans.js';
export function accountPolicySchema(db){db.exec(`CREATE TABLE IF NOT EXISTS account_controls(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,status TEXT NOT NULL DEFAULT 'active',reason TEXT NOT NULL DEFAULT '',version INTEGER NOT NULL DEFAULT 0,updated_at TEXT);
CREATE TABLE IF NOT EXISTS account_entitlements(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,plan TEXT NOT NULL,starts_at TEXT NOT NULL,ends_at TEXT,revoked_at TEXT,reason TEXT NOT NULL,created_at TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1);
CREATE INDEX IF NOT EXISTS account_entitlements_user ON account_entitlements(user_id,created_at);
CREATE VIEW IF NOT EXISTS active_users AS SELECT u.* FROM users u WHERE NOT EXISTS(SELECT 1 FROM account_controls c WHERE c.user_id=u.id AND c.status='suspended');`);}
export const accountActive=(db,id)=>!db.prepare("SELECT 1 FROM account_controls WHERE user_id=? AND status='suspended'").get(id);
export function memberAccess(db,id,now=new Date().toISOString()){
 if(typeof id!=='string'||!id)return accountAccess();
 const row=db.prepare("SELECT (SELECT json_object('plan',plan,'endsAt',ends_at) FROM account_entitlements WHERE user_id=? AND revoked_at IS NULL AND starts_at<=? AND (ends_at IS NULL OR ends_at>?) ORDER BY created_at DESC,id DESC LIMIT 1) AS active_pass,EXISTS(SELECT 1 FROM account_entitlements WHERE user_id=?) AS pass_history").get(id,now,now,id);
 return accessFromRecord(row);
}
export function accessFromRecord(row){if(!row.pass_history)return accountAccess();const active=row.active_pass?JSON.parse(row.active_pass):null,plan=active?.plan??'free';return {plan,mode:'manual',chat:plan!=='free',createFromSources:plan!=='free',automaticBilling:false,endsAt:active?.endsAt??null};}
