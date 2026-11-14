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
const output=resolve(project,'../artifacts/multi-google-clean-chat-2026-11-14/current');mkdirSync(output,{recursive:true});
const origin='https://multi-google.test',errors=[],captures=[],requests=[];let page,hold=false,release,failChat=false,chatCount=0,scheduled=true;
let accounts=[{connectionId:'one',label:'personal@example.test',features:['calendar','calendarWrite','tasks','tasksWrite']},{connectionId:'two',label:'work@example.test',features:['calendar','calendarWrite','tasks','tasksWrite']}];
let actions=[{id:'old-1',operation:'calendar.create',label:'캘린더 일정 추가',args:{title:'오래된 일정'},status:'succeeded',expiresAt:0}];
const schedules=['briefing','weather'].map(kind=>({kind,enabled:false,time:'08:00',timezone:'Asia/Seoul',city:kind==='weather'?'seoul':null,providers:[],aiConsent:false,revision:0,nextAt:null,instructions:''}));
const sources=()=>accounts.map((a,i)=>({id:i?'@g/'+a.connectionId+'/primary':'primary',primary:!i,name:'개인 일정 · '+a.label,accountLabel:a.label,connectionId:a.connectionId,canWrite:true}));
const geometry=(width,height,state='closed')=>({apiAvailable:true,hasHinge:true,width,height,hingeStatus:state==='open'?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion',active:state==='closed',frame:{x:width-60,y:32,width:28,height:28}}]});
try{
 page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Seoul'});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{
  const req=route.request(),url=new URL(req.url()),p=url.pathname,method=req.method(),body=req.postDataJSON();requests.push({p,method,body,query:Object.fromEntries(url.searchParams)});
  const headers={'Access-Control-Allow-Origin':`http://127.0.0.1:${server.address().port}`,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-Duckduck-Client','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'},done=(json,status=200)=>route.fulfill({json,status,headers});if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(p==='/api/auth/session')return done({user:{id:'owner',email:'owner@example.test',emailVerified:true}});
  if(p==='/api/todos')return done([]);
  if(p==='/api/capabilities')return done({todoNotes:true,assistant:true,externalActions:true,scheduledMessages:true,calendarWorkspace:2,calendarDetails:1,googleMultiAccount:true});
  if(p==='/api/assistant/status')return done({enabled:true,scheduledMessages:true,message:'',consentScopes:{todo:'v1',google:accounts.map(a=>a.connectionId).join(','),slack:'v1',notion:'v1',naver:'v1'},actions:[]});
  if(p==='/api/assistant/actions')return done({actions});
  if(p==='/api/assistant/chat'){chatCount++;if(hold)await new Promise(r=>release=r);if(failChat){failChat=false;return done({error:'답변을 받지 못했어요.'},502);}return done({answer:'요청한 내용을 확인했어요. '+chatCount,sources:[{ref:'google:one:event',provider:'google',title:'회의 준비',text:'일정 근거',kind:'event'}],warnings:[],proposals:[]});}
  if(p==='/api/assistant/messages')return done({messages:scheduled?[{id:'briefing',kind:'briefing',title:'오늘의 브리핑',text:'회의 준비부터 시작해볼까요?',warnings:[],createdAt:Date.parse('2026-11-14T00:00:00Z'),readAt:null}]:[]});
  if(p==='/api/assistant/messages/read')return done({ok:true});
  if(p==='/api/integrations')return done([{provider:'google',configured:true,connected:!!accounts.length,label:accounts[0]?.label,features:accounts[0]?.features??[],accounts},{provider:'notion',configured:false,connected:false,features:[]},{provider:'slack',configured:false,connected:false,features:[]}]);
  if(p==='/api/integrations/google/authorize')return done({url:'https://accounts.google.com/o/oauth2/auth?fixture=1'});
  if(p==='/api/integrations/google/diagnose')return done({ok:true});
  if(p==='/api/integrations/google/resources')return done({items:[{id:url.searchParams.get('connectionId')+':calendar:event',title:'선택 계정 일정',kind:'event'}],nextCursor:null});
  if(p==='/api/integrations/google/task-sync')return done({enabled:method==='POST'?body.enabled:false,canEnable:true,jobs:[]});
  if(p==='/api/integrations/google'&&method==='DELETE'){accounts=accounts.filter(a=>a.connectionId!==url.searchParams.get('connectionId'));return done({revoked:true});}
  if(p==='/api/calendar/calendars')return done({items:sources(),nextCursor:null});
  if(p==='/api/calendar/events')return done({items:[],connectionState:'connected',calendarId:url.searchParams.get('calendarId'),canWrite:true});
  if(p==='/api/calendar/reminders')return done({items:[],state:'ready'});
  if(p==='/api/automations')return done({schedules});
  if(p==='/api/automations/briefing'){Object.assign(schedules[0],body,{revision:1,nextAt:Date.now()+86400000});return done(schedules[0]);}
  if(p==='/api/operations/backup')return done({enabled:false,offsite:false,lastLocalSuccess:null,failed:false});
  return done({rules:[],messages:[]});
 });
 await page.context().route('https://accounts.google.com/**',r=>r.fulfill({body:'<!doctype html><p>합성 OAuth 승인 화면</p>',contentType:'text/html'}));
 const button=name=>page.getByRole('button',{name,exact:true}),tab=name=>page.getByRole('tab',{name:({덕:'duckduck','할 일':'Todo 리스트'}[name]??name),exact:true}),input=page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}),consent=page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true});
 async function capture(name){await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));await page.screenshot({path:resolve(output,name+'.png')});captures.push(name+'.png');}
 async function me(){await tab('ME').click();for(let i=0;i<5&&!await page.getByTestId('me-overview').isVisible();i++){const back=page.getByTestId('DuoBackButton');if(await back.count())await back.click();else await button('돌아가기').click();}await page.getByTestId('me-overview').waitFor();}
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>!!window.duoFixture);await page.evaluate(()=>window.duoFixture.showApp());await tab('덕').click();await page.getByTestId('duck-composer').waitFor();await page.getByText('회의 준비부터 시작해볼까요?',{exact:true}).waitFor();
 assert.equal(await button('대화 도구 열기').count(),0);assert.equal(await button('답변 근거 보기').count(),0);assert.equal(await page.getByTestId('duck-history-toggle').count(),0);assert.equal(await page.getByTestId('duck-action-old-1').count(),0);assert.equal(await button('키보드 내리기').count(),0,'keyboard remains design only');
 await input.fill('이 브리핑의 회의 준비를 자세히 알려줘');await consent.click();hold=true;await button('덕에게 보내기').click();await page.getByTestId('duck-chat-pending').waitFor();assert.equal(await input.inputValue(),'','clear immediately, before model response');assert.ok(requests.find(r=>r.p==='/api/assistant/chat').body.history.some(t=>t.text.includes('회의 준비부터')));assert.ok((await page.getByText('회의 준비부터 시작해볼까요?',{exact:true}).boundingBox()).y<(await page.getByText('이 브리핑의 회의 준비를 자세히 알려줘',{exact:true}).boundingBox()).y,'briefing precedes the follow-up question');await capture('01-sent-input-empty');await input.fill('다음 질문 초안');hold=false;release();await page.getByText('요청한 내용을 확인했어요. 1',{exact:true}).waitFor();assert.equal(await input.inputValue(),'다음 질문 초안');await capture('02-next-draft-preserved');
 await input.fill('실패할 요청');hold=true;failChat=true;await button('덕에게 보내기').click();await page.getByTestId('duck-chat-pending').waitFor();assert.equal(await input.inputValue(),'');await input.fill('오류 중에도 작성한 새 글');hold=false;release();await page.getByText('답변을 받지 못했어요.',{exact:true}).waitFor();assert.equal(await input.inputValue(),'오류 중에도 작성한 새 글');await button('AI 요청 다시 보내기').click();await page.getByText('요청한 내용을 확인했어요. 3',{exact:true}).waitFor();assert.equal(await input.inputValue(),'오류 중에도 작성한 새 글');assert.equal(requests.filter(r=>r.p==='/api/assistant/chat').at(-1).body.message,'실패할 요청');await capture('03-retry-preserves-new-draft');
 // Source preferences remain reachable in ME, and returning updates the mounted conversation.
 await me();await button('데이터·개인정보').click();await button('AI 자료·실행 관리').click();await page.getByRole('heading',{name:'덕 비서',exact:true}).waitFor();await page.getByRole('checkbox',{name:'Google 자료 사용',exact:true}).click();await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();await button('닫기').click();await tab('덕').click();await input.fill('두 계정의 자료를 확인해줘');await button('덕에게 보내기').click();await page.getByText('요청한 내용을 확인했어요. 4',{exact:true}).waitFor();assert.deepEqual(requests.filter(r=>r.p==='/api/assistant/chat').at(-1).body.providers,['google']);
 await me();await button('Google 연결 안내').click();await page.getByRole('heading',{name:'Google',exact:true}).waitFor();await button('Google 계정 work@example.test 선택').click();await capture('04-multiple-google-accounts');
 await button('자료 가져오기').click();await button('기본 캘린더').click();await page.getByRole('checkbox',{name:'선택 계정 일정',exact:true}).waitFor();assert.equal(requests.filter(r=>r.p==='/api/integrations/google/resources').at(-1).query.connectionId,'two');await capture('05-selected-account-resources');
 await button('완료 동기화').click();await button('완료 동기화 켜기').click();assert.equal(requests.filter(r=>r.p==='/api/integrations/google/task-sync'&&r.method==='POST').at(-1).body.connectionId,'two');
 await button('Google 계정 추가').click();await capture('06-add-account-permissions');await button('Google 계정 추가').last().click();assert.equal(requests.filter(r=>r.p==='/api/integrations/google/authorize').at(-1).body.mode,'add');assert.equal(accounts.length,2,'starting OAuth does not replace an existing account');for(const popup of page.context().pages())if(popup!==page)await popup.close();
 await button('연결 권한 관리').click();await button('연결 해제').click();assert.equal(accounts.length,2,'opening disconnect confirmation never removes an account');await capture('07-account-disconnect-confirmation');await button('연결 해제 확인').click();assert.deepEqual(accounts.map(a=>a.connectionId),['one']);
 await me();await button('데이터·개인정보').click();await button('브리핑·날씨 예약').click();await page.getByRole('textbox',{name:'브리핑에 바라는 점',exact:true}).fill('회의 준비와 오늘 마감 위주로 알려줘');await page.getByRole('switch',{name:'브리핑 예약 사용',exact:true}).click();await page.getByRole('checkbox',{name:'예약한 자료를 매일 AI에 보내 분석하기 동의',exact:true}).click();await capture('08-personal-briefing-consent');await page.getByTestId('briefing-settings-scroll').evaluate(node=>{node.scrollTop=0;});await capture('08-personal-briefing-settings');await button('예약 저장').click();assert.match(requests.filter(r=>r.p==='/api/automations/briefing').at(-1).body.instructions,/회의 준비/);await button('닫기').click();
 await tab('덕').click();for(const [name,width,height,state] of [['09-folded-clean-chat',430,740,'closed'],['10-open-clean-chat',960,740,'open']]){await page.setViewportSize({width,height});await page.evaluate(g=>window.duoFixture.change(g),geometry(width,height,state));if(state==='open')await page.getByTestId('DuoFixedCalendarPane').waitFor();const nav=await page.getByTestId('DuoTrailingNavigation').boundingBox(),camera=await page.getByTestId('fixture-camera-marker').boundingBox();assert.ok(Math.abs(nav.x+nav.width/2-camera.x-camera.width/2)<1);await capture(name);assert.equal(await button('대화 도구 열기').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:320,height:740});await page.evaluate(()=>window.duoFixture.change(null));await page.emulateMedia({colorScheme:'dark'});await capture('11-small-dark-clean-chat');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 writeFileSync(resolve(output,'verification.json'),JSON.stringify({syntheticOnly:true,captures,chatCount,accountsRemaining:accounts.length,keyboardImplemented:false,errors},null,2));console.log('PASS: clean ordinary/Duo chat; immediate input clearing, next draft and explicit failed retry, scheduled follow-up context, ME source preferences, multiple Google account selection/add permission flow/scoped resources+sync/disconnect confirmation, personalized briefing settings. Synthetic APIs/geometry only.');
}catch(error){if(page){console.log('DEBUG',await page.evaluate(()=>document.body.innerText.slice(-2200)));await page.screenshot({path:'/tmp/multi-google-chat-failure.png'});}throw error;}finally{await browser.close();await new Promise(r=>server.close(r));rmSync(temporary,{recursive:true,force:true});}
