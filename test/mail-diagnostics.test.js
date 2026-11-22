import test from 'node:test';
import assert from 'node:assert/strict';
import {createMailer} from '../server/mail.js';
import {mailPublicError,mailRejection,probeMailConfiguration} from '../server/mail-diagnostics.js';
import {adminAuthRoute} from '../server/admin-auth-routes.js';
test('mail normalizes key/from and never follows redirects; rejection logs contain classification only',async()=>{
 const logs=[],secret='private-provider-key',address='private-admin@example.test',code='739182';
 const mailer=createMailer({MAIL_API_KEY:' '+secret+'\n',MAIL_FROM:' sender@example.test\n'},async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer '+secret);assert.equal(JSON.parse(options.body).from,'sender@example.test');return Response.json({name:'validation_error',message:'You can only send testing emails to your own email address ('+address+'). '+code},{status:403});},line=>logs.push(line));
 await assert.rejects(()=>mailer.deliver('fixture-mail',{to:address,text:code,subject:'fixture'}),e=>{assert.equal(e.mailKind,'testing-recipient-restricted');assert.match(mailPublicError(e),/테스트 수신자/);return true;});for(const s of [secret,address,code,'message'])assert.equal(logs.join('').includes(s),false);assert.equal(JSON.parse(logs[0]).status,403);
});
test('mail classifies sender verification, key, scope, rate limit and network without echoing provider text',async()=>{
 assert.equal(mailRejection(403,{message:'The sender domain is not verified. Please verify your domain.'}),'sender-domain-unverified');assert.equal(mailRejection(401,{}),'invalid-api-key');assert.equal(mailRejection(401,{name:'restricted_api_key'}),'restricted-api-key');assert.equal(mailRejection(429,{}),'rate-limit');assert.equal(mailRejection(503,{}),'provider-unavailable');
 const logs=[],mailer=createMailer({MAIL_API_KEY:'fixture',MAIL_FROM:'fixture@example.test'},async()=>{throw Object.assign(Error('contains-private-text'),{cause:{code:'ECONNRESET'}});},line=>logs.push(line));await assert.rejects(()=>mailer.deliver('fixture',{}),e=>e.mailKind==='ECONNRESET');assert.equal(logs.join('').includes('contains-private-text'),false);
});
test('mail config probe is GET-only and logs safe sender state without sending or exposing domains/keys',async()=>{
 const logs=[],env={MAIL_API_KEY:'private-key',MAIL_FROM:'Duck <sender@private-domain.test>'};let calls=0;
 await probeMailConfiguration(env,async(url,options)=>{calls++;assert.equal(url,'https://api.resend.com/domains');assert.notEqual(options.method,'POST');assert.equal(options.body,undefined);return Response.json({data:[{name:'private-domain.test',status:'verified'}]});},line=>logs.push(line));assert.equal(calls,1);assert.equal(JSON.parse(logs[0]).senderState,'verified');for(const v of ['private-key','private-domain.test','sender@'])assert.equal(logs.join('').includes(v),false);
 await probeMailConfiguration(env,async()=>Response.json({name:'restricted_api_key',message:'secret details'},{status:401}),line=>logs.push(line));assert.equal(JSON.parse(logs[1]).kind,'restricted-api-key');
});
test('admin setup cancels a rejected code and returns actionable sanitized error instead of success',async()=>{
 let cancelled=null;const store={adminSetupMail:()=>({id:'fixture-job',message:{text:'private-code'}}),cancelAdminSetup:id=>cancelled=id};const mailer={configured:true,deliver:async()=>{throw Object.assign(Error('secret-provider-body'),{mailKind:'sender-domain-unverified'});}};
 await assert.rejects(()=>adminAuthRoute({method:'POST'},'/api/admin/auth/setup/send',store,mailer,async()=>({email:'admin@example.test'}),()=>{throw Error('must not report success');},()=>false,'127.0.0.1',false),e=>e.status===503&&/도메인/.test(e.message)&&!e.message.includes('secret-provider-body'));assert.equal(cancelled,'fixture-job');
});
