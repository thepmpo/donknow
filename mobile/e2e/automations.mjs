import {chromium} from 'playwright-core';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {openDuckTools} from './helpers.mjs';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),origin='https://duck-schedule.test',output=resolve(new URL('../../artifacts/scheduled-messages-2026-11-13/',import.meta.url).pathname);await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',timezoneId:'Asia/Seoul'});await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();
 let owner='first',readCalls=0,saves=[],modelCalls=0;
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const messages={first:[{id:'briefing-1',kind:'briefing',title:'오늘의 브리핑',text:'좋은 아침이에요. 오늘은 회의 자료를 먼저 준비해보세요.\n서울 날씨 현재12°C',warnings:[],createdAt:Date.now(),readAt:null}],second:[]};
 let schedules=['briefing','weather'].map(kind=>({kind,enabled:false,time:'08:00',timezone:'Asia/Seoul',city:kind==='weather'?'seoul':null,providers:[],aiConsent:false,revision:0,nextAt:null}));
 await page.addInitScript(({origin})=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),{origin});
 await page.route(origin+'/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,method=req.method(),body=req.postDataJSON();
  if(!path.startsWith('/api/')){const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));try{await route.fulfill({body:await readFile(file),contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'})[extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}return;}
  if(path==='/api/auth/session'||path==='/api/auth/login')return route.fulfill({json:{user:{id:owner,email:owner+'@example.test',emailVerified:true}}});
  if(path==='/api/auth/logout'){owner='second';return route.fulfill({json:{ok:true}});}
  if(path==='/api/todos')return route.fulfill({json:[]});
  if(path==='/api/calendar/events')return route.fulfill({json:{items:[],nextCursor:null}});
  if(path==='/api/capabilities')return route.fulfill({json:{todoNotes:true,assistant:true,scheduledMessages:true}});
  if(path==='/api/assistant/status')return route.fulfill({json:{enabled:true,scheduledMessages:true,actions:[],message:'준비됨'}});
  if(path==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
  if(path==='/api/assistant/chat'){modelCalls++;throw Error('Opening schedules must not call the model');}
  if(path==='/api/assistant/messages')return route.fulfill({json:{messages:messages[owner]}});
  if(path==='/api/assistant/messages/read'){readCalls++;messages[owner].forEach(m=>{m.readAt=Date.now();});return route.fulfill({json:{ok:true}});}
  if(path==='/api/automations')return route.fulfill({json:{schedules}});
  if(path.startsWith('/api/automations/')&&method==='POST'){saves.push(body);const kind=path.split('/').at(-1),result={...body,kind,revision:1,nextAt:Date.now()+86400000};schedules=schedules.map(s=>s.kind===kind?result:s);return route.fulfill({json:result});}
  if(path==='/api/integrations')return route.fulfill({json:[]});
  if(path==='/api/operations/backup')return route.fulfill({json:{enabled:false,offsite:false,failed:false,lastLocalSuccess:null}});
  throw Error('Unexpected API '+method+' '+path);
 });
 await page.goto(origin);await page.getByRole('tab',{name:'duckduck',exact:true}).waitFor();assert.equal(readCalls,0,'hidden Duck tab never marks messages read');
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByTestId('scheduled-message-briefing-1').waitFor();await page.screenshot({path:resolve(output,'01-chat-fixture.png')});
 await openDuckTools(page);await page.getByRole('button',{name:'브리핑·날씨 예약 열기',exact:true}).click();await page.getByRole('switch',{name:'브리핑 예약 사용',exact:true}).click();assert.equal(await page.getByRole('button',{name:'예약 저장',exact:true}).isDisabled(),true,'recurring AI requires consent');
 await page.getByLabel('예약 시간',{exact:true}).fill('08:20');await page.getByRole('checkbox',{name:'Google 예약 자료 사용',exact:true}).click();await page.getByRole('button',{name:'부산 날씨 선택',exact:true}).click();await page.getByRole('checkbox',{name:'예약한 자료를 매일 AI에 보내 분석하기 동의',exact:true}).click();
 await page.getByRole('button',{name:'예약 저장',exact:true}).click();await page.getByText('예약했어요. 정한 시간에 덕 채팅으로 보내드릴게요.',{exact:true}).waitFor();assert.deepEqual(saves[0],{enabled:true,time:'08:20',timezone:'Asia/Seoul',city:'busan',providers:['google'],aiConsent:true});await page.screenshot({path:resolve(output,'02-briefing-fixture.png')});
 await page.getByRole('button',{name:'도시 날씨',exact:true}).click();await page.getByRole('switch',{name:'날씨 예약 사용',exact:true}).click();await page.getByLabel('예약 시간',{exact:true}).fill('07:40');await page.getByRole('button',{name:'예약 저장',exact:true}).click();await page.getByText('예약했어요. 정한 시간에 덕 채팅으로 보내드릴게요.',{exact:true}).waitFor();assert.deepEqual(saves[1].providers,[]);assert.equal(saves[1].aiConsent,false);assert.equal(modelCalls,0);
 await page.setViewportSize({width:320,height:700});const save=await page.getByRole('button',{name:'예약 저장',exact:true}).boundingBox();assert.ok(save.y+save.height<=700,'small screen save stays visible');await page.screenshot({path:resolve(output,'03-small-weather-fixture.png')});
 await page.getByRole('button',{name:'닫기',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('새 메시지가 와도 입력 보존');
 messages.first.push({id:'weather-2',kind:'weather',title:'도시 날씨',text:'부산 현재15°C · 강수 확률20%',warnings:[],createdAt:Date.now()+1000,readAt:null});await page.clock.fastForward(30001);await page.getByTestId('scheduled-message-weather-2').waitFor();assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'새 메시지가 와도 입력 보존');assert.equal(modelCalls,0);
 await page.getByRole('tab',{name:'내정보',exact:true}).click();await page.getByRole('button',{name:'내 계정 관리',exact:true}).click();await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('textbox',{name:'이메일',exact:true}).fill('second@example.test');await page.getByRole('textbox',{name:'비밀번호',exact:true}).fill('fixture-password-123');await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('tab',{name:'duckduck',exact:true}).click();assert.equal(await page.getByTestId('scheduled-message-briefing-1').count(),0,'new account cannot see old scheduled messages');
 assert.deepEqual(errors,[]);console.log('PASS: scheduled chat, opt-in/AI consent, exact city/time/provider save, independent weather, 320px footer, polling preserves typing, read on active tab only, account isolation; fixture only');
}finally{await browser.close();}
