// Read-only audit of the real Expo web build. All API responses and writes are isolated fixtures.
import {createRequire} from 'node:module';
import {readFile,mkdir,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const require=createRequire(new URL('../../mobile/package.json',import.meta.url));
const {chromium}=require('playwright-core');
const repo=resolve(new URL('../..',import.meta.url).pathname),root=join(repo,'mobile/dist-web');
const output=join(repo,'artifacts/calendar-audit-2026-11-13'),origin='https://calendar-audit.test';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const notes=[],errors=[],requests=[],writes=[];let scenario='busy',releaseLoading=null,fixtureBundle=null;
const todos=Array.from({length:5},(_,i)=>({id:'audit-todo-'+i,title:['제안서 최종본 검토하기','긴 프로젝트 회의록을 정리하고 담당자에게 검토 요청하기','운동 30분 하기','보고서 보내기','완료한 자료 확인'][i],done:i===4,dueDate:'2026-11-13',category:i%2?'업무':'일상',notes:'감사용 예시 메모',createdAt:'2026-11-13T00:00:00Z',...(i===4?{completedAt:'2026-11-13T01:00:00Z'}:{})}));
const events=[
 {id:'meeting-late',title:'오후 고객사 미팅 · 최종 제안서 논의',dueDate:'2026-11-13',startAt:'2026-11-13T05:30:00Z',endAt:'2026-11-13T06:30:00Z'},
 {id:'meeting-morning',title:'오전 디자인 리뷰',dueDate:'2026-11-13',startAt:'2026-11-13T00:00:00Z',endAt:'2026-11-13T01:00:00Z'},
 {id:'all-day',title:'프로젝트 출시 점검',dueDate:'2026-11-13',endDate:'2026-11-14',allDay:true},
 {id:'multi-day',title:'여러 날 워크숍',dueDate:'2026-11-12',endDate:'2026-11-16',allDay:true},
 {id:'conflict',title:'겹친 오후 회의',dueDate:'2026-11-13',startAt:'2026-11-13T06:00:00Z',endAt:'2026-11-13T07:00:00Z'}
].sort((a,b)=>Date.parse(a.startAt||a.dueDate+'T00:00:00+09:00')-Date.parse(b.startAt||b.dueDate+'T00:00:00+09:00')); // Production provider query guarantees orderBy=startTime.
async function setup(page){
 page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.emulateMedia({reducedMotion:'reduce'});await page.clock.setFixedTime(new Date('2026-11-13T00:00:00Z'));
 await page.addInitScript(({origin})=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),{origin});
 await page.route(origin+'/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  if(!path.startsWith('/api/')){
   if(path==='/audit-duo.html')return route.fulfill({contentType:'text/html',body:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/audit-duo.js"></script>'});
   if(path==='/audit-duo.js')return route.fulfill({contentType:'text/javascript',body:fixtureBundle});
   const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));
   try{return route.fulfill({body:await readFile(file),contentType:({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'})[extname(file)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}
  }
  requests.push({path,method:request.method(),query:url.search});if(request.method()!=='GET')writes.push({path,method:request.method()});
  if(path==='/api/auth/session')return route.fulfill({json:{user:{id:'audit-user',email:'audit@example.test',emailVerified:true}}});
  if(path==='/api/todos')return route.fulfill({json:todos});
  if(path==='/api/assistant/status')return route.fulfill({json:{enabled:false,scheduledMessages:false,actions:[]}});
  if(path==='/api/capabilities')return route.fulfill({json:{todoNotes:true}});
  if(path==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
  if(path==='/api/calendar/events'){
   if(scenario==='loading')await new Promise(done=>{releaseLoading=done;});
   if(scenario==='error')return route.fulfill({status:503,json:{error:'Google 일정 연결을 확인해주세요.'}});
   return route.fulfill({json:{items:scenario==='empty'||!url.search.includes('2026-11')?[]:events,nextCursor:null}});
  }
  if(path==='/api/integrations')return route.fulfill({json:[{provider:'google',connected:true,configured:true,features:['calendar'],availableFeatures:['calendar']}]});
  throw Error('Unexpected audit API '+request.method()+' '+path);
 });
}
async function snapshot(page){return page.locator('body').ariaSnapshot();}
async function click(page,locator){await snapshot(page);await locator.click();}
async function capture(page,file,step,description){
 await page.evaluate(()=>new Promise(done=>requestAnimationFrame(()=>requestAnimationFrame(done))));
 await page.screenshot({path:join(output,file+'.png')});
 const metrics=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('[role="button"],[role="tab"]')].map(e=>{const b=e.getBoundingClientRect(),s=getComputedStyle(e);return{label:e.getAttribute('aria-label')||e.textContent?.trim(),width:b.width,height:b.height,top:b.top,bottom:b.bottom,selected:e.getAttribute('aria-selected'),background:s.backgroundColor};}).filter(x=>x.width>0&&x.height>0),agenda:(()=>{const e=document.querySelector('[data-testid="calendar-agenda"]');if(!e)return null;const b=e.getBoundingClientRect();return{top:b.top,height:b.height,text:e.innerText};})(),grid:(()=>{const e=document.querySelector('[data-testid="calendar-date-grid"]');if(!e)return null;const b=e.getBoundingClientRect();return{top:b.top,bottom:b.bottom,height:b.height,days:e.querySelectorAll('[role="button"]').length};})()}));
 notes.push({file:file+'.png',step,description,...metrics,dom:await snapshot(page)});
 console.log('CAPTURE '+file);
}
try{
 const page=await browser.newPage({viewport:{width:390,height:844},timezoneId:'Asia/Seoul'});await setup(page);await page.goto(origin);await click(page,page.getByRole('tab',{name:'캘린더',exact:true}));await page.getByTestId('calendar-date-grid').getByText('프로젝트 출시 점검',{exact:true}).waitFor();
 await capture(page,'01-month-overview',1,'390pt 월: 제목/도구/42칸/선택일 안내/하단 바');
 await click(page,page.getByRole('button',{name:'선택한 날짜의 일정과 할 일 보기',exact:true}));await capture(page,'02-selected-day-agenda',2,'선택일로 이동: 종일/시간/겹침/할 일/완료 상태');
 const before=await page.getByTestId('calendar-agenda').innerText();await click(page,page.getByTestId('calendar-agenda').getByText('오전 디자인 리뷰',{exact:true}));assert.equal(await page.getByTestId('calendar-agenda').innerText(),before);await capture(page,'03-event-title-no-detail',2,'외부 일정 제목을 눌러도 상세 화면은 열리지 않음');
 await click(page,page.getByRole('button',{name:'할 일 추가 ＋',exact:true}));await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();await capture(page,'04-create-todo-sheet',3,'선택 날짜에서 추가: Todo만 표시, 저장하지 않음');await click(page,page.getByRole('button',{name:'닫기',exact:true}));
 await page.getByTestId('calendar-scroll').evaluate(el=>{el.scrollTop=0;});await click(page,page.getByRole('button',{name:'주 보기',exact:true}));await capture(page,'05-week-view',4,'주 보기:7날짜와 아젠다, 시간표 없음');await click(page,page.getByRole('button',{name:'다음 달',exact:true}));await capture(page,'06-week-next-control',4,'주 보기에서도 다음달 버튼은12월1일로 이동');
 await click(page,page.getByRole('button',{name:'오늘',exact:true}));await click(page,page.getByRole('button',{name:'월 보기',exact:true}));await click(page,page.getByRole('button',{name:'년월 선택',exact:true}));await capture(page,'07-month-year-picker',5,'년월 이동 시트: 웹 대체 select, native는 코드에 날짜 spinner');await click(page,page.getByRole('button',{name:'년월 선택 닫기',exact:true}));
 await click(page,page.getByRole('button',{name:'2026년 11월 20일, 일정과 할 일 0개',exact:true}));await capture(page,'15-selected-other-day',1,'오늘13일과 선택20일의 시각 구분');await click(page,page.getByRole('button',{name:'선택한 날짜의 일정과 할 일 보기',exact:true}));await capture(page,'08-empty-day',6,'빈 날짜의 일정/할 일 구분과 안내');
 await page.getByTestId('calendar-scroll').evaluate(el=>{el.scrollTop=0;});await click(page,page.getByRole('button',{name:'다음 달',exact:true}));
 const beforeTab=await page.getByRole('button',{name:'년월 선택',exact:true}).innerText();await click(page,page.getByRole('tab',{name:'Todo 리스트',exact:true}));await click(page,page.getByRole('tab',{name:'캘린더',exact:true}));
 const afterTab=await page.getByRole('button',{name:'년월 선택',exact:true}).innerText();assert.notEqual(afterTab,beforeTab);await capture(page,'16-tab-return-resets-month',4,'다른 탭을 다녀오면12월에서오늘11월로 초기화');notes.at(-1).interaction={beforeTab,afterTab};
 scenario='error';await page.reload();await click(page,page.getByRole('tab',{name:'캘린더',exact:true}));await page.getByRole('alert').waitFor();await capture(page,'09-error-month-top',6,'공급자 오류 상태: 화면 위에는 오류가 보이지 않음');await click(page,page.getByRole('button',{name:'선택한 날짜의 일정과 할 일 보기',exact:true}));await capture(page,'10-error-agenda',6,'공급자 오류 상태: 아래 아젠다의 빈 안내와 오류/재시도 동시 표시');
 scenario='loading';await page.reload();await click(page,page.getByRole('tab',{name:'캘린더',exact:true}));await page.getByText('일정을 불러오고 있어요.',{exact:true}).waitFor();await capture(page,'11-loading-month-top',6,'공급자 대기 중: 월 화면의 로딩 발견성');scenario='busy';releaseLoading?.();await page.getByTestId('calendar-date-grid').getByText('프로젝트 출시 점검',{exact:true}).waitFor();
 await page.setViewportSize({width:320,height:667});await capture(page,'12-small-phone',1,'320×667:42칸과본문/하단 바 관계');
 await page.evaluate(()=>{for(const el of document.querySelectorAll('[dir="auto"]')){const s=getComputedStyle(el),font=parseFloat(s.fontSize),line=parseFloat(s.lineHeight);el.style.fontSize=font*1.6+'px';if(Number.isFinite(line))el.style.lineHeight=line*1.6+'px';}});await capture(page,'13-large-text-simulation',1,'320pt·글자160% CSS 시뮬레이션, native Dynamic Type 검사가 아님');
 const temporary=await mkdtemp(join(tmpdir(),'calendar-audit-duo-'));
 try{
  execFileSync(process.execPath,[join(repo,'mobile/node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',join(repo,'mobile/e2e/fixtures/duo-layout.tsx'),'--bundle-output',join(temporary,'fixture.js'),'--assets-dest',temporary,'--dev','false','--max-workers','2'],{cwd:join(repo,'mobile'),env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1'},stdio:'pipe'});
  fixtureBundle=await readFile(join(temporary,'fixture.js'),'utf8');
  const duo=await browser.newPage({viewport:{width:960,height:740},timezoneId:'Asia/Seoul'});await setup(duo);await duo.goto(origin+'/audit-duo.html');
  await duo.evaluate(()=>{window.duoFixture.change({apiAvailable:true,hasHinge:true,hingeStatus:'fullyOpen',width:960,height:740,safeArea:{top:20,right:80,bottom:20,left:16},regions:[{kind:'occlusion',active:false,frame:{x:900,y:32,width:28,height:28}}]});window.duoFixture.showApp();});
  await duo.getByTestId('DuoFixedCalendarPane').getByRole('heading',{name:'캘린더',exact:true}).waitFor();await duo.getByTestId('DuoFixedCalendarPane').getByText('프로젝트 출시 점검',{exact:true}).first().waitFor();await capture(duo,'14-duo-fixed-calendar',1,'Duo 기하 fixture: 왼쪽Calendar 고정/오른쪽Todo, 실제 기기 아님');await duo.close();
 }finally{await rm(temporary,{recursive:true,force:true});}
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[],'audit must not submit even fixture writes');
 await writeFile(join(output,'observations.json'),JSON.stringify({sourceHead:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),fixedClock:'2026-11-13T00:00:00Z',timezone:'Asia/Seoul',evidence:'Expo actual components + isolated fixture APIs; no native iPhone/Apple/Fantastical account session',errors,writes,requests,steps:notes},null,2)+'\n');
 console.log('PASS:16 fresh calendar captures; 6 journey steps; no writes or page errors');
}finally{releaseLoading?.();await browser.close();}
