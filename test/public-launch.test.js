import test from 'node:test';
import http from 'node:http';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {apiHarness} from '../test-support/api.js';
for(const lanes of ['0','1'])test('public domain serves introduction only, blocks direct app/API access and preserves existing testing; lanes='+lanes,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'docen-launch-'));let h;
 try{
  const landing=join(dir,'site'),web=join(dir,'app');await mkdir(landing);await mkdir(web);await writeFile(join(landing,'index.html'),'<h1>docen introduction</h1>');await writeFile(join(web,'index.html'),'<h1>internal app fixture</h1>');
  h=await apiHarness({REQUEST_LANES:lanes,LANDING_DIR:landing,WEB_DIR:web});const owner=await h.verified('launch-'+lanes+'@example.test');await h.request('/api/todos','POST',{title:'internal member data'},owner.token);
  async function get(path,host='docen.today',method='GET',body,extra={}){return new Promise((resolve,reject)=>{const req=http.request(h.baseUrl+path,{method,headers:{Host:host,'X-Duckduck-Client':'web','Content-Type':'application/json',Cookie:'duckduck_session='+owner.token,...extra}},res=>{const chunks=[];res.on('data',v=>chunks.push(v));res.on('end',()=>resolve(new Response(method==='HEAD'?null:Buffer.concat(chunks),{status:res.statusCode,headers:res.headers})));});req.on('error',reject);req.end(body===undefined?undefined:JSON.stringify(body));});}
  assert.match(await(await get('/')).text(),/docen introduction/);assert.equal((await get('/api/health')).status,200);assert.equal((await get('/api/legal')).status,200);assert.equal((await get('/terms')).status,200);assert.equal((await get('/support')).status,200);assert.equal((await get('/refund')).status,200);assert.equal((await get('/legal/2026-11-23/refund')).status,200);
  for(const host of ['docen.today','www.docen.today','DOCEN.TODAY','docen.today.','docen.today:443']){
   for(const path of ['/app','/app/','/app/settings','/admin','/project','/agent-call','/_expo/static/js/web/private.js']){const r=await get(path,host);assert.equal(r.status,303,host+path);assert.equal(r.headers.get('location'),'/coming-soon');assert.equal(r.headers.get('cache-control'),'no-store');}
   const r=await get('/api/todos',host);assert.equal(r.status,503);const data=await r.json();assert.equal(data.code,'SERVICE_NOT_LAUNCHED');assert.equal(JSON.stringify(data).includes('internal member data'),false);
  }
  for(const path of ['/api/auth/register','/api/auth/login','/api/account/verification/send','/api/todos','/api/assistant/chat','/api/admin/auth/login'])assert.equal((await get(path,'docen.today','POST',{email:'blocked@example.test',password:'Abc123!x'})).status,503,path);
  assert.match(await(await get('/coming-soon')).text(),/웹서비스 오픈/);const head=await get('/coming-soon','docen.today','HEAD');assert.equal(head.status,200);assert.equal(await head.text(),'');
  assert.equal((await get('/api/todos','duckduck-test.onrender.com')).status,200);assert.match(await(await get('/app','duckduck-test.onrender.com')).text(),/internal app fixture/);
  assert.equal((await get('/api/todos','duckduck-test.onrender.com','GET',undefined,{Origin:'https://docen.today'})).status,503,'public Origin cannot fall through the testing hostname');
  assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data.length,1,'public attempts neither change data nor revoke the test session');
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
