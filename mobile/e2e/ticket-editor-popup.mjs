import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
import http from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {resolve,extname} from 'node:path';import assert from 'node:assert/strict';import {chromium} from 'playwright-core';
const project=resolve(new URL('..',import.meta.url).pathname),root=mkdtempSync(join(tmpdir(),'docen-navigation-fixture-')),out=process.env.TICKET_CAPTURE_DIR||join(root,'captures');
execFileSync(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/view-welcome.tsx'),'--bundle-output',join(root,'fixture.js'),'--assets-dest',root,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:4*1024*1024});await mkdir(out,{recursive:true});
const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://x').pathname;try{if(path==='/'){res.setHeader('Content-Type','text/html');res.end('<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');return;}const file=resolve(root,'.'+path);res.setHeader('Content-Type',({'.js':'application/javascript','.ttf':'font/ttf','.png':'image/png','.mp4':'video/mp4'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});

const origin='https://ticket-editor.test';
const apple={id:'apple-ticket',title:'마지막 미리알림',notes:'남겨둘 메모를 여러 줄 이어서 적었습니다. 이어지는 문장도 편집창에서 끝까지 확인합니다.',done:false,category:'업무',dueDate:null,
 source:{provider:'apple-reminders',externalId:'reminder',listId:'inbox',listTitle:'Inbox'}};
try{
 for(const [mode,width] of [['standard',390],['duo',430],['web',1280]]){
  const page=await browser.newPage({viewport:{width,height:844},hasTouch:mode!=='web',isMobile:mode!=='web'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(10000);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.clock.install({time:new Date('2026-11-28T12:00:00Z')});
  await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
  let requestCount=0,todo=apple;
  await page.route(origin+'/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname==='/api/auth/session')return route.fulfill({json:{user:{id:'ticket-owner',email:'fixture@example.test',emailVerified:true}}});
   if(url.pathname==='/api/todos')return route.fulfill({json:[...Array.from({length:18},(_,i)=>({...apple,id:'ticket-'+i,source:undefined,title:'Ticket '+i,order:i})),{...todo,order:100}]});
   if(url.pathname==='/api/todo-destinations')return route.fulfill({json:url.searchParams.has('connectionId')?{items:[{id:'work',title:'업무 목록'}]}:{accounts:[{id:'google-account',title:'업무 계정'}]}});
   if(url.pathname==='/api/todos/apple-ticket/destination'){
    requestCount++;const target=route.request().postDataJSON();
    assert.deepEqual(target,{provider:'google',connectionId:'google-account',listId:'work'});
    todo={...todo,delivery:{...target,state:'queued'}};
    return route.fulfill({json:todo});
   }
   if(url.pathname==='/api/todos/apple-ticket'&&route.request().method()==='PATCH'){
    const patch=route.request().postDataJSON();assert.equal(patch.dueDate,'2026-11-30');
    todo={...todo,...patch};return route.fulfill({json:todo});
   }
   if(url.pathname==='/api/capabilities')return route.fulfill({json:{todoNotes:true}});
   return route.fulfill({status:404,json:{error:'fixture endpoint unavailable'}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/?mode='+mode);
  await page.evaluate(()=>window.viewWelcomeFixture.showTodos());
  const last=page.getByRole('button',{name:'마지막 미리알림 수정',exact:true});
  await last.click();
  const editor=page.getByTestId('todo-editor-surface'),popup=page.getByTestId('ticket-editor-popup');
  const title=editor.getByRole('textbox',{name:'Ticket 제목'}),note=editor.getByRole('textbox',{name:'메모'});
  assert.equal(await title.inputValue(),apple.title);assert.equal(await note.inputValue(),apple.notes);
  const rowFrame=await last.boundingBox();
  await editor.getByRole('button',{name:'예정일 편집',exact:true}).click();
  await popup.getByRole('button',{name:'오늘',exact:true}).waitFor();
  assert.equal(await editor.count(),0,'tools replace the popup contents');
  assert.equal((await last.boundingBox()).y,rowFrame.y,'the popup does not expand the underlying list');
  await popup.getByRole('button',{name:'내일',exact:true}).click();
  await popup.waitFor({state:'detached'});
  await editor.getByText('11.29',{exact:true}).waitFor();
  await editor.getByRole('button',{name:'예정일 편집',exact:true}).click();
  await popup.getByRole('button',{name:'날짜 및 시간…',exact:true}).click();
  if(mode==='standard'){
   const grid=await popup.getByTestId('month-picker-grid').boundingBox();
   const cdp=await page.context().newCDPSession(page);
   const x=Math.round(grid.x+grid.width*.80),y=Math.round(grid.y+grid.height*.6);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=6;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-i*20,y}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await popup.getByText('2026년 12월',{exact:true}).waitFor();
   await popup.getByRole('button',{name:'이전 달',exact:true}).click();
  }
  await popup.getByRole('button',{name:'2026-11-30로 변경',exact:true}).click();
  await popup.getByRole('button',{name:'적용',exact:true}).click();
  await editor.getByText('11.30',{exact:true}).waitFor();
  const saved=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/todos/apple-ticket'&&response.request().method()==='PATCH');
  await editor.getByRole('button',{name:'저장',exact:true}).click();
  assert.equal((await saved).status(),200);
  await editor.waitFor({state:'detached'});
  await last.click();
  await editor.getByRole('button',{name:'Ticket 저장 목록 선택',exact:true}).click();
  await popup.getByRole('button',{name:'Google Tasks · 업무 계정',exact:true}).click();
  await popup.getByRole('button',{name:'업무 목록',exact:true}).click();
  await popup.getByText(/이전 서비스의 원본은 보관/).waitFor();
  await popup.getByRole('button',{name:'복사하고 연결 변경',exact:true}).click();
  await popup.waitFor({state:'detached'});
  assert.equal(requestCount,1);
  assert.equal(await note.inputValue(),apple.notes);
  if(process.env.TICKET_CAPTURE_DIR)await page.screenshot({path:out+'/'+mode+'-ticket-editor.png'});
  await editor.getByRole('button',{name:'Ticket 삭제',exact:true}).click();
  await popup.getByText('Ticket을 삭제할까요?').waitFor();
  if(process.env.TICKET_CAPTURE_DIR)await page.screenshot({path:out+'/'+mode+'-ticket-delete.png'});
  await popup.getByRole('button',{name:'삭제 취소',exact:true}).click();
  await editor.getByRole('button',{name:'Ticket 편집 취소',exact:true}).click();
  await editor.waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log('PASS '+mode+': last Ticket, layered preset and detailed dates, and Apple-to-Google destination');
  await page.close();
 }
}finally{await browser.close();await new Promise(r=>server.close(r));rmSync(root,{recursive:true,force:true});}
