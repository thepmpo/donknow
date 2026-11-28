import {publicLaunchRestriction,sendPublicLaunchRestriction} from './public-launch.js';
import http from 'node:http';
import {Worker} from 'node:worker_threads';
import {randomBytes} from 'node:crypto';
import {isIP} from 'node:net';

export function requestLane(path,query){
 if(!path.startsWith('/api/'))return 'core';
 if(/^\/api\/calendar\/docen\/event-[a-z0-9-]+(?:\/apple-delivery)?$/.test(path)||
    path==='/api/calendar/events'&&query?.get('calendarId')==='@docen')return 'core';
 if(/^\/api\/todos\/[^/]+\/source-link$/.test(path))return 'integration';
 return /^\/api\/(?:auth(?:\/|$)|todos(?:\/|$)|todo-writes\/|todo-order$|capabilities$|account(?:\/|$))/.test(path)?'core':'integration';
}
const category=path=>path.startsWith('/api/todos')?'todo':path.startsWith('/api/assistant')?'assistant':path.startsWith('/api/calendar')?'calendar':path.startsWith('/api/integrations')?'integration':path.startsWith('/api/')?'api':'site';

/** These are threads inside the existing free web service, not new hosted
 * workers. Synchronous remote libSQL waits cannot block the public HTTP loop or
 * the independent core lane while a provider/agent request is running. */
export async function startRequestLanes({workerUrl=new URL('../server-runtime.js',import.meta.url),port=Number(process.env.PORT||3000),env=process.env,logger=console.log}={}){
 const key=randomBytes(32).toString('hex'),workers={},pending={core:0,integration:0};let closing=false,ready=true;
 async function boot(role){
  const worker=new Worker(workerUrl,{workerData:{role,key},env:{...env,PORT:'0'}});
  workers[role]={worker,port:null,agent:new http.Agent({keepAlive:true,maxSockets:8})};
  return new Promise((resolve,reject)=>{
   worker.once('error',()=>reject(new Error('Request lane failed to start: '+role)));
   worker.on('message',message=>{if(message.type==='ready'){workers[role].port=message.port;resolve();}
    if(role==='core'&&message.type==='wake-calendar')workers.integration?.worker.postMessage(message);});
   worker.on('exit',code=>{if(closing)return;ready=false;reject(new Error('Request lane exited: '+role));logger(JSON.stringify({event:'request-lane-exit',lane:role,code}));void close().then(()=>{process.exitCode=1;});});
  });
 }
 async function close(){if(closing)return;closing=true;ready=false;server?.close();await Promise.all(Object.values(workers).map(async lane=>{
  if(lane.worker.threadId!==-1)await new Promise(resolve=>{
   const finish=()=>{clearTimeout(timer);resolve();};
   const timer=setTimeout(()=>{void lane.worker.terminate().then(finish);},10000);
   lane.worker.once('exit',finish);lane.worker.postMessage({type:'close'});
  });
  lane.agent.destroy();
 }));}
 let server;
 try{await boot('core');await boot('integration');}catch(error){await close();throw error;}
 server=http.createServer((req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);res.end();return;}
  const path=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');
  const launchRestriction=publicLaunchRestriction(req,path);if(launchRestriction)return sendPublicLaunchRestriction(res,launchRestriction,req.method);
  if(path.startsWith('/api/')){
   const allowed=env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL||`${env.COOKIE_SECURE==='1'||env.NODE_ENV==='production'?'https':'http'}://${req.headers.host}`;
   if(req.headers.origin&&req.headers.origin!==allowed){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'허용되지 않은 요청 출처예요.'}));return;}
   if(req.headers.origin&&(env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL)){res.setHeader('Access-Control-Allow-Origin',allowed);res.setHeader('Access-Control-Allow-Credentials','true');res.setHeader('Vary','Origin');}
  }
  if(path==='/api/health'&&req.method==='GET'){res.writeHead(ready?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({ok:ready,authentication:'session',version:1,calendarWorkspace:2,requestLanes:2,release:/^[a-f0-9]{40}$/.test(env.RENDER_GIT_COMMIT??'')?env.RENDER_GIT_COMMIT:null}));return;}
  const role=requestLane(path,url.searchParams),lane=workers[role];
  if(!ready||pending[role]>=64){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'요청이 밀려 있어요. 잠시 뒤 저장 결과를 확인해주세요.'}));return;}
  pending[role]++;const started=performance.now();let ended=false;
  const finish=()=>{if(ended)return;ended=true;pending[role]--;const elapsed=Math.round(performance.now()-started);if(elapsed>=1000)logger(JSON.stringify({event:'request-timing',lane:role,route:category(path),method:req.method,status:res.statusCode,totalMs:elapsed}));};
  const headers={...req.headers};delete headers['x-duck-lane-key'];delete headers['x-duck-client-address'];delete headers.connection;
  const forwarded=env.TRUST_PROXY==='1'?req.headers['x-forwarded-for']?.split(',').at(-1)?.trim():null;
  headers['x-duck-lane-key']=key;headers['x-duck-client-address']=forwarded&&isIP(forwarded)?forwarded:req.socket.remoteAddress;
  const upstream=http.request({host:'127.0.0.1',port:lane.port,path:req.url,method:req.method,headers,agent:lane.agent},reply=>{
   res.writeHead(reply.statusCode,reply.headers);reply.pipe(res);
   if(role==='core'&&reply.statusCode<400&&['POST','PATCH'].includes(req.method)&&(path.startsWith('/api/todos')||path==='/api/todo-deletions'))workers.integration.worker.postMessage({type:'wake'});
  });
  upstream.on('error',()=>{if(!res.headersSent){res.writeHead(503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'서버 응답을 확인하지 못했어요. 저장 결과를 확인해주세요.'}));}else res.destroy();finish();});
  res.on('finish',finish);res.on('close',()=>{upstream.destroy();finish();});req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
 });
 server.requestTimeout=120000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'0.0.0.0',resolve);});
 logger('Donknow listening on port '+server.address().port);
 const stop=()=>void close();process.once('SIGTERM',stop);process.once('SIGINT',stop);
 return {server,workers,async close(){process.removeListener('SIGTERM',stop);process.removeListener('SIGINT',stop);await close();}};
}
