import {openAssistantSettings,closeAssistantSettings} from './helpers.mjs';
import {openDuckTools,openMe,openMeAccount,openMeData,openMeService,openServicePanel} from './helpers.mjs';
import http from 'node:http';
import { readFile, mkdtemp, rm, readdir, mkdir } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const project=resolve(new URL('..',import.meta.url).pathname);
const checkout=resolve(project,'..');
const root=resolve(project,'dist-web');
const artifacts=resolve(process.env.APP_CAPTURE_DIR||resolve(checkout,'artifacts'));await mkdir(artifacts,{recursive:true});
const server=http.createServer(async(req,res)=>{try{const file=resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+'/'))throw new Error('invalid');const path=file===root+'/'?root+'/index.html':file;const data=await readFile(path);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.html':'text/html; charset=utf-8','.ttf':'font/ttf','.ico':'image/x-icon'})[extname(path)]||'application/octet-stream'});res.end(data);}catch{try{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(await readFile(root+'/index.html'));}catch{res.writeHead(404);res.end();}}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const dir=await mkdtemp(join(tmpdir(),'duckduck-mobile-e2e-'));
const api=spawn(process.execPath,['server.js'],{cwd:checkout,env:{...process.env,DATA_DIR:dir,PORT:'0',PUBLIC_ORIGIN:'https://duckduck-api.test',COOKIE_SECURE:'1',NODE_ENV:'test',MAIL_TRANSPORT:'test-outbox',TEST_MAIL_DIR:join(dir,'mail')},stdio:['ignore','pipe','pipe']});
const port=await new Promise((resolve,reject)=>{api.once('error',reject);api.once('exit',code=>reject(new Error('API startup failed: '+code)));api.stdout.on('data',chunk=>{const match=String(chunk).match(/port (\d+)/);if(match)resolve(match[1]);});});
async function readCode(subject){const until=Date.now()+5000;while(Date.now()<until){let files=[];try{files=await readdir(join(dir,'mail'));}catch{}for(const file of files.filter(name=>name.endsWith('.json'))){const value=JSON.parse(await readFile(join(dir,'mail',file),'utf8'));if(value.to==='mobile@example.test'&&value.subject.includes(subject))return /인증번호: (\d{6})/.exec(value.text)[1];}await new Promise(r=>setTimeout(r,20));}throw new Error('Fixture mail not delivered');}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);
await page.emulateMedia({reducedMotion:'reduce'});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
let failApi=false,holdTodoWrites=false,failHeldWrites=false,holdTodoRead=false;
const readGates=[];
async function waitForRead(){const deadline=Date.now()+5000;while(!readGates.length){if(Date.now()>deadline)throw Error('Expected held Todo refresh');await new Promise(r=>setTimeout(r,10));}}
const writeGates=[];
async function waitForGate(count){const deadline=Date.now()+5000;while(writeGates.length<count){if(Date.now()>deadline)throw Error('Expected queued Todo write');await new Promise(r=>setTimeout(r,10));}}
await page.route('https://duckduck-api.test/**',async route=>{
 const request=route.request(), path=new URL(request.url()).pathname;
 if(!path.startsWith('/api/')){const response=await fetch(`http://127.0.0.1:${server.address().port}`+path);await route.fulfill({status:response.status,headers:{'content-type':response.headers.get('content-type')||'application/octet-stream'},body:Buffer.from(await response.arrayBuffer())});return;}
 if(failApi){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'test outage'})});return;}
 if(request.method()==='PATCH'&&path.startsWith('/api/todos/')){if(holdTodoWrites)await new Promise(resolve=>writeGates.push(resolve));if(failHeldWrites){await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'delayed test outage'})});return;}}
 const source=await request.allHeaders(), headers={};for(const key of ['content-type','x-duckduck-client','cookie','authorization','origin'])if(source[key])headers[key]=source[key];
 const response=await fetch(`http://127.0.0.1:${port}`+path,{method:request.method(),headers,...(request.postData()?{body:request.postData()}: {})});
 if(holdTodoRead&&request.method()==='GET'&&path==='/api/todos')await new Promise(resolve=>readGates.push(resolve));
 const resultHeaders={'content-type':'application/json'};const cookie=response.headers.get('set-cookie');if(cookie)resultHeaders['set-cookie']=cookie;
 await route.fulfill({status:response.status,headers:resultHeaders,body:await response.text()});
});
await page.goto('https://duckduck-api.test/');
await page.getByRole('button',{name:'화면 먼저 체험하기',exact:true}).click();
await page.getByRole('tab',{name:'Todo 리스트',exact:true}).waitFor();
assert.equal(await page.getByRole('tab').count(),5);assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),2);
// Verify shared layout at phone widths and with enlarged text before screenshots.
for(const width of [320,390,430]){
 await page.setViewportSize({width,height:844});
 for(const name of ['캘린더','Todo 리스트','duckduck','log','ME']){
  await page.getByRole('tab',{name,exact:true}).click();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`${name} overflow at ${width}`);
  const tabBar=await page.getByTestId('BottomNavigation').boundingBox();assert.ok(tabBar&&tabBar.y+tabBar.height<=845,'navigation stays inside viewport');
  const enlargedFits=await page.evaluate(()=>{
   const nodes=Array.from(document.querySelectorAll('[dir="auto"],input,textarea')).filter(el=>el.getBoundingClientRect().width>0);
   const original=nodes.map(el=>({el,fontSize:el.style.fontSize,lineHeight:el.style.lineHeight}));
   const sizes=nodes.map(el=>({font:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)}));
   nodes.forEach((el,i)=>{el.style.fontSize=sizes[i].font*1.6+'px';if(Number.isFinite(sizes[i].line))el.style.lineHeight=sizes[i].line*1.6+'px';});
   const fits=document.documentElement.scrollWidth<=innerWidth;
   original.forEach(({el,fontSize,lineHeight})=>{el.style.fontSize=fontSize;el.style.lineHeight=lineHeight;});return fits;
  });assert.equal(enlargedFits,true,`${name} enlarged text overflow at ${width}`);
 }
}
await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
await page.screenshot({path:join(artifacts,'mobile-todos.png')});
await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('아이폰 앱 확인하기');await page.getByRole('textbox',{name:'메모',exact:true}).fill('- 준비물');assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'• 준비물');await page.getByRole('textbox',{name:'메모',exact:true}).press('End');await page.getByRole('textbox',{name:'메모',exact:true}).press('Enter');await page.getByRole('textbox',{name:'메모',exact:true}).pressSequentially('agenda');assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'• 준비물\n• agenda');
await page.getByRole('textbox',{name:'메모',exact:true}).fill('- 긴 메모\n'.repeat(60));assert.ok(await page.getByRole('textbox',{name:'메모',exact:true}).evaluate(el=>el.clientHeight>300&&el.scrollHeight<=el.clientHeight+3));
const scrollState=await page.getByTestId('editor-scroll').evaluate(el=>{el.scrollTop=el.scrollHeight;return {moved:el.scrollTop>0,hidden:getComputedStyle(el).scrollbarWidth==='none'||getComputedStyle(el,'::-webkit-scrollbar').display==='none'};});assert.equal(scrollState.moved,true);assert.equal(scrollState.hidden,true);
await page.getByRole('textbox',{name:'메모',exact:true}).fill('• 준비물\n• agenda');assert.ok(await page.getByRole('textbox',{name:'메모',exact:true}).evaluate(el=>el.clientHeight<=240));await page.screenshot({path:join(artifacts,'mobile-notes-fixture.png')});await page.getByRole('button',{name:'저장',exact:true}).click();
await page.getByText('아이폰 앱 확인하기',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),3);

