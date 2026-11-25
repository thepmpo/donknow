import {createServer} from 'node:http';
import {readFile,stat,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {chromium} from '../../mobile/node_modules/playwright-core/index.mjs';
const root=resolve('website/dist/static');
const server=createServer(async(req,res)=>{try{let file=join(root,decodeURIComponent(new URL(req.url,'http://local').pathname));if((await stat(file)).isDirectory())file=join(file,'index.html');const body=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp4':'video/mp4','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end('Not found');}}).listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const out=resolve(process.env.LEGAL_BUSINESS_CAPTURE_DIR||'artifacts/docen-business-legal-2026-11-23');await mkdir(out,{recursive:true});
const normalize=t=>t.replace(/\s+/g,' ').trim();
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:1100});await page.goto(base);await page.locator('.footer-business').scrollIntoViewIfNeeded();
  const footer=await page.locator('.footer-business').innerText();
  for(const value of ['더피엠피오','대표 김상현','480-30-01764','경기도 화성시 동탄신리천로2길 66','010-8273-9104','thepmpo.official@gmail.com','[통신판매업 신고번호: 신고 완료 후 기재]'])assert.ok(footer.includes(value),value);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:out+'/footer-'+width+'.png'});
  for(const [route,label] of [['terms','이용약관'],['privacy','개인정보 처리방침'],['refund','환불정책']]){
   await page.locator('.site-footer nav').getByRole('link',{name:label,exact:true}).click();await page.locator('h1').waitFor();assert.equal(new URL(page.url()).pathname,'/'+route);
   if(route!=='privacy'){
    const raw=await readFile(resolve('content/legal/2026-11-23/docen-'+route+'.html'),'utf8');
    const original=await page.evaluate(html=>new DOMParser().parseFromString(html,'text/html').querySelector('article').textContent,raw);
    const rendered=await page.locator('article').textContent();assert.equal(normalize(rendered),normalize(original),route+' verbatim');
    await page.screenshot({path:out+'/'+route+'-'+width+'.png'});
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,route+'/'+width);
   await page.goto(base);await page.locator('.footer-business').scrollIntoViewIfNeeded();
  }
 }
 assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({passed:true,viewports:[320,390,1440],checks:['business identity/contact exact','terms/refund article text unchanged vs supplied originals','footer three real page navigations','mobile document width','pageerror none']},null,2));console.log('PASS: supplied legal prose unchanged; complete footer identity; three links; 320/390/1440px; no overflow/errors');
}finally{await browser.close();await new Promise(r=>server.close(r));}
