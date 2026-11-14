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
const output=resolve(project,'../artifacts/me-product-review-2026-11-14/current');mkdirSync(output,{recursive:true});
const report={syntheticOnly:true,steps:[],devices:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});
 const origin='https://me-review.test',todos=[{id:'review-todo',title:'디자인 검토 준비',notes:'확인할 메모',done:false,category:'업무',dueDate:'2026-11-14'}];
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 let serviceError=false;
 await page.route(origin+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  const cors={'Access-Control-Allow-Origin':`http://127.0.0.1:${server.address().port}`,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-Duckduck-Client','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'};
  const fulfill=(json,status=200)=>route.fulfill({json,status,headers:cors});if(req.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(path==='/api/auth/session')return fulfill({user:{id:'review-user',email:'owner@example.test',emailVerified:true}});
  if(path==='/api/todos')return fulfill(todos);
  if(path==='/api/capabilities')return fulfill({calendarWorkspace:2,calendarDetails:1,todoNotes:true,assistant:true});
  if(path==='/api/calendar/calendars')return fulfill({items:[{id:'primary',name:'업무 캘린더',primary:true,connectionId:'conn',canWrite:true}]});
  if(path==='/api/calendar/events')return fulfill({items:[],connectionState:'connected',connectionId:'conn',calendarId:'primary',canWrite:true,readAt:new Date().toISOString()});
  if(path==='/api/assistant/status')return fulfill({enabled:true,message:'AI 준비됨',actions:[]});
  if(path==='/api/assistant/actions')return fulfill({actions:[...['a','b'].map((id,index)=>({id,operation:'calendar.create',label:'캘린더 일정 추가',status:'succeeded',args:{title:['제품 검토','자료 정리'][index]},expiresAt:Date.now()+600000})),{id:'unknown',operation:'calendar.create',label:'확인이 필요한 일정',status:'unknown',args:{title:'상태 확인'},expiresAt:Date.now()+600000}]});
  if(path==='/api/integrations'){if(serviceError)return fulfill({error:'temporary_unavailable'},503);return fulfill([{provider:'google',name:'Google',connected:true,configured:true,features:['calendar'],availableFeatures:['calendar','calendarWrite','tasks','tasksWrite']},{provider:'notion',name:'Notion',connected:false,configured:true,features:[],availableFeatures:['pages','pagesWrite']},{provider:'slack',name:'Slack',connected:false,configured:false,features:[],availableFeatures:[]}]);}
  if(path==='/api/operations/backup')return fulfill({storageDriver:'turso',enabled:false,offsite:false,lastLocalSuccess:null,failed:false});
  if(path==='/api/integrations/google/task-sync')return fulfill({enabled:false,canEnable:false,jobs:[]});
  if(path==='/api/automations')return fulfill({automations:[],messages:[]});
  return fulfill({items:[],actions:[]});
 });

 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.evaluate(()=>window.duoFixture.showApp());await page.getByRole('heading',{name:'할 일',exact:true}).waitFor();
 const capture=async(name,step)=>{await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await page.screenshot({path:resolve(output,name+'.png')});report.steps.push({name,step});};
 const me=()=>page.getByRole('tab',{name:'ME',exact:true});
 await me().click();await page.getByRole('heading',{name:'ME',exact:true}).waitFor();assert.equal(await page.getByRole('tab',{name:'내정보',exact:true}).count(),0);await capture('01-me-entry','ME 진입');
 await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('button',{name:'연결 상태 새로고침',exact:true}).waitFor();await page.getByRole('button',{name:'연결 권한 다시 선택',exact:true}).waitFor();await capture('02-google-settings','연결된 Google 관리');
 const buttonCount=await page.getByTestId('DuoActivePane').getByRole('button').count();report.googleButtons=buttonCount;
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('button',{name:'Notion 연결 안내',exact:true}).click();await page.getByText('아직 연결하지 않았어요.',{exact:true}).waitFor();await capture('03-notion-connect','새 Notion 연결 진입');await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByText('이 기기의 할 일·일정 알림',{exact:true}).scrollIntoViewIfNeeded();await capture('04-notifications','알림 설정 찾기');assert.equal(await page.getByRole('switch',{name:'기기 알림',exact:true}).isDisabled(),true,'web does not claim native notification permission');
 await page.getByRole('button',{name:'데이터와 개인정보',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).waitFor();await capture('05-privacy','데이터 안내 읽기');await page.setViewportSize({width:320,height:568});await capture('05-small-privacy','짧고 좁은 화면의 개인정보');report.smallPrivacyClose=await page.getByRole('button',{name:'닫기',exact:true}).boundingBox();await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).waitFor({state:'detached'});
 await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();await capture('06-account','계정 관리 진입');const body=page.getByText('내 계정',{exact:true});assert.ok((await body.boundingBox()).y<400);
 await page.getByRole('button',{name:'계정 삭제',exact:true}).click();await page.getByRole('button',{name:'계정과 기록 삭제',exact:true}).waitFor();await capture('07-delete-entry','삭제 확인 진입까지만');assert.equal(await page.getByRole('button',{name:'계정과 기록 삭제',exact:true}).isDisabled(),true);await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.getByText('클라우드 DB 저장',{exact:true}).scrollIntoViewIfNeeded();await capture('08-storage-operations','운영·백업 설명');
 await page.getByRole('button',{name:'표시 이름 편집',exact:true}).click();await page.getByRole('textbox',{name:'표시 이름',exact:true}).waitFor();await page.getByRole('textbox',{name:'표시 이름',exact:true}).fill('여러 기기에서 쓰는 사용자');await page.getByRole('button',{name:'저장',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).waitFor({state:'detached'});await capture('09-long-profile-name','긴 프로필명');
 await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('button',{name:'연결 상태 새로고침',exact:true}).waitFor();serviceError=true;await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByText('최근 연결 · 확인 필요',{exact:true}).waitFor();await capture('09-status-recheck','일시 조회 실패와 기존 연결 보존');serviceError=false;await page.getByRole('button',{name:'서비스 상태 다시 확인',exact:true}).click();await page.getByText('읽기 연결',{exact:true}).waitFor();
 const geometry=(width,height,hingeStatus='closed')=>({apiAvailable:true,hasHinge:true,hingeStatus,width,height,safeArea:{top:20,right:80,bottom:20,left:16},regions:[{kind:'occlusion',active:hingeStatus==='closed',frame:{x:width-60,y:32,width:28,height:28}}]});
 for(const g of [geometry(430,640),geometry(960,740,'fullyOpen')]){await page.setViewportSize({width:g.width,height:g.height});await page.evaluate(g=>window.duoFixture.change(g),g);await me().click();const active=page.getByTestId('DuoActivePane');await active.getByRole('heading',{name:'ME',exact:true}).waitFor();await active.getByRole('heading',{name:'ME',exact:true}).scrollIntoViewIfNeeded();const nav=await page.getByTestId('DuoTrailingNavigation').boundingBox(),camera=await page.getByTestId('fixture-camera-marker').boundingBox();assert.ok(Math.abs(nav.x+nav.width/2-camera.x-camera.width/2)<1);if(g.hingeStatus==='fullyOpen')await page.getByTestId('DuoFixedCalendarPane').getByRole('heading',{name:'캘린더',exact:true}).waitFor();await capture(g.hingeStatus==='closed'?'10-duo-folded-me':'11-duo-open-me','Duo ME 기하 확인');report.devices.push({hinge:g.hingeStatus,width:g.width,height:g.height,tabLabel:'ME',cameraAligned:true});}
 assert.deepEqual(errors,[]);writeFileSync(resolve(output,'verification.json'),JSON.stringify({...report,errors},null,2));console.log('PASS: fresh ME/Google/Notion/notifications/privacy/account/delete entry/operations/name flow; ordinary + folded/open Duo label, fixed Calendar and camera centerline; synthetic API/geometry only');
}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
