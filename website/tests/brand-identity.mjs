import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
import {apiHarness} from '../../test-support/api.js';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=resolve('artifacts/docen-identity-2026-11-23/browser');await mkdir(out,{recursive:true});
const h=await apiHarness({LANDING_DIR:resolve('website/dist/client'),WEB_DIR:resolve('mobile/dist-web')}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
try{
 for(const [mode,width] of [['motion',1440],['reduce',390]]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:mode==='reduce'?'reduce':'no-preference'}),page=await context.newPage(),errors=[];
  page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.message);});let release,seen;const held=new Promise(r=>release=r),waiting=new Promise(r=>seen=r);
  await page.route('**/assets/index-*.js',async route=>{seen();await held;await route.continue();});
  await page.goto(h.baseUrl+'/',{waitUntil:'commit'});await waiting;
  await page.locator('.docen-boot img').waitFor();
  if(mode==='motion')await page.waitForFunction(()=>{const v=document.querySelector('.docen-boot video');return v&&!v.paused&&v.currentTime>0;});
  else{assert.equal(await page.locator('.docen-boot video').getAttribute('src'),null);assert.equal(await page.locator('.docen-boot video').isVisible(),false);}
  await page.screenshot({path:out+'/'+mode+'-boot.png'});release();await page.locator('.hero h1').waitFor();
  assert.equal(await page.locator('.docen-boot').count(),0);assert.equal(await page.locator('#faq').innerText().then(t=>/Dots|my dot|dot results/.test(t)),false);
  const logo=page.locator('.brand img').first();assert.match(await logo.getAttribute('src'),/brand\/docen-logo\.png/);await page.waitForFunction(()=>document.querySelector('.brand img')?.naturalWidth>0);
  await page.screenshot({path:out+'/'+mode+'-home.png'});assert.deepEqual(errors,[]);results.push(mode+' website boot/logo/FAQ');await context.close();
 }
 const user=await h.verified('brand-fixture@example.test');
 for(const mode of ['motion','reduce','failure']){console.log('Checking app loader:',mode);
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:mode==='reduce'?'reduce':'no-preference'}),page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',e=>{errors.push(e.message);console.error('BROWSER ERROR',e.message);});
  const appOrigin='https://brand-app.test';await context.route(appOrigin+'/**',async route=>{const u=new URL(route.request().url());const response=await route.fetch({url:h.baseUrl+u.pathname+u.search});await route.fulfill({response});});
  await context.addCookies([{name:'duckduck_session',value:user.token,url:appOrigin}]);
  await context.addInitScript(base=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:base})),appOrigin);
  let release,seen;const held=new Promise(r=>release=r),waiting=new Promise(r=>seen=r);
  await page.route('**/api/auth/session',async route=>{seen();await held;await route.fallback();});
  if(mode==='failure')await page.route('**/*.mp4',route=>route.abort());
  await page.goto(appOrigin+'/app',{waitUntil:'commit'});await Promise.race([waiting,new Promise((_,reject)=>setTimeout(()=>reject(Error('App did not request a session: '+errors.join(';'))),15000))]);await page.getByTestId('session-restoration').waitFor();
  if(mode==='motion')await page.waitForFunction(()=>{const v=document.querySelector('[data-testid="session-restoration"] video');return v&&!v.paused&&v.currentTime>0;});
  if(mode==='reduce')assert.equal(await page.locator('[data-testid="session-restoration"] video').count(),0);
  if(mode==='failure')await page.waitForFunction(()=>document.querySelector('[data-testid="session-restoration"] video')===null);
  await page.screenshot({path:out+'/app-'+mode+'-restore.png'});release();await page.getByTestId('session-restoration').waitFor({state:'hidden'});
  assert.equal(await page.locator('[data-testid="email-verification-gate"]').count(),0);assert.deepEqual(errors,[]);results.push(mode+' app session loader');await context.close();
 }
 const page=await browser.newPage();await page.goto(h.baseUrl+'/admin');await page.getByRole('heading',{name:'어드민 로그인',exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('.brand img')?.naturalWidth>0);assert.equal(await page.getByRole('navigation').count(),0);await page.screenshot({path:out+'/admin-login-logo.png'});await page.close();results.push('admin logo, gate preserved');
 await writeFile(out+'/results.json',JSON.stringify({passed:true,source:'Real production website and Expo web bundles with isolated HTTP server/verified synthetic user; no provider/model calls or native hardware',flows:results},null,2));console.log('PASS: brand logo, motion/reduced/error loaders, FAQ removal and admin gate');
}finally{await browser.close();await h.close();}