const row=page.getByTestId(/^todo-/).filter({visible:true}).filter({hasText:'아이폰 앱 확인하기'});await row.scrollIntoViewIfNeeded();const b=await row.boundingBox();
await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+90,b.y+b.height/2,{steps:8});await page.mouse.up();
await page.getByText('완료 · 3초 후 log로 이동',{exact:true}).filter({visible:true}).waitFor();
await new Promise(r=>setTimeout(r,1800));assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),3);await row.waitFor({state:'detached'});assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),2);
await page.getByRole('tab',{name:'log',exact:true}).click();await page.getByText('아이폰 앱 확인하기',{exact:true}).filter({visible:true}).waitFor();await page.screenshot({path:join(artifacts,'mobile-log.png')});
await page.getByRole('button',{name:'아이폰 앱 확인하기 되돌리기',exact:true}).click();await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByText('아이폰 앱 확인하기',{exact:true}).filter({visible:true}).waitFor();

await page.getByRole('tab',{name:'캘린더',exact:true}).click();assert.ok([28,35,42].includes(await page.getByRole('button',{name:/할 일 \d+개/}).count()));await page.locator('[data-testid="calendar-date-grid"] [aria-selected="true"]').click({position:{x:8,y:8}});await page.getByRole('button',{name:'아이폰 앱 확인하기 수정',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'• 준비물\n• agenda');await page.getByRole('button',{name:'닫기',exact:true}).click();await page.screenshot({path:join(artifacts,'mobile-calendar.png')});
await page.getByRole('tab',{name:'duckduck',exact:true}).click();
await openDuckTools(page);await page.getByRole('button',{name:'할 일과 기록 찾기',exact:true}).click();
await page.getByRole('textbox',{name:'할 일과 기록 검색',exact:true}).fill('회의 자료');await page.getByText('팀 회의 자료 준비하기',{exact:true}).filter({visible:true}).waitFor();
await page.getByRole('button',{name:'할 일 열기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'할 일 제목',exact:true}).inputValue(),'팀 회의 자료 준비하기');await page.getByRole('button',{name:'닫기',exact:true}).click();
await openDuckTools(page);await page.getByRole('button',{name:'할 일과 기록 찾기',exact:true}).click();await page.getByRole('textbox',{name:'할 일과 기록 검색',exact:true}).fill('중요한');await page.getByRole('tab',{name:'완료 기록',exact:true}).click();await page.getByText('오늘 가장 중요한 일 정하기',{exact:true}).filter({visible:true}).waitFor();await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.setViewportSize({width:390,height:844});await page.screenshot({path:join(artifacts,'mobile-record-search.png')});
await page.getByRole('button',{name:'미완료로 되돌리기',exact:true}).click();await page.getByText('미완료 할 일로 되돌렸어요.',{exact:true}).filter({visible:true}).waitFor();await page.getByText('일치하는 기록이 없어요. 다른 단어로 찾아보세요.',{exact:true}).filter({visible:true}).waitFor();await page.getByRole('tab',{name:'미완료 기록',exact:true}).click();await page.getByText('오늘 가장 중요한 일 정하기',{exact:true}).filter({visible:true}).waitFor();await page.getByRole('textbox',{name:'할 일과 기록 검색',exact:true}).fill('찾을수없는항목');await page.getByText('일치하는 기록이 없어요. 다른 단어로 찾아보세요.',{exact:true}).filter({visible:true}).waitFor();await page.getByRole('button',{name:'닫기',exact:true}).click();
await page.screenshot({path:join(artifacts,'mobile-duckduck.png')});await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('임시 메모');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByRole('textbox',{name:'정리한 할 일',exact:true}).fill('');await page.getByRole('button',{name:'Todo 리스트에 추가',exact:true,disabled:true}).waitFor();await page.getByRole('button',{name:'초안 버리기',exact:true}).click();await page.getByText('무엇을 도와드릴까요?',{exact:true}).filter({visible:true}).waitFor();
await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('덕에서 정리한 할 일 초안');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByRole('textbox',{name:'정리한 할 일',exact:true}).fill('덕에서 정리한 할 일');await page.screenshot({path:join(artifacts,'mobile-duck-draft.png')});await page.getByRole('button',{name:'Todo 리스트에 추가',exact:true}).click();await page.getByText('추가 완료 ✓',{exact:true}).filter({visible:true}).waitFor();await page.getByRole('button',{name:'Todo 보기 →',exact:true}).click();await page.getByRole('button',{name:'덕에서 정리한 할 일 수정',exact:true}).waitFor();
await page.getByRole('tab',{name:'duckduck',exact:true}).click();
await openDuckTools(page);await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();
await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).fill('친구: 내일까지 자료 보내줘. 비공개 대화 원문');
await page.getByRole('textbox',{name:'대화에서 정리한 할 일',exact:true}).fill('회의 자료 보내기');
await page.screenshot({path:join(artifacts,'mobile-kakao-paste.png')});
await page.getByRole('button',{name:'할 일 확인하기',exact:true}).click();
assert.equal(await page.getByText('친구: 내일까지 자료 보내줘. 비공개 대화 원문',{exact:true}).filter({visible:true}).count(),0);
await openDuckTools(page);await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();
assert.equal(await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).inputValue(),'');
await page.getByRole('button',{name:'닫기',exact:true}).click();
await page.getByRole('button',{name:'Todo 리스트에 추가',exact:true}).click();
await page.getByText('회의 자료 보내기',{exact:true}).filter({visible:true}).waitFor();
await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
await page.getByRole('button',{name:'회의 자료 보내기 수정',exact:true}).click();
await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__sharedTodo=data.text;}});});
await page.getByRole('button',{name:'카카오톡 등으로 공유',exact:true}).click();
assert.equal(await page.evaluate(()=>window.__sharedTodo.includes('회의 자료 보내기')&&!window.__sharedTodo.includes('비공개 대화 원문')),true);
await page.screenshot({path:join(artifacts,'mobile-kakao-share.png')});
await page.getByRole('button',{name:'닫기',exact:true}).click();
await page.getByRole('tab',{name:'ME',exact:true}).click();await page.screenshot({path:join(artifacts,'mobile-profile.png')});
await page.getByRole('button',{name:'서비스 추가·가져오기',exact:true}).click();await page.getByRole('button',{name:'아이폰 미리 알림 가져오기',exact:true}).click();await page.getByText('미리 알림 가져오기는 아이폰 앱에서 사용할 수 있어요.',{exact:true}).filter({visible:true}).waitFor();await page.screenshot({path:join(artifacts,'mobile-apple-reminders.png')});await page.getByRole('button',{name:'돌아가기',exact:true}).click();
await openMeAccount(page);await page.getByRole('button',{name:'로그인·연결 설정',exact:true}).click();await page.getByRole('textbox',{name:'클라우드 서버 주소',exact:true}).fill('https://duckduck-api.test');await page.getByRole('button',{name:'연결하기',exact:true}).click();await page.getByRole('button',{name:'처음이에요 · 회원가입',exact:true}).click();await page.getByRole('textbox',{name:'이메일',exact:true}).fill('mobile@example.test');await page.getByLabel('비밀번호',{exact:true}).fill('mobile-test-password');await page.screenshot({path:join(artifacts,'mobile-auth.png')});await page.getByRole('button',{name:'계정 만들기',exact:true}).click();await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),0);
await openMeAccount(page);await page.getByRole('button',{name:'이메일 인증',exact:true}).click();await page.getByRole('button',{name:'인증번호 요청',exact:true}).click();await page.getByText('인증번호 전송을 요청했어요. 메일을 확인해주세요.',{exact:true}).filter({visible:true}).waitFor();await page.screenshot({path:join(artifacts,'mobile-verification.png')});const verification=await readCode('이메일 인증');await page.getByRole('textbox',{name:'6자리 인증번호',exact:true}).fill(verification);await page.getByRole('button',{name:'인증 완료',exact:true}).click();await page.getByText('이메일 인증 완료',{exact:true}).filter({visible:true}).waitFor();await page.screenshot({path:join(artifacts,'mobile-account-settings.png')});await openMe(page);await page.getByRole('button',{name:'서비스 추가·가져오기',exact:true}).click();await page.getByText('준비 중인 서비스',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Google 연결 안내',exact:true}).count(),0);await page.screenshot({path:join(artifacts,'mobile-services.png')});
let fixtureSyncEnabled=false,fixtureCanEnable=false;
const tasksFixture = async route => {
 const url=new URL(route.request().url());
 if(url.pathname==='/api/integrations') return route.fulfill({json:[{provider:'google',name:'Google',configured:true,connected:true,label:'테스트 계정',features:['tasks','tasksWrite'],availableFeatures:['tasks','tasksWrite']}]});
 if(url.pathname.endsWith('/task-sync')) {if(route.request().method()==='POST')fixtureSyncEnabled=JSON.parse(route.request().postData()).enabled;return route.fulfill({json:{enabled:fixtureSyncEnabled,canEnable:fixtureCanEnable,jobs:[]}});}
 if(url.pathname.endsWith('/diagnose')) return route.fulfill({json:{ok:true}});
 if(url.pathname.endsWith('/search')) return route.fulfill({json:{items:[{id:'fixture:tasks:list1:open-search',title:'테스트: 자료 준비',completed:false,listTitle:'업무',dueDate:null},{id:'fixture:tasks:list1:done-search',title:'테스트: 자료 검토 완료',completed:true,listTitle:'지난 업무',dueDate:null}],partial:true,searchedLists:5}});
 if(url.pathname.endsWith('/resources')) return route.fulfill({json:{items:url.searchParams.get('status')==='completed'&&url.searchParams.has('channel')?[{id:'fixture:tasks:list1:done1',title:'테스트: 지난 회의 준비',kind:'task',completed:true}]:url.searchParams.has('channel')?[{id:'fixture:tasks:list1:task1',title:'테스트: 회의 준비',dueDate:'2030-01-01',kind:'task'}]:[{id:'list1',title:'테스트 목록',kind:'tasklist'}],nextCursor:null}});
 return route.fallback();
};
await page.route('https://duckduck-api.test/api/integrations**',tasksFixture);
await page.getByRole('button',{name:'서비스 상태 다시 확인',exact:true}).click();await openMeService(page,'Google');await openServicePanel(page,'연결 문제 해결');
await page.getByRole('button',{name:'연결 점검',exact:true}).click();await page.getByText('연결된 계정의 읽기 접근을 확인했어요.',{exact:true}).filter({visible:true}).waitFor();
await openServicePanel(page,'완료 동기화');await page.getByRole('button',{name:'Google Tasks 수정 권한 승인',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'완료 동기화 켜기',exact:true}).isDisabled(),true);fixtureCanEnable=true;await page.getByRole('button',{name:'동기화 상태 새로고침',exact:true}).click();
await page.getByRole('button',{name:'완료 동기화 켜기',exact:true,disabled:false}).click();await page.getByRole('button',{name:'완료 동기화 끄기',exact:true}).waitFor();await page.screenshot({path:join(artifacts,'mobile-task-sync-fixture.png')});await page.getByRole('button',{name:'완료 동기화 끄기',exact:true}).click();await page.getByRole('button',{name:'완료 동기화 켜기',exact:true}).waitFor();
await openServicePanel(page,'자료 가져오기');await page.getByRole('button',{name:'Google Tasks',exact:true}).click();
await page.getByRole('button',{name:'테스트 목록',exact:true}).click();
await page.getByRole('checkbox',{name:'테스트: 회의 준비',exact:true}).click();
await page.getByRole('button',{name:'선택한 1개를 Todo에 추가',exact:true,disabled:false}).waitFor();
await page.screenshot({path:join(artifacts,'mobile-google-tasks-fixture.png')});
await page.getByRole('button',{name:'완료 기록 보기',exact:true}).click();
await page.getByText('테스트: 지난 회의 준비',{exact:true}).filter({visible:true}).waitFor();
await page.getByText('완료 기록 · 참고용',{exact:true}).filter({visible:true}).waitFor();
assert.equal(await page.getByRole('checkbox',{name:'테스트: 지난 회의 준비',exact:true}).count(),0);
await page.getByRole('button',{name:'선택한 0개를 Todo에 추가',exact:true,disabled:true}).waitFor();
await page.screenshot({path:join(artifacts,'mobile-completed-reference-fixture.png')});
await page.getByRole('button',{name:'미완료 할 일 보기',exact:true}).click();
await page.getByRole('checkbox',{name:'테스트: 회의 준비',exact:true}).waitFor();

