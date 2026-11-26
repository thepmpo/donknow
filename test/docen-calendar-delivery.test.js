import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDocenCalendarDelivery} from '../server/docen-calendar-delivery.js';

test('new calendar writes can start while a previous original is slow',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});
 const waiting=[{id:'slow'}],started=[],completed=[];
 let release;
 const store={
  claimDocenGoogleDelivery:()=>waiting.shift(),
  nextDocenGoogleDeliveryAt:()=>null,
  finishDocenGoogleDelivery:(job,state,id)=>completed.push([job.id,state,id]),
 };
 const worker=createDocenCalendarDelivery(store,async job=>{
  started.push(job.id);
  if(job.id==='slow')await new Promise(resolve=>{release=resolve;});
  return job.id+'-original';
 });
 t.after(()=>worker.close());
 worker.wake();
 t.mock.timers.tick(1);
 assert.deepEqual(started,['slow']);
 waiting.push({id:'next'});
 worker.wake();
 t.mock.timers.tick(1);
 await Promise.resolve();
 assert.deepEqual(completed,[['next','synced','next-original']]);
 release();
 await Promise.resolve();
 await Promise.resolve();
 assert.deepEqual(completed.at(-1),['slow','synced','slow-original']);
});

test('calendar retries wake at the next due time and honor provider retry delays',async t=>{
 t.mock.timers.enable({apis:['setTimeout','Date'],now:1000});
 let availableAt=1000,attempt=0,finished=false;
 const store={
  claimDocenGoogleDelivery(){
   if(availableAt>Date.now()||finished)return null;
   availableAt=Infinity;
   return {id:'one',attempt:++attempt};
  },
  nextDocenGoogleDeliveryAt:()=>Number.isFinite(availableAt)?availableAt:null,
  finishDocenGoogleDelivery(job,state,_id,retryAfterMs){
   if(job.attempt===1){assert.equal(state,'queued');assert.equal(retryAfterMs,800);availableAt=Date.now()+retryAfterMs;}
   else {assert.equal(state,'synced');finished=true;}
  },
 };
 const worker=createDocenCalendarDelivery(store,async job=>{
  if(job.attempt===1)throw Object.assign(Error('rate limited'),{status:429,retryAfterMs:800});
  return 'original';
 });
 t.after(()=>worker.close());
 worker.wake();
 t.mock.timers.tick(1);
 await Promise.resolve();
 t.mock.timers.tick(799);
 assert.equal(attempt,1);
 t.mock.timers.tick(1);
 await Promise.resolve();
 assert.equal(attempt,2);
 assert.equal(finished,true);
});
