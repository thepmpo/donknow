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
const output=resolve(project,'../artifacts/assistant-agent-2026-11-15/current');mkdirSync(output,{recursive:true});
const origin='https://assistant-memory.test',errors=[],captures=[],calls=[],todos=[];let page,enabled=false,notes=[],turns=[];
const proposal={operation:'todo.create',label:'할 일',args:{title:'문서 확인',notes:'합성 자료',dueDate:null},sourceRefs:[]};
const item={key:'a'.repeat(64),proposalIndex:0,title:'문서 확인',notes:'합성 자료',dueDate:null,sourceRefs:[]};
const initialTurns=[{id:'saved-user',role:'user',text:'문서를 확인할 일로 정리해줘',createdAt:Date.now()-60000,state:'sent'},{id:'saved-answer',role:'assistant',text:'확인할 내용을 정리했어요.',proposals:[proposal],items:[item],createdAt:Date.now()-59000}];
const geometry=(width,height,open=false)=>({apiAvailable:true,hasHinge:true,width,height,hingeStatus:open?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[]});
try{
 page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{const req=route.request(),p=new URL(req.url()).pathname,method=req.method(),body=req.postDataJSON();calls.push({p,method});const headers={'Access-Control-Allow-Origin':`http://127.0.0.1:${server.address().port}`,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-Duckduck-Client','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'},done=(json,status=200)=>route.fulfill({json,status,headers});if(method==='OPTIONS')return route.fulfill({status:204,headers});
 if(p==='/api/auth/session')return done({user:{id:'owner',email:'owner@example.test',emailVerified:true}});
 if(p==='/api/todos')return done(todos);
 if(p==='/api/capabilities')return done({todoNotes:true,assistantChecklist:1,briefingChecklist:1,assistantMemory:1,assistant:true,externalActions:true,scheduledMessages:true,calendarWorkspace:2,calendarDetails:1});
 if(p==='/api/assistant/status')return done({enabled:true,actions:[{operation:'todo.create',provider:'todo',label:'할 일',fields:['title','notes','dueDate'],required:['title']}],memory:{enabled,count:notes.length,turnCount:turns.length},consentScopes:{todo:'v1',google:'v1',slack:'v1',notion:'v1',naver:'v1'}});
 if(p==='/api/assistant/actions')return done({actions:[]});
 if(p==='/api/assistant/messages')return done({messages:[]});
 if(p==='/api/assistant/conversation')return done({turns,before:null});
 if(p==='/api/assistant/memory/settings'){if(method==='POST'){enabled=body.enabled;if(enabled&&!turns.length)turns=structuredClone(initialTurns);}return done({enabled,count:notes.length,turnCount:turns.length});}
 if(p==='/api/assistant/memory'){
  if(method==='GET')return done({memories:notes});
  if(method==='DELETE'){assert.equal(body.confirmation,'DELETE');notes=[];turns=[];return done({ok:true});}
  const note={id:'11111111-1111-1111-1111-111111111111',text:body.text,source:'user',updatedAt:Date.now()};notes.push(note);return done(note,201);
 }
 if(p.startsWith('/api/assistant/memory/')){const note=notes[0];if(method==='PATCH')note.text=body.text;else notes=[];return done(note??{ok:true});}
 if(p.includes('/conversation/')&&p.includes('/items/')){let todo=todos.find(t=>t.id===item.todoId);if(!todo){todo={id:'stable-todo',title:item.title,notes:item.notes,category:'일상',done:true,dueDate:null,createdAt:new Date().toISOString()};todos.push(todo);}item.todoId=todo.id;item.todo=todo;turns[1].items=[item];return done({todoId:todo.id,todo,excluded:false});}
 if(p==='/api/calendar/calendars')return done({items:[]});if(p==='/api/calendar/events')return done({items:[],connectionState:'disconnected'});if(p==='/api/integrations')return done([]);if(p==='/api/integrations/naver')return done({configured:false,connected:false,features:[]});if(p==='/api/operations/backup')return done({enabled:false});throw Error('Unexpected '+method+' '+p);
 });
 const button=name=>page.getByRole('button',{name,exact:true}),capture=async name=>{await page.screenshot({path:resolve(output,name+'.png')});captures.push(name+'.png');};
 const openMemory=async()=>{await page.getByRole('tab',{name:'ME',exact:true}).click();for(let i=0;i<4&&!await page.getByTestId('me-overview').isVisible();i++){const back=page.getByTestId('DuoBackButton');if(await back.count())await back.click();else await button('돌아가기').click();}await button('데이터·개인정보').click();await button('대화와 기억').click();await page.getByText('대화 저장·기억 사용',{exact:true}).waitFor();};
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>window.duoFixture.showApp());await openMemory();await capture('01-ordinary-memory-opt-in');await page.getByRole('switch',{name:'대화 저장·기억 사용',exact:true}).click();await page.getByText('저장된 대화 2개 · 기억 0개',{exact:true}).waitFor();
 await page.getByRole('textbox',{name:'기억할 내용',exact:true}).fill('답장은 간결한 한국어로');await button('기억 추가').click();await page.getByText('저장된 대화 2개 · 기억 1개',{exact:true}).waitFor();await capture('02-memory-note');await button('기억 수정 답장은 간결한 한국어로').click();await page.getByRole('textbox',{name:'기억할 내용',exact:true}).fill('한 문단으로 답장해줘');await button('기억 수정 저장').click();await button('기억 잊기 한 문단으로 답장해줘').waitFor();await button('닫기').click();
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('checkbox',{name:'할 일 후보 1 완료 표시',exact:true}).click();await button('할 일 후보 1 log 보기').waitFor();assert.equal(todos.length,1);await capture('03-restored-chat-completed');
 await page.reload();await page.evaluate(()=>window.duoFixture.showApp());await page.getByRole('tab',{name:'duckduck',exact:true}).click();await button('할 일 후보 1 log 보기').waitFor();assert.equal(todos.length,1);await page.setViewportSize({width:430,height:740});await page.evaluate(g=>window.duoFixture.change(g),geometry(430,740));await capture('04-folded-restored-chat');
 await page.setViewportSize({width:960,height:740});await page.evaluate(g=>window.duoFixture.change(g),geometry(960,740,true));await page.emulateMedia({colorScheme:'dark'});await openMemory();await button('기억 잊기 한 문단으로 답장해줘').click();await page.getByText('저장된 대화 2개 · 기억 0개',{exact:true}).waitFor();await capture('05-open-dark-memory');await button('대화·기억 모두 지우기').click();await button('대화·기억 삭제 확인').click();await page.getByText('저장된 대화 0개 · 기억 0개',{exact:true}).waitFor();if(await page.getByTestId('DuoBackButton').count())await page.getByTestId('DuoBackButton').last().click();else await button('닫기').click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();assert.equal(await page.getByText('확인할 내용을 정리했어요.',{exact:true}).count(),0);assert.equal(todos.length,1);assert.deepEqual(errors,[]);
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({syntheticOnly:true,captures,calls,ownerMemoryOptIn:true,editForget:true,conversationChecklistRestored:true,stableTodoId:todos[0].id,fullClearPreservesTodo:true,errors},null,2));console.log('PASS: actual Expo ME memory opt-in/add/edit/forget/full-clear; chat/checklist reload keeps Todo ID; ordinary/folded/open/dark synthetic geometry, no external writes.');
}catch(error){if(page)console.log('DEBUG',await page.evaluate(()=>document.body.innerText.slice(-2200)));throw error;}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
