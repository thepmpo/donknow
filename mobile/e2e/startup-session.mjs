// Real production Expo UI, isolated synthetic API/session delays. No real account/model writes.
import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web',import.meta.url).pathname),out=resolve(new URL('../../artifacts/startup-session-2026-11-16',import.meta.url).pathname);await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage']}),origin='https://startup.test',errors=[],results=[];
const access={plan:'pro',mode:'complimentary',chat:true,createFromSources:true},user={id:'fixture',email:'fixture@example.test',emailVerified:true,plan:'pro',planAccess:'complimentary'};
async function scenario(mode){
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 let releaseSession,releaseTodos,signalSession,signalTodos,online=mode!=='offline',first=true;
 const held=new Promise(r=>signalSession=r),listHeld=new Promise(r=>signalTodos=r),calls=[];
 let todos=[{id:'one',title:'직접 쓴 첫 번째',dueDate:null,done:false,category:'일상',order:0},{id:'two',title:'직접 쓴 두 번째',dueDate:null,done:false,category:'일상',order:1},{id:'slack',title:'Slack에서 온 요청',dueDate:null,done:false,category:'업무',order:2,source:{provider:'slack',externalId:'channel:message'}}];
 await page.route(origin+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(!path.startsWith('/api/')){const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));return route.fulfill({contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf'})[extname(file)]??'application/octet-stream',body:await readFile(file)});}
  calls.push(path);const done=(json,status=200)=>route.fulfill({json,status});
  if(path==='/api/auth/session'){if(first){first=false;signalSession();await new Promise(r=>releaseSession=r);}return mode==='expired'?done({error:'expired'},401):online?done({user}):done({error:'fixture offline'},503);}
  if(path==='/api/todos'){if(!releaseTodos){signalTodos();await new Promise(r=>releaseTodos=r);}return done(todos);}
  if(path==='/api/capabilities')return done({todoOrdering:1,todoNotes:true});
  if(path==='/api/todo-order'){const ids=req.postDataJSON().ids;todos=todos.map(t=>({...t,order:ids.indexOf(t.id)}));await new Promise(r=>setTimeout(r,350));return done(todos);}
  if(path==='/api/assistant/status')return done({enabled:true,access,usage:{funded:false,remainingKrw:0,proPriceKrw:27900},actions:[],consentScopes:{todo:'todo-v1'}});
  if(path==='/api/integrations')return done({integrations:[]});
  if(path==='/api/agent/profile')return done({name:'docen',providers:[]});
  return done({items:[],messages:[],turns:[],actions:[],jobs:[],settings:{enabled:false}});
 });
 try{
  await page.goto(origin);await held;await page.getByTestId('session-restoration').waitFor();
  const nav=page.getByTestId('BottomNavigation');await nav.waitFor();const before=await nav.boundingBox();
  assert.equal(await page.getByRole('textbox',{name:'이메일',exact:true}).count(),0);assert.equal(calls.includes('/api/todos'),false);assert.equal(await nav.getByRole('tab',{disabled:true}).count(),5);
  if(mode==='success')await page.screenshot({path:out+'/03-restoring.png'});
  releaseSession();
  if(mode==='expired'){await page.getByRole('textbox',{name:'이메일',exact:true}).waitFor();assert.equal(await nav.count(),0);results.push('401 alone opens login');return;}
  if(mode==='offline'){await page.getByRole('button',{name:'연결 다시 확인',exact:true}).waitFor();assert.equal(await page.getByRole('textbox',{name:'이메일',exact:true}).count(),0);assert.equal(calls.includes('/api/todos'),false);await page.screenshot({path:out+'/07-connection-retry.png'});online=true;await page.getByRole('button',{name:'연결 다시 확인',exact:true}).click();}
  await listHeld;await page.getByTestId('session-restoration').waitFor({state:'detached'});assert.equal(await nav.getByRole('tab',{disabled:false}).count(),5);const after=await nav.boundingBox();assert.ok(Math.abs(before.y-after.y)<1&&Math.abs(before.height-after.height)<1,'navigation never jumps after authentication');
  releaseTodos();await page.getByTestId('todo-one').waitFor();
  if(mode==='offline'){results.push('503 preserves the pending session and explicit retry restores it');return;}
  await page.getByRole('tab',{name:'출처별 할 일',exact:true}).click();assert.deepEqual(await page.getByTestId(/^agenda-source:/).evaluateAll(els=>els.map(e=>e.dataset.testid)),['agenda-source:local','agenda-source:slack']);await page.screenshot({path:out+'/04-manual-first.png'});
  await page.getByRole('button',{name:'할 일 여러 개 선택',exact:true}).click();await page.getByRole('checkbox',{name:'직접 쓴 두 번째 선택',exact:true}).click();await page.getByRole('button',{name:'선택한 할 일 이동',exact:true}).click();
  await page.evaluate(()=>{window.reorderSamples=[];const started=performance.now();const sample=()=>{const el=document.querySelector('[data-testid="todo-two"]').parentElement.parentElement;window.reorderSamples.push(new DOMMatrix(getComputedStyle(el).transform).m42);if(performance.now()-started<600)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
  await page.getByRole('button',{name:'선택한 할 일 위로 이동',exact:true}).click();await page.getByText('할 일을 옮겼어요.',{exact:true}).waitFor();
  assert.deepEqual(await page.getByTestId('agenda-source:local').getByTestId(/^todo-(one|two)$/).evaluateAll(els=>els.map(e=>e.dataset.testid)),['todo-two','todo-one']);
  await page.waitForFunction(()=>window.reorderSamples?.length>10);const samples=await page.evaluate(()=>window.reorderSamples);assert.ok(samples.some(v=>Math.abs(v)>1),'rows interpolate from their old position');await page.waitForTimeout(220);assert.ok(Math.abs(await page.getByTestId('todo-two').evaluate(e=>new DOMMatrix(getComputedStyle(e.parentElement.parentElement).transform).m42))<1);
  await page.getByRole('tab',{name:'docen',exact:true}).click();const input=page.getByRole('textbox',{name:'docen에게 이야기하기',exact:true});await input.fill('탭을 바꿔도 유지할 초안');assert.equal(await page.getByTestId('duck-receive-only').count(),0);assert.equal(await page.getByText('프로 이용 중이에요. AI 처리 예산은 아직 준비되지 않았어요.',{exact:false}).count(),0);
  for(const name of ['ME','log','Todo 리스트','docen']){await page.getByRole('tab',{name,exact:true}).click();assert.equal(await page.getByTestId('screen-transition').evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).a),1);}
  assert.equal(await input.inputValue(),'탭을 바꿔도 유지할 초안');await page.screenshot({path:out+'/05-pro-chat.png'});
  await page.getByRole('tab',{name:'ME',exact:true}).click();await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();await page.getByText('프로 · 현재 무료 제공',{exact:true}).waitFor();await page.screenshot({path:out+'/06-account-pro.png'});
  await page.emulateMedia({reducedMotion:'reduce'});await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();assert.equal(await page.getByTestId('screen-transition').evaluate(e=>getComputedStyle(e).opacity),'1');
  results.push('slow session: no login flash/private read; fixed navigation before Todo load; manual group first; animated optimistic reorder; stable page scale; preserved chat draft; complimentary Pro and unfunded budget are distinct; reduced motion');
 }finally{releaseSession?.();releaseTodos?.();await context.close();}
}
try{for(const mode of ['success','expired','offline'])await scenario(mode);assert.deepEqual(errors,[]);await writeFile(out+'/results.json',JSON.stringify({results,errors,scope:'production Expo web, synthetic API; physical iOS/Duo not verified'},null,2));console.log('PASS',results);}finally{await browser.close();}
