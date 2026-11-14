import {openDuckTools} from './helpers.mjs';
// Fresh UX evidence capture. All accounts, provider replies and Todo writes are isolated fixtures.
import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),origin='https://duck-ux-audit.test';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,timezoneId:'Asia/Seoul'});page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 async function visibleInConversation(locator,message){
  for(let attempt=0;attempt<30;attempt++){
   const box=await locator.boundingBox(),area=await page.getByTestId('duck-chat-scroll').boundingBox();
   if(box&&area&&box.y>=area.y-1&&box.y+box.height<=area.y+area.height+1)return;
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  }
  assert.fail(message);
 }
 let enabled=true,userId='first-user',chatCalls=[],prepareCalls=[],confirmCalls=[],drafts=[],todos=[],authorizeCalls=[],holdChat=false,releaseChat,holdConfirm=false,releaseConfirm,holdActionsRead=false,releaseActionsRead;
 const definition={operation:'todo.create',provider:'todo',label:'Todo 추가',fields:['title','notes','dueDate'],required:['title']};
 await page.addInitScript(({origin})=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),{origin});
 await page.route(origin+'/**',async route=>{
  const request=route.request(),path=new URL(request.url()).pathname,method=request.method(),body=request.postDataJSON();
  if(!path.startsWith('/api/')){
   const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));
   try{await route.fulfill({body:await readFile(file),contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'})[extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}return;
  }
  if(path==='/api/auth/session')return route.fulfill({json:{user:{id:userId,email:userId+'@example.test',emailVerified:true}}});
  if(path==='/api/auth/logout'){userId='second-user';todos=[];drafts=[];return route.fulfill({json:{ok:true}});}
  if(path==='/api/auth/login')return route.fulfill({json:{user:{id:userId,email:userId+'@example.test',emailVerified:true}}});
  if(path==='/api/assistant/status')return route.fulfill({json:{enabled,message:enabled?'AI 준비됨':'AI 서비스가 아직 설정되지 않았어요. 직접 작업을 작성하고 확인해 실행할 수 있어요.',actions:[definition]}});
  if(path==='/api/assistant/actions'&&method==='GET'){const snapshot=structuredClone(drafts);if(holdActionsRead){holdActionsRead=false;await new Promise(resolve=>{releaseActionsRead=resolve;});}return route.fulfill({json:{actions:snapshot}});}
  if(path==='/api/assistant/chat'){
   chatCalls.push(body);assert.equal(body.consent,true);assert.ok(body.message.length<=2000);assert.ok(body.history.every(turn=>turn.text.length<=2000));
   if(holdChat)await new Promise(resolve=>{releaseChat=resolve;});
   return route.fulfill({json:{answer:chatCalls.length===1?'자료 검토를 할 일 후보로 정리했어요. 제목과 날짜를 확인해주세요.':'할 일 후보를 준비했어요.',sources:[],warnings:[],proposals:[{operation:'todo.create',label:'Todo 추가',args:{title:'자료 준비',notes:'',dueDate:null},sourceRefs:[]}]}});
  }
  if(path==='/api/assistant/actions'&&method==='POST'){prepareCalls.push(body);const draft={...body,id:'draft-'+prepareCalls.length,label:'Todo 추가',status:'pending',expiresAt:Date.now()+600000};drafts.unshift(draft);return route.fulfill({json:draft});}
  if(path.match(/^\/api\/assistant\/actions\/[^/]+\/confirm$/)){
   confirmCalls.push({path,body});assert.equal(body.confirmation,true);if(holdConfirm)await new Promise(resolve=>{releaseConfirm=resolve;});
   const draft=drafts.find(draft=>path.includes(draft.id));draft.status='succeeded';todos.push({...draft.args,id:'todo-'+confirmCalls.length,done:false,createdAt:new Date().toISOString(),category:'일상',reminderAt:null});return route.fulfill({json:draft});
  }
  if(path==='/api/todos'&&method==='GET')return route.fulfill({json:todos});
  if(path==='/api/todos'&&method==='POST'){const todo={...body,id:'manual-1',done:false,createdAt:new Date().toISOString()};todos.push(todo);return route.fulfill({json:todo});}
  if(path==='/api/calendar/events')return route.fulfill({json:{items:[],nextCursor:null}});
  if(path==='/api/capabilities')return route.fulfill({json:{todoNotes:true,assistant:enabled,externalActions:true}});
  if(path==='/api/integrations/google/authorize'){authorizeCalls.push(body);return route.fulfill({json:{url:'https://accounts.google.com/fixture-only'}});}
  if(path==='/api/integrations')return route.fulfill({json:[{provider:'google',name:'Google',configured:true,connected:false,features:[],availableFeatures:['calendar','tasks','tasksWrite','gmail','gmailSend','gmailModify','drive','driveContent','driveWrite']},{provider:'notion',name:'Notion',configured:true,connected:false,features:[],availableFeatures:['pages','pagesWrite']},{provider:'slack',name:'Slack',configured:false,connected:false,features:[],availableFeatures:['channels','messages','messagesWrite']}]});
  if(path==='/api/operations/backup')return route.fulfill({json:{enabled:false,offsite:false,lastLocalSuccess:null,failed:false}});
  throw Error('Unexpected API request '+method+' '+path);
 });

 const output=process.env.DUCK_UX_OUTPUT?resolve(process.env.DUCK_UX_OUTPUT):resolve(new URL('../../artifacts/ux-fixes-2026-11-12/',import.meta.url).pathname);await mkdir(output,{recursive:true});
 const findings=[];
 async function capture(name){
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:resolve(output,name+'.png')});
  const measures=await page.evaluate(()=>({width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('[role="button"],[role="tab"],[role="checkbox"],input,textarea')].map(e=>{const b=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent?.trim().slice(0,60),role:e.getAttribute('role')||e.tagName,width:Math.round(b.width),height:Math.round(b.height),visible:b.width>0&&b.height>0&&b.top>=0&&b.top<innerHeight};}).filter(c=>c.visible)}));
  findings.push({file:name+'.png',...measures});
 }
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
 const labels=['계약서 검토하기','회의 자료 정리하기','다음 주 프로젝트 일정과 담당자별 준비 사항 확인하기','병원 예약하기','책 반납하기','운동 30분 하기','지난 회의록 공유하기','이메일 정리하기'];
 todos=labels.map((title,i)=>({id:'audit-'+i,title,notes:i===2?'담당자와 일정을 확인한 뒤 정리하기':'',done:i>=6,category:i%2?'일상':'업무',dueDate:i<3?today:null,reminderAt:null,createdAt:new Date().toISOString(),completedAt:i>=6?new Date().toISOString():null}));
 await page.goto(origin);await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('button',{name:'계약서 검토하기 수정',exact:true}).waitFor();await capture('01-todos-fixture');
 await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.getByText('계약서 검토하기',{exact:true}).first().waitFor();await capture('02-calendar-fixture');
 await page.getByRole('button',{name:'선택한 날짜의 일정과 할 일 보기',exact:true}).click();
 await page.getByTestId('calendar-agenda').getByText('계약서 검토하기',{exact:true}).waitFor();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok((await page.getByTestId('calendar-agenda').boundingBox()).y<500,'calendar jump reveals selected-day heading above navigation');await capture('16-calendar-jump-fixture');
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'대화 도구 열기'}).waitFor();await capture('03-duck-start-fixture');
 assert.equal(await page.getByTestId('duck-chat-tools').count(),0,'optional tools begin collapsed');
 assert.ok((await page.getByTestId('duck-chat-scroll').boundingBox()).height>450,'conversation has at least 450px at 390x844');
 await page.getByRole('tab',{name:'log',exact:true}).click();await capture('04-log-fixture');
 await page.getByRole('tab',{name:'내정보',exact:true}).click();await page.getByRole('button',{name:'Google 연결 안내',exact:true}).waitFor();await capture('05-profile-fixture');
 await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.ok((await page.getByText('내 계정',{exact:true}).boundingBox()).y<400,'profile jump reveals account heading');await capture('17-account-jump-fixture');
 await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('checkbox',{name:'Google Tasks 읽기 권한',exact:true}).waitFor();await capture('06-google-permissions-fixture');
 for(const target of [page.getByRole('tab',{name:'Google',exact:true}),page.getByRole('checkbox',{name:'Google Tasks 읽기 권한',exact:true})]){const box=await target.boundingBox();assert.ok(box.width>=44&&box.height>=44,'permission controls have 44px touch targets');}
 const extra=page.getByRole('button',{name:'추가 권한 선택',exact:true});assert.equal(await extra.getAttribute('aria-expanded'),'false');await extra.click();
 const sendScope=page.getByRole('checkbox',{name:'메일 발송 권한',exact:true});assert.equal(await sendScope.getAttribute('aria-checked'),'false');await sendScope.click();
 assert.ok((await sendScope.boundingBox()).y<(await page.getByRole('button',{name:'Google 연결',exact:true}).boundingBox()).y,'authorization follows write choices');await capture('18-expanded-permissions-fixture');
 await extra.click();await extra.click();assert.equal(await sendScope.getAttribute('aria-checked'),'true','folding permissions preserves selection');
 const contrast=await page.getByRole('button',{name:'Google 연결',exact:true}).evaluate(el=>{const rgb=s=>s.match(/[\d.]+/g).slice(0,3).map(Number);const lum=s=>rgb(s).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);const a=lum(getComputedStyle(el).backgroundColor),b=lum(getComputedStyle(el.firstElementChild).color);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});assert.ok(contrast>=4.5,'white primary button text meets 4.5:1');
 await page.evaluate(()=>{window.open=()=>({opener:null,location:{href:''},close(){}});});await page.getByRole('button',{name:'Google 연결',exact:true}).click();await page.getByText('연결을 승인한 뒤 이 화면에서 새로고침을 눌러주세요.',{exact:true}).waitFor();assert.equal(authorizeCalls.length,1);assert.deepEqual(authorizeCalls[0].features,['calendar','gmailSend'],'only selected scopes requested; mock authorization does not grant permissions');
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();
 const composer=page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true});await composer.fill('자료 검토를 할 일로 추가해줘');await capture('07-request-before-consent-fixture');
 await page.getByText('자료 사용에 동의하면 보낼 수 있어요.',{exact:true}).waitFor();assert.equal(chatCalls.length,0);assert.equal(await page.getByRole('button',{name:'덕에게 보내기',exact:true}).isDisabled(),true);
 await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 후보 1 제목',exact:true}).waitFor();await capture('08-ai-candidate-fixture');
 await visibleInConversation(page.getByRole('button',{name:'Todo 추가 초안 확인',exact:true}),'candidate preview button is visible with title and date');
 assert.equal(await page.getByRole('textbox',{name:'할 일 후보 1 메모',exact:true}).count(),0,'optional memo starts collapsed');await page.getByRole('button',{name:'할 일 후보 1 메모 열기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 후보 1 메모',exact:true}).fill('접어도 보존할 메모');await page.getByRole('button',{name:'할 일 후보 1 메모 접기',exact:true}).click();await page.getByRole('button',{name:'할 일 후보 1 메모 열기',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'할 일 후보 1 메모',exact:true}).inputValue(),'접어도 보존할 메모');await page.getByRole('button',{name:'할 일 후보 1 메모 접기',exact:true}).click();
 await page.getByLabel('예정일 선택',{exact:true}).fill('2026-12-24');
 await page.getByRole('textbox',{name:'할 일 후보 1 제목',exact:true}).fill('AI에서 확인한 자료 검토');await page.getByRole('button',{name:'Todo 추가 초안 확인',exact:true}).click();await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).waitFor();await capture('09-confirmation-fixture');assert.equal(todos.length,8);assert.equal(prepareCalls.at(-1).args.dueDate,'2026-12-24');assert.equal(prepareCalls.at(-1).args.notes,'접어도 보존할 메모');await page.getByTestId('duck-action-draft-1').getByText('예정일: 2026년 12월 24일',{exact:true}).waitFor();
 await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).click();await page.getByText('Todo 추가 · 완료',{exact:true}).waitFor();await capture('10-succeeded-fixture');assert.equal(todos.length,9);assert.equal(confirmCalls.length,1);
 const completed=page.getByTestId('duck-action-draft-1');assert.equal(await completed.getByText('메모: 접어도 보존할 메모',{exact:true}).count(),0,'completed details start folded');await completed.getByRole('button',{name:'Todo 추가 실행 내용 보기 draft-1',exact:true}).click();await completed.getByText('메모: 접어도 보존할 메모',{exact:true}).waitFor();await completed.getByRole('button',{name:'Todo 추가 실행 내용 접기 draft-1',exact:true}).click();
 await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('button',{name:'AI에서 확인한 자료 검토 수정',exact:true}).waitFor();await capture('11-added-todo-fixture');
 await page.getByRole('button',{name:'AI에서 확인한 자료 검토 수정',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();await capture('12-edit-sheet-fixture');
 for(const width of [390,320]){await page.setViewportSize({width,height:width===320?700:844});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const save=await page.getByRole('button',{name:'저장',exact:true}).boundingBox();assert.ok(save.y>=0&&save.y+save.height<=(width===320?700:844),'save remains fully visible at '+width);assert.equal(await page.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'접어도 보존할 메모');}
 await capture('19-small-editor-fixture');await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await openDuckTools(page);await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).fill('동료: 내일까지 자료 검토 부탁해요.');await capture('13-paste-sheet-fixture');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.setViewportSize({width:320,height:700});await capture('14-duck-small-fixture');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'320px has no horizontal overflow');assert.match(await page.getByRole('tab',{name:'Todo 리스트',exact:true}).innerText(),/Todo\s+리스트/,'small tab label breaks between words');
 await page.setViewportSize({width:390,height:844});await page.route(origin+'/api/assistant/chat',route=>route.fulfill({status:502,json:{error:'AI 요청이 잠시 몰렸어요. 잠시 뒤 다시 보내주세요.'}}));await composer.fill('이어서 정리해줘');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByTestId('duck-chat-feedback').waitFor();await capture('15-error-retry-fixture');
 await writeFile(resolve(output,'capture-metadata.json'),JSON.stringify({source:'Current Expo web bundle; isolated mock account, model and API; no production reads/writes',capturedAt:new Date().toISOString(),steps:findings,requests:{chat:chatCalls.length,prepare:prepareCalls.length,confirm:confirmCalls.length,authorization:authorizeCalls.length},errors},null,2)+'\n');
 assert.deepEqual(errors,[]);console.log('CAPTURED '+findings.length+' fresh UX steps; chat space, visible consent/preview, preserved memo/date, folded results, calendar/account jumps, 44px scopes, exact requested rights, 4.5:1 contrast and 320px verified against isolated mock API');
}finally{await browser.close();}
