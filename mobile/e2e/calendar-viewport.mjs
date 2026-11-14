import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web',import.meta.url).pathname),output=resolve(process.env.CALENDAR_CAPTURE_DIR||new URL('../../artifacts/calendar-viewport-2026-11-13',import.meta.url).pathname),before=process.env.CAPTURE_PHASE==='before',origin='https://calendar-viewport.test';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const errors=[],checks=[];
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'Asia/Seoul'});page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'reduce'});
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
 const tab=name=>page.getByRole('tab',{name,exact:true}),button=name=>page.getByRole('button',{name,exact:true}),calendar=()=>page.getByTestId('calendar-workspace'),grid=()=>page.getByTestId('calendar-date-grid');
 async function capture(name){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:resolve(output,(before?'before-':'')+name+'.png')});}
 await page.goto(origin);await page.getByRole('heading',{name:'할 일',exact:true}).waitFor();const subtitleY=(await page.getByText('11월 14일 토요일',{exact:true}).boundingBox()).y;
 await capture('ordinary-todos');await tab('캘린더').click();await grid().waitFor();await capture('ordinary-month');
 await button('캘린더 더보기').click();await button('오늘').waitFor();await capture('ordinary-today-menu');await page.getByTestId('calendar-sheet').getByRole('button',{name:'닫기',exact:true}).click();await page.getByTestId('calendar-sheet').waitFor({state:'detached'});
 if(before){console.log('Captured before state');}else{
  const headings=[];
  for(const [name,title] of [['캘린더','캘린더'],['Todo 리스트','할 일'],['duckduck','덕'],['log','log'],['ME','ME']]){await tab(name).click();const heading=await page.getByRole('heading',{name:title,exact:true}).boundingBox();headings.push({name,...heading});}
  assert.ok(headings.every(h=>Math.abs(h.y-headings[0].y)<1&&Math.abs(h.x-headings[0].x)<1),'all five headings start at the same coordinates');
  await tab('캘린더').click();const weekdays=await page.getByTestId('calendar-weekdays').locator('[dir="auto"]').first().boundingBox();assert.ok(Math.abs(weekdays.y-subtitleY)<1,'weekday text starts at the Todo subtitle level');
  async function fits(label){await page.waitForTimeout(80);const bounds=await grid().boundingBox(),scroll=page.getByTestId('calendar-scroll'),metrics=await scroll.evaluate(e=>({h:e.clientHeight,sh:e.scrollHeight,top:e.scrollTop,overflow:getComputedStyle(e).overflowY})),nav=await page.getByTestId('BottomNavigation').boundingBox();assert.ok(metrics.sh<=metrics.h+1,JSON.stringify({label,metrics}));assert.equal(metrics.top,0);assert.ok(Math.abs(bounds.y+bounds.height-nav.y)<4,'grid fills to the bottom navigation safe boundary '+JSON.stringify({label,bounds,nav,metrics}));const old=bounds.y;await scroll.hover();await page.mouse.wheel(0,500);await page.waitForTimeout(80);assert.ok(Math.abs((await grid().boundingBox()).y-old)<1,'wheel does not move the month');checks.push({label,bounds,metrics});}
  for(const [width,height] of [[390,844],[320,667],[431,640],[430,932],[844,390]]){
   await page.setViewportSize({width,height});await fits('month-'+width);
   await button('2주 보기로 전환').click();await fits('fortnight-'+width);await button('월 보기로 전환').click();
  }
  await page.setViewportSize({width:390,height:844});await button('2주 보기로 전환').click();await capture('ordinary-fortnight');await button('월 보기로 전환').click();
  await button('년월 선택').click();await page.getByTestId('calendar-year-overview').getByRole('button',{name:'2026년 2월로 이동',exact:true}).click();await page.getByTestId('calendar-year-overview').waitFor({state:'detached'});assert.equal(await grid().getByRole('button',{name:/^2026년 .*일, 일정과 할 일/}).count(),28);await fits('four-week-february');
  await button('년월 선택').click();await page.getByTestId('calendar-year-overview').getByRole('button',{name:'2026년 8월로 이동',exact:true}).click();await page.getByTestId('calendar-year-overview').waitFor({state:'detached'});assert.equal(await grid().getByRole('button',{name:/^2026년 .*일, 일정과 할 일/}).count(),42);await fits('six-week-august');await capture('ordinary-six-week-month');
  await page.emulateMedia({colorScheme:'dark'});await capture('ordinary-dark');
  assert.deepEqual(errors,[]);await writeFile(resolve(output,'viewport-verification.json'),JSON.stringify({headings,subtitleY,checks,errors,nativeDeviceVerified:false},null,2));console.log('PASS: month/fortnight fit, no wheel scroll, 4/5/6-week capacity, five headings and body baseline, ordinary controls');
 }
}finally{await browser.close();}
