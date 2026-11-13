import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createAutomations} from '../server/automations.js';
import {createPushSender} from '../server/push.js';
test('scheduled push is session-bound, once-only and never exposes private message text',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-push-'));let store;try{store=await openStore(dir);const a=await store.register('push@example.test','fixture-password-123');store.queueAccountMail(a.user.id,'verify');const mail=store.claimMail();store.verifyEmail(a.user.id,/인증번호: (\d{6})/.exec(mail.message.text)[1]);store.mailSucceeded(mail.id);
 const token='ExpoPushToken[fixture_abcdefghijklmnop]';const device=store.registerPushDevice(a.user.id,null,token,a.token);assert.ok(device.deviceId);assert.equal(store.pushDeviceStatus(a.user.id,device.deviceId).enabled,true);
 assert.throws(()=>store.registerPushDevice(a.user.id,null,'https://evil.test',a.token));assert.throws(()=>store.registerPushDevice(a.user.id,null,token,'invalid'));
 let now=Date.parse('2026-11-15T09:00:00Z');store.configureAutomation(a.user.id,'weather',{enabled:true,time:'09:00',timezone:'UTC',city:'seoul',providers:[],aiConsent:false},now-60000);
 await createAutomations(store,{},async()=>({city:'서울',temperature:1,low:0,high:2,rain:3,observedAt:'2026-11-15T09:00'}),{now:()=>now}).tick();
 const messages=store.assistantMessages(a.user.id);assert.equal(messages.length,1);let calls=0;
 const sender=createPushSender(store,{fetcher:async(url,request)=>{calls++;assert.equal(url,'https://exp.host/--/api/v2/push/send');const body=JSON.parse(request.body);assert.equal(body.to,token);assert.equal(body.body.includes('서울'),false);assert.equal(body.data.messageId,messages[0].id);return {ok:true,json:async()=>({data:{status:'ok',id:'ticket-fixture'}})};}});
 await sender.tick();await sender.tick();assert.equal(calls,1);
 now+=86400000;await createAutomations(store,{},async()=>({city:'서울',temperature:1,low:0,high:2,rain:3,observedAt:'2026-11-16T09:00'}),{now:()=>now}).tick();let uncertain=0;const timeout=createPushSender(store,{fetcher:async()=>{uncertain++;throw Error('timeout');}});await timeout.tick();await timeout.tick();assert.equal(uncertain,1,'uncertain network result is never automatically re-sent');
 store.logout(a.token);assert.equal(store.pushDeviceStatus(a.user.id,device.deviceId).enabled,false);now+=86400000;await createAutomations(store,{},async()=>({city:'서울',temperature:1,low:0,high:2,rain:3,observedAt:'2026-11-17T09:00'}),{now:()=>now}).tick();assert.equal(store.assistantMessages(a.user.id).length,3);await sender.tick();assert.equal(calls,1,'expired/logout session receives no additional push');
 }finally{store?.close();await rm(dir,{recursive:true,force:true});}
});