await page.getByRole('button',{name:'Tasks 목록 다시 선택',exact:true}).click();await page.getByRole('button',{name:'선택한 0개를 Todo에 추가',exact:true,disabled:true}).waitFor();
await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();await openDuckTools(page);await page.getByRole('button',{name:'할 일과 기록 찾기',exact:true}).click();
await page.getByRole('textbox',{name:'할 일과 기록 검색',exact:true}).fill('자료');await page.getByRole('button',{name:'Google Tasks에서 찾기',exact:true}).click();await page.getByText('테스트: 자료 검토 완료',{exact:true}).filter({visible:true}).waitFor();await page.getByText('일부 기록만 검색했어요. 나머지는 서비스 연결 화면에서 목록별로 확인해주세요.',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 할 일 가져오기',exact:true}).count(),1);
await page.getByRole('tab',{name:'완료 기록',exact:true}).click();await page.getByText('테스트: 자료 검토 완료',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByRole('button',{name:'이 할 일 가져오기',exact:true}).count(),0);await page.screenshot({path:join(artifacts,'mobile-external-search-fixture.png')});
await page.getByRole('textbox',{name:'할 일과 기록 검색',exact:true}).fill('다른 단어');await page.getByText('테스트: 자료 검토 완료',{exact:true}).filter({visible:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'닫기',exact:true}).click();
assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),0);
await page.unroute('https://duckduck-api.test/api/integrations**',tasksFixture);await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('실제 클라우드 API 저장 검증');await page.getByRole('textbox',{name:'메모',exact:true}).fill('- 클라우드 메모');await page.getByLabel('예정일 선택',{exact:true}).fill('2030-01-01');await page.getByRole('switch',{name:'할 일 알림',exact:true}).click();await page.getByLabel('알림 시',{exact:true}).selectOption('09');await page.getByLabel('알림 분',{exact:true}).selectOption('00');await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(artifacts,'mobile-reminder.png')});await page.setViewportSize({width:390,height:844});const oldNotesServer=route=>route.fulfill({json:{mail:true,integrations:[]}});await page.route('https://duckduck-api.test/api/capabilities',oldNotesServer);await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByText('저장하지 못했어요. 연결을 확인하고 다시 시도해주세요.',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'• 클라우드 메모');assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),0);await page.unroute('https://duckduck-api.test/api/capabilities',oldNotesServer);await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByText('실제 클라우드 API 저장 검증',{exact:true}).filter({visible:true}).waitFor();
await openMeData(page);await page.getByRole('button',{name:'내 데이터 내보내기',exact:true}).click();const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'내 데이터 파일 다운로드',exact:true}).click();const downloaded=await downloadEvent;const personalExport=JSON.parse(await readFile(await downloaded.path(),'utf8'));assert.equal(personalExport.format,'duckduck-personal-v1');assert.equal(personalExport.todos.length,1);assert.equal(personalExport.todos[0].title,'실제 클라우드 API 저장 검증');assert.equal(personalExport.todos[0].notes,'• 클라우드 메모');assert.ok(!JSON.stringify(personalExport).includes('accessToken'));await page.screenshot({path:join(artifacts,'mobile-personal-export.png')});await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();
// A slow cloud response must not delay checking or undo; writes stay ordered.
holdTodoWrites=true;
await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).click();await waitForGate(1);
assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 미완료로 변경',exact:true}).isChecked(),true,'checked before server response');
await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 되돌리기',exact:true}).click();
assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).isChecked(),false,'undo before server response');
assert.equal(writeGates.length,1,'same-item writes do not race');writeGates[0]();await waitForGate(2);
assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).isChecked(),false,'old acknowledgement does not reverse undo');
holdTodoWrites=false;writeGates[1]();await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 수정',exact:true,disabled:false}).waitFor();
assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json())[0].done),false);
// Four seconds start at the tap, and a later failed save restores the row.
holdTodoWrites=true;await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).click();await waitForGate(3);await new Promise(r=>setTimeout(r,5500));assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),0);
failHeldWrites=true;holdTodoWrites=false;writeGates[2]();await page.getByRole('alert').waitFor();assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).isChecked(),false);failHeldWrites=false;
// A refresh started before the tap cannot overwrite the newer optimistic state.
holdTodoRead=true;const staleReadFinished=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/todos'&&response.request().method()==='GET');await page.getByRole('button',{name:'데이터 다시 불러오기',exact:true}).click();await waitForRead();
holdTodoWrites=true;await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).click();await waitForGate(4);assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 미완료로 변경',exact:true}).isChecked(),true);
holdTodoWrites=false;writeGates[3]();await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 수정',exact:true,disabled:false}).waitFor();holdTodoRead=false;readGates[0]();await staleReadFinished;await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));assert.equal(await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 미완료로 변경',exact:true}).isChecked(),true,'stale refresh ignored');
await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 되돌리기',exact:true}).click();await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 수정',exact:true,disabled:false}).waitFor();
failApi=true;await page.getByRole('checkbox',{name:'실제 클라우드 API 저장 검증 완료하기',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),1);assert.equal(await page.getByRole('checkbox').isChecked(),false);failApi=false;await page.getByRole('button',{name:'데이터 다시 불러오기',exact:true}).click();await page.getByRole('alert').waitFor({state:'hidden'});
const saved=await page.evaluate(async()=>await(await fetch('/api/todos')).json());assert.equal(saved[0].title,'실제 클라우드 API 저장 검증');assert.equal(saved.length,1);assert.ok(saved[0].reminderAt.startsWith('2030-01-01')); 
await page.reload();await page.getByText('실제 클라우드 API 저장 검증',{exact:true}).filter({visible:true}).waitFor();
await openMeAccount(page);await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),0);
await page.getByRole('button',{name:'처음이에요 · 회원가입',exact:true}).click();await page.getByRole('textbox',{name:'이메일',exact:true}).fill('other@example.test');await page.getByLabel('비밀번호',{exact:true}).fill('other-test-password');await page.getByRole('button',{name:'계정 만들기',exact:true}).click();await page.getByRole('tab',{name:'Todo 리스트',exact:true}).waitFor();assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),0);
await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('button',{name:'할 일 추가',exact:true}).waitFor();await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
await page.evaluate(async()=>{await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json','X-Duckduck-Client':'web'},body:'{}'});});
await page.getByRole('button',{name:'할 일 추가',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).fill('만료된 로그인');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'할 일 제목',exact:true}).count(),0);
await page.getByRole('button',{name:'비밀번호를 잊었어요',exact:true}).click();await page.getByRole('textbox',{name:'계정 이메일',exact:true}).fill('mobile@example.test');await page.getByRole('button',{name:'인증번호 요청',exact:true}).click();const reset=await readCode('비밀번호');await page.getByRole('textbox',{name:'6자리 인증번호',exact:true}).fill(reset);await page.getByLabel('새 비밀번호',{exact:true}).fill('changed-fixture-password');await page.getByRole('button',{name:'비밀번호 변경',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();await page.getByRole('textbox',{name:'이메일',exact:true}).fill('mobile@example.test');await page.getByLabel('비밀번호',{exact:true}).fill('changed-fixture-password');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 수정',exact:true}).waitFor();
// Calendar events remain distinct from Todo and include their scheduled time.
const calendarFixture=route=>{const today=new Date().toISOString().slice(0,10);return route.fulfill({json:{items:[{id:'fixture-calendar-event',title:'테스트: 시간 있는 일정',dueDate:today,startAt:today+'T09:00:00+09:00',endAt:today+'T10:00:00+09:00',allDay:false}],nextCursor:null}});};await page.route('https://duckduck-api.test/api/calendar/events**',calendarFixture);await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.getByText('테스트: 시간 있는 일정',{exact:true}).filter({visible:true}).last().waitFor();await page.locator('[data-testid="calendar-date-grid"] [aria-selected="true"]').click({position:{x:8,y:8}});await page.getByText('일정',{exact:true}).filter({visible:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'테스트: 시간 있는 일정 일정 상세',exact:true}).count(),1);await page.getByRole('button',{name:'테스트: 시간 있는 일정 일정 상세',exact:true}).click();await page.getByTestId('calendar-event-detail').waitFor();assert.equal(await page.getByRole('button',{name:'Todo로 추가',exact:true}).count(),0,'event detail no longer includes the removed shortcut');await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();await page.screenshot({path:join(artifacts,'mobile-calendar-events-fixture.png')});await page.unroute('https://duckduck-api.test/api/calendar/events**',calendarFixture);
// Assistant manual execution stays separate from AI and does not write until explicit confirmation.
await page.getByRole('tab',{name:'duckduck',exact:true}).click();await openDuckTools(page);await page.getByRole('button',{name:'덕 AI 비서 열기',exact:true}).click();
await page.getByText('AI 서비스가 아직 설정되지 않았어요. 직접 작업을 작성하고 확인해 실행할 수 있어요.',{exact:true}).filter({visible:true}).waitFor();
await page.getByRole('button',{name:'덕에게 물어보기',exact:true,disabled:true}).waitFor();await page.getByRole('button',{name:'자료 확인하기',exact:true}).click();await page.getByText('확인한 자료 1개',{exact:true}).filter({visible:true}).waitFor();
await page.getByRole('button',{name:'직접 작업 작성',exact:true}).click();await page.getByRole('button',{name:'Todo 추가',exact:true}).click();await page.getByRole('textbox',{name:'작업 제목',exact:true}).fill('비서가 확인 후 추가한 일');await page.getByRole('button',{name:'실행 전 내용 확인',exact:true}).click();await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).waitFor();
assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),1,'preview does not create todo');
await page.getByRole('button',{name:'직접 작업 접기',exact:true}).click();await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).click();await page.getByText('Todo 추가 · 완료',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),2);
await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(artifacts,'mobile-assistant-action-fixture.png')});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'닫기',exact:true}).click();
await page.evaluate(async()=>{const todos=await(await fetch('/api/todos')).json();const todo=todos.find(t=>t.title==='비서가 확인 후 추가한 일');const r=await fetch('/api/todos/'+todo.id,{method:'DELETE',headers:{'Content-Type':'application/json','X-Duckduck-Client':'web'}});if(!r.ok)throw Error('Fixture cleanup failed');});await page.reload();await page.getByRole('button',{name:'실제 클라우드 API 저장 검증 수정',exact:true}).waitFor();await page.getByRole('tab',{name:'ME',exact:true}).click();
// New briefing combines selected read-only sources, handles weather failure, and never writes.
await page.getByRole('tab',{name:'duckduck',exact:true}).click();
await openDuckTools(page);await page.getByRole('button',{name:'오늘의 브리핑 열기',exact:true}).click();
await page.getByText('오늘의 브리핑',{exact:true}).filter({visible:true}).waitFor();
const briefingFixture=route=>{assert.deepEqual(route.request().postDataJSON().providers,['google']);return route.fulfill({json:{readAt:new Date().toISOString(),warnings:['테스트: 일부 자료'],sources:[{ref:'google:event',provider:'google',kind:'event',title:'테스트 브리핑 일정'},{ref:'google:done',provider:'google',kind:'task',title:'완료 자료 제외',completed:true}]}});};
await page.route('https://duckduck-api.test/api/assistant/context',briefingFixture);
await page.getByRole('button',{name:'Google',exact:true}).click();await page.getByRole('button',{name:'선택한 자료로 브리핑 새로고침',exact:true}).click();await page.getByText('테스트 브리핑 일정',{exact:true}).filter({visible:true}).waitFor();assert.equal(await page.getByText('완료 자료 제외',{exact:true}).filter({visible:true}).count(),0);
let weatherCalls=0;const weatherFixture=route=>{weatherCalls++;return weatherCalls===1?route.fulfill({status:502,json:{error:'테스트: 날씨 연결 실패'}}):route.fulfill({json:{city:'서울',temperature:17,high:19,low:8,rain:20,observedAt:'2026-11-09T12:00'}});};
await page.route('https://duckduck-api.test/api/weather?city=seoul',weatherFixture);await page.getByRole('button',{name:'서울',exact:true}).click();await page.getByText('테스트: 날씨 연결 실패',{exact:true}).filter({visible:true}).waitFor();await page.getByRole('button',{name:'서울',exact:true}).click();await page.getByText('서울 17°C · 최저 8° / 최고 19° · 강수 확률 20%',{exact:true}).filter({visible:true}).waitFor();
await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:join(artifacts,'mobile-today-weather-fixture.png')});await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'닫기',exact:true}).click();await page.unroute('https://duckduck-api.test/api/assistant/context',briefingFixture);await page.unroute('https://duckduck-api.test/api/weather?city=seoul',weatherFixture);
// Paste produces editable individual drafts, discards completed items, and does not store raw input.
await openDuckTools(page);await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).fill('- 붙여넣기 첫 초안\n- [ ] 붙여넣기 둘째 초안\n- [x] 완료된 초안');if(await page.getByRole('button',{name:'직접 정리 방법 열기',exact:true}).count())await page.getByRole('button',{name:'직접 정리 방법 열기',exact:true}).click();await page.getByRole('button',{name:'목록에서 할 일 초안 나누기',exact:true}).click();
assert.equal(await page.getByRole('textbox',{name:'정리한 할 일',exact:true}).count(),2);assert.equal(await page.getByRole('textbox',{name:'정리한 할 일',exact:true}).first().inputValue(),'붙여넣기 첫 초안');assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),1);
await page.getByRole('button',{name:'초안 버리기',exact:true}).first().click();await page.getByRole('button',{name:'초안 버리기',exact:true}).first().click();

