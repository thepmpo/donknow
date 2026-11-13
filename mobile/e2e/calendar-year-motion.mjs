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
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,timezoneId:'Asia/Seoul',recordVideo:{dir:'/tmp/calendar-year-video',size:{width:390,height:844}}});page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))requests.push({path:new URL(r.url()).pathname,method:r.method()});});await page.clock.install({time:new Date('2026-11-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'reduce'});
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
 await page.goto(origin);await tab('캘린더').click();await grid().waitFor();await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(400);await button('년월 선택').click();await page.waitForTimeout(800);await page.getByRole('button',{name:'2026년 11월로 이동',exact:true}).click();await page.waitForTimeout(800);await button('년월 선택').click();await page.waitForTimeout(800);await button('월간 보기로 돌아가기').click();await page.getByTestId('calendar-year-overview').waitFor({state:'detached'});await page.waitForTimeout(500);const video=page.video();await page.close();await video.saveAs('/tmp/calendar-year-motion.webm');assert.deepEqual(errors,[]);console.log('PASS: recorded actual ordinary Expo year/month motion');
}finally{await browser.close();}
