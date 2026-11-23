import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
import {apiHarness} from '../../test-support/api.js';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import http from 'node:http';
import assert from 'node:assert/strict';
const origin='https://docen.today',out='/tmp/docen-public-launch-browser';await mkdir(out,{recursive:true});
const h=await apiHarness({REQUEST_LANES:'1',LANDING_DIR:resolve('website/dist/client'),WEB_DIR:resolve('mobile/dist-web')});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [name,width,height] of [['desktop',1440,1000],['phone',390,844]]){
  const context=await browser.newContext({viewport:{width,height}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route(origin+'/**',async route=>{const req=route.request(),url=new URL(req.url()),headers=await req.allHeaders();headers.host=url.host;delete headers['accept-encoding'];const response=await new Promise((resolve,reject)=>{const q=http.request(h.baseUrl+url.pathname+url.search,{method:req.method(),headers},r=>{const chunks=[];r.on('data',c=>chunks.push(c));r.on('end',()=>resolve({status:r.statusCode,headers:r.headers,body:Buffer.concat(chunks)}));});q.on('error',reject);q.end(req.postData()??undefined);});await route.fulfill(response);});
  await page.goto(origin+'/');await page.getByRole('heading',{level:1}).waitFor();assert.equal(await page.locator('.login-link').count(),0);assert.equal(await page.locator('.hero .hero-footnote').count(),0);assert.equal(await page.locator('.hero a[href$="/coming-soon"],.closing a[href$="/coming-soon"]').count(),0);assert.equal(await page.locator('a[href$="/app"]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:out+'/'+name+'-introduction.png'});
  const appRedirect=await page.evaluate(async()=>{const r=await fetch('/app',{redirect:'manual'});return r.type;});assert.equal(appRedirect,'opaqueredirect');
  const blocked=await page.evaluate(async()=>{const res=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json','X-Duckduck-Client':'web'},body:JSON.stringify({email:'never-created@example.test',password:'fixture-only'})});return {status:res.status,body:await res.json()};});assert.equal(blocked.status,503);assert.equal(blocked.body.code,'SERVICE_NOT_LAUNCHED');assert.equal(await page.evaluate(async()=>(await fetch('/api/health')).status),200);
  await page.getByRole('link',{name:'오픈 준비 중',exact:true}).first().click();await page.getByRole('heading',{name:'웹서비스 오픈을 준비하고 있어요.'}).waitFor();assert.equal(new URL(page.url()).pathname,'/coming-soon');await page.screenshot({path:out+'/'+name+'-coming-soon.png'});assert.equal(await page.getByRole('textbox',{name:'이메일',exact:true}).count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(out+'/results.json',JSON.stringify({passed:true,source:'Actual production website build + isolated real two-lane Node server, virtual Host docen.today via local proxy; not a claim of live DNS/TLS',flows:['desktop/390px introduction','requested prelaunch clutter removed','no app links','launch notice navigation','direct /app redirected','public signup API blocked','health remains healthy'],errors:[]},null,2));console.log('PASS: public introduction only, direct app/signup blocked, PC and phone');
}finally{await browser.close();await h.close();}
