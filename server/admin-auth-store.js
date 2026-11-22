import {randomBytes,randomInt,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {configuredAdminEmails} from './admin-routes.js';
import {fail} from './secrets.js';
const scrypt=promisify(scryptCallback),digest=v=>createHash('sha256').update(v).digest('hex'),lifetime=8*60*60*1000;
export function adminAuthStore(db,box,env){
 db.exec(`CREATE TABLE IF NOT EXISTS admin_accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT,salt TEXT,verified_at TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_operator_sessions(token_hash TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS admin_operator_session_account ON admin_operator_sessions(admin_id);
 CREATE TABLE IF NOT EXISTS admin_setup_codes(admin_id TEXT PRIMARY KEY REFERENCES admin_accounts(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL,requested_at INTEGER NOT NULL,delivery_id TEXT NOT NULL);`);
 for(const email of configuredAdminEmails(env))db.prepare('INSERT INTO admin_accounts(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING').run(randomUUID(),email,new Date().toISOString());
 const allowed=email=>configuredAdminEmails(env).includes(email);
 const account=email=>db.prepare('SELECT id,email,password_hash,salt,verified_at FROM admin_accounts WHERE email=?').get(email);
 const publicAdmin=r=>({id:r.id,email:r.email,emailVerified:!!r.verified_at,identity:'admin'});
 const tx=work=>{db.exec('BEGIN IMMEDIATE');try{const v=work();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 function session(row){const token=randomBytes(32).toString('base64url'),expiresAt=Date.now()+lifetime;db.prepare('DELETE FROM admin_operator_sessions WHERE expires_at<=?').run(Date.now());db.prepare('INSERT INTO admin_operator_sessions VALUES(?,?,?)').run(digest(token),row.id,expiresAt);return {user:publicAdmin(row),token,expiresAt};}
 return {
  adminSetupMail(email){
   if(!allowed(email))return null;const row=account(email);if(!row)return null;const now=Date.now(),old=db.prepare('SELECT requested_at FROM admin_setup_codes WHERE admin_id=?').get(row.id);if(old&&old.requested_at>now-60000)throw fail(429,'인증번호는 1분 후 다시 요청해주세요.');
   const code=String(randomInt(100000,1000000)),id=randomUUID();db.prepare('INSERT INTO admin_setup_codes VALUES(?,?,?,0,?,?) ON CONFLICT(admin_id) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,requested_at=excluded.requested_at,delivery_id=excluded.delivery_id').run(row.id,box.hash('admin-setup:'+row.id+':'+code),now+10*60000,now,id);
   return {id,adminId:row.id,message:{to:row.email,subject:'덕 어드민 전용 계정 인증번호',text:`덕 어드민 비밀번호 설정 인증번호: ${code}\n\n10분 안에 어드민 화면에 입력해주세요. 덕 앱 계정과는 별개의 관리자 전용 계정입니다. 본인이 요청하지 않았다면 이 메일을 무시해주세요.`}};
  },
  cancelAdminSetup(id){db.prepare('DELETE FROM admin_setup_codes WHERE delivery_id=?').run(id);},
  async finishAdminSetup(email,code,password){
   if(!allowed(email)||!/^\d{6}$/.test(code)||typeof password!=='string'||password.length<10||password.length>128)return null;
   const row=account(email);if(!row)return null;const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
   return tx(()=>{const pending=db.prepare('SELECT code_hash,expires_at,attempts FROM admin_setup_codes WHERE admin_id=?').get(row.id);if(!pending||pending.expires_at<=Date.now()||pending.attempts>=5)return null;db.prepare('UPDATE admin_setup_codes SET attempts=attempts+1 WHERE admin_id=?').run(row.id);
    if(!timingSafeEqual(Buffer.from(pending.code_hash,'hex'),Buffer.from(box.hash('admin-setup:'+row.id+':'+code),'hex')))return null;
    const verifiedAt=new Date().toISOString();db.prepare('UPDATE admin_accounts SET password_hash=?,salt=?,verified_at=? WHERE id=?').run(hash,salt,verifiedAt,row.id);db.prepare('DELETE FROM admin_setup_codes WHERE admin_id=?').run(row.id);db.prepare('DELETE FROM admin_operator_sessions WHERE admin_id=?').run(row.id);return session({...row,verified_at:verifiedAt});});
  },
  async adminLogin(email,password){const row=allowed(email)?account(email):null;const supplied=await scrypt(typeof password==='string'?password:'',row?.salt??'admin-nonexistent-account',64),expected=row?.password_hash?Buffer.from(row.password_hash,'hex'):Buffer.alloc(64);return timingSafeEqual(supplied,expected)&&row?.verified_at&&allowed(email)?session(row):null;},
  adminSession(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;const row=db.prepare('SELECT a.id,a.email,a.verified_at,s.expires_at FROM admin_operator_sessions s JOIN admin_accounts a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now());return row?.verified_at&&allowed(row.email)?{user:publicAdmin(row),expiresAt:row.expires_at}:null;},
  adminLogout(token){if(typeof token==='string'&&token.length===43)db.prepare('DELETE FROM admin_operator_sessions WHERE token_hash=?').run(digest(token));}
 };
}
