import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';
test('all accounts have complimentary Pro in registration, login, restored sessions and assistant access without inventing funds',async()=>{
 const h=await apiHarness({AI_COST_PROTECTION:'true'});
 try{
  for(const email of ['existing-plan@example.test','new-plan@example.test']){
   const a=await h.verified(email);assert.equal(a.user.plan,'pro');assert.equal(a.user.planAccess,'complimentary');
   const restored=await h.request('/api/auth/session','GET',undefined,a.token);assert.equal(restored.data.user.plan,'pro');
   const account=await h.request('/api/account','GET',undefined,a.token);assert.equal(account.data.user.plan,'pro');
   const status=await h.request('/api/assistant/status','GET',undefined,a.token);assert.equal(status.status,200);assert.equal(status.data.access.chat,true);assert.equal(status.data.access.createFromSources,true);assert.equal(status.data.access.automaticBilling,false);assert.equal(status.data.usage.funded,false);assert.equal(status.data.usage.remainingKrw,0);
   const login=await h.request('/api/auth/login','POST',{email,password:'fixture-password-123'});assert.equal(login.data.user.plan,'pro');assert.equal(login.data.user.id,a.user.id);
  }
  assert.equal((await h.request('/api/assistant/status')).status,401);
 }finally{await h.close();}
});
