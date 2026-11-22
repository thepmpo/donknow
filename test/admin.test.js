import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {isAdmin} from '../server/admin-routes.js';
import {apiHarness} from '../test-support/api.js';
const email='admin@example.test',env={DUCK_ADMIN_EMAILS:email};
test('admin allowlist fails closed and requires a verified exact account',()=>{
 const user={email,emailVerified:true};assert.equal(isAdmin(user,{}),false);assert.equal(isAdmin({...user,emailVerified:false},env),false);assert.equal(isAdmin({...user,email:'other@example.test'},env),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:'*'}),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:email+',broken'}),false);assert.equal(isAdmin(user,{DUCK_ADMIN_EMAILS:' ADMIN@example.test '}),true);
});
test('admin store exposes only bounded metadata, no content/tokens, and derives complimentary access without fabricated payments',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-admin-store-'));let store=await openStore(dir);
 try{
  const a=await store.register(email,'fixture-password-123'),b=await store.register('member@example.test','fixture-password-123');
  store.create(b.user.id,{title:'PRIVATE_TASK_CONTENT',notes:'PRIVATE_NOTES',dueDate:null});
  store.saveConnection(b.user.id,'google',{accessToken:'PRIVATE_PROVIDER_TOKEN',refreshToken:'PRIVATE_REFRESH_TOKEN',connectionId:'private-connection',features:['tasks']},'Google account');
  assert.equal(store.adminMembers({query:b.user.id}).items[0].id,b.user.id);assert.equal(store.adminMembers({query:'MEMBER@EXAMPLE.TEST'}).total,1);assert.equal(store.adminMembers({query:'%'}).total,0);assert.equal(store.adminMembers({query:"' OR 1=1--"}).total,0);
  const d=store.adminMember(b.user.id),serialized=JSON.stringify(d);for(const privateText of ['PRIVATE_TASK_CONTENT','PRIVATE_NOTES','PRIVATE_PROVIDER_TOKEN','PRIVATE_REFRESH_TOKEN','password_hash','token_hash','salt','payload','accessToken'])assert.equal(serialized.includes(privateText),false,privateText);
  assert.equal(d.todos.total,1);assert.equal(d.access.mode,'complimentary');assert.equal(d.entitlements[0].startsAt,null);assert.equal(d.billing.available,false);assert.deepEqual(d.billing.items,[]);assert.equal(d.usage.limitKrw,0);assert.equal(d.connections[0].state,'saved');assert.equal(d.connections[0].lastSyncAt,null);
  assert.throws(()=>store.adminMember("' OR 1=1--"),{status:404});assert.throws(()=>store.adminMembers({offset:-1}),{status:400});assert.throws(()=>store.adminMembers({query:'a'.repeat(101)}),{status:400});
  for(let i=0;i<26;i++)await store.register(`page${i}@example.test`,'fixture-password-123');const page=store.adminMembers();assert.equal(page.items.length,25);assert.equal(page.nextOffset,25);assert.equal(store.adminMembers({offset:25}).items.length,3);
  store.recordAdminAccess(a.user.id,'member',b.user.id);assert.equal(store.adminAudit().items[0].subjectId,b.user.id);assert.equal(store.adminOverview().members.total,28);
  store.close();store=await openStore(dir);assert.equal(store.adminAudit().items[0].actorEmail,email);await store.deleteAccount(b.user.id,'fixture-password-123');assert.equal(store.adminAudit().items[0].subjectId,null);await store.deleteAccount(a.user.id,'fixture-password-123');assert.equal(store.adminAudit().items[0].actorEmail,null);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
test('admin HTTP rejects guests, ordinary users, unverified owners and all writes; verified owner can search/read with no-store and audited access',async()=>{
 const h=await apiHarness(env);
 async function verify(account){await h.request('/api/account/verification/send','POST',{},account.token);const mail=await h.mail(account.user.email,'이메일 인증');const code=/인증번호: (\d{6})/.exec(mail.text)[1];const r=await h.request('/api/account/verification/confirm','POST',{code},account.token);assert.equal(r.status,200);}
 try{
  const a=await h.register(email),b=await h.register('regular@example.test');assert.equal((await h.request('/api/admin/members')).status,401);assert.equal((await h.request('/api/admin/members','GET',undefined,a.token)).status,403);
  await verify(a);await verify(b);for(const path of ['/api/admin/session','/api/admin/overview','/api/admin/members','/api/admin/members/'+a.user.id,'/api/admin/audit'])assert.equal((await h.request(path,'GET',undefined,b.token)).status,403,path);
  assert.equal((await h.request('/api/admin/session','GET',undefined,a.token)).data.role,'admin-reader');const list=await h.request('/api/admin/members?q='+encodeURIComponent(b.user.email),'GET',undefined,a.token);assert.equal(list.status,200);assert.equal(list.data.total,1);assert.equal(list.data.items[0].id,b.user.id);
  const d=await h.request('/api/admin/members/'+b.user.id,'GET',undefined,a.token);assert.equal(d.status,200);assert.equal(d.data.access.mode,'complimentary');assert.equal(d.data.billing.available,false);assert.equal(d.data.usage.limitKrw,0);
  assert.equal((await h.request('/api/admin/members/'+a.user.id,'PATCH',{plan:'pro',admin:true},a.token)).status,405);assert.equal((await h.request('/api/admin/members?offset=-1','GET',undefined,a.token)).status,400);assert.equal((await h.request('/api/admin/members/'+crypto.randomUUID(),'GET',undefined,a.token)).status,404);
  const res=await fetch(h.baseUrl+'/api/admin/overview',{headers:{Authorization:'Bearer '+a.token}});assert.equal(res.headers.get('cache-control'),'no-store');assert.equal((await res.json()).members.total,2);
  const audit=await h.request('/api/admin/audit','GET',undefined,a.token);assert.ok(audit.data.items.some(e=>e.operation==='member'&&e.subjectId===b.user.id));assert.equal(JSON.stringify(audit.data).includes(b.user.email),false,'audit does not retain searched member email');
  await h.request('/api/auth/logout','POST',{},a.token);assert.equal((await h.request('/api/admin/members','GET',undefined,a.token)).status,401);
 }finally{await h.close();}
});
