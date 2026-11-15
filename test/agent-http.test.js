import test from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';
test('agent HTTP endpoints enforce verified ownership, owned files, channel readiness and one-use computer credentials',async()=>{
 const h=await apiHarness({AI_ENABLED:'false'});try{
  const a=await h.register('agent-http@example.test'),b=await h.register('agent-other@example.test');
  assert.equal((await h.request('/api/agent/profile','GET',undefined,a.token)).status,403);
  await h.request('/api/account/verification/send','POST',{},a.token);const mail=await h.mail(a.user.email,'이메일 인증');
  await h.request('/api/account/verification/confirm','POST',{code:/인증번호: (\d{6})/.exec(mail.text)[1]},a.token);
  assert.equal((await h.request('/api/agent/profile','GET')).status,401);
  assert.equal((await h.request('/api/agent/profile','PATCH',{proactive:true},a.token)).status,400);
  assert.equal((await h.request('/api/agent/profile','PATCH',{providers:['slack'],consent:true},a.token)).status,400);
  const profile=await h.request('/api/agent/profile','PATCH',{name:'내 비서'},a.token);assert.equal(profile.status,200);assert.equal(profile.data.name,'내 비서');
  const f=await h.request('/api/agent/files','POST',{name:'개인 문서.txt',mime:'text/plain',data:Buffer.from('비공개 검수').toString('base64')},a.token);assert.equal(f.status,201);
  assert.equal((await h.request('/api/agent/files/'+f.data.id+'?content=1','GET',undefined,b.token)).status,403);
  await h.request('/api/account/verification/send','POST',{},b.token);const bm=await h.mail(b.user.email,'이메일 인증');await h.request('/api/account/verification/confirm','POST',{code:/인증번호: (\d{6})/.exec(bm.text)[1]},b.token);
  assert.equal((await h.request('/api/agent/files/'+f.data.id+'?content=1','GET',undefined,b.token)).status,404);
  assert.equal((await h.request('/api/agent/files','GET',undefined,b.token)).data.files.length,0);
  assert.equal((await h.request('/api/agent/contacts','POST',{kind:'slack',consent:true,providers:[]},a.token)).status,409);
  const pair=await h.request('/api/agent/computers','POST',{name:'검수 컴퓨터',confirmation:true},a.token);assert.equal(pair.status,201);
  assert.equal((await h.request('/api/agent/computers/claim','POST',{id:pair.data.id,pairToken:'wrong'})).status,401);
  const claim=await h.request('/api/agent/computers/claim','POST',{id:pair.data.id,pairToken:pair.data.pairToken});assert.equal(claim.status,200);assert.ok(claim.data.secret);
  assert.equal((await h.request('/api/agent/computers/claim','POST',{id:pair.data.id,pairToken:pair.data.pairToken})).status,401);
  const listed=await h.request('/api/agent/computers','GET',undefined,a.token);assert.ok(!JSON.stringify(listed).includes(claim.data.secret));assert.ok(!JSON.stringify(listed).includes(pair.data.pairToken));
  assert.equal((await h.request('/api/agent/computers/'+pair.data.id+'/screen','GET',undefined,b.token)).status,404);
  assert.equal((await h.request('/api/agent/jobs','POST',{goal:'일해줘',requestKey:'disabled',consent:true,providers:[]},a.token)).status,503);
 }finally{await h.close();}
});
