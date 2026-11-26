import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import http from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const project=resolve(new URL('..',import.meta.url).pathname),root=mkdtempSync(join(tmpdir(),'docen-navigation-fixture-')),out=resolve(process.env.CALENDAR_WEEK_CAPTURE_DIR||resolve(project,'../artifacts/calendar-week-build'));
execFileSync(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/calendar-week.tsx'),'--bundle-output',join(root,'fixture.js'),'--assets-dest',root,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1',EXPO_PUBLIC_CALENDAR_DIAGNOSTICS:'1'},maxBuffer:4*1024*1024});await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://x').pathname;try{if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');return;}const file=resolve(root,'.'+path);res.setHeader('Content-Type',({'.js':'application/javascript','.ttf':'font/ttf','.png':'image/png','.mp4':'video/mp4'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const origin='https://week-build.test';
const all=(id,start,end)=>({id,eventId:id,title:{span:'팀 워크숍',review:'문서 검토'}[id]??id,calendarId:'primary',calendarName:'테스트 일정',allDay:true,dueDate:start,endDate:end,canWrite:true,etag:id});
const timed=(id,time,end,day='2026-11-25')=>({id,eventId:id,title:{meeting:'제품 회의',overlap:'디자인 검토',sat:'토요일 약속'}[id]??id,calendarId:'primary',calendarName:'테스트 일정',dueDate:day,startAt:day+'T'+time+':00+09:00',endAt:day+'T'+end+':00+09:00',canWrite:true,etag:id});
let events=[all('span','2026-11-24','2026-11-26'),all('review','2026-11-24','2026-11-27'),timed('meeting','10:00','11:30'),timed('overlap','10:15','11:00'),timed('morning','09:00','09:45'),timed('sat','09:00','10:00','2026-11-28')];
const todos=[{id:'task',title:'자료 보내기',category:'업무',done:false,dueDate:'2026-11-25',dueTime:'14:00'},{id:'plain',title:'시간 없는 할 일',category:'업무',done:false,dueDate:'2026-11-25'},{id:'weekend',title:'주말 준비',category:'업무',done:false,dueDate:'2026-11-28',dueTime:'13:00'}];
try{
 for(const [mode,width,height] of [['duo',430,844],['standard',390,844],['web',1360,960]].filter(([mode])=>!process.env.CALENDAR_WEEK_SURFACE||process.env.CALENDAR_WEEK_SURFACE===mode)){
  const page=await browser.newPage({viewport:{width,height},timezoneId:'Asia/Seoul',hasTouch:true,isMobile:mode!=='web'}),errors=[],reads=[];const originalEvents=events;let failCalendar=false,moveArgs=null,moveWrites=0,failMove=false;page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install({time:new Date('2026-11-25T10:29:00+09:00')});await page.clock.pauseAt(new Date('2026-11-25T10:30:00+09:00'));
  await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
  await page.route(origin+'/**',async route=>{const u=new URL(route.request().url()),p=u.pathname;
   if(p==='/api/auth/session')return route.fulfill({json:{user:{id:'week-user',email:'week@example.test',emailVerified:true}}});
   if(p==='/api/todos')return route.fulfill({json:todos});
   if(p==='/api/capabilities')return route.fulfill({json:{calendarWorkspace:2,calendarDetails:1}});
   if(p==='/api/calendar/calendars')return route.fulfill({json:{items:[{id:'primary',primary:true,name:'테스트 일정',canWrite:true,color:'#2366e8'}]}});
   if(p==='/api/calendar/events'){if(failCalendar)return route.fulfill({status:503,json:{error:'fixture unavailable'}});reads.push(Object.fromEntries(u.searchParams));return route.fulfill({json:{items:events,calendarId:'primary',calendarName:'테스트 일정',canWrite:true,connectionState:'connected',nextCursor:null,readAt:'2026-11-25T01:30:00Z'}});}
   if(p==='/api/assistant/actions'&&route.request().method()==='POST'){moveArgs=route.request().postDataJSON();return route.fulfill({json:{id:'drag-fixture',status:'pending'}});}
   if(p==='/api/assistant/actions/drag-fixture/confirm'){
    moveWrites++;
    assert.deepEqual(route.request().postDataJSON(),{confirmation:true});
    if(failMove)return route.fulfill({json:{id:'drag-fixture',status:'failed'}});
    events=events.map(event=>event.id==='meeting'?{...event,dueDate:'2026-11-26',startAt:moveArgs.args.start,endAt:moveArgs.args.end}:event);
    return route.fulfill({json:{id:'drag-fixture',status:'succeeded'}});
   }
   if(p==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
   if(p==='/api/auth/logout')return route.fulfill({json:{ok:true}});
   return route.fulfill({status:404,json:{error:'fixture endpoint unavailable'}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode);await page.getByTestId('calendar-week-workspace').waitFor();await page.getByTestId('week-span-span').waitFor();await page.waitForTimeout(100);
  assert.ok(reads.some(r=>r.start==='2026-11-23'&&r.end==='2026-11-30'),'query is one Mon-Sun week, not fourteen days');assert.equal(await page.getByTestId('calendar-date-grid').count(),0);assert.equal(await page.getByTestId('DuoCalendarViewButton').count(),mode==='duo'?1:0);
  const month=await page.getByTestId('calendar-year-trigger').boundingBox();if(mode==='web'){const toggle=await page.getByTestId('calendar-view-toggle').boundingBox();assert.ok(toggle.x>=month.x+month.width);}else{assert.equal(await page.getByTestId('calendar-view-toggle').count(),0);const bar=await page.getByTestId('calendar-date-controls').boundingBox();assert.ok(month.x+month.width>bar.x+bar.width-2);}
  const sat=await page.getByTestId('week-saturday').boundingBox(),sun=await page.getByTestId('week-sunday').boundingBox(),hours=page.getByTestId('calendar-week-hours'),hbox=await hours.boundingBox();assert.equal(sat.x,sun.x);assert.ok(sun.y>=sat.y+sat.height-1);assert.ok(sat.x>=hbox.x+hbox.width-1);
  const friday=page.getByTestId('week-date-2026-11-27'),saturday=page.getByTestId('week-date-2026-11-28');
  await saturday.getByText('할 일 1',{exact:true}).waitFor();
  assert.equal(await friday.getByText('할 일 1',{exact:true}).count(),0);
  for(const [left,right] of [[friday,saturday],[friday.getByText('금',{exact:true}),saturday.getByText('토',{exact:true})],[friday.getByText('27',{exact:true}),saturday.getByText('28',{exact:true})]]){
   const a=await left.boundingBox(),b=await right.boundingBox();
   assert.ok(Math.abs(a.y-b.y)<1&&Math.abs(a.height-b.height)<1,'Friday and Saturday share header and text alignment when only Saturday has a task');
  }
  const weekdayDivider=await page.getByTestId('week-pinned-dates').boundingBox();
  const weekendList=await page.getByTestId('weekend-list-2026-11-28').boundingBox();
  assert.ok(Math.abs(weekdayDivider.y+weekdayDivider.height-weekendList.y)<1,'Saturday list starts below the shared date divider');
  const overlap=await page.getByTestId('week-timed-overlap').boundingBox(),meeting=await page.getByTestId('week-timed-meeting').boundingBox();assert.ok(meeting.x+meeting.width<=overlap.x+.5);assert.ok(meeting.y+meeting.height>overlap.y);
  const pinned=await page.getByTestId('week-pinned-spans').boundingBox(),span=await page.getByTestId('week-span-span').boundingBox(),before=await page.getByTestId('week-timed-meeting').boundingBox();await hours.evaluate(e=>{e.scrollTop+=144;e.dispatchEvent(new Event('scroll'));});await page.waitForTimeout(100);assert.equal((await page.getByTestId('week-pinned-spans').boundingBox()).y,pinned.y);assert.equal((await page.getByTestId('week-span-span').boundingBox()).y,span.y);assert.ok((await page.getByTestId('week-timed-meeting').boundingBox()).y<before.y-100);await hours.evaluate(e=>{e.scrollTop=576;e.dispatchEvent(new Event('scroll'));});
  assert.equal(await page.getByTestId('week-current-time-label').innerText(),'10:30');const nowTop=await page.getByTestId('week-current-time-line').evaluate(e=>parseFloat(e.style.top));await page.clock.fastForward(1800000);assert.equal(await page.getByTestId('week-current-time-label').innerText(),'11:00');assert.ok(Math.abs(await page.getByTestId('week-current-time-line').evaluate(e=>parseFloat(e.style.top))-nowTop-36)<1);await page.clock.setSystemTime(new Date('2026-11-25T10:30:00+09:00'));await page.clock.fastForward(30000);
  if(mode==='standard'){const tab=page.getByRole('tab',{name:'docen',exact:true});assert.equal(await tab.locator('img').count(),1);assert.equal(await tab.innerText(),'');}
  await page.screenshot({path:out+'/'+mode+'-week.png'});
  await page.getByTestId('week-span-span').click();await page.getByTestId('calendar-event-detail').waitFor();assert.match(await page.getByTestId('calendar-event-detail').innerText(),/팀 워크숍/);if(mode==='duo')await page.getByTestId('DuoBackButton').click();else await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByTestId('calendar-sheet').waitFor({state:'detached'});
  await page.getByTestId('week-date-2026-11-25').click();await page.getByTestId('calendar-day-detail').waitFor();assert.ok(await page.getByTestId('calendar-day-detail').getByText('시간 없는 할 일',{exact:true}).isVisible());if(mode==='duo')await page.getByTestId('DuoBackButton').click();else await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByTestId('calendar-sheet').waitFor({state:'detached'});
  await hours.evaluate(e=>{e.scrollTop=960;e.dispatchEvent(new Event('scroll'));});await page.getByTestId('week-timed-week-todo:task').click();assert.equal(await page.getByTestId('week-fixture-last').innerText(),'todo:task');await page.evaluate(()=>window.weekFixture.today());await page.waitForFunction(()=>document.querySelector('[data-testid=\"calendar-week-hours\"]').scrollTop<700);assert.ok(await hours.evaluate(e=>e.scrollTop)<700,'today navigation restores the current hours even in the same week');
  const year=await page.getByTestId('calendar-year-trigger').boundingBox();await page.mouse.move(year.x+year.width/2,year.y+year.height/2);await page.mouse.down();await page.clock.fastForward(650);await page.mouse.up();await page.getByTestId('calendar-sheet').waitFor();await page.getByRole('button',{name:'캘린더 보기 전환',exact:true}).click();await page.getByRole('tab',{name:'일 보기',exact:true}).click();await page.getByTestId('calendar-day-strip').waitFor();assert.equal(await page.getByTestId('calendar-week-workspace').count(),0);await page.evaluate(()=>window.weekFixture.week());await page.getByTestId('calendar-week-workspace').waitFor();
  if(mode==='duo'){const rect=await page.getByTestId('calendar-year-trigger').boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);await page.mouse.down();await page.clock.fastForward(650);await page.mouse.up();await page.getByRole('button',{name:'캘린더 상태·새로고침',exact:true}).click();failCalendar=true;await page.getByRole('button',{name:'일정 새로고침',exact:true}).click();await page.getByTestId('calendar-sync-notice').waitFor();await page.getByTestId('DuoBackButton').click();await page.getByTestId('calendar-sheet').waitFor({state:'detached'});assert.ok(await page.getByTestId('week-span-span').isVisible(),'failed refresh keeps cached source events');failCalendar=false;}
  if(mode!=='duo'){
   async function dragMeeting(destination){
    await hours.evaluate(e=>{e.scrollTop=576;e.dispatchEvent(new Event('scroll'));});
    const source=await page.getByTestId('week-timed-meeting').boundingBox(),target=await page.getByTestId('calendar-drop-'+destination).boundingBox();
    const x=source.x+source.width*.5,y=source.y+10,targetX=target.x+target.width*.5;
    const client=mode==='web'?null:await page.context().newCDPSession(page);
    try{
     if(client)await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     else {await page.mouse.move(x,y);await page.mouse.down();}
     await page.clock.fastForward(400);await page.clock.runFor(40);await page.getByTestId('calendar-drag-preview').waitFor();
     if(client){
      for(let step=1;step<=8;step++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(targetX-x)*step/8,y}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     }else{await page.mouse.move(targetX,y,{steps:8});await page.mouse.up();}
    }finally{await client?.detach();}
   }
   await dragMeeting('2026-11-26');
   await page.getByTestId('week-column-2026-11-26').getByTestId('week-timed-meeting').waitFor();
   await page.waitForFunction(()=>!document.querySelector('[data-testid="calendar-drag-preview"]'));
   assert.equal(moveWrites,1);
   assert.equal(moveArgs.operation,'calendar.update');assert.equal(moveArgs.args.id,'meeting');assert.equal(moveArgs.args.expectedETag,'meeting');
   assert.equal(new Date(moveArgs.args.start).toISOString(),'2026-11-26T01:00:00.000Z');
   assert.equal(new Date(moveArgs.args.end).toISOString(),'2026-11-26T02:30:00.000Z');
   if(mode==='web'){
    await page.waitForFunction(()=>document.querySelector('[data-testid="week-column-2026-11-26"] [data-testid="week-timed-meeting"]')&&!document.querySelector('[role="dialog"]'));
    await page.clock.runFor(50);
    failMove=true;
    const rejected=page.waitForResponse(response=>response.url().endsWith('/api/assistant/actions/drag-fixture/confirm'));
    await dragMeeting('2026-11-27');await rejected;
    await page.getByTestId('week-column-2026-11-27').getByTestId('week-timed-meeting').waitFor({state:'detached'});
    await page.getByTestId('week-column-2026-11-26').getByTestId('week-timed-meeting').waitFor();
    assert.equal(moveWrites,2);
   }
   events=originalEvents;
  }
  await page.evaluate(()=>window.weekFixture.logout());await page.getByTestId('week-span-span').waitFor({state:'detached'});assert.equal(await page.getByTestId('week-timed-meeting').count(),0,'sign-out clears former account events');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);await page.close();console.log('PASS actual week integration '+mode);
 }
}finally{await browser.close();await new Promise(r=>server.close(r));rmSync(root,{recursive:true,force:true});}
