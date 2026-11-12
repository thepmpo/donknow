import {chromium} from 'playwright-core';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';

const root=resolve(new URL('../dist-web/',import.meta.url).pathname),origin='https://duck-chat-errors.test';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const reducedMotion of ['no-preference','reduce']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  let recordCount=5,historyReads=0,statusFailure=false,historyFailure=false,mode='provider',chatCalls=[],emailVerified=true;
  const messages={verification:'이메일 인증을 먼저 완료해주세요.',provider:'AI 요청을 완료하지 못했어요. 서비스 설정을 확인해주세요.',timeout:'AI 응답이 늦어요. 실행된 작업은 없어요.'};
  await page.addInitScript(({origin})=>{
   localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin}));
   // Exercise the real AbortController/error mapping without a one-minute test.
   const original=setTimeout;window.setTimeout=(handler,delay,...args)=>original(handler,delay===60000?600:delay,...args);
  },{origin});
  await page.route(origin+'/**',async route=>{
   const request=route.request(),path=new URL(request.url()).pathname;
   if(!path.startsWith('/api/')){
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));
    try{await route.fulfill({body:await readFile(file),contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'})[extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}return;
   }
   if(path==='/api/auth/session')return route.fulfill({json:{user:{id:'fixture-user',email:'fixture@example.test',emailVerified}}});
   if(path==='/api/todos')return route.fulfill({json:[]});
   if(path==='/api/assistant/status'){
    if(statusFailure){await new Promise(resolve=>setTimeout(resolve,10));if(historyReads>0)return route.fulfill({status:503,json:{error:'AI 연결을 확인하지 못했어요.'}});}
    return route.fulfill({json:{enabled:true,message:'AI 준비됨',actions:[]}});
   }
   if(path==='/api/assistant/actions'){historyReads++;return historyFailure?route.fulfill({status:503,json:{error:'최근 실행 기록을 불러오지 못했어요.'}}):route.fulfill({json:{actions:Array.from({length:recordCount},(_,index)=>({id:'old-'+index,operation:'todo.create',label:'이전 기록 '+index,status:'succeeded',args:{title:'예전 업무',notes:'오래된 기록 '.repeat(30)},expiresAt:Date.now()-1000}))}});}
   if(path==='/api/assistant/chat'){
    chatCalls.push(request.postDataJSON());const responseMode=mode;
    await new Promise(resolve=>setTimeout(resolve,responseMode==='client-timeout'?900:200));
    if(responseMode==='client-timeout'){try{await route.fulfill({json:{answer:'늦은 답변',sources:[],warnings:[],proposals:[]}});}catch{}return;}
    if(responseMode==='success')return route.fulfill({json:{answer:'요청한 내용을 확인했어요.',sources:[],warnings:[],proposals:[]}});
    return route.fulfill({status:responseMode==='verification'?403:responseMode==='unauthorized'?401:502,json:{error:messages[responseMode]||'다시 로그인해주세요.'}});
   }
   throw Error('Unexpected API request '+request.method()+' '+path);
  });
  const composer=page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}),send=page.getByRole('button',{name:'덕에게 보내기',exact:true}),consent=page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true});
  async function open(){historyReads=0;await page.goto(origin);await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'AI에 보낼 자료 선택',exact:true}).waitFor();}
  async function visibleNearComposer(locator,label){
   const box=await locator.boundingBox(),input=await composer.boundingBox();
   assert.ok(box&&input&&box.y>=0&&box.y+box.height<=input.y+1&&input.y+input.height<844,label+' remains visible above the composer');
  }
  for(const records of [5,0]){
   recordCount=records;await page.setViewportSize({width:records?390:320,height:844});
   for(const failure of ['verification','provider','timeout','client-timeout']){
    mode=failure;await open();await composer.fill('오늘 해야 할 일을 간단히 정리해줘');await consent.tap();await composer.focus();
    const callsBefore=chatCalls.length;await send.tap();
    await page.getByTestId('duck-chat-pending').waitFor();await visibleNearComposer(page.getByTestId('duck-chat-pending'),'sending indicator');
    assert.equal(await send.isDisabled(),true,'busy tap cannot submit again');
    const alert=page.getByRole('alert');await alert.waitFor();await visibleNearComposer(alert,`${failure}, ${records} previous records, ${reducedMotion}`);
    assert.equal(await composer.inputValue(),'오늘 해야 할 일을 간단히 정리해줘','failed input is preserved');assert.equal(await consent.getAttribute('aria-checked'),'true','consent is preserved');assert.equal(chatCalls.length,callsBefore+1,'no automatic resend');
    if(failure==='verification')assert.match(await alert.textContent(),/내정보 → 내 계정 → 이메일 인증/);
    else{
     assert.match(await alert.textContent(),failure==='client-timeout'?/응답 시간이 초과/:new RegExp(messages[failure]));
     await visibleNearComposer(page.getByRole('button',{name:'AI 요청 다시 보내기',exact:true}),'explicit retry');
    }
    if(failure==='provider'&&records===5&&reducedMotion==='no-preference')await page.screenshot({path:'/tmp/duck-chat-error-after.png'});
   }
  }
  mode='provider';recordCount=5;await open();await composer.fill('수정 전 요청');await consent.tap();await send.tap();await page.getByRole('alert').waitFor();
  await composer.fill('내용을 고친 뒤 다시 요청');mode='success';const beforeRetry=chatCalls.length;await page.getByRole('button',{name:'AI 요청 다시 보내기',exact:true}).tap();await page.getByText('요청한 내용을 확인했어요.',{exact:true}).waitFor();
  assert.equal(chatCalls.length,beforeRetry+1);assert.equal(chatCalls.at(-1).message,'내용을 고친 뒤 다시 요청');assert.equal(await composer.inputValue(),'');assert.equal(await page.getByRole('alert').count(),0);

  // The parent status read succeeds; the inline hook's own status read fails.
  statusFailure=true;await open();await composer.fill('연결 복구 후 보낼 요청');await consent.tap();await page.getByRole('button',{name:'AI 연결 다시 확인',exact:true}).waitFor();await visibleNearComposer(page.getByRole('alert'),'status load failure');assert.equal(await send.isDisabled(),true);
  const beforeStatusRetry=chatCalls.length;statusFailure=false;await page.getByRole('button',{name:'AI 연결 다시 확인',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('[aria-label="덕에게 보내기"]')?.getAttribute('aria-disabled')!=='true');assert.equal(await send.isDisabled(),false);assert.equal(chatCalls.length,beforeStatusRetry,'connection retry does not call AI');
  historyFailure=true;await open();await composer.fill('기록 조회 실패와 별개인 요청');await consent.tap();await page.getByRole('button',{name:'AI 연결 다시 확인',exact:true}).waitFor();assert.equal(await send.isDisabled(),false,'failed history does not disable ready AI');await send.tap();await page.getByText('요청한 내용을 확인했어요.',{exact:true}).waitFor();historyFailure=false;

  // A stale client account flag cannot block an account verified on the server.
  emailVerified=false;await open();await composer.fill('인증 갱신 뒤 요청');await consent.tap();await send.tap();await page.getByText('요청한 내용을 확인했어요.',{exact:true}).waitFor();emailVerified=true;
  mode='unauthorized';await composer.fill('만료된 세션 요청');await send.tap();await page.getByRole('button',{name:'로그인',exact:true}).waitFor();assert.equal(await page.getByTestId('duck-chat-feedback').count(),0,'expired session returns to login');
  assert.deepEqual(errors,[]);await page.close();
 }
 console.log('PASS: mobile touch + both motion preferences; visible pending and 403/502/server timeout/client timeout with empty or long history; preserved input/consent, explicit edited retry, status retry, independent history load, stale verification flag, expired login; mocked provider only');
}finally{await browser.close();}
