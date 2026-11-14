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
const output=resolve(project,'../artifacts/navigation-refinement-2026-11-14/'+(process.env.REFINEMENT_PHASE||'current'));mkdirSync(output,{recursive:true});
const after=!(process.env.REFINEMENT_PHASE||'current').startsWith('before'),report={phase:after?'after':'before',screens:[],checks:[]};
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE_ERROR',e.message);});await page.clock.install({time:new Date('2026-11-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'reduce'});
 const origin='https://navigation-review.test',todos=[{id:'review-todo',title:'디자인 검토 준비',notes:'확인할 메모',done:false,category:'업무',dueDate:'2026-11-14'}];
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
 const geometry=(width,height,hingeStatus='closed',extra=[])=>({apiAvailable:true,hasHinge:true,hingeStatus,width,height,safeArea:{top:20,right:80,bottom:20,left:16},regions:[{kind:'occlusion',active:hingeStatus==='closed',frame:{x:width-60,y:32,width:28,height:28}},...extra]});
 async function change(g){await page.setViewportSize({width:g?.width??390,height:g?.height??844});await page.evaluate(g=>window.duoFixture.change(g),g);await page.waitForTimeout(80);}
 async function capture(name){await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));await page.screenshot({path:resolve(output,name+'.png')});report.screens.push(name+'.png');}
 for(const [name,g] of [['phone',null],['folded',geometry(430,640)],['open',geometry(960,740,'fullyOpen')]]){
  await change(g);await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.getByRole('heading',{name:'캘린더',exact:true}).first().waitFor();
  const local=page.getByTestId('DuoActivePane').getByTestId('calendar-view-toggle'),column=page.getByTestId('DuoCalendarViewButton');
  report.checks.push({name,localToggle:await local.count(),columnToggle:await column.count()});await capture('01-'+name+'-calendar');
  const toggle=await column.count()?column:local;await toggle.click();const current=page.getByTestId('DuoActivePane');assert.equal(await current.getByTestId('calendar-date-grid').locator('[aria-selected]').count(),14);await toggle.click();
  await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('button',{name:'디자인 검토 준비 수정',exact:true}).click();const title=page.getByRole('textbox',{name:'할 일 제목',exact:true});await title.waitFor();const focused=await title.evaluate(el=>el===document.activeElement);report.checks.push({name,editorAutoFocused:focused});if(after)assert.equal(focused,false,'opening a Todo does not summon keyboard');await title.click();assert.equal(await title.evaluate(el=>el===document.activeElement),true);await capture('02-'+name+'-editor');await page.getByRole('button',{name:'닫기',exact:true}).click();
 }
 // A folded window with a tall native reserved camera/status interval cannot fit two 64pt accessories.
 await change(geometry(430,560,'closed',[{kind:'occlusion',active:true,frame:{x:350,y:60,width:80,height:140}}]));await page.getByRole('tab',{name:'캘린더',exact:true}).click();await capture('03-short-column-calendar');report.checks.push({name:'short-column',localToggle:await page.getByTestId('DuoActivePane').getByTestId('calendar-view-toggle').count(),columnToggle:await page.getByTestId('DuoCalendarViewButton').count()});
 if(after){await page.getByTestId('calendar-view-toggle').last().click();assert.equal(await page.getByTestId('DuoActivePane').getByTestId('calendar-date-grid').locator('[aria-selected]').count(),14);await page.getByTestId('calendar-view-toggle').last().click();}
 await change(geometry(430,600,'closed',[{kind:'occlusion',active:true,frame:{x:350,y:60,width:80,height:120}}]));if(after){const view=await page.getByTestId('DuoCalendarViewButton').boundingBox();assert.ok(view.width>=44&&view.width<64);await capture('03-compact-column-calendar');}
 await change(geometry(430,640));await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'대화 도구 열기'}).waitFor();await capture('04-folded-chat');report.checks.push({name:'completed-action-height',height:await page.getByTestId('duck-action-a').count()?(await page.getByTestId('duck-action-a').boundingBox())?.height:0});
 if(after){assert.equal(await page.getByText('처리됐는지 확인하지 못했어요. 원본 서비스에서 확인한 뒤 다음 작업을 진행해주세요.',{exact:true}).count(),1,'unknown action stays visible');await page.getByRole('button',{name:'최근 실행 기록 2개 보기',exact:true}).click();const historyHeight=(await page.getByTestId('duck-action-a').boundingBox()).height;assert.ok(historyHeight<=84);report.checks.push({name:'expanded-history-row',height:historyHeight});await capture('05-history-compact');await page.getByRole('button',{name:'캘린더 일정 추가 실행 내용 보기 a',exact:true}).click();await page.getByText('제목: 제품 검토',{exact:true}).waitFor();await capture('05-history-expanded');}
 await change(null);await page.getByRole('tab',{name:'내정보',exact:true}).click();await page.getByRole('button',{name:'Google 연결 안내',exact:true}).waitFor();await capture('06-profile-start');await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();await page.waitForTimeout(80);await capture('07-profile-account');
 await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('button',{name:'연결 상태 새로고침',exact:true}).waitFor();await page.waitForTimeout(150);await capture('08-profile-google');await page.getByRole('button',{name:'돌아가기',exact:true}).click();await capture('09-profile-return');
 await page.getByText('저장과 연결',{exact:true}).scrollIntoViewIfNeeded();await capture('10-profile-storage');await page.getByRole('button',{name:'데이터와 개인정보',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).waitFor();await capture('11-profile-privacy');await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).waitFor({state:'detached'});
 await page.getByText('클라우드 DB 저장',{exact:true}).scrollIntoViewIfNeeded();await capture('12-profile-backup');
 await page.getByRole('button',{name:'계정 삭제',exact:true}).click();await page.getByText('계정 삭제',{exact:true}).first().waitFor();await capture('12-account-delete-entry');await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('button',{name:'Notion 연결 안내',exact:true}).click();await page.getByText('아직 연결하지 않았어요.',{exact:true}).waitFor();await capture('12-notion-unconnected');await page.getByRole('button',{name:'돌아가기',exact:true}).click();
 await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(100);await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.waitForTimeout(750);
 // Sample the full month slide after a held drag, including the release handoff.
 const grid=page.getByTestId('DuoActivePane').getByTestId('calendar-date-grid'),box=await grid.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+35);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+35,{steps:10});
 const beforeRelease=await page.getByTestId('calendar-period-current').last().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41);await page.mouse.up();
 const samples=await page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now(),pane=document.querySelector('[data-testid="DuoActivePane"]');function sample(){const old=pane.querySelector('[data-testid="calendar-period-outgoing"]'),node=pane.querySelector('[data-testid="calendar-period-current"]');rows.push({t:performance.now()-start,current:new DOMMatrix(getComputedStyle(node).transform).m41,outgoing:old?new DOMMatrix(getComputedStyle(old).transform).m41:null,width:node.getBoundingClientRect().width});if(performance.now()-start<760)requestAnimationFrame(sample);else resolve(rows);}sample();}));report.month={beforeRelease,samples};await capture('13-month-rest');
 if(after){const sliding=samples.filter(row=>row.outgoing!==null);assert.ok(sliding.length>8,'slide spans multiple actual animation frames');for(let i=0;i<sliding.length;i++){const row=sliding[i];assert.ok(Math.abs(row.current-row.outgoing-row.width)<1,'adjacent pages keep a constant seam');if(i)assert.ok(row.outgoing<=sliding[i-1].outgoing+.5,'old page never jitters backwards');}assert.ok(Math.abs(sliding[0].outgoing-beforeRelease)<40,'release keeps the held position');assert.equal(samples.at(-1).outgoing,null);assert.equal(samples.at(-1).current,0);}
 // Menu navigation uses only a slight fade, with no zoom/position change.
 const tabSamplesPromise=page.evaluate(()=>new Promise(resolve=>{const rows=[],start=performance.now();function sample(){const el=document.querySelector('[data-testid="screen-transition"]'),m=new DOMMatrix(getComputedStyle(el).transform);rows.push({t:performance.now()-start,scale:m.a,x:m.m41,y:m.m42,opacity:+getComputedStyle(el).opacity});if(performance.now()-start<350)requestAnimationFrame(sample);else resolve(rows);}sample();}));await page.getByRole('tab',{name:'내정보',exact:true}).click();const tabSamples=await tabSamplesPromise;report.tab=tabSamples;if(after){assert.ok(tabSamples.every(row=>row.scale===1&&row.x===0&&row.y===0&&row.opacity>=.98));assert.equal(tabSamples.at(-1).opacity,1);}
 report.errors=errors;assert.deepEqual(errors,[]);writeFileSync(resolve(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({ok:true,...report,month:{beforeRelease,samples:samples.length}}));
}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
