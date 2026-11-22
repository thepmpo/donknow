import {randomBytes,randomInt,randomUUID,createHash,scrypt as scryptCallback,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import {configuredAdminEmails} from './admin-routes.js';
import {fail} from './secrets.js';
import {adminPermissions} from './admin-operations.js';
const scrypt=promisify(scryptCallback),digest=v=>createHash('sha256').update(v).digest('hex'),lifetime=8*60*60*1000;
export async function adminAuthStore(db,box,env){
 db.exec(`CREATE TABLE IF NOT EXISTS admin_accounts(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT,salt TEXT,verified_at TEXT,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS admin_operator_sessions(token_hash TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,expires_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS admin_operator_session_account ON admin_operator_sessions(admin_id);
 CREATE TABLE IF NOT EXISTS admin_setup_codes(admin_id TEXT PRIMARY KEY REFERENCES admin_accounts(id) ON DELETE CASCADE,code_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,attempts INTEGER NOT NULL,requested_at INTEGER NOT NULL,delivery_id TEXT NOT NULL);`);
 const columns=db.prepare('PRAGMA table_info(admin_accounts)').all();if(!columns.some(c=>c.name==='must_change_password'))db.exec('ALTER TABLE admin_accounts ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');if(!columns.some(c=>c.name==='owner_activated_at'))db.exec('ALTER TABLE admin_accounts ADD COLUMN owner_activated_at TEXT');
 if(!columns.some(c=>c.name==='role'))db.exec("ALTER TABLE admin_accounts ADD COLUMN role TEXT NOT NULL DEFAULT 'reader'");if(!columns.some(c=>c.name==='disabled'))db.exec('ALTER TABLE admin_accounts ADD COLUMN disabled INTEGER NOT NULL DEFAULT 0');if(!columns.some(c=>c.name==='version'))db.exec('ALTER TABLE admin_accounts ADD COLUMN version INTEGER NOT NULL DEFAULT 0');
 if(!columns.some(c=>c.name==='managed'))db.exec('ALTER TABLE admin_accounts ADD COLUMN managed INTEGER NOT NULL DEFAULT 0');
 const emails=configuredAdminEmails(env);
 for(const email of emails)db.prepare('INSERT INTO admin_accounts(id,email,created_at) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING').run(randomUUID(),email,new Date().toISOString());
 // Explicit operator-provided one-time initialization; never reset a changed password on restart.
 const initial=env.DUCK_ADMIN_INITIAL_PASSWORD;
 if(emails.length===1&&typeof initial==='string'&&initial.length>=8&&initial.length<=128){
  const pending=db.prepare('SELECT id,owner_activated_at FROM admin_accounts WHERE email=?').get(emails[0]);
  if(pending&&!pending.owner_activated_at){const salt=randomBytes(16).toString('hex'),hash=(await scrypt(initial,salt,64)).toString('hex');const updated=db.prepare('UPDATE admin_accounts SET password_hash=?,salt=?,owner_activated_at=?,must_change_password=1 WHERE id=? AND owner_activated_at IS NULL').run(hash,salt,new Date().toISOString(),pending.id);if(updated.changes){db.prepare('DELETE FROM admin_setup_codes WHERE admin_id=?').run(pending.id);db.prepare('DELETE FROM admin_operator_sessions WHERE admin_id=?').run(pending.id);console.info(JSON.stringify({event:'admin-owner-bootstrap',initialized:true,passwordChangeRequired:true}));}}
 }
 const allowed=email=>{const a=db.prepare('SELECT role,disabled,managed FROM admin_accounts WHERE email=?').get(email);return !!a&&!a.disabled&&(configuredAdminEmails(env).includes(email)||a.managed===1&&['operator','reader'].includes(a.role));};
 const account=email=>db.prepare('SELECT id,email,password_hash,salt,verified_at,owner_activated_at,must_change_password,role,disabled,version,managed FROM admin_accounts WHERE email=?').get(email);
 const publicAdmin=r=>({id:r.id,email:r.email,emailVerified:!!r.verified_at,activated:!!(r.verified_at||r.owner_activated_at),mustChangePassword:!!r.must_change_password,identity:'admin',managedAdmin:configuredAdminEmails(env).includes(r.email)||r.managed===1,role:configuredAdminEmails(env).includes(r.email)?'owner':r.role,permissions:adminPermissions(configuredAdminEmails(env).includes(r.email)?'owner':r.role)});
 const tx=work=>{db.exec('BEGIN IMMEDIATE');try{const v=work();db.exec('COMMIT');return v;}catch(e){db.exec('ROLLBACK');throw e;}};
 function session(row){const token=randomBytes(32).toString('base64url'),expiresAt=Date.now()+(row.must_change_password?10*60*1000:lifetime);db.prepare('DELETE FROM admin_operator_sessions WHERE expires_at<=?').run(Date.now());db.prepare('INSERT INTO admin_operator_sessions VALUES(?,?,?)').run(digest(token),row.id,expiresAt);return {user:publicAdmin(row),token,expiresAt};}
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
    const verifiedAt=new Date().toISOString();db.prepare('UPDATE admin_accounts SET password_hash=?,salt=?,verified_at=?,must_change_password=0 WHERE id=?').run(hash,salt,verifiedAt,row.id);db.prepare('DELETE FROM admin_setup_codes WHERE admin_id=?').run(row.id);db.prepare('DELETE FROM admin_operator_sessions WHERE admin_id=?').run(row.id);return session({...row,verified_at:verifiedAt,must_change_password:0});});
  },
  async adminLogin(email,password){const row=allowed(email)?account(email):null;const supplied=await scrypt(typeof password==='string'?password:'',row?.salt??'admin-nonexistent-account',64),expected=row?.password_hash?Buffer.from(row.password_hash,'hex'):Buffer.alloc(64);return timingSafeEqual(supplied,expected)&&(row?.verified_at||row?.owner_activated_at)&&allowed(email)&&account(email)?.password_hash===row.password_hash?session(row):null;},
  adminSession(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return null;const row=db.prepare('SELECT a.id,a.email,a.verified_at,a.owner_activated_at,a.must_change_password,a.role,a.disabled,a.version,a.managed,s.expires_at FROM admin_operator_sessions s JOIN admin_accounts a ON a.id=s.admin_id WHERE s.token_hash=? AND s.expires_at>?').get(digest(token),Date.now());return (row?.verified_at||row?.owner_activated_at)&&allowed(row.email)?{user:publicAdmin(row),expiresAt:row.expires_at}:null;},
  async changeRequiredAdminPassword(token,password,currentPassword){
   const active=this.adminSession(token);if(!active)throw fail(403,'비밀번호 변경 로그인을 다시 확인해주세요.');if(!active.user.mustChangePassword){const confirmed=account(active.user.email),candidate=await scrypt(typeof currentPassword==='string'?currentPassword:'',confirmed.salt,64);if(!timingSafeEqual(candidate,Buffer.from(confirmed.password_hash,'hex')))throw fail(403,'현재 비밀번호를 확인해주세요.');}if(typeof password!=='string'||password.length<10||password.length>128)throw fail(400,'새 비밀번호는 10~128자로 입력해주세요.');
   const row=account(active.user.email),same=await scrypt(password,row.salt,64);if(timingSafeEqual(same,Buffer.from(row.password_hash,'hex')))throw fail(400,'임시 비밀번호와 다른 새 비밀번호를 입력해주세요.');
   const salt=randomBytes(16).toString('hex'),hash=(await scrypt(password,salt,64)).toString('hex');
   return tx(()=>{const current=this.adminSession(token);if(!current||current.user.mustChangePassword!==active.user.mustChangePassword)throw fail(409,'로그인 상태가 바뀌었어요. 다시 로그인해주세요.');const updated=db.prepare('UPDATE admin_accounts SET password_hash=?,salt=?,must_change_password=0,version=version+1 WHERE id=? AND password_hash=?').run(hash,salt,row.id,row.password_hash);if(!updated.changes)throw fail(409,'비밀번호가 이미 변경됐어요. 다시 로그인해주세요.');db.prepare('DELETE FROM admin_operator_sessions WHERE admin_id=?').run(row.id);db.prepare('DELETE FROM admin_setup_codes WHERE admin_id=?').run(row.id);db.prepare('INSERT INTO admin_operations VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(),row.id,'operator.password.change',null,'관리자 본인 비밀번호 변경',JSON.stringify({mustChangePassword:active.user.mustChangePassword}),JSON.stringify({mustChangePassword:false}),Date.now());return session({...row,password_hash:hash,salt,must_change_password:0});});
  },
  adminOperators(){return {items:db.prepare('SELECT id,email,role,disabled,version,must_change_password,created_at FROM admin_accounts ORDER BY created_at,id').all().map(r=>({id:r.id,email:r.email,role:configuredAdminEmails(env).includes(r.email)?'owner':r.role,protected:configuredAdminEmails(env).includes(r.email),disabled:!!r.disabled,version:r.version,mustChangePassword:!!r.must_change_password,createdAt:r.created_at}))};},
  async adminSaveOperator(actor,id,input){
   if(actor.role!=='owner')throw fail(403,'총관리자만 운영자 권한을 관리할 수 있어요.');
   const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
   if(!id&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)||!['operator','reader'].includes(input.role)||typeof input.disabled!=='boolean')throw fail(400,'운영자 이메일과 권한을 확인해주세요.');
   const existing=id?db.prepare('SELECT id,email,version,role,disabled FROM admin_accounts WHERE id=?').get(id):null;if(id&&!existing)throw fail(404,'운영자를 찾지 못했어요.');if(existing&&(configuredAdminEmails(env).includes(existing.email)||existing.id===actor.id))throw fail(409,'총관리자 본인의 권한은 이 화면에서 변경할 수 없어요.');
   const password=input.temporaryPassword;let salt,hash;if(!existing||password){if(typeof password!=='string'||password.length<10||password.length>128)throw fail(400,'운영자 초기 비밀번호는 10~128자로 입력해주세요.');salt=randomBytes(16).toString('hex');hash=(await scrypt(password,salt,64)).toString('hex');}
   // Re-check the caller after password hashing so a revoked/changed role cannot finish a stale write.
   const fresh=this.adminSession(input.sessionToken);if(!fresh||fresh.user.id!==actor.id||fresh.user.role!=='owner'||fresh.user.mustChangePassword)throw fail(403,'총관리자 로그인을 다시 확인해주세요.');
   return this.adminOperate(actor,existing?'operator.update':'operator.create',null,input,'operators.write',()=>{
    const target=existing?.id??randomUUID();
    if(existing){const latest=db.prepare('SELECT version FROM admin_accounts WHERE id=?').get(target);if(latest?.version!==input.version)throw fail(409,'운영자 정보가 바뀌었어요. 다시 확인해주세요.');db.prepare('UPDATE admin_accounts SET role=?,disabled=?,version=version+1 WHERE id=?').run(input.role,Number(input.disabled),target);}
    else {if(account(email))throw fail(409,'이미 등록된 관리자 이메일이에요.');db.prepare('INSERT INTO admin_accounts(id,email,role,disabled,created_at,managed) VALUES(?,?,?,?,?,1)').run(target,email,input.role,Number(input.disabled),new Date().toISOString());}
    if(hash)db.prepare('UPDATE admin_accounts SET password_hash=?,salt=?,owner_activated_at=?,must_change_password=1,version=version+1 WHERE id=?').run(hash,salt,new Date().toISOString(),target);
    db.prepare('DELETE FROM admin_operator_sessions WHERE admin_id=?').run(target);db.prepare('DELETE FROM admin_setup_codes WHERE admin_id=?').run(target);return {operatorId:target,email:existing?.email??email,role:input.role,disabled:input.disabled,passwordReset:!!hash,previous:existing?{role:existing.role,disabled:!!existing.disabled}:null};
   });
  },
  adminLogout(token){if(typeof token==='string'&&token.length===43)db.prepare('DELETE FROM admin_operator_sessions WHERE token_hash=?').run(digest(token));}
 };
}
