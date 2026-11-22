import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {apiHarness} from '../test-support/api.js';
import {openStore} from '../server/store.js';
import {legalVersion,publicLegal} from '../server/legal-policy.js';
const acceptance={termsVersion:legalVersion,privacyVersion:legalVersion,age14:true};
const password='signup-fixture-password-123';
test('signup rejects missing, partial, outdated or false required agreement attestations without creating accounts',async()=>{
 const h=await apiHarness();try{
  const variants=[undefined,{},false,{...acceptance,age14:false},{...acceptance,age14:'true'},{...acceptance,privacyVersion:'old'},{...acceptance,termsVersion:'old'}];
  for(let i=0;i<variants.length;i++){const result=await h.request('/api/auth/register','POST',{email:`missing${i}@example.test`,password,agreements:variants[i]});assert.equal(result.status,400);assert.match(result.data.error,/동의/);}
  const db=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,0);assert.equal(db.prepare('SELECT count(*) AS n FROM signup_agreements').get().n,0);}finally{db.close();}
 }finally{await h.close();}
});
test('real signup records exact document versions and time atomically; duplicate/concurrent signup and account isolation preserve consent',async()=>{
 const h=await apiHarness();try{
  const metadata=await h.request('/api/legal');assert.equal(metadata.status,200);assert.equal(metadata.data.minimumAge,14);assert.equal(metadata.data.marketingRequired,false);
  const body={email:'consented@example.test',password,agreements:acceptance};const both=await Promise.all([h.request('/api/auth/register','POST',body),h.request('/api/auth/register','POST',body)]);assert.deepEqual(both.map(r=>r.status).sort(),[201,409]);const owner=both.find(r=>r.status===201).data;
  const info=await h.request('/api/account/agreements','GET',undefined,owner.token);assert.equal(info.status,200);assert.equal(info.data.accepted.termsVersion,legalVersion);assert.equal(info.data.accepted.privacyVersion,legalVersion);assert.equal(info.data.accepted.age14,true);assert.equal(info.data.accepted.client,'native');assert.ok(Number.isFinite(Date.parse(info.data.accepted.acceptedAt)));
  assert.equal((await h.request('/api/account/agreements')).status,401);const other=await h.register('other-consented@example.test');const lookup=await h.request('/api/account/agreements?user='+other.user.id,'GET',undefined,owner.token);assert.equal(lookup.data.accepted.acceptedAt,info.data.accepted.acceptedAt);
  const exported=await h.request('/api/account/export','GET',undefined,owner.token);assert.deepEqual(exported.data.signupAgreements,info.data.accepted);assert.equal(JSON.stringify(exported.data.signupAgreements).includes(password),false);
  const login=await h.request('/api/auth/login','POST',{email:body.email,password});assert.equal(login.status,200);assert.equal((await h.request('/api/account/agreements','GET',undefined,login.data.token)).data.accepted.acceptedAt,info.data.accepted.acceptedAt,'login cannot rewrite acceptance time');
  const db=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{const row=db.prepare('SELECT password_hash FROM users WHERE id=?').get(owner.user.id);assert.notEqual(row.password_hash,password);assert.equal(db.prepare('SELECT count(*) AS n FROM signup_agreements WHERE user_id=?').get(owner.user.id).n,1);}finally{db.close();}
  assert.equal((await h.request('/api/account','DELETE',{password,confirmation:'DELETE'},owner.token)).status,200);assert.equal((await h.request('/api/auth/session','GET',undefined,owner.token)).status,401);
 }finally{await h.close();}
});
test('stored signup agreements survive restarts; preexisting internal/imported accounts are never falsely marked consented',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-legal-persist-'));let store=await openStore(dir);try{const old=await store.register('legacy@example.test',password),member=await store.register('persist-consent@example.test',password,acceptance,'web');assert.equal(store.signupAgreements(old.user.id),null);const accepted=store.signupAgreements(member.user.id);store.close();store=await openStore(dir);assert.deepEqual(store.signupAgreements(member.user.id),accepted);assert.equal(store.signupAgreements(old.user.id),null);assert.ok(store.session(old.token));await store.deleteAccount(member.user.id,password);assert.equal(store.signupAgreements(member.user.id),null);}finally{store.close();await rm(dir,{recursive:true,force:true});}
});
test('all legal pages and archived accepted versions are public, readable, protected and do not invent missing processor details',async()=>{
 const h=await apiHarness();try{for(const [key,doc] of Object.entries(publicLegal().documents)){for(const path of [doc.url,doc.archiveUrl]){const res=await fetch(h.baseUrl+path);assert.equal(res.status,200,path);assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await res.text(),new RegExp(key==='terms'?'서비스 이용약관':key==='privacy'?'개인정보 처리방침':key==='ai'?'AI·외부 서비스':'쿠키·기기 저장'));}assert.equal((await fetch(h.baseUrl+doc.url,{method:'HEAD'})).status,200);}
 assert.equal((await fetch(h.baseUrl+'/legal/2000-01-01/terms')).status,404);const privacy=await(await fetch(h.baseUrl+'/privacy')).text();assert.match(privacy,/동의 철회/);assert.match(privacy,/Turso/);assert.match(privacy,/확인 필요/);assert.match(privacy,/별도 국외 이전 동의/);assert.match(privacy,/만 14세/);const metadata=JSON.parse(await readFile(new URL('../docs/app-store-metadata.json',import.meta.url),'utf8'));assert.equal(metadata.reviewedForPublication,false,'new pages are not legal/publication approval');
 }finally{await h.close();}
});