// Fixture AI: consent is required; model suggestions never execute by themselves.
const assistantStatus=await page.evaluate(async()=>await(await fetch('/api/assistant/status')).json());
const assistantStatusFixture=route=>route.fulfill({json:{...assistantStatus,enabled:true,message:'테스트 응답 · AI 제안 흐름'}});
let aiCalls=0;const assistantChatFixture=route=>{const b=route.request().postDataJSON();assert.equal(b.consent,true);assert.ok(b.providers.includes('google'));aiCalls++;return route.fulfill({json:{answer:'테스트 메일에 회의 자료 요청이 있어요. Todo로 정리해볼까요?',warnings:['테스트 공급자 응답이에요.'],sources:[{ref:'google:fixture-mail',provider:'google',kind:'mail',title:'테스트: 회의 자료 요청',text:'자료를 확인하고 답장해주세요.',locator:{id:'abc123'}}],proposals:[{operation:'todo.create',label:'Todo 추가',args:{title:'테스트: 회의 자료 보내기',notes:'메일 요청 확인',dueDate:null},sourceRefs:['google:fixture-mail']}]}});};
await page.route('https://duckduck-api.test/api/assistant/status',assistantStatusFixture);await page.route('https://duckduck-api.test/api/assistant/chat',assistantChatFixture);const statusReady=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/assistant/status');await page.reload();await statusReady;await page.getByRole('tab',{name:'duckduck',exact:true}).click();
await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('오늘 메일에서 할 일 찾아줘');
await page.getByRole('button',{name:'덕에게 보내기',exact:true,disabled:true}).waitFor();
assert.equal(aiCalls,0,'typing does not call AI');
assert.equal(await page.getByRole('textbox',{name:'비서에게 요청',exact:true}).count(),0,'normal chat does not open the advanced sheet');
await openAssistantSettings(page);await page.getByRole('checkbox',{name:'Google 자료 사용',exact:true}).click();await closeAssistantSettings(page);
await page.getByRole('button',{name:'덕에게 보내기',exact:true,disabled:true}).waitFor();
assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'오늘 메일에서 할 일 찾아줘');
await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();
await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();
await page.getByText('테스트 메일에 회의 자료 요청이 있어요. Todo로 정리해볼까요?',{exact:true}).filter({visible:true}).waitFor();
assert.equal(aiCalls,1);
assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),1,'AI answer is not an automatic Todo write');
await page.getByRole('button',{name:'할 일 후보 1 Todo에 추가',exact:true}).click();
await page.getByTestId('assistant-checklist-1').getByText('Todo에 추가됨 · 보기',{exact:true}).waitFor();
assert.equal(await page.evaluate(async()=>(await(await fetch('/api/todos')).json()).length),2,'only the explicit Todo gesture saves the candidate');
await page.screenshot({path:join(artifacts,'mobile-assistant-ai-fixture.png')});
await page.unroute('https://duckduck-api.test/api/assistant/status',assistantStatusFixture);await page.unroute('https://duckduck-api.test/api/assistant/chat',assistantChatFixture);await page.getByRole('tab',{name:'ME',exact:true}).click();
const deletingUser=await page.evaluate(async()=>(await(await fetch('/api/auth/session')).json()).user.id);await openMeAccount(page);await page.getByRole('button',{name:'표시 이름 편집',exact:true}).click();await page.getByRole('textbox',{name:'표시 이름',exact:true}).fill('기기 설정 삭제 테스트');await page.getByRole('button',{name:'저장',exact:true}).click();assert.equal(await page.evaluate(id=>Object.keys(localStorage).some(key=>key.includes(id)),deletingUser),true);await page.getByRole('button',{name:'계정 삭제',exact:true}).click();await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByLabel('삭제 확인용 현재 비밀번호',{exact:true}).fill('changed-fixture-password');await page.getByRole('checkbox',{name:'계정 삭제에 동의',exact:true}).click();await page.getByRole('button',{name:'계정과 기록 삭제',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();assert.equal(await page.getByTestId(/^todo-/).filter({visible:true}).count(),0);assert.equal(await page.evaluate(async()=>(await fetch('/api/auth/session')).status),401);assert.equal(await page.evaluate(id=>Object.keys(localStorage).some(key=>key.includes(id)),deletingUser),false);
for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
assert.deepEqual(errors,[]);console.log('PASS: actual Expo web bundle; five tabs, native PanResponder swipe + three-second countdown and removal, log restore, month-bounded calendar, Duck record search/filter/open/restore, draft edit/discard and transfer, service disclosure, assistant preview/explicit confirmation/history plus consent/source-backed AI proposals (fixture), signup, cloud API create and cookie reload, logout, tenant isolation, session expiry clears modal, demo/cloud separation, optimistic completion and queued undo before acknowledgement, stale acknowledgement ignored, failed writes rollback, retry recovery, email verification, password reset/relogin, memo bullets/continuation, calendar memo reopen, hidden-but-working scroll, legacy-server memo guard, reminder persistence, missing OAuth setup, Google opt-in completion sync and connection diagnosis (fixture), personal JSON download, Google Tasks list selection and external search/reference-only results (fixture), Apple Reminders web guidance, Kakao paste and share message, account deletion, responsive widths');
}finally{await browser.close();server.close();const exited=once(api,'exit');api.kill();await exited;await rm(dir,{recursive:true,force:true});}
