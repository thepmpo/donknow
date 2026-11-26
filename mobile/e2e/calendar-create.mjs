import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import http from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const project=resolve(new URL('..',import.meta.url).pathname),root=mkdtempSync(join(tmpdir(),'docen-navigation-fixture-')),out=resolve(process.env.CREATE_CAPTURE_DIR||resolve(project,'../artifacts/calendar-compose-cleanup'));
execFileSync(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/view-welcome.tsx'),'--bundle-output',join(root,'fixture.js'),'--assets-dest',root,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1',EXPO_PUBLIC_CALENDAR_DIAGNOSTICS:'1'},maxBuffer:4*1024*1024});await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://x').pathname;try{if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');return;}const file=resolve(root,'.'+path);res.setHeader('Content-Type',({'.js':'application/javascript','.ttf':'font/ttf','.png':'image/png','.mp4':'video/mp4'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const origin='https://view-welcome.test';
try{
 for(const [mode,width,height] of [['duo',430,844],['standard',390,844],['web',1100,860]].filter(([mode])=>!process.env.CREATE_SURFACE||process.env.CREATE_SURFACE===mode)){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:mode!=='web'}),errors=[],actions=[],todos=[],saved=[],details=[];let writes=0,sourceFailure=false,authorization=null,completionGate=null,waitingCompletion=0;
  page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce',colorScheme:process.env.CREATE_COLOR_SCHEME||'dark'});await page.clock.setFixedTime(new Date('2026-11-25T10:00:00Z'));
  await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
  let revealProviderEvent=false;
  await page.route(origin+'/**',async route=>{const r=route.request(),p=new URL(r.url()).pathname,method=r.method(),body=()=>r.postDataJSON();
   if(p==='/api/auth/session')return route.fulfill({json:{user:{id:'view-user',email:'view@example.test',emailVerified:true}}});
   if(p==='/api/capabilities')return route.fulfill({json:{calendarWorkspace:2,calendarDetails:1,calendarCreateOptions:1,todoNotes:true,todoOrdering:1}});
   if(p==='/api/todos'){if(method==='POST'){const todo={...body(),id:'todo-'+todos.length,done:false};todos.push(todo);return route.fulfill({status:201,json:todo});}return route.fulfill({json:todos});}
   if(p==='/api/todo-order'&&method==='PUT'){
    const {ids}=body();
    for(const item of todos)item.order=ids.indexOf(item.id);
    return route.fulfill({json:todos});
   }
   if(p.endsWith('/membership')&&method==='POST'){
    const item=todos.find(t=>t.id===p.split('/').at(-2));
    item.category=body().destination;return route.fulfill({json:item});
   }
   if(p.startsWith('/api/todos/')&&method==='DELETE'){
    const index=todos.findIndex(t=>t.id===p.split('/').at(-1));if(index>=0)todos.splice(index,1);return route.fulfill({json:{ok:true}});
   }
   if(p.startsWith('/api/todos/')&&method==='PATCH'){
    if(completionGate){waitingCompletion++;await completionGate;}
    const item=todos.find(t=>t.id===p.split('/').at(-1));
    Object.assign(item,body(),{completedAt:body().done?new Date().toISOString():null});
    return route.fulfill({json:item});
   }
   if(p==='/api/integrations')return route.fulfill({json:[{provider:'google',name:'Google',connected:true,configured:true,label:'테스트 계정',features:['calendar','calendarWrite'],accounts:[{connectionId:'connection-google',label:'테스트 계정',features:['calendar','calendarWrite']}]}]});
   if(p==='/api/integrations/google/authorize'){authorization=body();return route.fulfill({json:{url:'https://accounts.google.com/o/oauth2/v2/auth?fixture=docen'}});}
   if(p==='/api/calendar/calendars'&&sourceFailure)return route.fulfill({status:409,json:{error:'서비스 연결을 다시 승인해주세요.'}});
   if(p==='/api/calendar/calendars')return route.fulfill({json:{items:[{id:'primary',primary:true,name:'내 일정',canWrite:true,connectionId:'connection-google'},{id:'team-calendar',name:'팀 캘린더',color:'#ab063d',canWrite:true,connectionId:'connection-google'}]}});
   if(p==='/api/calendar/events'){
    const calendarId=new URL(route.request().url()).searchParams.get('calendarId')??'primary';
    return route.fulfill({json:{items:saved.filter(e=>e.calendarId===calendarId&&revealProviderEvent),calendarId,connectionState:'connected',readAt:new Date().toISOString(),nextCursor:null}});
   }
   if(p==='/api/calendar/event-details'){details.push(body());return route.fulfill({json:{revision:1,fields:body().patch}});}
   if(p==='/api/assistant/status')return route.fulfill({json:{enabled:false,actions:[]}});
   if(p==='/api/assistant/actions'&&method==='POST'){const action={...body(),id:'action-'+actions.length,status:'pending',accountLabel:'테스트 Google 계정',calendarName:'내 일정'};actions.push(action);return route.fulfill({json:action});}
   const match=p.match(/^\/api\/assistant\/actions\/([^/]+)(\/confirm)?$/);if(match){const action=actions.find(a=>a.id===match[1]);if(method==='DELETE')action.status='cancelled';if(match[2]&&action.status==='pending'){writes++;action.status='succeeded';action.result={id:'saved-event'};saved.push({id:'google-authoritative:saved-event',eventId:'saved-event',title:action.args.title,calendarId:action.args.calendarId,color:'#45af67',connectionId:'connection-google',dueDate:action.args.startDate,endDate:action.args.endDate,allDay:true,etag:'v1',canWrite:true});}return route.fulfill({json:action});}
   if(p==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});if(p==='/api/assistant/notices')return route.fulfill({json:{id:'notice'}});
   return route.fulfill({status:404,json:{error:'fixture unavailable '+method+' '+p}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?reminderError=1&mode='+mode);await page.getByTestId('calendar-week-workspace').waitFor();await page.waitForTimeout(250);
  const date=page.getByTestId('week-date-2026-11-25');await date.hover();await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();
  const sheet=page.getByTestId('calendar-sheet');
  const closeSheet=async()=>{
   if(mode==='duo')await page.getByTestId('DuoBackButton').click();
   else await sheet.getByRole('button',{name:'닫기',exact:true}).click();
   await sheet.waitFor({state:'detached'});
  };
  assert.equal(await page.getByTestId('calendar-add').count(),0);
  async function openAdd(){
   const year=page.getByTestId('calendar-year-trigger');
   await year.hover();await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();
   await sheet.getByRole('button',{name:'캘린더 항목 추가',exact:true}).click();
  }
await sheet.waitFor();await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).waitFor();
  await page.waitForFunction(()=>{
   const a=document.querySelector('[data-testid="calendar-create-tabs"]').getBoundingClientRect();
   const b=document.querySelector('[data-testid="calendar-sheet-surface"]').getBoundingClientRect();
   return Math.abs((a.left+a.width/2)-(b.left+b.width/2))<1;
  });
  assert.equal(await sheet.getByLabel('일정 시작일',{exact:true}).inputValue(),'2026-11-25');
  const event=sheet.getByRole('tab',{name:'일정',exact:true}),todo=sheet.getByRole('tab',{name:/^(할 일|Todo 리스트)$/});assert.equal(await event.getAttribute('aria-selected'),'true');
  for(const label of ['일정 장소','일정 시간대 선택','첨부 파일 링크 추가'])assert.equal(await sheet.getByLabel(label,{exact:true}).count(),0);
  assert.equal(await sheet.getByText(/추가 링크·첨부|쓰기 가능한 캘린더|반복·초대를 아직|docen 알림/).count(),0);assert.equal(await sheet.getByTestId('calendar-reminder-preview').count(),0);
  await page.screenshot({path:out+'/'+mode+'-event.png'});
  await sheet.getByRole('button',{name:'알림 선택',exact:true}).click();const menu=sheet.getByTestId('calendar-reminder-menu');await menu.waitFor();assert.equal(await menu.getByText(/갱신|이전 예약|Asia\/|docen/).count(),0);assert.equal(await menu.getByRole('radio').count(),11);const choices=await menu.getByRole('radio').all(),align=[];for(const choice of choices){const box=await choice.boundingBox();assert.ok(box.height>=48);align.push(box.x);}assert.ok(Math.max(...align)-Math.min(...align)<1);const checks=await menu.locator('[data-testid^="calendar-reminder-check-"]').all(),xs=[];for(const check of checks)xs.push((await check.boundingBox()).x);assert.ok(Math.max(...xs)-Math.min(...xs)<1);await page.screenshot({path:out+'/'+mode+'-reminder.png'});await menu.getByRole('radio',{name:'알림 10분 전',exact:true}).click();assert.match(await sheet.getByRole('button',{name:'알림 선택',exact:true}).innerText(),/10분 전/);

  await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).fill('주간 디자인 리뷰');await todo.click();await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('할 일 초안');await event.click();assert.equal(await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).inputValue(),'주간 디자인 리뷰');await todo.click();assert.equal(await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).inputValue(),'할 일 초안');await page.screenshot({path:out+'/'+mode+'-todo.png'});await event.click();
  await sheet.getByLabel('일정 종료일',{exact:true}).fill('2026-11-27');await sheet.getByRole('button',{name:'일정 반복 선택',exact:true}).click();await sheet.getByRole('radio',{name:'반복 매주',exact:true}).click();await sheet.getByRole('textbox',{name:'일정 초대 이메일',exact:true}).fill('guest@example.test');await sheet.getByRole('textbox',{name:'일정 메모',exact:true}).fill('검토 자료를 준비해주세요.');await sheet.getByRole('textbox',{name:'일정 링크',exact:true}).fill('https://example.test/review');
  await sheet.getByRole('button',{name:'저장할 캘린더 선택',exact:true}).click();
  await sheet.getByRole('radio',{name:'캘린더 팀 캘린더',exact:true}).click();
  await sheet.getByRole('button',{name:'일정 저장',exact:true}).click();
  await sheet.waitFor({state:'detached'});
  await page.waitForFunction(()=>document.querySelector('[data-testid="calendar-week-workspace"]'));
  assert.equal(actions.length,1);
  assert.equal(actions[0].args.calendarId,'team-calendar');
  assert.equal(actions[0].args.startDate,'2026-11-25');assert.equal(actions[0].args.endDate,'2026-11-28');assert.deepEqual(actions[0].args.recurrence,['RRULE:FREQ=WEEKLY']);assert.deepEqual(actions[0].args.attendees,['guest@example.test']);assert.equal(actions[0].args.location,'');assert.equal(actions[0].args.notes,'검토 자료를 준비해주세요.');
  const savedEvent=page.getByRole('button',{name:'주간 디자인 리뷰 종일 일정 상세',exact:true});
  await savedEvent.waitFor();
  await page.getByTestId('week-span-confirmed:connection-google:team-calendar:saved-event').waitFor();
  assert.equal(writes,1);
  revealProviderEvent=true;
  await openAdd();await sheet.waitFor();await todo.click();await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('리뷰 할 일 저장');await sheet.getByRole('textbox',{name:'메모',exact:true}).fill('다음 검토 자료');await sheet.getByRole('button',{name:'저장',exact:true}).click();await sheet.waitFor({state:'detached'});await page.waitForTimeout(300);assert.equal(writes,1);assert.equal(todos.length,1);assert.equal(todos[0].dueDate,'2026-11-25');assert.equal(todos[0].title,'리뷰 할 일 저장');assert.equal(todos[0].notes,'다음 검토 자료');assert.equal(details.length,1);assert.equal(details[0].patch.url,'https://example.test/review');assert.equal(details[0].patch.attachments,undefined);assert.deepEqual(errors,[]);
  await openAdd();await sheet.waitFor();if(mode==='duo')await page.getByTestId('DuoBackButton').click();else await sheet.getByRole('button',{name:'닫기',exact:true}).click();await sheet.waitFor({state:'detached'});
  await page.getByRole('button',{name:'2026-11-26 13시 일정 추가',exact:true}).click();await sheet.waitFor();assert.equal(await sheet.getByLabel('일정 시작일',{exact:true}).inputValue(),'2026-11-26');assert.equal(await sheet.getByLabel('일정 시작 시간',{exact:true}).inputValue(),'13:00');assert.equal(await sheet.getByLabel('일정 종료 시간',{exact:true}).inputValue(),'14:00');if(mode==='duo')await page.getByTestId('DuoBackButton').click();else await sheet.getByRole('button',{name:'닫기',exact:true}).click();await sheet.waitFor({state:'detached'});
  await openAdd();await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).fill('닫으면 지울 초안');
  await sheet.getByLabel('일정 종료일',{exact:true}).fill('2026-11-29');
  await todo.click();await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('닫으면 지울 할 일');
  await closeSheet();
  await openAdd();await sheet.waitFor();
  assert.equal(await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).inputValue(),'');
  assert.equal(await sheet.getByLabel('일정 종료일',{exact:true}).inputValue(),await sheet.getByLabel('일정 시작일',{exact:true}).inputValue());
  await todo.click();assert.equal(await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).inputValue(),'');
  await closeSheet();
  if(mode==='standard'){
   async function selectView(label){const year=page.getByTestId('calendar-year-trigger');await year.hover();await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();await sheet.getByRole('button',{name:'캘린더 보기 전환',exact:true}).click();await sheet.getByRole('tab',{name:label,exact:true}).click();}
   for(const label of ['월 보기','일 보기']){await selectView(label);if(label==='월 보기'){const divider=page.getByTestId('calendar-week-divider-2026-11-22'),cell=page.getByTestId('calendar-day-2026-11-25');const d=await divider.boundingBox(),c=await cell.boundingBox();assert.ok(d.x<=c.x&&d.x+d.width>=c.x+c.width-1);assert.equal(await cell.evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');await page.screenshot({path:out+'/standard-month-divider.png'});}const day=label==='일 보기'?page.getByTestId('calendar-period-current').getByRole('button',{name:'2026-11-25 일간 보기',exact:true}):page.getByTestId('calendar-day-2026-11-25');await day.hover();await page.mouse.down();await page.waitForTimeout(600);await page.mouse.up();await sheet.waitFor();assert.equal(await sheet.getByLabel('일정 시작일',{exact:true}).inputValue(),'2026-11-25');await sheet.getByRole('button',{name:'닫기',exact:true}).click();await sheet.waitFor({state:'detached'});}
   await page.setViewportSize({width:320,height:667});await openAdd();await sheet.waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);const tabsBounds=await page.getByTestId('calendar-create-tabs').boundingBox(),closeBounds=await sheet.getByRole('button',{name:'닫기',exact:true}).boundingBox();assert.ok(tabsBounds.x+tabsBounds.width<=closeBounds.x+1,'closing never overlaps the creation tabs at 320px');await page.screenshot({path:out+'/standard-320-event.png'});await todo.click();await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('작은 화면 키보드 입력');await page.evaluate(()=>window.viewWelcomeFixture.keyboard(true));await page.setViewportSize({width:320,height:500});await page.waitForTimeout(250);const field=await sheet.getByRole('textbox',{name:'할 일 제목',exact:true}).boundingBox(),area=await page.getByTestId('calendar-create-todo').boundingBox();assert.ok(field.y>=area.y-1&&field.y+field.height<=area.y+area.height+1,'Todo title remains visible after keyboard resize');await page.evaluate(()=>window.viewWelcomeFixture.keyboard(false));await page.setViewportSize({width:320,height:667});await sheet.getByRole('button',{name:'닫기',exact:true}).click();await sheet.waitFor({state:'detached'});
  }
  if(mode==='standard'){
   sourceFailure=true;await page.reload();await page.getByTestId('calendar-week-workspace').waitFor();
   const diagnostic=page.getByRole('button',{name:'캘린더 연결 오류 원인 보기',exact:true});
   await page.screenshot({path:out+'/standard-calendar-diagnostic.png'});
   await diagnostic.click();await sheet.getByText('서비스 연결을 다시 승인해주세요.',{exact:true}).waitFor();
   assert.equal(await page.getByText(/빈 시간으로 판단/).count(),0);
   await sheet.getByRole('button',{name:'닫기',exact:true}).click();
   await openAdd();await sheet.waitFor();await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).fill('재연결 후 유지할 초안');await sheet.getByRole('button',{name:'저장할 캘린더 선택',exact:true}).click();await sheet.getByTestId('calendar-destination-menu').waitFor();assert.equal(await sheet.getByRole('button',{name:'ME 연결 관리 열기',exact:true}).count(),0);assert.equal(await sheet.getByRole('button',{name:'캘린더 목록 다시 확인',exact:true}).count(),0);assert.equal(await sheet.getByText('기본 캘린더',{exact:true}).count(),0);assert.equal(await sheet.getByRole('radio',{name:'캘린더 기본 캘린더',exact:true}).count(),0);await page.screenshot({path:out+'/standard-connection-required.png'});
   await page.context().route('https://accounts.google.com/**',r=>r.fulfill({contentType:'text/html',body:'<p>연결 확인 테스트</p>'}));await closeSheet();await page.getByRole('tab',{name:'ME',exact:true}).click();await page.getByRole('button',{name:'연결된 서비스 관리',exact:true}).click();await page.getByRole('button',{name:'Google 캘린더 연결 관리',exact:true}).click();await page.getByRole('button',{name:'연결 권한 관리',exact:true}).click();const permission=page.getByRole('button',{name:'연결 권한 다시 선택',exact:true});await permission.waitFor();const popupPromise=page.waitForEvent('popup');await permission.click();const popup=await popupPromise;await popup.waitForURL('https://accounts.google.com/**');assert.equal(authorization.mode,'reauthorize');assert.equal(authorization.connectionId,'connection-google');assert.ok(authorization.features.includes('calendarWrite'));sourceFailure=false;await popup.close();await page.bringToFront();await page.getByRole('tab',{name:'캘린더',exact:true}).click();await openAdd();await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).waitFor();assert.equal(await sheet.getByRole('textbox',{name:'일정 제목',exact:true}).inputValue(),'');await page.waitForFunction(()=>document.querySelector('[aria-label="저장할 캘린더 선택"]')?.textContent.includes('내 일정'));assert.equal(writes,1);await page.screenshot({path:out+'/standard-connection-restored.png'});await sheet.getByRole('button',{name:'닫기',exact:true}).click();
  }
  {
   await page.setViewportSize({width,height});
   if(mode==='web'){
    todos[0].order=0;
    todos.push({...todos[0],id:'todo-second',title:'주변 행 위치 검증',order:1});
    await page.reload();
    await page.evaluate(()=>window.viewWelcomeFixture.showTodos());
   }
   else await page.getByRole('tab',{name:/^(할 일|Todo 리스트)$/}).click();
   const row=page.getByTestId('todo-todo-0');
   async function swipe(target,direction,verticalStep=4){
    const box=await target.boundingBox();
    const x=box.x+box.width/2,y=box.y+box.height/2;
    if(mode==='web'){
     await page.mouse.move(x,y);await page.mouse.down();
     await page.mouse.move(x+direction*80,y,{steps:8});await page.mouse.up();return;
    }
    const session=await page.context().newCDPSession(page);
    try{
     await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
     for(let i=1;i<=8;i++)await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+direction*i*10,y:y+i*verticalStep}]});
     await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    }finally{await session.detach();}
   }
   await row.waitFor();assert.equal(await row.getByText('직접 작성',{exact:true}).count(),0);
   await row.getByRole('button',{name:'리뷰 할 일 저장 수정',exact:true}).click();
   const title=page.getByRole('textbox',{name:'할 일 제목',exact:true});
   await title.waitFor();
   const trash=await page.getByRole('button',{name:'할 일 삭제',exact:true}).boundingBox(),cancel=await page.getByRole('button',{name:'할 일 편집 취소',exact:true}).boundingBox();
   assert.ok(trash.x<cancel.x&&Math.abs(trash.y-cancel.y)<2);
   assert.equal(await title.evaluate(el=>el===document.activeElement),false);
   await title.click();
   assert.equal(await title.evaluate(el=>el===document.activeElement),true);
   await page.getByRole('button',{name:'할 일 편집 취소',exact:true}).click();
   await title.waitFor({state:'detached'});
   const selection=row.getByRole('checkbox',{name:'리뷰 할 일 저장 선택',exact:true});
   const originalColor=await row.evaluate(el=>getComputedStyle(el).backgroundColor);
   await swipe(row,1);await selection.waitFor();assert.equal(await selection.getAttribute('aria-checked'),'true');assert.equal(todos[0].done,false);
   assert.notEqual(await row.evaluate(el=>getComputedStyle(el).backgroundColor),originalColor);
   assert.equal(await row.evaluate(el=>getComputedStyle(el).borderTopLeftRadius),'14px');
   const list=page.getByTestId('todos-list-scroll');
   const beforeDate=await list.evaluate(el=>el.scrollTop);
   await page.getByRole('button',{name:'선택한 할 일 예정일 변경',exact:true}).click();
   const dateDialog=page.getByRole('dialog',{name:'날짜 변경'});
   await dateDialog.getByRole('button',{name:'2026-11-25로 변경',exact:true}).waitFor();
   const grid=dateDialog.getByTestId('month-picker-grid'),satDate=grid.getByRole('button',{name:'2026-11-28로 변경',exact:true});
   const gridBounds=await grid.boundingBox(),satBounds=await satDate.boundingBox();
   assert.ok(satBounds.x+satBounds.width<=gridBounds.x+gridBounds.width+1,'the final date column fits in the picker');

   assert.equal(await list.evaluate(el=>el.scrollTop),beforeDate);
   assert.equal(await selection.getAttribute('aria-checked'),'true');
   await page.screenshot({path:out+'/'+mode+'-todo-batch-date.png'});
   await closeSheet();
   assert.equal(await page.getByRole('button',{name:'선택한 할 일 이동',exact:true}).count(),0);
   await page.getByRole('button',{name:'선택한 할 일 삭제',exact:true}).click();
   await page.getByRole('dialog',{name:'할 일 삭제'}).waitFor();await closeSheet();
   assert.equal(todos[0].done,false);
   await swipe(row,1);await selection.waitFor({state:'detached'});
   if(mode==='web'){
    await swipe(row,1);await selection.waitFor();
    const other=page.getByTestId('todo-todo-second');
    const from=await row.boundingBox(),to=await other.boundingBox();
    await page.mouse.move(from.x+80,from.y+from.height/2);await page.mouse.down();
    await page.getByTestId('todo-drag-preview').waitFor();
    assert.equal(await page.getByTestId('todo-selection-toolbar').count(),0);
    await page.mouse.move(from.x+80,to.y+to.height-3,{steps:10});
    const reordered=page.waitForResponse(r=>r.url().endsWith('/api/todo-order')&&r.request().method()==='PUT');
    await page.mouse.up();assert.equal((await reordered).status(),200);
    assert.equal(todos.find(t=>t.id==='todo-second').order,0);
    const settled=await other.boundingBox();
    await page.waitForTimeout(220);
    assert.ok(Math.abs((await other.boundingBox()).y-settled.y)<2,'neighbor stays settled after drop');
   }
   let releaseCompletion;
   completionGate=new Promise(resolve=>{releaseCompletion=resolve;});
   await swipe(row,-1);await page.waitForFunction(()=>document.querySelector('[data-testid="completion-countdown-todo-0"]'));
   await swipe(row,-1);
   await row.getByRole('checkbox',{name:'리뷰 할 일 저장 완료하기',exact:true}).waitFor();
   await swipe(row,1);await selection.waitFor();
   assert.equal(await selection.getAttribute('aria-checked'),'true');
   assert.equal(waitingCompletion,1,'selection works before the first completion write resolves');
   await swipe(row,1);await selection.waitFor({state:'detached'});
   completionGate=null;releaseCompletion();
   await swipe(row,-1);
   await row.getByRole('checkbox',{name:'리뷰 할 일 저장 미완료로 변경',exact:true}).waitFor();
   if(mode==='web')await page.evaluate(()=>window.viewWelcomeFixture.showLog());
   else await page.getByRole('tab',{name:/^(log|완료 기록)$/i}).click();
   await page.clock.setFixedTime(new Date('2026-11-25T10:00:05Z'));
   const logged=page.getByTestId('log-list-scroll').getByTestId('todo-todo-0');
   await logged.waitFor();
   const logSelection=logged.getByRole('checkbox',{name:'리뷰 할 일 저장 선택',exact:true});
   await swipe(logged,1);await logSelection.waitFor();assert.equal(await logSelection.getAttribute('aria-checked'),'true');
   const logToolbar=page.getByTestId('log-selection-toolbar');
   await logToolbar.waitFor();assert.equal(await logToolbar.getByText('되돌리기',{exact:true}).count(),0);
   const logListBounds=await page.getByTestId('log-list-scroll').boundingBox(),logBarBounds=await logToolbar.boundingBox();
   assert.ok(Math.abs((logListBounds.x+logListBounds.width/2)-(logBarBounds.x+logBarBounds.width/2))<2,'the log toolbar is centered within its own pane');
   await logToolbar.getByRole('button',{name:'선택한 로그 삭제',exact:true}).click();
   await page.getByRole('dialog',{name:'로그 삭제'}).waitFor();
   await closeSheet();

   await swipe(logged,1);await logSelection.waitFor({state:'detached'});
   await swipe(logged,-1);await logged.getByRole('checkbox',{name:'리뷰 할 일 저장 완료하기',exact:true}).waitFor();
   if(mode==='web'){
    await page.evaluate(()=>window.viewWelcomeFixture.showTodos());
    const other=page.getByTestId('todo-todo-second');
    await swipe(other,1);
    await page.getByRole('button',{name:'선택한 할 일 예정일 변경',exact:true}).click();
    await page.getByRole('dialog',{name:'날짜 변경'}).getByRole('button',{name:'2026-11-26로 변경',exact:true}).click();await sheet.waitFor({state:'detached'});
    assert.equal(todos.find(t=>t.id==='todo-second').dueDate,'2026-11-26');
    await swipe(other,1);
    await page.getByRole('button',{name:'선택한 할 일 삭제',exact:true}).click();
    await page.getByRole('dialog',{name:'할 일 삭제'}).getByRole('button',{name:'도슨에서 선택한 할 일 삭제 확인',exact:true}).click();
    await other.waitFor({state:'detached'});
    assert.deepEqual(todos.map(t=>t.id),['todo-0']);
   }

  }
  console.log('PASS '+mode+': calendar creation, selected shape, rapid select during pending completion and log swipe');await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));rmSync(root,{recursive:true,force:true});}
