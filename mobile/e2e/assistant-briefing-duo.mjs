import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
// The official Expo resolver is required for web fonts, blur and native-module web shims.
const temporary=mkdtempSync(join(tmpdir(),'duck-duo-layout-'));
const bundleFile=join(temporary,'fixture.js');
await promisify(execFile)(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/duo-layout.tsx'),'--bundle-output',bundleFile,'--assets-dest',temporary,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:2*1024*1024});
const bundle=readFileSync(bundleFile,'utf8');
const server=http.createServer((req,res)=>{if(req.url.includes('.ttf')){res.setHeader('Content-Type','font/ttf');res.end(readFileSync(resolve(project,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf')));return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const output=resolve(process.env.BRIEFING_CAPTURE_DIR||resolve(project,'../artifacts/assistant-briefing-2026-11-15/duo'));mkdirSync(output,{recursive:true});
const origin='https://briefing-duo.test',errors=[],captures=[],calls=[],todos=[];let page;const items=[1,2,3].map(n=>({key:String(n).repeat(64),title:['문서 확인','회의 자료 준비','답변 확인'][n-1],notes:'합성 자료',dueDate:null,sourceRefs:['notion:fixture:'+n]}));const message={id:'hour-10',kind:'briefing',title:'10시 브리핑',text:'새 요청과 미완료 내용을 확인했어요. 필요한 항목을 선택해주세요.',items,warnings:[],createdAt:Date.now(),readAt:null};
const geometry=(width,height,open=false)=>({apiAvailable:true,hasHinge:true,width,height,hingeStatus:open?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion',active:!open,frame:{x:width-60,y:32,width:28,height:28}}]});
try{
 page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,timezoneId:'Asia/Seoul'});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,method=req.method(),body=req.postDataJSON();calls.push({p,method});
  const headers={'Access-Control-Allow-Origin':`http://127.0.0.1:${server.address().port}`,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-Duckduck-Client','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'},done=(json,status=200)=>route.fulfill({json,status,headers});if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(p==='/api/auth/session')return done({user:{id:'owner',email:'owner@example.test',emailVerified:true}});
  if(p==='/api/todos')return done(todos);
  if(p==='/api/capabilities')return done({todoNotes:true,assistantChecklist:1,briefingChecklist:1,assistant:true,externalActions:true,scheduledMessages:true,calendarWorkspace:2,calendarDetails:1});
  if(p==='/api/assistant/status')return done({enabled:true,scheduledMessages:true,message:'',actions:[],consentScopes:{todo:'v1',google:'v1',slack:'v1',notion:'v1',naver:'v1'}});
  if(p==='/api/assistant/actions')return done({actions:[]});
  if(p==='/api/assistant/messages')return done({messages:[message]});
  if(p==='/api/assistant/messages/read')return done({ok:true});
  if(p.includes('/items/')){const item=items.find(i=>i.key===p.split('/').at(-1));if(['complete','todo'].includes(body.action)){let todo=todos.find(t=>t.id===item.todoId);if(!todo){todo={id:'item-'+item.key,title:item.title,notes:item.notes,category:'일상',dueDate:null,done:false,createdAt:new Date().toISOString()};todos.push(todo);item.todoId=todo.id;}todo.done=body.action==='complete';item.todo=todo;item.excluded=false;}else item.excluded=body.action==='exclude';return done({todoId:item.todoId??null,todo:item.todo??null,excluded:!!item.excluded});}
  if(p==='/api/calendar/calendars')return done({items:[{id:'primary',name:'기본',connectionId:'conn',primary:true,canWrite:true}]});
  if(p==='/api/calendar/events')return done({items:[],connectionState:'connected',connectionId:'conn',calendarId:'primary',readAt:new Date().toISOString()});
  if(p==='/api/integrations')return done([]);
  if(p==='/api/integrations/naver')return done({configured:false,connected:false,features:[]});
  if(p==='/api/operations/backup')return done({enabled:false});
  throw Error('Unexpected '+method+' '+p);
 });
 const button=name=>page.getByRole('button',{name,exact:true}),capture=async name=>{await page.screenshot({path:resolve(output,name+'.png')});captures.push(name+'.png');};
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>window.duoFixture.showApp());await page.getByRole('tab',{name:'ME',exact:true}).waitFor();await page.getByRole('tab',{name:'docen.t ai',exact:true}).click();await page.getByTestId('scheduled-message-hour-10').waitFor();await capture('01-ordinary-briefing');
 await page.getByRole('checkbox',{name:'Ticket 후보 1 완료 표시',exact:true}).click();await button('Ticket 후보 1 log 보기').waitFor();assert.equal(todos[0].done,true);
 async function swipe(n,dx){const row=page.getByTestId('assistant-checklist-row-'+n);await row.scrollIntoViewIfNeeded();await page.waitForTimeout(150);const b=await row.boundingBox(),x=b.x+b.width*.55,y=b.y+27;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y,{steps:8});await page.mouse.up();await page.waitForTimeout(350);}
 await page.setViewportSize({width:430,height:740});await page.evaluate(g=>window.duoFixture.change(g),geometry(430,740));await page.getByTestId('DuoTrailingNavigation').waitFor();await swipe(2,-85);await button('Ticket 후보 2 다시 포함').waitFor();assert.equal(todos.length,1);await swipe(3,85);await button('Ticket 후보 3 Ticket 보기').waitFor();assert.equal(todos.length,2);await swipe(3,85);assert.equal(todos.length,2);await capture('02-folded-gestures');
 await page.setViewportSize({width:960,height:740});await page.evaluate(g=>window.duoFixture.change(g),geometry(960,740,true));const fixed=await page.getByTestId('DuoFixedCalendarPane').boundingBox();await button('Ticket 후보 2 다시 포함').click();await button('Ticket 후보 2 Ticket 아님').waitFor();assert.deepEqual(await page.getByTestId('DuoFixedCalendarPane').boundingBox(),fixed);await capture('03-open-panes');
 await page.getByRole('tab',{name:'ME',exact:true}).click();await button('연결된 서비스 관리').waitFor();assert.equal(await button('Google 연결 안내').count(),0);await button('연결된 서비스 관리').click();await page.getByRole('heading',{name:'연결된 서비스',exact:true}).waitFor();await page.getByTestId('DuoBackButton').click();await button('연결된 서비스 관리').waitFor();assert.deepEqual(await page.getByTestId('DuoFixedCalendarPane').boundingBox(),fixed);await capture('04-open-me-depth');
 assert.equal(calls.some(c=>c.p==='/api/assistant/chat'),false);assert.deepEqual(errors,[]);writeFileSync(resolve(output,'verification.json'),JSON.stringify({syntheticOnly:true,captures,todos:todos.length,checkboxLog:true,leftExcludedOnly:true,rightSameTodoIdentity:true,fixedPanePreserved:true,errors},null,2));console.log('PASS: ordinary/folded/open scheduled checklist; completed log; left X no Todo write; right same ID/repeat; independent calendar pane and ME service depth; synthetic API/geometry only');
}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
