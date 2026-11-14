import {openMeAccount} from './helpers.mjs';
import {openDuckTools} from './helpers.mjs';
import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),origin='https://duck-chat.test';
const capture=process.env.CHAT_CAPTURE_DIR;if(capture)await mkdir(capture,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 async function visibleInConversation(locator,message){
  for(let attempt=0;attempt<30;attempt++){
   const box=await locator.boundingBox(),area=await page.getByTestId('duck-chat-scroll').boundingBox();
   if(box&&area&&box.y>=area.y-1&&box.y+box.height<=area.y+area.height+1)return;
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(resolve)));
  }
  assert.fail(message);
 }
 let enabled=true,userId='first-user',chatCalls=[],prepareCalls=[],confirmCalls=[],drafts=Array.from({length:5},(_,index)=>({id:'older-'+index,operation:'todo.create',label:'이전 기록 '+index,status:'succeeded',args:{title:'예전 업무 '+index,notes:'오래된 기록 '.repeat(30)},expiresAt:Date.now()-1000})),todos=[],holdChat=false,releaseChat,holdConfirm=false,releaseConfirm,holdActionsRead=false,releaseActionsRead;
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
   return route.fulfill({json:{answer:chatCalls.length===1?'긴 답변 '.repeat(600)+'답변 끝까지 유지':'할 일 후보를 준비했어요.',sources:[],warnings:[],proposals:[{operation:'todo.create',label:'Todo 추가',args:{title:'자료 준비',notes:'',dueDate:null},sourceRefs:[]}]}});
  }
  if(path==='/api/assistant/actions'&&method==='POST'){prepareCalls.push(body);const draft={...body,id:'draft-'+prepareCalls.length,label:'Todo 추가',status:'pending',expiresAt:Date.now()+600000};drafts.unshift(draft);return route.fulfill({json:draft});}
  if(path.match(/^\/api\/assistant\/actions\/[^/]+\/confirm$/)){
   confirmCalls.push({path,body});assert.equal(body.confirmation,true);if(holdConfirm)await new Promise(resolve=>{releaseConfirm=resolve;});
   const draft=drafts.find(draft=>path.includes(draft.id));draft.status='succeeded';todos.push({...draft.args,id:'todo-'+confirmCalls.length,done:false,createdAt:new Date().toISOString(),category:'일상',reminderAt:null});return route.fulfill({json:draft});
  }
  if(path==='/api/todos'&&method==='GET')return route.fulfill({json:todos});
  if(path==='/api/todos'&&method==='POST'){const todo={...body,id:'manual-1',done:false,createdAt:new Date().toISOString()};todos.push(todo);return route.fulfill({json:todo});}
  if(path==='/api/capabilities')return route.fulfill({json:{todoNotes:true,assistant:enabled,externalActions:true}});
  if(path==='/api/integrations')return route.fulfill({json:[]});
  if(path==='/api/operations/backup')return route.fulfill({json:{enabled:false,offsite:false,lastLocalSuccess:null,failed:false}});
  throw Error('Unexpected API request '+method+' '+path);
 });
 await page.goto(origin);await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'대화 도구 열기'}).waitFor();
 assert.equal(chatCalls.length,0,'opening Duck never starts AI');
 const composerBox=await page.getByTestId('duck-composer').boundingBox();assert.ok(composerBox.height<=54,'empty composer takes one compact row '+JSON.stringify(composerBox));for(const name of ['대화 도구 열기','덕에게 보내기']){const box=await page.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box.width>=44&&box.height>=44);}assert.equal(await page.getByRole('button',{name:'AI에 보낼 자료 선택',exact:true}).count(),0,'source picker stays in the optional tools');if(capture){await page.screenshot({path:resolve(capture,'01-compact-phone-chat.png')});await writeFile(resolve(capture,'composer.json'),JSON.stringify(composerBox,null,2));}
 const composer=page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true});
 await openDuckTools(page);await page.getByRole('button',{name:'AI에 보낼 자료 선택',exact:true}).click();await page.getByTestId('duck-chat-providers').waitFor();await page.getByRole('button',{name:'대화 도구 열기',exact:true}).click();assert.equal(await page.getByTestId('duck-chat-providers').count(),0);assert.equal(await page.getByTestId('duck-chat-tools').count(),0);
 const longRequest='이번주 해야 할 일을 정리해주세요. '.repeat(12);await composer.fill(longRequest);assert.equal(await composer.inputValue(),longRequest);
 assert.equal(await page.getByRole('button',{name:'덕에게 보내기',exact:true}).isDisabled(),true,'explicit consent before AI');
 await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();
 await page.getByRole('textbox',{name:'할 일 후보 1 제목'}).waitFor();assert.equal(chatCalls.length,1);assert.equal(prepareCalls.length,0);assert.equal(confirmCalls.length,0);assert.equal(await page.getByRole('dialog').count(),0,'normal AI stays in Duck conversation');
 assert.ok((await page.getByTestId('duck-chat-scroll').textContent()).includes('답변 끝까지 유지'),'long answer remains visible');await visibleInConversation(page.getByTestId('duck-latest-reply').getByText('덕',{exact:true}),'new reply heading is visible instead of old history');
 await page.getByRole('textbox',{name:'할 일 후보 1 제목'}).fill('확인 후 저장할 자료');await page.getByRole('button',{name:'Todo 추가 초안 확인',exact:true}).click();
 await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).waitFor();assert.equal(prepareCalls.length,1);assert.equal(prepareCalls[0].args.title,'확인 후 저장할 자료');assert.equal(todos.length,0,'preview creates no Todo');await visibleInConversation(page.getByTestId('duck-action-draft-1').getByText('Todo 추가 · 확인 대기',{exact:true}),'new preview heading is visible above old records');assert.equal(await page.getByLabel('예정일 선택',{exact:true}).count(),0,'prepared candidate date is read-only');await page.getByTestId('duck-action-draft-1').getByText('예정일: 없음',{exact:true}).waitFor();
 holdConfirm=true;await page.getByRole('button',{name:'Todo 추가 확인하고 실행',exact:true}).evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>document.body.textContent.includes('처리하고 있어요'));assert.equal(await page.getByRole('button',{name:'대화 도구 열기',exact:true}).isDisabled(),true,'no replacement draft during an active request');assert.equal(confirmCalls.length,1,'double tap submits once');holdConfirm=false;releaseConfirm();
 await page.getByText('Todo 추가 · 완료',{exact:true}).waitFor();assert.equal(todos.length,1);await visibleInConversation(page.getByTestId('duck-action-draft-1').getByText('Todo 추가 · 완료',{exact:true}),'completed result heading remains visible');
 await composer.fill('이어서 확인해줘');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByText('할 일 후보를 준비했어요.',{exact:true}).waitFor();assert.equal(chatCalls.length,2);assert.equal(chatCalls[1].history[1].text.length,2000,'follow-up context trims long answer');await visibleInConversation(page.getByRole('textbox',{name:'할 일 후보 1 제목',exact:true}),'candidate title remains visible below short reply');await visibleInConversation(page.getByLabel('예정일 선택',{exact:true}),'candidate date remains visible instead of scrolling to bottom of large note');
 await page.getByTestId('duck-chat-scroll').evaluate(element=>{element.scrollTop=0;});await openDuckTools(page);await page.getByRole('button',{name:'AI에 보낼 자료 선택',exact:true}).click();await visibleInConversation(page.getByTestId('duck-chat-providers').getByText('이번 대화에서 사용할 자료',{exact:true}),'opened provider panel is revealed from old scroll position');await openDuckTools(page);await page.getByRole('button',{name:'AI에 보낼 자료 선택',exact:true}).click();
 await composer.fill('탭과 크기를 바꿔도 남는 입력');await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();assert.equal(await composer.inputValue(),'탭과 크기를 바꿔도 남는 입력');
 for(const width of [320,430,900]){await page.setViewportSize({width,height:844});assert.equal(await composer.inputValue(),'탭과 크기를 바꿔도 남는 입력');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no horizontal overflow '+width);}
 // An older record read cannot replace a new preview. Closing advanced controls refreshes inline records.
 await page.setViewportSize({width:390,height:844});await openDuckTools(page);await page.getByRole('button',{name:'덕 AI 비서 열기',exact:true}).click();await page.getByText('덕 비서',{exact:true}).waitFor();await page.getByRole('button',{name:'직접 작업 작성',exact:true}).click();await page.getByRole('button',{name:'Todo 추가',exact:true}).click();await page.getByRole('textbox',{name:'작업 제목',exact:true}).fill('늦은 기록보다 새 초안');
 holdActionsRead=true;await page.getByRole('button',{name:'기록 새로고침',exact:true}).click();for(let attempt=0;attempt<500&&!releaseActionsRead;attempt++)await new Promise(resolve=>setTimeout(resolve,10));assert.ok(releaseActionsRead,'record refresh reached fixture');
 await page.getByRole('button',{name:'실행 전 내용 확인',exact:true}).click();await page.getByText('제목: 늦은 기록보다 새 초안',{exact:true}).waitFor();
 const oldReadDone=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/assistant/actions'&&response.request().method()==='GET');releaseActionsRead();await oldReadDone;await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.getByText('제목: 늦은 기록보다 새 초안',{exact:true}).waitFor();
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.getByText('덕 비서',{exact:true}).waitFor({state:'hidden'});await page.getByText('제목: 늦은 기록보다 새 초안',{exact:true}).waitFor();
 await openDuckTools(page);await page.getByRole('button',{name:'카카오톡 대화 붙여넣기',exact:true}).click();
 const pasted='준비할 자료에 대한 대화입니다. '.repeat(180);await page.getByRole('textbox',{name:'복사한 카카오톡 대화',exact:true}).fill(pasted);await page.getByRole('button',{name:'붙여넣은 내용 AI 분석 준비',exact:true}).click();
 await page.getByText(`붙여넣은 내용 ${pasted.length}자 · 아직 보내지 않았어요`,{exact:true}).waitFor();assert.equal(chatCalls.length,2,'prepare paste never calls AI');assert.equal(await page.getByRole('button',{name:'덕에게 보내기',exact:true}).isDisabled(),true,'new paste needs consent');
 await page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true}).click();await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByText(`붙여넣은 내용 ${pasted.length}자 · 아직 보내지 않았어요`,{exact:true}).waitFor({state:'hidden'});assert.equal(chatCalls.at(-1).pastedText,pasted);assert.equal(chatCalls.length,3);
 await page.screenshot({path:'/tmp/duck-chat-mobile-fixture.png'});
 // A late AI answer from the first account cannot appear in the next account.
 holdChat=true;await composer.fill('이전 계정에서만 보여야 하는 질문');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.waitForFunction(()=>document.body.textContent.includes('처리하고 있어요'));
 await openMeAccount(page);await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();
 releaseChat();await page.getByRole('textbox',{name:'이메일',exact:true}).fill('second@example.test');await page.getByLabel('비밀번호',{exact:true}).fill('test-password');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'대화 도구 열기'}).waitFor();
 assert.equal(await composer.inputValue(),'');assert.equal(await page.getByText('이전 계정에서만 보여야 하는 질문',{exact:true}).count(),0);assert.equal(await page.getByRole('textbox',{name:'할 일 후보 1 제목'}).count(),0);
 // Unconfigured AI keeps the existing explicit manual Todo flow.
 enabled=false;await page.reload();await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByText('AI 연결은 준비 중이에요. 지금은 직접 적어 Todo로 담을 수 있어요.',{exact:true}).waitFor();
 await composer.fill('AI 없이 직접 정리');await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByRole('textbox',{name:'정리한 할 일',exact:true}).waitFor();assert.equal(todos.length,0);await page.getByRole('button',{name:'Todo 리스트에 추가',exact:true}).click();await page.getByText('추가 완료 ✓',{exact:true}).waitFor();assert.equal(todos[0].title,'AI 없이 직접 정리');
 assert.deepEqual(errors,[]);console.log('PASS: inline AI consent, full answer / bounded follow-up, editable proposals, preview and single confirm, pasted text consent, tab/resize continuity, stale record read preservation, advanced-close refresh, visible new results over old history, provider reveal, read-only prepared dates, owner isolation, unavailable-AI manual fallback; mocked provider only');
}finally{await browser.close();}
