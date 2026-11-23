import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {apiHarness} from '../test-support/api.js';
test('one origin serves introduction, legacy pricing anchor, app and unchanged private API with bounded video reads',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'duck-site-'));let h;
 try{
  const landing=join(dir,'site'),app=join(dir,'web');await mkdir(join(landing,'assets/reference'),{recursive:true});await mkdir(app);await writeFile(join(landing,'index.html'),'<h1>Introduction</h1>');await writeFile(join(app,'index.html'),'<h1>Account app</h1>');await writeFile(join(app,'loading.mp4'),'ABCDEFGHIJ');await writeFile(join(landing,'assets/reference/demo.webm'),'0123456789');await writeFile(join(dir,'private.txt'),'private');await symlink(join(dir,'private.txt'),join(landing,'escape.txt'));
  h=await apiHarness({LANDING_DIR:landing,WEB_DIR:app});
  for(const p of ['/','/home']){const r=await fetch(h.baseUrl+p);assert.equal(r.status,200);assert.match(await r.text(),/Introduction/);assert.match(r.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(r.headers.has('set-cookie'),false);}
  const legacy=await fetch(h.baseUrl+'/pricing',{redirect:'manual'});assert.equal(legacy.status,302);assert.equal(legacy.headers.get('location'),'/#pricing');
  for(const p of ['/app','/app/'])assert.match(await(await fetch(h.baseUrl+p)).text(),/Account app/);
  assert.equal((await h.request('/api/todos')).status,401);const owner=await h.verified('unified-owner@example.test');const saved=await h.request('/api/todos','POST',{title:'kept account task'},owner.token);assert.equal(saved.status,201);await fetch(h.baseUrl+'/');await fetch(h.baseUrl+'/app');assert.equal((await h.request('/api/todos','GET',undefined,owner.token)).data[0].id,saved.data.id);
  const appVideo=await fetch(h.baseUrl+'/loading.mp4',{headers:{Range:'bytes=2-5'}});assert.equal(appVideo.status,206);assert.equal(appVideo.headers.get('content-type'),'video/mp4');assert.equal(await appVideo.text(),'CDEF');
  const partial=await fetch(h.baseUrl+'/assets/reference/demo.webm',{headers:{Range:'bytes=2-5'}});assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),'bytes 2-5/10');assert.equal(partial.headers.get('content-type'),'video/webm');assert.equal(await partial.text(),'2345');
  const suffix=await fetch(h.baseUrl+'/site/assets/reference/demo.webm',{headers:{Range:'bytes=-3'}});assert.equal(await suffix.text(),'789');assert.equal((await fetch(h.baseUrl+'/site/assets/reference/demo.webm',{headers:{Range:'bytes=99-'}})).status,416);
  const head=await fetch(h.baseUrl+'/',{method:'HEAD'});assert.equal(head.status,200);assert.equal(await head.text(),'');
  for(const p of ['/site/escape.txt','/site/%2eprivate','/site/assets/no.js'])assert.equal((await fetch(h.baseUrl+p)).status,404);assert.equal((await fetch(h.baseUrl+'/',{method:'POST'})).status,405);
 }finally{await h?.close();await rm(dir,{recursive:true,force:true});}
});
