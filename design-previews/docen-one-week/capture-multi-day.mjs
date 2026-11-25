import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
const root=resolve(new URL('../..',import.meta.url).pathname),out=resolve(root,'artifacts/week-multiday-preview');await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',extname(file)==='.png'?'image/png':'text/html');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const [mode,width,height,file] of [['duo',1160,920,'01-duo-landscape.png'],['duo',500,1060,'02-duo-portrait.png'],['standard',500,1060,'03-non-duo.png']]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:'+server.address().port+'/design-previews/docen-one-week/multi-day.html?mode='+mode);
  await page.locator('.nav img').evaluate(async img=>{if(!img.complete)await new Promise(resolve=>img.addEventListener('load',resolve,{once:true}));});
  const days=page.locator('.day');assert.equal(await days.count(),7);
  for(const day of await days.all()){const times=await day.locator('.time').allTextContents();assert.deepEqual(times,[...times].sort());}
  const span=await page.locator('.multi-day').boundingBox(),tue=await days.nth(1).boundingBox(),wed=await days.nth(2).boundingBox();assert.ok(span.x>=tue.x&&span.x<tue.x+10);assert.ok(Math.abs(span.x+span.width-(wed.x+wed.width-5))<2);
  assert.ok(await page.locator('.multi-day').getAttribute('aria-label').then(s=>s.includes('24')&&s.includes('25')));
  if(mode==='standard'){const sat=await days.nth(5).boundingBox(),sun=await days.nth(6).boundingBox();assert.equal(Math.round(sat.y),Math.round(sun.y));const nav=await page.locator('.nav').boundingBox(),device=await page.locator('.device').boundingBox();assert.ok(nav.width>device.width*.8);}
  else{const sat=await days.nth(5).boundingBox(),sun=await days.nth(6).boundingBox();assert.equal(Math.round(sat.x),Math.round(sun.x));assert.ok(sun.y>sat.y+100);const camera=await page.locator('.camera').boundingBox(),body=await page.locator('.main').boundingBox();assert.ok(camera.x>=body.x+body.width);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(out,file),fullPage:true});
  await page.getByRole('button',{name:'다음 주',exact:true}).click();assert.match(await page.locator('#range').innerText(),/30일/);await page.getByRole('button',{name:'이전 주',exact:true}).click();assert.match(await page.locator('#range').innerText(),/23일/);
 }
 assert.deepEqual(errors,[]);console.log('PASS: 3 responsive proposals; Tue-Wed continuous span; daily chronological order; Duo reserved camera and stacked weekend; non-Duo 7 columns and bottom nav.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
