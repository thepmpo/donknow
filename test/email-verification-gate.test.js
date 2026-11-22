import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {apiHarness} from '../test-support/api.js';
const codeOf=mail=>/인증번호: (\d{6})/.exec(mail.text)[1];
test('signup automatically mails a code and denies all member APIs until mailbox ownership is proven',async()=>{
 const h=await apiHarness();try{
  const a=await h.register('gate@example.test');assert.equal(a.user.emailVerified,false);assert.equal(a.verification.required,true);assert.equal(a.verification.queued,true);
  const mail=await h.mail(a.user.email,'이메일 인증'),code=codeOf(mail);
  for(const [path,method,body] of [['/api/todos','GET'],['/api/todos','POST',{title:'blocked'}],['/api/calendar/events?month=2026-11','GET'],['/api/integrations','GET'],['/api/assistant/chat','POST',{message:'blocked'}],['/api/account/export','GET'],['/api/agent/profile','GET'],['/api/account','DELETE',{password:'fixture-password-123',confirmation:'DELETE'}]]){const r=await h.request(path,method,body,a.token);assert.equal(r.status,403,path);assert.equal(r.data.code,'EMAIL_VERIFICATION_REQUIRED');}
  assert.equal((await h.request('/api/auth/session','GET',undefined,a.token)).data.user.emailVerified,false);assert.equal((await h.request('/api/account/verification/send','POST',{},a.token)).status,429);
  const other=await h.register('other-gate@example.test');const otherCode=codeOf(await h.mail(other.user.email,'이메일 인증'));
  if(code!==otherCode)assert.equal((await h.request('/api/account/verification/confirm','POST',{code:otherCode},a.token)).status,400);
  assert.equal((await h.request('/api/account/verification/confirm','POST',{code:'wrong'},a.token)).status,400);
  assert.equal((await h.request('/api/account/verification/confirm','POST',{code},a.token)).status,200);assert.equal((await h.request('/api/todos','POST',{title:'verified task'},a.token)).status,201);
  assert.equal((await h.request('/api/account/verification/confirm','POST',{code},a.token)).status,400);
  // A previously issued unverified web cookie has exactly the same server gate.
  const web=await fetch(h.baseUrl+'/api/todos',{headers:{Cookie:'duckduck_session='+other.token}});assert.equal(web.status,403);
  const db=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{assert.equal(db.prepare('SELECT COUNT(*) AS n FROM todos WHERE user_id=?').get(other.user.id).n,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM automation_schedules WHERE user_id=?').get(other.user.id).n,0);}finally{db.close();}
 }finally{await h.close();}
});
test('resend invalidates the previous code; expired codes and failed delivery never grant access',async()=>{
 const h=await apiHarness();try{
  const a=await h.register('resend-gate@example.test'),old=codeOf(await h.mail(a.user.email,'이메일 인증'));
  const db=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{db.prepare('UPDATE mail_outbox SET created_at=created_at-61000 WHERE user_id=?').run(a.user.id);}finally{db.close();}
  assert.equal((await h.request('/api/account/verification/send','POST',{},a.token)).status,202);
  let current;for(let i=0;i<100&&!current;i++){const files=await readdir(join(h.dir,'mail'));for(const name of files.filter(n=>n.endsWith('.json'))){const mail=JSON.parse(await readFile(join(h.dir,'mail',name),'utf8'));if(mail.to===a.user.email&&codeOf(mail)!==old)current=codeOf(mail);}if(!current)await new Promise(r=>setTimeout(r,20));}assert.ok(current);assert.equal((await h.request('/api/account/verification/confirm','POST',{code:old},a.token)).status,400,'resend invalidates previous code before expiry');
  const inspect=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{inspect.prepare('UPDATE account_actions SET expires_at=0 WHERE user_id=?').run(a.user.id);}finally{inspect.close();}
  assert.equal((await h.request('/api/account/verification/confirm','POST',{code:current},a.token)).status,400);assert.equal((await h.request('/api/todos','GET',undefined,a.token)).status,403);
  const login=await h.request('/api/auth/login','POST',{email:a.user.email,password:'fixture-password-123'});assert.equal(login.status,200);assert.equal(login.data.verification.required,true);assert.equal((await h.request('/api/todos','GET',undefined,login.data.token)).status,403);
  assert.equal((await h.request('/api/auth/logout','POST',{},a.token)).status,200);
 }finally{await h.close();}
 const failed=await apiHarness({MAIL_TRANSPORT:'',MAIL_API_KEY:'fixture-only',MAIL_FROM:'duck@resend.dev',NODE_OPTIONS:'--import='+new URL('../test-support/mail-rejected-fixture.mjs',import.meta.url).href});try{
  const a=await failed.register('rejected@example.test');let status;for(let i=0;i<40;i++){status=(await failed.request('/api/account','GET',undefined,a.token)).data.mailStatus;if(status?.status==='failed')break;await new Promise(r=>setTimeout(r,20));}assert.equal(status.status,'failed');assert.match(status.error,/발신 도메인/);assert.equal(JSON.stringify(status).includes('fixture-only'),false);
  const db=new DatabaseSync(join(failed.dir,'duckduck.sqlite'));try{assert.equal(db.prepare('SELECT COUNT(*) AS n FROM account_actions WHERE user_id=?').get(a.user.id).n,0);assert.equal(db.prepare('SELECT payload FROM mail_outbox WHERE user_id=?').get(a.user.id).payload,'');}finally{db.close();}assert.equal((await failed.request('/api/todos','GET',undefined,a.token)).status,403);
 }finally{await failed.close();}
});
