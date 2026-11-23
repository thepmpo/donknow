import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
const root=resolve('website/dist/static');
const server=createServer(async(req,res)=>{try{let file=join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));if((await stat(file)).isDirectory())file=join(file,'index.html');const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp4':'video/mp4','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{const page=await browser.newPage({viewport:{width:1440,height:1024}});const errors=[],bad=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)bad.push(r.url());});await page.goto(base);await page.waitForFunction(()=>document.querySelector('.hero-bounce video')?.currentTime>.1);await page.getByRole('button',{name:'Switch to English',exact:true}).click();assert.match(await page.locator('.hero h1').innerText(),/Bring it all/);
for(const route of ['terms','privacy','ai-policy','cookies','support','coming-soon','app','admin','project','agent-call','legal/2026-11-22.2/terms']){const response=await fetch(base+'/'+route);assert.equal(response.status,200,route);const html=await response.text();assert.match(html,/docen/);if(['app','admin','project','agent-call'].includes(route))assert.match(html,/웹서비스 오픈을 준비/);}
assert.equal((await fetch(base+'/api/session')).status,404);assert.equal((await fetch(base+'/server.js')).status,404);assert.equal((await fetch(base+'/admin.js')).status,404);assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);console.log('PASS: static-only KR/EN hero playback, local legal/support/archive/notices, no backend/admin scripts, no runtime/asset errors');}finally{await browser.close();await new Promise(r=>server.close(r));}
