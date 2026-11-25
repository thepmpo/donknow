import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
import {apiHarness} from '../../test-support/api.js';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=resolve(process.env.BRAND_CAPTURE_DIR||'artifacts/docen-brand-polish-2026-11-23');await mkdir(out,{recursive:true});
const h=await apiHarness({LANDING_DIR:resolve('website/dist/client')}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const cases=[];
try{
 for(const width of [320,360,361,375,390,600,900,1440]){
  const page=await browser.newPage({viewport:{width,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(h.baseUrl+'/');await page.locator('.hero h1').waitFor();
  for(const lang of ['ko','en']){
   if(lang==='en')await page.getByRole('button',{name:'Switch to English',exact:true}).click();
   assert.equal(await page.locator('.login-link,.hero-footnote').count(),0);
   assert.equal(await page.locator('.hero .btn-large,.closing .btn-large').count(),0);
   const mark=page.locator('.site-header .brand img');await page.waitForFunction(()=>document.querySelector('.site-header .brand img')?.naturalWidth>0);
   assert.equal(Math.round((await mark.boundingBox()).width),width<=600?56:62);
   assert.ok(await mark.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m42)<-3,'logo is optically raised without changing its size');
   assert.equal(await page.locator('.site-header .brand-period').evaluate(el=>getComputedStyle(el).color),'rgb(35, 102, 232)');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${width}/${lang}: overflow`);
   if([390,1440].includes(width)){await page.screenshot({path:out+'/'+width+'-'+lang+'-hero.png'});await page.locator('.closing').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+width+'-'+lang+'-footer.png'});await page.evaluate(()=>scrollTo(0,0));}
   cases.push({width,lang,headerLogo:width<=600?56:62});
  }
  assert.deepEqual(errors,[]);await page.close();
 }
 const admin=await browser.newPage();await admin.goto(h.baseUrl+'/admin');await admin.getByRole('heading',{name:'어드민 로그인',exact:true}).waitFor();assert.equal(await admin.locator('.brand .brand-period').innerText(),'.');assert.equal(await admin.locator('.brand .brand-period').evaluate(el=>getComputedStyle(el).color),'rgb(35, 102, 232)');assert.equal(await admin.getByRole('navigation').count(),0);await admin.close();
 await writeFile(out+'/results.json',JSON.stringify({passed:true,source:'Production landing build + isolated real Node server; no production account changes',cases,checks:['2x logo','blue wordmark period','hero/footer CTA and disclaimer removed','login coming-soon label removed','320-1440px no overflow','KR/EN','admin wordmark and login gate']},null,2));console.log('PASS: enlarged logo, unified period and requested copy/CTA removal at eight widths in KR/EN');
}finally{await browser.close();await h.close();}
