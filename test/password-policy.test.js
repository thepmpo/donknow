import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {join} from 'node:path';
import {apiHarness} from '../test-support/api.js';
import {openStore} from '../server/store.js';
import {legalVersion} from '../server/legal-policy.js';
import {validNewPassword} from '../server/password-policy.js';
const agreements={termsVersion:legalVersion,privacyVersion:legalVersion,age14:true};
test('new user passwords require eight characters, a digit and punctuation; confirmation is enforced by the API',async()=>{
 const h=await apiHarness();try{
  const passwords=['Ab12!xy','abcdefgh!','abcdef12','12345678','        ','a'.repeat(129)+'1!'];
  for(let i=0;i<passwords.length;i++){assert.equal(validNewPassword(passwords[i]),false);const response=await h.request('/api/auth/register','POST',{email:`weak${i}@example.test`,password:passwords[i],passwordConfirmation:passwords[i],agreements});assert.equal(response.status,400);assert.match(response.data.error,/숫자.*특수문자.*8자/);}
  for(const confirmation of [undefined,'Different123!']){const response=await h.request('/api/auth/register','POST',{email:'confirmation@example.test',password:'Abc123!x',passwordConfirmation:confirmation,agreements});assert.equal(response.status,400);if(confirmation===undefined)assert.match(response.data.error,/최신 앱.*docen 웹/);else assert.equal(response.data.error,'비밀번호가 일치하지 않습니다.');}
  const created=await h.request('/api/auth/register','POST',{email:'eight@example.test',password:'Abc123!x',passwordConfirmation:'Abc123!x',agreements});assert.equal(created.status,201);assert.equal(created.data.user.emailVerified,false);assert.equal((await h.request('/api/auth/login','POST',{email:'eight@example.test',password:'Abc123!x'})).status,200);
  const db=new DatabaseSync(join(h.dir,'duckduck.sqlite'));try{assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM mail_outbox').get().n,1,'signup automatically queues mailbox verification');}finally{db.close();}
  await h.verify(created.data);
  assert.equal((await h.request('/api/account','DELETE',{password:'Abc123!x',confirmation:'DELETE'},created.data.token)).status,200,'eight-character users can delete their account');
 }finally{await h.close();}
});
test('reset validates matching strong passwords, revokes sessions and preserves legacy password login',async()=>{
 const h=await apiHarness();try{
  const a=await h.verified('reset-policy@example.test');const oldStore=await openStore(h.dir);try{await oldStore.register('legacy-policy@example.test','old-password');}finally{oldStore.close();}
  assert.equal((await h.request('/api/auth/login','POST',{email:'legacy-policy@example.test',password:'old-password'})).status,200,'existing passwords do not gain new composition rules at login');
  assert.equal((await h.request('/api/auth/password/request','POST',{email:a.user.email})).status,202);const code=/인증번호: (\d{6})/.exec((await h.mail(a.user.email,'비밀번호')).text)[1];
  for(const body of [{password:'12345678',passwordConfirmation:'12345678'},{password:'Abc123!x',passwordConfirmation:'Mismatch123!'}])assert.equal((await h.request('/api/auth/password/confirm','POST',{email:a.user.email,code,...body})).status,400);
  assert.equal((await h.request('/api/auth/password/confirm','POST',{email:a.user.email,code,password:'Abc123!x',passwordConfirmation:'Abc123!x'})).status,200);assert.equal((await h.request('/api/auth/session','GET',undefined,a.token)).status,401);assert.equal((await h.request('/api/auth/login','POST',{email:a.user.email,password:'Abc123!x'})).status,200);
 }finally{await h.close();}
});
