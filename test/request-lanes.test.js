import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {startRequestLanes,requestLane} from '../server/request-lanes.js';
test('real synchronous remote database waits in integration lane do not stall health or a separate core write',async t=>{
 const directory=await mkdtemp(join(tmpdir(),'duck-lane-latency-')),child=spawn(process.execPath,['test-support/hrana-server.js',join(directory,'remote.sqlite')],{cwd:new URL('../',import.meta.url),env:{...process.env,FIXTURE_HRANA_DELAY_MS:'100'},stdio:['ignore','pipe','pipe']});
 let lanes;
 try{
  const port=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',()=>reject(Error('fixture startup failed')));child.stdout.on('data',chunk=>{const match=String(chunk).match(/port (\d+)/);if(match)resolve(match[1]);});});
  const logs=[];lanes=await startRequestLanes({workerUrl:new URL('../test-support/request-lane-worker.js',import.meta.url),port:0,env:{...process.env,NODE_ENV:'test',FIXTURE_REMOTE_URL:'http://127.0.0.1:'+port},logger:value=>logs.push(value)});
  const base='http://127.0.0.1:'+lanes.server.address().port,worker=lanes.workers.integration.worker;
  const reading=new Promise(resolve=>{const listener=message=>{if(message.type==='reading'){worker.off('message',listener);resolve();}};worker.on('message',listener);});
  let done=false;const remote=fetch(base+'/api/calendar/events').then(async response=>{await response.json();done=true;});await reading;
  const start=performance.now();assert.equal((await fetch(base+'/api/health')).status,200);const healthMs=performance.now()-start;
  const writeStart=performance.now();assert.equal((await fetch(base+'/api/todos',{method:'POST',body:'{}'})).status,200);const writeMs=performance.now()-writeStart;
  assert.equal(done,false,'8-query remote request is still blocked in its worker');assert.ok(healthMs<500,'health stays outside synchronous DB waits');assert.ok(writeMs<1000,'core write uses independent lane');await remote;
  t.diagnostic(JSON.stringify({injectedHttpLatencyMs:100,healthMs:Math.round(healthMs),coreWriteMs:Math.round(writeMs),productionMeasurement:false}));
  assert.ok(logs.some(line=>line.includes('request-timing')&&line.includes('integration')));assert.ok(!logs.some(line=>line.includes('fixture-token')||line.includes('calendar/events')));
 }finally{await lanes?.close();const exited=once(child,'exit');child.kill();await exited;await rm(directory,{recursive:true,force:true});}
});
test('provider/action work stays in one lane while local writes, authentication and receipts use core',()=>{
 for(const path of ['/api/todos','/api/todos/abc/source-result','/api/todo-writes/key','/api/auth/session','/api/capabilities'])assert.equal(requestLane(path),'core');
 for(const path of ['/api/assistant/chat','/api/assistant/actions/id/confirm','/api/calendar/events','/api/integrations/google/authorize','/api/webhooks/slack','/api/agent/chat/id'])assert.equal(requestLane(path),'integration');
});
