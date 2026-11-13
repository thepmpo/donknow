import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(process.env.CALENDAR_WEB_DIR||new URL('../dist-web',import.meta.url).pathname),output=resolve(process.env.CALENDAR_CAPTURE_DIR||new URL('../../artifacts/calendar-year-2026-11-14',import.meta.url).pathname),before=process.env.CAPTURE_PHASE==='before',origin='https://calendar-viewport.test';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[],requests=[];
const rollback=process.env.CALENDAR_YEAR_ROLLBACK==='1';
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'Asia/Seoul'});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push({path:new URL(r.url()).pathname,method:r.method()});});await page.clock.install({time:new Date('2026-11-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  if(!p.startsWith('/api/')){const path=resolve(root,'.'+(p==='/'?'/index.html':p));assert.ok(path.startsWith(root+'/'));try{return route.fulfill({body:await readFile(path),contentType:({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.png':'image/png'})[extname(path)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}}
  if(p==='/api/auth/session')return route.fulfill({json:{user:{id:'viewport-user',email:'viewport@example.test',emailVerified:true}}});
  if(p==='/api/todos')return route.fulfill({json:[{id:'viewport-task',title:'제안서 검토하기',dueDate:'2026-11-14',category:'업무',done:false}]});
  if(p==='/api/capabilities')return route.fulfill({json:{todoNotes:true,calendarWorkspace:2}});
  if(p==='/api/calendar/calendars')return route.fulfill({json:{items:[{id:'primary',primary:true,name:'내 일정',canWrite:true,color:'#1b64da'}]}});
  if(p==='/api/calendar/events')return route.fulfill({json:{items:[{id:'review',title:'디자인 검토',dueDate:'2026-11-13',allDay:true,endDate:'2026-11-14',calendarId:'primary',canWrite:true}],calendarId:'primary',connectionState:'connected',readAt:'2026-11-14T00:00:00Z'}});
  if(p==='/api/assistant/status')return route.fulfill({json:{enabled:false,actions:[],scheduledMessages:false}});
  if(p==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
  if(p==='/api/duck-chat')return route.fulfill({json:{messages:[]}});
  if(p==='/api/integrations')return route.fulfill({json:{providers:{google:{connected:true},notion:{connected:false},slack:{connected:false},naver:{connected:false}}}});
  return route.fulfill({status:404,json:{error:'fixture endpoint unavailable'}});
 });
 const tab=name=>page.getByRole('tab',{name,exact:true}),button=name=>page.getByRole('button',{name,exact:true}),grid=()=>page.getByTestId('calendar-date-grid');
 async function nextMonth(){await button('캘린더 더보기').click();await button('다음 달').click();}
 async function shot(name){await page.screenshot({path:resolve(output,name+'.png')});}
 async function holdCalendar(){const b=await tab('캘린더').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(650);}
 const selected=()=>grid().locator('[aria-selected="true"]').getAttribute('aria-label');
 async function todaySelected(){await grid().locator('[aria-selected="true"]').filter({has:page.locator('[dir="auto"]')}).filter({hasText:'14'}).waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="calendar-date-grid"] [aria-selected="true"]')?.getAttribute('aria-label')?.includes('2026년 11월 14일'));}
 await page.goto(origin);await tab('캘린더').click();await grid().waitFor();await page.waitForTimeout(200);
 if(rollback){
  await button('년월 선택').click();assert.equal(await page.getByLabel('이동할 년',{exact:true}).count(),1);assert.equal(await page.getByLabel('이동할 월',{exact:true}).count(),1);assert.equal(await page.getByTestId('calendar-year-overview').count(),0);await shot('rollback-legacy-picker-open');await page.getByLabel('이동할 월',{exact:true}).selectOption('1');await button('선택한 년월로 이동').click();assert.match(await button('년월 선택').innerText(),/2월/);await tab('캘린더').click();await todaySelected();assert.match(await selected(),/2026년 11월 14일/);await page.screenshot({path:resolve(output,'rollback-legacy-picker-restored.png')});console.log('PASS: year feature OFF restores legacy picker and preserves Today shortcut');
 }else{
 const overview=()=>page.getByTestId('calendar-year-overview');
 async function openYear(){await button('년월 선택').click();await overview().waitFor();await page.waitForTimeout(550);}
 async function pick(key){await overview().getByRole('button',{name:key.slice(0,4)+'년 '+Number(key.slice(5))+'월로 이동',exact:true}).click();await overview().waitFor({state:'detached'});}
 await openYear();assert.equal(await overview().getByRole('button',{name:/^2026년 .*월로 이동$/}).count(),12);assert.equal(await button('선택한 년월로 이동').count(),0);const reads=requests.filter(r=>r.path==='/api/calendar/events').length;await shot('01-ordinary-year');await page.waitForTimeout(150);assert.equal(requests.filter(r=>r.path==='/api/calendar/events').length,reads,'year overview never fetches 12 months of event data');
 await pick('2026-01');assert.match(await button('년월 선택').innerText(),/1월/);assert.match(await selected(),/2026년 1월 1일/);await shot('02-ordinary-month-after-zoom');
 await openYear();await button('다음 년').click();await overview().getByRole('heading',{name:'2027년',exact:true}).waitFor();await button('캘린더 더보기').click();await button('캘린더 상태·새로고침').click();await page.keyboard.press('Escape');await page.waitForTimeout(100);await overview().getByRole('heading',{name:'2027년',exact:true}).waitFor();await pick('2027-11');assert.match(await button('년월 선택').innerText(),/2027년 11월/);
 await openYear();await button('다음 년').click();await page.keyboard.press('Escape');await overview().waitFor({state:'detached'});await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='년월 선택');assert.match(await button('년월 선택').innerText(),/2027년 11월/,'back cancels year navigation without changing selected month');
 for(const width of [320,430]){await page.setViewportSize({width,height:844});await openYear();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await shot('03-year-width-'+width);await button('월간 보기로 돌아가기').click();await overview().waitFor({state:'detached'});}
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});await openYear();assert.equal(await page.getByTestId('calendar-workspace').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(0, 0, 0)');await shot('04-year-dark');await button('2주 보기로 전환').click();await overview().waitFor({state:'detached'});assert.equal(await grid().getByRole('button',{name:/^2027년 .*일, 일정과 할 일/}).count(),14);
 await tab('캘린더').click();await button('월 보기로 전환').click();await page.emulateMedia({colorScheme:'light',reducedMotion:'no-preference'});await page.waitForTimeout(120);await button('년월 선택').click();await page.waitForTimeout(75);const duringOpen=await page.getByTestId('calendar-month-zoom').evaluate(el=>getComputedStyle(el).transform);assert.notEqual(duringOpen,'none');assert.notEqual(duringOpen,'matrix(1, 0, 0, 1, 0, 0)');await shot('05-opening-zoom');await page.waitForTimeout(500);const tile=overview().getByRole('button',{name:'2026년 11월로 이동',exact:true});await tile.click();await page.waitForTimeout(90);const duringClose=await page.getByTestId('calendar-month-zoom').evaluate(el=>getComputedStyle(el).transform);assert.notEqual(duringClose,'matrix(1, 0, 0, 1, 0, 0)');await shot('06-closing-zoom');await overview().waitFor({state:'detached'});
 await openYear();await tab('Todo 리스트').click();await tab('캘린더').click();await overview().waitFor({state:'detached'});assert.match(await selected(),/2026년 11월 14일/,'Today shortcut exits year navigation safely');
 await page.emulateMedia({reducedMotion:'reduce'});await openYear();assert.equal(await page.getByTestId('calendar-month-zoom').evaluate(el=>getComputedStyle(el).transform),'matrix(1, 0, 0, 1, 0, 0)');await pick('2026-02');assert.match(await button('년월 선택').innerText(),/2월/);assert.ok(requests.every(r=>r.method==='GET'),'year navigation never writes externally');
 await writeFile(resolve(output,'verification.json'),JSON.stringify({errors,checks:['12-month overview','no confirm/cancel','direct month selection','year step/back/keyboard focus','More preserves browsed year','320/390/430 and dark','scoped two-week and Today','actual opening/closing transform','reduced-motion identity','no event prefetch fanout or writes'],duringOpen,duringClose,nativeMotionVerified:false},null,2));console.log('PASS: real Expo year navigation, measured zoom, reduced motion, menus, keyboard, widths, theme and read-only behavior');
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
