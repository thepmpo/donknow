import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {DatabaseSync} from 'node:sqlite';
test('docen displays the legacy default assistant without rewriting saved profiles, sessions, tasks or original consent',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'docen-brand-compat-'));let store=await openStore(dir);
 try{
  const account=await store.register('brand-compat@example.test','fixture-password-123'),id=account.user.id;
  store.configureAgent(id,{name:'덕'});const task=store.create(id,{title:'회원이 직접 쓴 덕이라는 원문',category:'업무',dueDate:null});
  const db=new DatabaseSync(join(dir,'duckduck.sqlite'));db.prepare('INSERT INTO signup_agreements VALUES(?,?,?,?,?,?)').run(id,'2026-11-22','2026-11-22',1,'2026-11-22T01:00:00Z','web');const before=db.prepare('SELECT payload FROM agent_profiles WHERE user_id=?').get(id).payload;
  assert.equal(store.agentProfile(id).name,'docen');assert.equal(db.prepare('SELECT payload FROM agent_profiles WHERE user_id=?').get(id).payload,before,'display normalization never changes encrypted member records');
  assert.equal(store.session(account.token).user.id,id);assert.equal(store.get(id,task.id).title,'회원이 직접 쓴 덕이라는 원문');assert.equal(store.signupAgreements(id).termsVersion,'2026-11-22');
  store.configureAgent(id,{name:'나의 개인 비서'});assert.equal(store.agentProfile(id).name,'나의 개인 비서');db.close();store.close();store=await openStore(dir);assert.equal(store.agentProfile(id).name,'나의 개인 비서');assert.equal(store.session(account.token).user.id,id);
  const original=await readFile(new URL('../public/legal/2026-11-22/terms.html',import.meta.url),'utf8'),current=await readFile(new URL('../public/terms.html',import.meta.url),'utf8');assert.match(original,/덕/);assert.match(current,/docen/);assert.match(current,/2026-11-22\.2/);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
