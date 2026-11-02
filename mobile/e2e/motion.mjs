import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const root=resolve(new URL('../dist-web',import.meta.url).pathname);
const server=http.createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))throw Error();const data=await readFile(file);res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf'})[extname(file)]||'application/octet-stream'});res.end(data);}catch{res.writeHead(404);res.end();}});
let browser;
try{
 await new Promise((done,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',done);});
 browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('button',{name:'화면 먼저 체험하기',exact:true}).click();
 const tab=page.getByRole('tab',{name:'Todo 리스트',exact:true});await tab.waitFor();await page.waitForTimeout(250);
 const box=await tab.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[role="tab"][aria-label="Todo 리스트"]')).transform).a<0.995);
 await page.mouse.up();await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[role="tab"][aria-label="Todo 리스트"]')).transform).a>0.999);
 async function watchTransition(){await page.evaluate(()=>{window.__motionObserver?.disconnect();window.__motionSamples=[];const el=document.querySelector('[data-testid="screen-transition"]');window.__motionObserver=new MutationObserver(()=>window.__motionSamples.push(Number(getComputedStyle(el).opacity)));window.__motionObserver.observe(el,{attributes:true,attributeFilter:['style']});});}
 await watchTransition();await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__motionSamples.some(v=>v<0.99)),'tab change fades');
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('탭을 바꿔도 유지되는 초안');
 for(const name of ['log','Todo 리스트','캘린더','duckduck']){await page.getByRole('tab',{name,exact:true}).click({force:true});await page.waitForTimeout(40);}
 assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'탭을 바꿔도 유지되는 초안');
 await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
 await page.evaluate(()=>{window.__collapse=[];const el=document.querySelector('[data-testid="completion-motion-demo-2"]');const observer=new MutationObserver(()=>{if(el.style.height)window.__collapse.push(el.getBoundingClientRect().height);});observer.observe(el,{attributes:true,attributeFilter:['style']});});
 await page.getByRole('checkbox',{name:'팀 회의 자료 준비하기 완료하기',exact:true}).click();await page.waitForTimeout(3000);assert.equal(await page.getByTestId('todo-demo-2').count(),1);
 await page.getByTestId('todo-demo-2').waitFor({state:'detached'});assert.ok(await page.evaluate(()=>window.__collapse.some(h=>h>0&&h<80)),'completion row collapses at deadline');
 await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor({state:'hidden'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);await watchTransition();await page.getByRole('tab',{name:'log',exact:true}).click();await page.waitForTimeout(220);assert.ok(await page.evaluate(()=>window.__motionSamples.every(v=>v===1)),'reduced motion skips page fade');
 const reducedTab=page.getByRole('tab',{name:'log',exact:true});const rb=await reducedTab.boundingBox();await page.mouse.move(rb.x+rb.width/2,rb.y+rb.height/2);await page.mouse.down();await page.waitForTimeout(120);assert.equal(await reducedTab.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a),1);await page.mouse.up();
 await page.getByRole('button',{name:'팀 회의 자료 준비하기 되돌리기',exact:true}).click();await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
 await page.getByRole('checkbox',{name:'팀 회의 자료 준비하기 완료하기',exact:true}).click();await page.waitForTimeout(120);await page.getByRole('button',{name:'팀 회의 자료 준비하기 되돌리기',exact:true}).click();await page.waitForTimeout(4100);assert.equal(await page.getByTestId('todo-demo-2').count(),1,'undo cancels removal');
 assert.deepEqual(errors,[]);console.log('PASS: button press/release, tab fade, rapid navigation preserves draft, four-second collapse, live reduced-motion preference, undo cancels expiry');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
