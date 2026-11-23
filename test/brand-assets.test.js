import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {apiHarness} from '../test-support/api.js';
for(const lanes of ['0','1'])test('public branding assets support loading video ranges without opening service APIs; lanes='+lanes,async()=>{
 const h=await apiHarness({REQUEST_LANES:lanes});
 const get=(path,method='GET',extra={})=>new Promise((resolve,reject)=>{const q=http.request(h.baseUrl+path,{method,headers:{Host:'docen.today',...extra}},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));});q.on('error',reject);q.end();});
 try{
  const logo=await get('/assets/brand/docen-logo.png');assert.equal(logo.status,200);assert.equal(logo.headers['content-type'],'image/png');assert.deepEqual(logo.body,await readFile(new URL('../mobile/assets/brand/docen-logo.png',import.meta.url)));
  const movie=await readFile(new URL('../mobile/assets/brand/docen-loading.mp4',import.meta.url));
  const range=await get('/assets/brand/docen-loading.mp4','GET',{Range:'bytes=0-63'});assert.equal(range.status,206);assert.equal(range.headers['content-type'],'video/mp4');assert.equal(range.headers['content-range'],'bytes 0-63/'+movie.length);assert.deepEqual(range.body,movie.subarray(0,64));
  const head=await get('/assets/brand/docen-loading.mp4','HEAD');assert.equal(head.status,200);assert.equal(Number(head.headers['content-length']),movie.length);assert.equal(head.body.length,0);
  const style=await get('/assets/brand/brand.css');assert.equal(style.status,200);const script=await get('/assets/brand/loading.js');assert.equal(script.status,200);
  assert.equal((await get('/assets/brand/private.env')).status,303);assert.equal((await get('/app')).status,303);assert.equal((await get('/api/todos')).status,503);
 }finally{await h.close();}
});
