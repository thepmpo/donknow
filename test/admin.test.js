import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {isAdmin} from '../server/admin-routes.js';
import {apiHarness} from '../test-support/api.js';
const email='admin@example.test',env={DUCK_ADMIN_EMAILS:email},password='admin-fixture-password-123';
const codeOf=job=>/인증번호: (\d{6})/.exec(job.message?.text??job.text)[1];
test('only independent verified admin identities match the exact allowlist; docen users never qualify',()=>{
 const user={email,emailVerified:true,identity:'admin'};assert.equal(isAdmin(user,{}),false);assert.equal(isAdmin({...user,identity:undefined},env),false);assert.equal(isAdmin({...user,emailVerified:false},env),false);assert.equal(isAdmin({...user,email:'other@example.test'},env),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:'*'}),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:email+',broken'}),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:' ADMIN@example.test '}),true);
});
test('separate admin setup, password/session reset and audit persist without creating or modifying docen users',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-admin-store-'));let store=await openStore(dir,{env});
 try{
  assert.equal(store.adminOverview().members.total,0,'invited admin is not an app member');assert.equal(await store.adminLogin(email,password),null);assert.equal(store.adminSetupMail('stranger@example.test'),null);
  const same=await store.register(email,'duck-password-123'),b=await store.register('member@example.test','fixture-password-123');assert.equal(store.adminSession(same.token),null);
  const setup=store.adminSetupMail(email);assert.throws(()=>store.adminSetupMail(email),{status:429});const admin=await store.finishAdminSetup(email,codeOf(setup),password);assert.ok(admin);assert.equal(admin.user.identity,'admin');assert.notEqual(admin.user.id,same.user.id);assert.equal(store.session(admin.token),null);assert.equal(store.adminSession(admin.token).user.email,email);assert.equal(await store.finishAdminSetup(email,codeOf(setup),password),null,'one time code cannot be reused');assert.ok(await store.login(email,'duck-password-123'),'docen password unaffected');assert.equal(await store.adminLogin(email,'duck-password-123'),null);
  store.create(b.user.id,{title:'PRIVATE_TASK_CONTENT',notes:'PRIVATE_NOTES',dueDate:null});store.saveConnection(b.user.id,'google',{accessToken:'PRIVATE_PROVIDER_TOKEN',refreshToken:'PRIVATE_REFRESH_TOKEN',connectionId:'private-connection'},'Google account');
  assert.equal(store.adminMembers({query:b.user.id}).items[0].id,b.user.id);assert.equal(store.adminMembers({query:'MEMBER@EXAMPLE.TEST'}).total,1);assert.equal(store.adminMembers({query:'%'}).total,0);assert.equal(store.adminMembers({query:"' OR 1=1--"}).total,0);
  const d=store.adminMember(b.user.id),serialized=JSON.stringify(d);for(const v of ['PRIVATE_TASK_CONTENT','PRIVATE_NOTES','PRIVATE_PROVIDER_TOKEN','PRIVATE_REFRESH_TOKEN','password_hash','token_hash','salt','payload','accessToken'])assert.equal(serialized.includes(v),false,v);assert.equal(d.todos.total,1);assert.equal(d.access.mode,'complimentary');assert.equal(d.entitlements[0].startsAt,null);assert.equal(d.billing.available,false);assert.deepEqual(d.billing.items,[]);assert.equal(d.connections[0].lastSyncAt,null);
  assert.throws(()=>store.adminMember("' OR 1=1--"),{status:404});assert.throws(()=>store.adminMembers({offset:-1}),{status:400});assert.throws(()=>store.adminMembers({query:'a'.repeat(101)}),{status:400});
  for(let i=0;i<26;i++)await store.register(`page${i}@example.test`,'fixture-password-123');assert.equal(store.adminMembers().items.length,25);assert.equal(store.adminMembers().nextOffset,25);assert.equal(store.adminMembers({offset:25}).items.length,3);
  store.recordAdminAccess(admin.user.id,'member',b.user.id);store.close();store=await openStore(dir,{env});assert.equal(store.adminAudit().items[0].actorEmail,email);assert.equal(store.adminSession(admin.token).user.id,admin.user.id);
  const reset=store.adminSetupMail(email),updated=await store.finishAdminSetup(email,codeOf(reset),'new-admin-password-123');assert.ok(updated);assert.equal(store.adminSession(admin.token),null);assert.ok(store.session(same.token),'resetting admin password never revokes docen sessions');assert.ok(await store.login(email,'duck-password-123'));
  await store.deleteAccount(b.user.id,'fixture-password-123');assert.equal(store.adminAudit().items[0].subjectId,null);await store.deleteAccount(same.user.id,'duck-password-123');assert.equal(store.adminAudit().items[0].actorEmail,email);assert.ok(store.adminSession(updated.token),'deleting same-email app account cannot delete admin account');
  const final=store.adminSetupMail(email),bad=codeOf(final)==='000000'?'999999':'000000';for(let i=0;i<5;i++)assert.equal(await store.finishAdminSetup(email,bad,password),null);assert.equal(await store.finishAdminSetup(email,codeOf(final),password),null,'five failed code attempts lock that code');
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
test('admin HTTP accepts only its own cookie, verifies email setup, blocks docen/Bearer sessions and every management write',async()=>{
 const h=await apiHarness(env);let cookie='';
 async function call(path,method='GET',body){const res=await fetch(h.baseUrl+path,{method,headers:{'Content-Type':'application/json','X-Duckduck-Client':'web',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:res.status,data:await res.json(),headers:res.headers};}
 try{
  const app=await h.verified(email),b=await h.verified('regular@example.test');assert.equal((await call('/api/admin/members')).status,401);assert.equal((await h.request('/api/admin/members','GET',undefined,app.token)).status,401);assert.equal((await fetch(h.baseUrl+'/api/admin/session',{headers:{Cookie:'duckduck_session='+app.token}})).status,401,'same-email docen cookie is not an admin login');
  assert.equal((await call('/api/admin/auth/login','POST',{email,password:'fixture-password-123'})).status,401);assert.equal((await call('/api/admin/auth/setup/send','POST',{email:'stranger@example.test'})).status,202);
  assert.equal((await call('/api/admin/auth/setup/send','POST',{email})).status,202);const mail=await h.mail(email,'어드민 전용');const setup=await call('/api/admin/auth/setup/confirm','POST',{email,code:codeOf(mail),password});assert.equal(setup.status,200);assert.match(setup.headers.get('set-cookie'),/^duckduck_admin_session=/);assert.match(setup.headers.get('set-cookie'),/HttpOnly/);assert.match(setup.headers.get('set-cookie'),/SameSite=Strict/);
  assert.equal((await call('/api/admin/session')).data.user.identity,undefined,'public role response does not need internal identity');assert.equal((await call('/api/admin/session')).data.role,'owner');assert.equal((await call('/api/admin/overview')).data.members.total,2,'admin provision does not fabricate app member');
  const list=await call('/api/admin/members?q='+encodeURIComponent(b.user.email));assert.equal(list.data.items[0].id,b.user.id);const d=await call('/api/admin/members/'+b.user.id);assert.equal(d.data.billing.available,false);assert.equal(d.data.usage.limitKrw,0);
  assert.equal((await call('/api/admin/members/'+b.user.id,'PATCH',{plan:'pro',admin:true})).status,405);assert.equal((await call('/api/admin/members?offset=-1')).status,400);assert.equal((await call('/api/admin/overview')).headers.get('cache-control'),'no-store');assert.ok((await call('/api/admin/audit')).data.items.some(e=>e.subjectId===b.user.id));
  const adminValue=cookie.split('=')[1];assert.equal((await h.request('/api/auth/session','GET',undefined,adminValue)).status,401,'admin token is not a docen session');assert.equal((await h.request('/api/auth/session','GET',undefined,app.token)).status,200,'original docen account unchanged');
  await call('/api/admin/auth/logout','POST',{});assert.equal((await call('/api/admin/members')).status,401);assert.equal((await call('/api/admin/auth/login','POST',{email,password})).status,200);assert.equal((await call('/api/admin/members')).status,200);
 }finally{await h.close();}
});
test('owner temporary password grants only change-password access, rotates sessions and never resets on restart',async()=>{
 const temporary='Temp123!',replacement='owner-new-password-123',bootstrapEnv={...env,DUCK_ADMIN_INITIAL_PASSWORD:temporary};
 const h=await apiHarness(bootstrapEnv);let cookie='';
 async function call(path,method='GET',body){const res=await fetch(h.baseUrl+path,{method,headers:{'Content-Type':'application/json','X-Duckduck-Client':'web',...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});const set=res.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return {status:res.status,data:await res.json(),headers:res.headers};}
 try{
  const app=await h.verified(email);const login=await call('/api/admin/auth/login','POST',{email,password:temporary});assert.equal(login.status,200);assert.equal(login.data.user.emailVerified,false);assert.equal(login.data.user.mustChangePassword,true);assert.match(login.headers.get('set-cookie'),/Max-Age=600(?:;|$)/);const limited=cookie;
  assert.equal((await call('/api/admin/session')).data.role,'admin-password-change');for(const path of ['/api/admin/members','/api/admin/overview','/api/admin/audit','/api/admin/members/'+app.user.id]){const r=await call(path);assert.equal(r.status,403);assert.equal(r.data.code,'ADMIN_PASSWORD_CHANGE_REQUIRED');}
  assert.equal((await call('/api/admin/auth/password/change','POST',{password:'short'})).status,400);
  const changed=await call('/api/admin/auth/password/change','POST',{password:replacement});assert.equal(changed.status,200);assert.equal(changed.data.user.mustChangePassword,false);assert.match(changed.headers.get('set-cookie'),/Max-Age=28800/);const full=cookie;
  cookie=limited;assert.equal((await call('/api/admin/session')).status,401);cookie=full;assert.equal((await call('/api/admin/overview')).data.members.total,1);assert.equal((await call('/api/admin/auth/login','POST',{email,password:temporary})).status,401);assert.equal((await h.request('/api/auth/session','GET',undefined,app.token)).status,200);
 }finally{await h.close();}
 const dir=await mkdtemp(join(tmpdir(),'duck-admin-bootstrap-'));let store=await openStore(dir,{env:bootstrapEnv});try{assert.equal(store.adminOverview().members.total,0);const admin=await store.adminLogin(email,temporary);await store.changeRequiredAdminPassword(admin.token,replacement);store.close();store=await openStore(dir,{env:bootstrapEnv});assert.equal(await store.adminLogin(email,temporary),null);assert.equal((await store.adminLogin(email,replacement)).user.mustChangePassword,false);}finally{store.close();await rm(dir,{recursive:true,force:true});}
});
