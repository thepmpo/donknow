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
 const navBox=await page.getByRole('tablist').boundingBox();assert.ok(Math.abs(navBox.y+navBox.height-844)<2,'navigation sits at viewport bottom without capsule margin');assert.equal(await page.getByLabel('덕 오리 마크',{exact:true}).count(),1);
 const positions=[];for(const [tabName,title] of [['Todo 리스트','할 일'],['캘린더','캘린더'],['duckduck','덕'],['log','log'],['내정보','내정보']]){await page.getByRole('tab',{name:tabName,exact:true}).click();await page.waitForTimeout(300);const h=page.getByRole('heading',{name:title,exact:true});await h.scrollIntoViewIfNeeded();positions.push(await h.boundingBox());}assert.ok(positions.every(p=>Math.abs(p.x-positions[0].x)<1&&Math.abs(p.y-positions[0].y)<1),'five primary headers share coordinates');await tab.click();await page.waitForTimeout(250);
 const box=await tab.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
 await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[role="tab"][aria-label="Todo 리스트"]')).transform).a<0.995);
 await page.mouse.up();await page.waitForFunction(()=>new DOMMatrix(getComputedStyle(document.querySelector('[role="tab"][aria-label="Todo 리스트"]')).transform).a>0.999);
 async function watchTransition(){await page.evaluate(()=>{window.__motionObserver?.disconnect();window.__motionSamples=[];const el=document.querySelector('[data-testid="screen-transition"]');window.__motionObserver=new MutationObserver(()=>window.__motionSamples.push(Number(getComputedStyle(el).opacity)));window.__motionObserver.observe(el,{attributes:true,attributeFilter:['style']});});}
 await watchTransition();await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.waitForTimeout(250);assert.ok(await page.evaluate(()=>window.__motionSamples.some(v=>v<0.99)),'tab change fades');
 const grid=page.getByTestId('calendar-date-grid');const beforeDay=await grid.locator('[aria-selected="true"]').getAttribute('aria-label');const gb=await grid.boundingBox();await page.mouse.move(gb.x+gb.width*.8,gb.y+40);await page.mouse.down();await page.mouse.move(gb.x+gb.width*.2,gb.y+40,{steps:12});await page.mouse.up();assert.notEqual(await grid.locator('[aria-selected="true"]').getAttribute('aria-label'),beforeDay,'calendar horizontal drag selects next month');await page.getByRole('button',{name:'년월 선택',exact:true}).click();await page.getByLabel('이동할 년',{exact:true}).selectOption('2030');await page.getByLabel('이동할 월',{exact:true}).selectOption('5');await page.getByRole('button',{name:'선택한 년월로 이동',exact:true}).click();await page.getByText('2030년 6월⌄',{exact:true}).waitFor();await page.getByRole('button',{name:'주 보기',exact:true}).click();assert.equal(await grid.getByRole('button').count(),7);await page.getByRole('button',{name:'월 보기',exact:true}).click();assert.equal(await grid.getByRole('button').count(),42);
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('탭을 바꿔도 유지되는 초안');
 for(const name of ['log','Todo 리스트','캘린더','duckduck']){await page.getByRole('tab',{name,exact:true}).click({force:true});await page.waitForTimeout(40);}
 assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'탭을 바꿔도 유지되는 초안');
 await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
 await page.evaluate(()=>{window.__collapse=[];const el=document.querySelector('[data-testid="completion-motion-demo-2"]');window.__collapseInitial=el.getBoundingClientRect().height;const observer=new MutationObserver(()=>{if(el.style.height)window.__collapse.push(el.getBoundingClientRect().height);});observer.observe(el,{attributes:true,attributeFilter:['style']});});
 await page.getByRole('checkbox',{name:'팀 회의 자료 준비하기 완료하기',exact:true}).click();const counter=page.getByTestId('completion-countdown-demo-2');
 for(const seconds of [3,2,1]){
  await page.getByText(`완료 · ${seconds}초 후 log로 이동`,{exact:true}).waitFor();
  assert.equal(await page.getByTestId('completion-motion-demo-2').evaluate(el=>Number(getComputedStyle(el).opacity)),1,'countdown stays fully visible through 1');
  if(seconds===3)await page.screenshot({path:resolve(new URL('../../artifacts/mobile-completion-countdown-fixture.png',import.meta.url).pathname)});
 }
 await page.waitForTimeout(400);assert.match(await counter.innerText(),/1초/,'1 remains readable before fade');
 await page.waitForFunction(()=>{const el=document.querySelector('[data-testid="completion-motion-demo-2"]');return el&&Number(getComputedStyle(el).opacity)<1&&Number(getComputedStyle(el).opacity)>0;});
 await page.getByTestId('todo-demo-2').waitFor({state:'detached'});assert.ok(await page.evaluate(()=>window.__collapse.some(h=>h>0&&h<window.__collapseInitial-1)),'completion row collapses at deadline');
 await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();
 const close=page.getByRole('button',{name:'닫기',exact:true});assert.equal(await close.innerText(),'×');const closeBox=await close.boundingBox();assert.ok(closeBox.width>=44&&closeBox.height>=44);
 const handle=page.getByRole('button',{name:'아래로 내려 닫기',exact:true});await handle.hover();const hb=await handle.boundingBox();await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2+110,{steps:10});await page.mouse.up();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor({state:'hidden'});
 await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor({state:'hidden'});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);await watchTransition();await page.getByRole('tab',{name:'log',exact:true}).click();await page.waitForTimeout(220);assert.ok(await page.evaluate(()=>window.__motionSamples.every(v=>v===1)),'reduced motion skips page fade');
 const reducedTab=page.getByRole('tab',{name:'log',exact:true});const rb=await reducedTab.boundingBox();await page.mouse.move(rb.x+rb.width/2,rb.y+rb.height/2);await page.mouse.down();await page.waitForTimeout(120);assert.equal(await reducedTab.evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a),1);await page.mouse.up();
 await page.getByRole('button',{name:'팀 회의 자료 준비하기 되돌리기',exact:true}).click();await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
 await page.getByRole('checkbox',{name:'팀 회의 자료 준비하기 완료하기',exact:true}).click();await page.waitForTimeout(120);await page.getByRole('button',{name:'팀 회의 자료 준비하기 되돌리기',exact:true}).click();await page.waitForTimeout(5500);assert.equal(await page.getByTestId('todo-demo-2').count(),1,'undo cancels removal');
 // Density regression: eight ordinary items fit on a standard phone, six on a shorter phone.
 const dense=await browser.newPage({viewport:{width:390,height:844}});await dense.emulateMedia({reducedMotion:'reduce'});
 await dense.addInitScript(()=>{const today=new Date().toISOString().slice(0,10);localStorage.setItem('duckduck.mobile.demo.todos.v1',JSON.stringify(Array.from({length:8},(_,i)=>({id:'density-'+i,title:['오늘 할 일 정리','회의 자료 보내기','이메일 답장하기','운동 30분 하기','책 읽기','장보기','일정 확인하기','하루 기록하기'][i],done:false,dueDate:today,category:'일상',createdAt:new Date().toISOString()}))));});
 await dense.goto(`http://127.0.0.1:${server.address().port}`);await dense.getByRole('button',{name:'화면 먼저 체험하기',exact:true}).click();await dense.getByTestId('todo-density-7').waitFor();
 const rowSizes=await dense.getByTestId(/^todo-density-/).evaluateAll(items=>items.map(item=>item.getBoundingClientRect().height));assert.ok(rowSizes.every(height=>height>=44&&height<=64),'compact rows preserve touch size');
 let navigation=await dense.getByRole('tablist').boundingBox(),last=await dense.getByTestId('todo-density-7').boundingBox();assert.ok(last.y+last.height<=navigation.y,'eight tasks visible without scrolling');
 await dense.screenshot({path:'/tmp/duckduck-compact-todos.png'});await dense.setViewportSize({width:390,height:667});navigation=await dense.getByRole('tablist').boundingBox();last=await dense.getByTestId('todo-density-5').boundingBox();assert.ok(last.y+last.height<=navigation.y,'six tasks visible on short screen');await dense.close();
 assert.deepEqual(errors,[]);console.log('PASS: drag-to-dismiss and accessible X, button press/release, tab fade, rapid navigation preserves draft, three-to-one countdown then fade and collapse, live reduced-motion preference, undo cancels expiry; compact phone list density');
}finally{await browser?.close();await new Promise(done=>server.close(done));}
