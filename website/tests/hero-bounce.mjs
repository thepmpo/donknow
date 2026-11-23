import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
import {apiHarness} from '../../test-support/api.js';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=resolve('artifacts/docen-hero-bounce-2026-11-23');await mkdir(out,{recursive:true});
const h=await apiHarness({LANDING_DIR:resolve('website/dist/client')});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try {
 const page=await browser.newPage({viewport:{width:1440,height:1024}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(h.baseUrl);await page.locator('.hero-bounce video').waitFor();
 await page.waitForFunction(()=>document.querySelector('.hero-bounce video')?.currentTime>.1);
 const start=await page.locator('video').evaluate(v=>v.currentTime);await page.waitForTimeout(400);
 assert.notEqual(await page.locator('video').evaluate(v=>v.currentTime),start);
 assert.deepEqual(await page.locator('video').evaluate(v=>[v.muted,v.loop,v.playsInline]),[true,true,true]);
 await page.screenshot({path:out+'/desktop-ko.png'});
 const title=await page.locator('.hero h1').boundingBox();assert.ok(Math.abs(title.x+title.width/2-720)<2);
 await page.getByRole('button',{name:'Switch to English',exact:true}).click();await page.screenshot({path:out+'/desktop-en.png'});
 await page.locator('.hero .text-link').click();await page.waitForTimeout(300);assert.ok((await page.url()).includes('#product-demo'));
 await page.locator('.closing').scrollIntoViewIfNeeded();await page.waitForTimeout(300);assert.equal(await page.locator('video').evaluate(v=>v.paused),true);
 await page.evaluate(()=>scrollTo(0,0));await page.waitForFunction(()=>!document.querySelector('video')?.paused);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);assert.equal(await page.locator('.hero-bounce video').count(),0);await page.screenshot({path:out+'/reduced-motion.png'});
 await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('video').waitFor();await page.locator('video').evaluate(v=>v.dispatchEvent(new Event('error')));await page.waitForTimeout(100);assert.equal(await page.locator('video').count(),0);
 for(const width of [320,390,768,1099,1100,1440,1920]){
  await page.setViewportSize({width,height:1024});await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width<1100){assert.equal(await page.locator('.hero-bounce').isVisible(),false);assert.equal(await page.locator('video').count(),0);}
  if(width===390)await page.screenshot({path:out+'/mobile-unchanged.png'});
 }
 assert.deepEqual(errors,[]);results.push('real video playback advances; muted loop inline; center headline; CTA; offscreen pause/resume; reduced-motion; error fallback; mobile hidden; no overflow; no page errors');
 await writeFile(out+'/results.json',JSON.stringify({passed:true,results},null,2));console.log('PASS: '+results.join('; '));
}finally{await browser.close();await h.close();}
