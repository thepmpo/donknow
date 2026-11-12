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
 let enabled=true,userId='first-user',chatCalls=[],prepareCalls=[],confirmCalls=[],drafts=[],todos=[],holdChat=false,releaseChat,holdConfirm=false,releaseConfirm,holdActionsRead=false,releaseActionsRead;
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
  if(path==='/api/integrations')return route.fulfill({json:[{provider:'google',name:'Google',configured:true,connected:false,features:[],availableFeatures:['calendar','tasks','tasksWrite','gmail','gmailSend','gmailModify','drive','driveContent','driveWrite']},{provider:'notion',name:'Notion',configured:true,connected:false,features:[],availableFeatures:['pages','pagesWrite']},{provider:'slack',name:'Slack',configured:false,connected:false,features:[],availableFeatures:['channels','messages','messagesWrite']}]});
  if(path==='/api/operations/backup')return route.fulfill({json:{enabled:false,offsite:false,lastLocalSuccess:null,failed:false}});
  throw Error('Unexpected API request '+method+' '+path);
 });

 const output=resolve(new URL('../../artifacts/ux-audit-2026-11-12/',import.meta.url).pathname);await mkdir(output,{recursive:true});
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
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'AI에 보낼 자료 선택'}).waitFor();await capture('03-duck-start-fixture');
 await page.getByRole('tab',{name:'log',exact:true}).click();await capture('04-log-fixture');
 await page.getByRole('tab',{name:'내정보',exact:true}).click();await page.getByRole('button',{name:'Google 연결 안내',exact:true}).waitFor();await capture('05-profile-fixture');
 await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('checkbox',{name:'Google Tasks 읽기 권한',exact:true}).waitFor();await capture('06-google-permissions-fixture');
 await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();
 const composer=page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true});await composer.fill('자료 검토를 할 일로 추가해줘');await capture('07-request-before-consent-fixture');
 assert.equal(chatCalls.length,0);assert.equal(await page.getByRole('button',{name:'덕에게 보내기',exact:true}).isDisabled(),true);
 await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByRole('textbox',{name:'할 일 후보 1 제목',exact:true}).waitFor();await capture('08-ai-candidate-fixture');
 await page.getByRole('textbox',{name:'할 일 후보 1 제목',exact:true}).fill('AI에서 확인한 자료 검토');await page.getByRole('button',{name:'Todo 추가 초안 확인',exact:true}).click();await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).waitFor();await capture('09-confirmation-fixture');assert.equal(todos.length,8);
 await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).click();await page.getByText('Todo 추가 · 완료',{exact:true}).waitFor();await capture('10-succeeded-fixture');assert.equal(todos.length,9);assert.equal(confirmCalls.length,1);
 await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('button',{name:'AI에서 확인한 자료 검토 수정',exact:true}).waitFor();await capture('11-added-todo-fixture');
 await page.getByRole('button',{name:'AI에서 확인한 자료 검토 수정',exact:true}).click();await page.getByRole('textbox',{name:'할 일 제목',exact:true}).waitFor();await capture('12-edit-sheet-fixture');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).fill('동료: 내일까지 자료 검토 부탁해요.');await capture('13-paste-sheet-fixture');await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.setViewportSize({width:320,height:700});await capture('14-duck-small-fixture');
 await page.setViewportSize({width:390,height:844});await page.route(origin+'/api/assistant/chat',route=>route.fulfill({status:502,json:{error:'AI 요청이 잠시 몰렸어요. 잠시 뒤 다시 보내주세요.'}}));await composer.fill('이어서 정리해줘');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByTestId('duck-chat-feedback').waitFor();await capture('15-error-retry-fixture');
 await writeFile(resolve(output,'capture-metadata.json'),JSON.stringify({source:'Current Expo web bundle; isolated mock account, model and API; no production reads/writes',capturedAt:new Date().toISOString(),steps:findings,requests:{chat:chatCalls.length,prepare:prepareCalls.length,confirm:confirmCalls.length},errors},null,2)+'\n');
 assert.deepEqual(errors,[]);console.log('CAPTURED '+findings.length+' fresh UX steps; consent, preview before write, single confirm and resulting Todo verified against isolated mock API');
}finally{await browser.close();}
