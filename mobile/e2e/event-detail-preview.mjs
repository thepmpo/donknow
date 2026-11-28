import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import http from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const project=resolve(new URL('..',import.meta.url).pathname),root=mkdtempSync(join(tmpdir(),'docen-navigation-fixture-')),out=resolve(process.env.DETAIL_CAPTURE_DIR||resolve(project,'../artifacts/event-detail-preview'));
execFileSync(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/view-welcome.tsx'),'--bundle-output',join(root,'fixture.js'),'--assets-dest',root,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:4*1024*1024});await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://x').pathname;try{if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');return;}const file=resolve(root,'.'+path);res.setHeader('Content-Type',({'.js':'application/javascript','.ttf':'font/ttf','.png':'image/png','.mp4':'video/mp4'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});

const origin='https://event-preview.test';
const events=[
 {id:'preview-event',title:'포트폴리오 정리',calendarId:'icloud',startDate:'2026-11-18T00:00:00Z',endDate:'2026-11-19T00:00:00Z',allDay:true,timeZone:'UTC',notes:''},
 {id:'preview-event-2',title:'보리 미용',calendarId:'icloud',startDate:'2026-11-08T14:00:00Z',endDate:'2026-11-08T15:00:00Z',allDay:false,timeZone:'UTC',notes:''},
];
const ticket=(id,title,listId,listTitle)=>({id,title,dueDate:null,category:'일상',done:false,source:{provider:'apple-reminders',listId,listTitle,externalId:'preview-'+id,color:'#6aaff7'}});
const localTicket={id:'local-ticket',title:'기기에 반영할 삭제',dueDate:null,category:'일상',done:false,
 delivery:{provider:'apple-reminders',state:'checking',listId:'inbox'}};
const legacyEdit={id:'legacy-edit',before:localTicket,patch:{notes:'기기에 보관한 메모'},
 editedAt:'2026-11-28T10:00:00Z',blocked:true,failure:'기존 저장이 처리되지 않았어요.'};
const pendingKey='todo-fixture-pending-20261128';
const pendingCreate={id:pendingKey,draft:{title:'28일 대기 Ticket',dueDate:'2026-11-28',category:'일상'},createdAt:'2026-11-28T10:00:00Z',blocked:true};
try{
 for(const [mode,width,height] of [['duo',430,844],['standard',390,844],['web',1120,850]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:mode!=='web',isMobile:mode!=='web'});
  page.setDefaultTimeout(10000);
  await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});
  await page.clock.install({time:new Date('2026-11-28T10:00:00Z')});
  await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
  if(mode==='standard')await page.addInitScript(({owner,legacyEdit,pendingCreate})=>{
   if(sessionStorage.getItem('fixture.legacy-edit-seeded'))return;
   const encoded=owner.split('').map(char=>char.charCodeAt(0).toString(16).padStart(4,'0')).join('');
   for(const [prefix,job] of [['docen.todo.edits.',legacyEdit],['docen.todo.outbox.',pendingCreate]]){
    const key=prefix+encoded,chunks=JSON.stringify([job]).match(/.{1,400}/g);
    chunks.forEach((chunk,index)=>sessionStorage.setItem(key+'.fixture.'+index,chunk));
    sessionStorage.setItem(key,JSON.stringify({owner,g:'fixture',parts:chunks.length,at:Date.now()}));
   }
   sessionStorage.setItem('fixture.legacy-edit-seeded','1');
  },{owner:origin+':preview-user',legacyEdit,pendingCreate});
  let acceptDeletes=false,deleted=false,deleteRequests=0;
  await page.route(origin+'/**',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/todo-create-cancellations'){
    assert.deepEqual(route.request().postDataJSON(),{requestKey:pendingKey});
    return route.fulfill({json:{todo:null}});
   }
   if(path==='/api/todo-deletions'){
    assert.deepEqual(route.request().postDataJSON(),{id:'local-ticket',sourceId:null});
    deleteRequests++;
    if(!acceptDeletes)return route.fulfill({status:503,json:{error:'fixture offline'}});
    deleted=true;
    return route.fulfill({json:{ok:true}});
   }
   const payloads={
    '/api/auth/session':{user:{id:'preview-user',email:'preview@example.test',emailVerified:true}},
    '/api/todos':[ticket('a','공부 기록 정리','today',"Today's"),ticket('b','국간장','inbox','Inbox'),...(!deleted?[localTicket]:[])],
    '/api/capabilities':{calendarWorkspace:2,calendarDetails:1,calendarCreateOptions:1,docenCalendar:1},
    '/api/calendar/calendars':{items:[],nextCursor:null},
    '/api/calendar/events':{items:[],nextCursor:null,connectionState:'connected'},
    '/api/integrations':[],
   };
   if(path in payloads)return route.fulfill({json:payloads[path]});
   return route.fulfill({status:404,json:{error:'fixture endpoint'}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?nativeCalendar=1&deviceTodos=1&mode='+mode);
  await page.waitForFunction(()=>!!window.appleCalendarFixture);
  await page.evaluate(events=>{
   window.appleCalendarFixture.setAllowed(true);
   for(const event of events)window.appleCalendarFixture.writeOutside(event);
  },events);
  if(mode==='standard'){
   const nav=page.getByTestId('BottomNavigation');
   for(const name of ['캘린더','Ticket','docen.t ai','log','ME']){
    await nav.getByRole('tab',{name,exact:true}).waitFor();
    assert.equal(await nav.getByText(name,{exact:true}).count(),0);
   }
   await nav.getByTestId('navigation-calendar-date').getByText('28',{exact:true}).waitFor();
  }
  const event=page.getByRole('button',{name:/포트폴리오 정리.*Event 상세/});
  const switchButton=page.getByTestId('DuoCalendarViewButton');
  const frame=mode==='duo'&&await switchButton.boundingBox();
  await event.click();
  const sheet=page.getByTestId('calendar-sheet');
  await sheet.getByText('포트폴리오 정리',{exact:true}).waitFor();
  await page.screenshot({path:join(out,mode+'-event-detail.png')});
  if(mode==='duo'){
   const close=page.getByRole('button',{name:'Event 상세 닫기'});
   assert.deepEqual(await close.boundingBox(),frame);
   assert.equal(await switchButton.count(),0);
   await close.click();
   await switchButton.waitFor();
   assert.deepEqual(await switchButton.boundingBox(),frame);
  }else{
   const close=sheet.getByRole('button',{name:'닫기',exact:true});
   if(mode==='standard'){
    const edit=sheet.getByRole('button',{name:'이 Event 수정',exact:true});
    const editFrame=await edit.boundingBox(),closeFrame=await close.boundingBox();
    assert.ok(editFrame.x+editFrame.width<=closeFrame.x);
    assert.equal(await close.getByText('×',{exact:true}).evaluate(el=>getComputedStyle(el).fontSize),'32px');
   }
   await close.click();
  }
  await sheet.waitFor({state:'detached'});
  if(mode==='standard'){
   const pending=page.getByRole('button',{name:'28일 대기 Ticket Ticket 수정',exact:true});
   await pending.tap();
   const pendingEditor=page.getByTestId('todo-editor-surface');
   await pendingEditor.getByRole('button',{name:'Ticket 삭제',exact:true}).click();
   const cancellation=page.waitForResponse(response=>response.url().endsWith('/api/todo-create-cancellations'));
   await page.getByRole('button',{name:'Ticket 삭제 확인',exact:true}).click();
   assert.equal((await cancellation).status(),200);
   await pending.waitFor({state:'detached'});
   await page.getByRole('tab',{name:'Ticket',exact:true}).click();
   assert.equal(await page.getByRole('tab',{name:'출처별 Ticket'}).count(),0);
   const undated=page.getByRole('button',{name:'날짜 없음',exact:true}),row=page.getByRole('button',{name:'국간장 수정'});
   assert.equal(await undated.getAttribute('aria-expanded'),'true');
   await undated.click();
   assert.equal(await row.count(),0);
   await undated.click();
   await row.waitFor();
   await page.screenshot({path:join(out,'standard-ticket-lists.png')});
   const local=page.getByRole('button',{name:'기기에 반영할 삭제 수정'});
   await local.waitFor();
   assert.equal(await page.getByTestId('todo-local-ticket').getByText(/저장 결과 확인 중|반영 대기/).count(),0);
   await local.click();
   const editor=page.getByTestId('todo-editor-surface');
   assert.equal(await editor.getByRole('textbox',{name:'메모'}).inputValue(),'기기에 보관한 메모');
   await editor.getByRole('button',{name:'Ticket 저장 목록 선택'}).click();
   const popup=page.getByTestId('ticket-editor-popup');
   await popup.getByText('현재 · 미리알림',{exact:true}).waitFor();
   assert.equal(await popup.getByText(/저장 결과를 확인|반영 대기/).count(),0);
   await popup.getByRole('button',{name:'닫기',exact:true}).click();
   await page.getByRole('button',{name:'Ticket 삭제',exact:true}).click();
   await page.getByRole('button',{name:'Ticket 삭제 확인'}).click();
   await local.waitFor({state:'detached'});
   assert.equal(deleted,false);
   assert.ok(deleteRequests>=1);
   await page.reload();
   await page.getByRole('tab',{name:'Ticket',exact:true}).click();
   await page.getByRole('button',{name:'국간장 수정'}).waitFor();
   assert.equal(await local.count(),0);
   const retried=page.waitForResponse(response=>response.url().endsWith('/api/todo-deletions')&&response.status()===200,{timeout:18000});
   acceptDeletes=true;
   await retried;
   assert.equal(deleted,true);
   assert.equal(await local.count(),0);
  }
  await page.close();
 }
}finally{await browser.close();server.close();rmSync(root,{recursive:true,force:true});}
