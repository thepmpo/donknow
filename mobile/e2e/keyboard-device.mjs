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
await promisify(execFile)(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/keyboard-device.tsx'),'--bundle-output',bundleFile,'--assets-dest',temporary,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:2*1024*1024});
const bundle=readFileSync(bundleFile,'utf8');
const server=http.createServer((req,res)=>{if(req.url.includes('.ttf')){res.setHeader('Content-Type','font/ttf');res.end(readFileSync(resolve(project,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/'+(req.url.includes('MaterialCommunityIcons')?'MaterialCommunityIcons.ttf':'Ionicons.ttf'))));return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const output=resolve(project,'../artifacts/keyboard-device-2026-11-14/current');mkdirSync(output,{recursive:true});
const origin='https://calendar-comfort.test',errors=[],captures=[],calls=[];let page,writes=0,detailsWrites=0,chatCalls=0,holdReads=false,eventReads=0,canWriteCalendar=true;const held=[];
const todos=[{id:'memo',title:'여행 준비 메모',notes:'필요한 물건을 적어보세요',dueDate:'2026-11-14',done:false,category:'일상',reminderAt:null,createdAt:'2026-11-14T00:00:00Z'}],actions=[],events=[{id:'conn:calendar:timed',eventId:'timed',calendarId:'primary',calendarName:'개인 일정',connectionId:'conn',title:'아침 산책과 회의 준비',dueDate:'2026-11-14',startAt:'2026-11-14T00:00:00Z',endAt:'2026-11-14T01:00:00Z',allDay:false,timeZone:'Asia/Seoul',canWrite:true,etag:'v0',notes:'필요한 자료 확인',duckDetails:{revision:0,fields:{reminderMinutes:10}}},{id:'conn:calendar:all-day',eventId:'all-day',calendarId:'primary',calendarName:'개인 일정',connectionId:'conn',title:'가족과 함께하는 날',dueDate:'2026-11-15',endDate:'2026-11-16',allDay:true,timeZone:'Asia/Seoul',canWrite:true,etag:'v0'}];
const geometry=(width,height,open=false)=>({apiAvailable:true,hasHinge:true,width,height,hingeStatus:open?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion',active:!open,frame:{x:width-60,y:24,width:28,height:28}}]});
try{
 page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,timezoneId:'Asia/Seoul'});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-11-14T00:00:00Z')});await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{
  const req=route.request(),p=new URL(req.url()).pathname,method=req.method(),body=req.postDataJSON();calls.push({p,method,body});const headers={'Access-Control-Allow-Origin':`http://127.0.0.1:${server.address().port}`,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type,X-Duckduck-Client','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'},done=(json,status=200)=>route.fulfill({json,status,headers});if(method==='OPTIONS')return route.fulfill({status:204,headers});
  if(p==='/api/auth/session')return done({user:{id:'owner',email:'owner@example.test',emailVerified:true}});
  if(p==='/api/assistant/chat'){chatCalls++;return done({answer:'일상과 업무를 함께 정리해볼게요.\n\n오전에는 중요한 업무 한 가지부터 정해보세요.\n집중할 시간을 먼저 잡고, 급하지 않은 연락은 뒤로 미뤄도 좋아요.\n\n점심 전후에는 잠깐 걷거나 쉬는 시간을 두세요.\n오후에는 회의 후속 작업과 남은 일정을 살펴보세요.\n필요한 준비물이나 확인할 내용이 있다면 함께 정리할 수 있어요.\n\n저녁에는 개인 약속과 휴식 시간을 확인해보세요.\n오늘 끝내기 어려운 일은 내일 가능한 시간으로 옮겨도 괜찮아요.\n\n더 필요한 내용이 있으면 이어서 알려주세요.',sources:[],warnings:[],proposals:[]});}
  if(p==='/api/todos'&&method==='GET')return done(todos);
  if(p==='/api/todos'&&method==='POST'){const t={...body,id:'todo-'+(todos.length+1),done:false,createdAt:new Date().toISOString()};todos.push(t);return done(t);}
  if(p.startsWith('/api/todos/')&&method==='PATCH'){const t=todos.find(t=>t.id===p.split('/').at(-1));Object.assign(t,body);return done(t);}
  if(p==='/api/capabilities')return done({todoNotes:true,calendarWorkspace:2,calendarDetails:1,assistant:true,externalActions:true,assistantChecklist:1});
  if(p==='/api/assistant/status')return done({enabled:true,actions:[],consentScopes:{todo:'v1',google:'v1',slack:'v1',notion:'v1',naver:'v1'}});
  if(p==='/api/assistant/actions'&&method==='GET')return done({actions});
  if(p==='/api/assistant/actions'&&method==='POST'){const a={...body,id:'action-'+actions.length,status:'pending',expiresAt:Date.now()+600000};actions.push(a);return done(a);}
  if(p.endsWith('/confirm')){const a=actions.find(a=>p.includes('/'+a.id+'/'));if(a.status!=='succeeded'){writes++;a.status='succeeded';a.result={id:a.args.id??'timed'};if(a.operation==='calendar.create'){holdReads=true;a.result={id:'created-'+writes};events.push({id:'conn:calendar:created-'+writes,eventId:'created-'+writes,calendarId:'primary',calendarName:'개인 일정',connectionId:'conn',title:a.args.title,dueDate:a.args.startDate??'2026-11-14',endDate:a.args.endDate,allDay:!!a.args.allDay,startAt:a.args.start,endAt:a.args.end,timeZone:'Asia/Seoul',canWrite:true,etag:'created-v1'});}else if(a.args.title)events[0].title=a.args.title;}return done(a);}
  if(p==='/api/calendar/calendars')return done({items:[{id:'primary',name:'개인 일정',primary:true,canWrite:canWriteCalendar,timeZone:'Asia/Seoul',connectionId:'conn',color:'#168f9c'}],nextCursor:null});
  if(p==='/api/calendar/events'){eventReads++;const capturedEvents=JSON.parse(JSON.stringify(events));if(holdReads)await new Promise(resolve=>held.push(resolve));return done({items:capturedEvents,calendarId:'primary',connectionId:'conn',canWrite:true,connectionState:'connected',nextCursor:events.some(e=>e.eventId?.startsWith('created-'))?'more':null,readAt:new Date().toISOString()});}
  if(p==='/api/calendar/event-details'){detailsWrites++;const event=events.find(e=>e.eventId===body.eventId);event.duckDetails={revision:(event.duckDetails?.revision??0)+1,fields:{...event.duckDetails?.fields,...body.patch}};return done(event.duckDetails);}
  if(p==='/api/calendar/reminders')return done({items:[],state:'ready'});if(p==='/api/integrations')return done([{provider:'google',connected:true,configured:true,features:['calendar','calendarWrite'],label:'개인 계정'}]);if(p==='/api/automations')return done({schedules:[]});return done({messages:[]});
 });


 const button=name=>page.getByRole('button',{name,exact:true});
 const capture=async name=>{await page.screenshot({path:resolve(output,name+'.png')});captures.push(name);};
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();
 for(const [name,width,height,open,duo] of [['01-phone',390,510,false,false],['02-folded',431,590,false,true],['03-open-landscape',960,540,true,true],['04-open-portrait',740,650,true,true]]){
  await page.setViewportSize({width,height});await page.evaluate(g=>window.keyboardDevice.geometry(g),duo?geometry(width,height,open):null);
  const notes=page.getByRole('textbox',{name:'메모',exact:true});await notes.focus();await page.evaluate(()=>window.keyboardDevice.keyboard(true));await notes.fill('지금 쓰는 첫 줄이 바로 보여야 해요.\n준비물을 입력합니다.');await page.waitForTimeout(100);
  assert.equal(await page.getByTestId('todo-editor-save').count(),0,'save consumes no typing space');
  const f=await notes.boundingBox(),v=await page.getByTestId('editor-scroll').boundingBox();assert.ok(f.y>=v.y-1&&f.y+Math.min(f.height,v.height-24)<=v.y+v.height+1,JSON.stringify({f,v}));
  assert.equal(await page.getByTestId('keyboard-dismiss-inline').count(),0);assert.equal(await page.getByTestId('keyboard-dismiss-fallback').count(),0);
  if(duo){const close=page.getByTestId('DuoKeyboardDismissButton');await close.waitFor();const b=await close.boundingBox();assert.ok(b.x>=width-geometry(width,height,open).safeArea.right,'keyboard control stays in physical camera column');assert.equal(await page.getByTestId('DuoBackButton').count(),0,'X action temporarily becomes keyboard dismissal');await capture(name+'-memo-keyboard');await close.click();assert.equal(await notes.inputValue(),'지금 쓰는 첫 줄이 바로 보여야 해요.\n준비물을 입력합니다.');assert.equal(await page.evaluate(()=>!!window.editorClosed),false);}
  else {assert.equal(await button('키보드 내리기').count(),0,'ordinary native accessory is not counterfeited on web');await capture(name+'-memo-keyboard');await notes.blur();}
  await page.evaluate(()=>window.keyboardDevice.keyboard(false));await page.getByTestId('todo-editor-save').waitFor();if(duo)await page.getByTestId('DuoBackButton').waitFor();assert.equal(writes,0);assert.equal(calls.filter(c=>c.method!=='GET'&&c.method!=='OPTIONS').length,0,'typing/dismiss never writes');
  const title=page.getByRole('textbox',{name:'할 일 제목',exact:true});await title.focus();await page.evaluate(()=>window.keyboardDevice.keyboard(true));await page.waitForTimeout(80);const a=await title.boundingBox(),b=await page.getByTestId('editor-scroll').boundingBox();assert.ok(a.y>=b.y-1,'returning to title reveals it too');await title.blur();await page.evaluate(()=>window.keyboardDevice.keyboard(false));
 }
 await page.evaluate(()=>{window.keyboardDevice.mode('app');window.keyboardDevice.geometry(null);});await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'캘린더',exact:true}).click();
 const current=()=>page.getByTestId('DuoActivePane').getByTestId('calendar-period-current');
 for(const [theme,duo] of [['light',false],['dark',false],['light',true],['dark',true]]){
  await page.emulateMedia({colorScheme:theme});await page.setViewportSize(duo?{width:431,height:820}:{width:390,height:844});await page.evaluate(g=>window.keyboardDevice.geometry(g),duo?geometry(431,820,false):null);const today=current().getByTestId('calendar-day-2026-11-14');await today.waitFor();const before=await today.evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(before,'rgba(0, 0, 0, 0)');
  await current().getByTestId('calendar-day-2026-11-17').click();if(duo)await page.getByTestId('DuoBackButton').click();else await button('닫기').click();await page.getByTestId('calendar-sheet').waitFor({state:'detached'});assert.equal(await today.evaluate(el=>getComputedStyle(el).backgroundColor),before,'today shade survives selecting another day');await capture('05-'+theme+(duo?'-duo':'-phone')+'-today-shade');
 }
 assert.deepEqual(errors,[]);writeFileSync(resolve(output,'verification.json'),JSON.stringify({syntheticOnly:true,nativeKeyboardNotVerified:true,captures,writes,errors},null,2));console.log('PASS: phone and Duo folded/open/portrait memo focus and title return; save hidden; camera-column dismiss restores X without closing or writing; no header/composer keyboard controls; native ordinary Done requires device test; persistent today shading light/dark and independent selection.');
}catch(error){if(page){console.log('DEBUG',await page.evaluate(()=>document.body.innerText.slice(-1800)));await page.screenshot({path:resolve(output,'debug-failure.png')});}throw error;}finally{holdReads=false;held.splice(0).forEach(fn=>fn());await browser.close();await new Promise(r=>server.close(r));rmSync(temporary,{recursive:true,force:true});}
