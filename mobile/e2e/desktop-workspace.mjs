import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),out=resolve(new URL('../../artifacts/desktop-workspace-2026-11-22/',import.meta.url).pathname),origin='https://duck-workspace.test';await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ko-KR',timezoneId:'Asia/Seoul'});page.setDefaultTimeout(15000);await page.emulateMedia({reducedMotion:'reduce'});
const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Seoul'}),errors=[],writes=[];let signed=true,statusFail=false;
const todos=[{id:'t1',title:'제안서 피드백 전달하기',notes:'요청받은 의견을 확인하고 다음 행동을 정리해요.',done:false,category:'업무',dueDate:today,dueTime:'14:00',source:{provider:'google',externalId:'account:tasks:source-1'}},{id:'t2',title:'다음 주 회의 준비',done:false,category:'업무',dueDate:today}];
const events=[],actions=[];
const messages=[{id:'briefing-1',kind:'briefing',title:'오늘의 브리핑',summary:'연결한 자료에서 오늘 챙길 일을 정리했어요.',text:'합성 자료로 화면을 검증합니다.',createdAt:Date.now(),readAt:null,warnings:[],items:[{key:'1'.repeat(64),title:'디자인 피드백 미팅 잡기',notes:'내일 오후 가능한 시간을 확인해보세요.',dueDate:null,sourceRefs:['slack:fixture:1'],section:'함께 확인할 일',group:'new'}],sources:[{ref:'slack:fixture:1',title:'디자인 피드백 요청',provider:'slack'}]}];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(({origin})=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),{origin});
await page.route(origin+'/**',async route=>{const r=route.request(),path=new URL(r.url()).pathname,method=r.method(),body=r.postDataJSON();
 if(!path.startsWith('/api/')){const f=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(f.startsWith(root+'/'));try{await route.fulfill({body:await readFile(f),contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png'})[extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}return;}
 const json=v=>route.fulfill({json:v});
 if(path==='/api/auth/session')return signed?json({user:{id:'fixture',email:'fixture@example.test',emailVerified:true}}):route.fulfill({status:401,json:{error:'로그인이 필요해요.'}});
 if(path==='/api/health')return json({ok:true,calendarWorkspace:2});
 if(path==='/api/capabilities')return json({todoNotes:true,assistant:true,scheduledMessages:true});
 if(path==='/api/todos'&&method==='GET')return json(todos);
 if(path.startsWith('/api/todos/')&&method==='PATCH'){writes.push({path,body});const t=todos.find(t=>t.id===path.split('/').at(-1));Object.assign(t,body);return json(t);}
 if(path==='/api/assistant/status'&&statusFail)return route.fulfill({status:503,json:{error:'비서 상태 확인 실패 fixture'}});
 if(path==='/api/assistant/status')return json({enabled:true,scheduledMessages:true,access:{plan:'pro',mode:'complimentary',chat:true,createFromSources:true},usage:{funded:true,remainingKrw:1000},actions:[],connections:[]});
 if(path==='/api/assistant/chat'){assert.equal(body.consent,true);writes.push({path,body});return json({answer:'웹 채팅 응답 연결을 확인했어요.',proposals:[],sources:[],warnings:[]});}
 if(path==='/api/calendar/calendars')return json({items:[{id:'primary',name:'내 일정',primary:true,canWrite:true}],nextCursor:null});
 if(path.startsWith('/api/assistant/actions/')&&path.endsWith('/confirm')){const a=actions.find(a=>a.id===path.split('/').at(-2));assert.equal(body.confirmation,true);a.status='succeeded';a.result={id:'event-1'};messages[0].items[0].calendarAdded=true;events.push({id:'event-1',eventId:'event-1',title:a.args.title,calendarId:'primary',dueDate:a.args.startDate??a.args.start.slice(0,10),allDay:a.args.allDay,endDate:a.args.endDate,canWrite:true,etag:'saved'});writes.push({path,body});return json(a);}
 if(path==='/api/assistant/actions')return json({actions:[]});
 if(path==='/api/assistant/conversation')return json({messages:[],turns:[]});
 if(path==='/api/assistant/messages')return json({messages});
 if(path==='/api/assistant/messages/read')return json({ok:true});
 if(path.includes('/items/')){writes.push({path,body});if(body.action==='calendar'){const a={id:'00000000-0000-4000-8000-000000000001',operation:'calendar.create',args:body.args,status:'pending',destinationCalendarName:'내 일정'};actions.push(a);return json(a);}const item=messages[0].items[0],todo={id:'moved',title:item.title,notes:item.notes,dueDate:null,category:'업무',done:body.action==='complete'};todos.push(todo);Object.assign(item,{todoId:todo.id,todo});return json({todoId:todo.id,todo,excluded:false});}
 if(path==='/api/integrations')return json([]);
 if(path==='/api/calendar/events')return json({items:events,calendarId:'primary',connectionState:'connected',canWrite:true,nextCursor:null});
 if(path==='/api/automations')return json({schedules:[]});
 if(path==='/api/operations/backup')return json({enabled:false});
 return json({enabled:false,items:[],messages:[],turns:[],sources:[],actions:[]});
});
try{
 await page.goto(origin);await page.getByTestId('desktop-workspace').waitFor();await page.getByTestId('desktop-briefing').getByText('디자인 피드백 미팅 잡기',{exact:true}).waitFor();
 statusFail=true;await page.getByRole('button',{name:'브리핑 새로고침',exact:true}).click();await page.getByText('비서 연결 상태를 확인하지 못했어요. 기존 내용은 유지하고 있어요. 새로고침으로 다시 확인해주세요.',{exact:true}).waitFor();await page.getByTestId('desktop-briefing').getByText('디자인 피드백 미팅 잡기',{exact:true}).waitFor();statusFail=false;await page.getByRole('button',{name:'브리핑 새로고침',exact:true}).click();await page.getByText('비서 연결 상태를 확인하지 못했어요. 기존 내용은 유지하고 있어요. 새로고침으로 다시 확인해주세요.',{exact:true}).waitFor({state:'hidden'});
 assert.equal(await page.getByTestId('BottomNavigation').count(),0);assert.equal(await page.getByTestId('desktop-workspace').getByRole('tab').count(),5);
 await page.screenshot({path:resolve(out,'desktop-briefing.png')});
 await page.getByTestId('desktop-briefing').getByRole('button',{name:'할 일 후보 1 Todo에 추가',exact:true}).click();await page.getByTestId('desktop-briefing').getByText('Todo에 추가됨 · 보기',{exact:true}).waitFor();assert.ok(writes.some(w=>w.body.action==='todo'));
 await page.getByTestId('desktop-briefing').getByRole('button',{name:'할 일 후보 1 캘린더로 이동',exact:true}).click();await page.getByRole('textbox',{name:'일정 제목',exact:true}).waitFor();if(await page.getByRole('switch',{name:'종일 일정',exact:true}).getAttribute('aria-checked')!=='true')await page.getByRole('switch',{name:'종일 일정',exact:true}).click();await page.getByRole('button',{name:'일정 저장 내용 미리보기',exact:true}).click();assert.equal(events.length,0,'preview must not write');await page.getByRole('button',{name:'확인하고 일정 추가',exact:true}).click();await page.getByTestId('desktop-briefing').getByText('캘린더에 추가됨',{exact:true}).waitFor();assert.equal(events.length,1,'one explicit confirmation writes once');
 await page.getByRole('button',{name:'새 할 일 작성',exact:true}).click();await page.getByRole('button',{name:'닫기',exact:true}).click();
 await page.getByRole('checkbox',{name:'완료: 제안서 피드백 전달하기',exact:true}).click();assert.ok(writes.some(w=>w.path==='/api/todos/t1'&&w.body.done));
 await page.getByRole('button',{name:'웹에서 덕과 대화하기',exact:true}).click();await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('작성 중인 대화를 유지해요');
 await page.getByRole('button',{name:'브리핑으로 돌아가기',exact:true}).click();await page.getByRole('button',{name:'덕과 대화하기',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'작성 중인 대화를 유지해요');
 const consent=page.getByRole('checkbox',{name:'선택한 자료와 내 Todo를 AI에 보내 분석하기 동의',exact:true});if(await consent.count()&&await consent.getAttribute('aria-checked')!=='true')await consent.click();await page.getByRole('button',{name:'덕에게 보내기',exact:true}).click();await page.getByText('웹 채팅 응답 연결을 확인했어요.',{exact:true}).waitFor();assert.ok(writes.some(w=>w.path==='/api/assistant/chat'));
 await page.screenshot({path:resolve(out,'desktop-chat.png')});
 await page.getByRole('tab',{name:'Todo 리스트',exact:true}).click();await page.screenshot({path:resolve(out,'desktop-todos.png')});
 await page.getByRole('tab',{name:'캘린더',exact:true}).click();await page.screenshot({path:resolve(out,'desktop-calendar.png')});
 await page.getByRole('tab',{name:'ME',exact:true}).click();await page.getByTestId('me-overview').waitFor();await page.screenshot({path:resolve(out,'desktop-me.png')});
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('button',{name:'브리핑으로 돌아가기',exact:true}).click();
 for(const width of [1100,1280,1440,1920]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'desktop overflow '+width);}
 await page.setViewportSize({width:390,height:844});await page.getByTestId('BottomNavigation').waitFor();assert.equal(await page.getByTestId('BottomNavigation').getByRole('tab').count(),5);await page.screenshot({path:resolve(out,'phone-unchanged.png')});
 await page.setViewportSize({width:1440,height:1000});await page.getByTestId('desktop-workspace').waitFor();await page.emulateMedia({colorScheme:'dark'});await page.screenshot({path:resolve(out,'desktop-dark.png')});
 await page.emulateMedia({colorScheme:'light'});messages.splice(0);await page.reload();await page.getByTestId('desktop-briefing').getByText('아직 받은 브리핑이 없어요.',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'desktop-empty.png')});signed=false;await page.reload();await page.getByRole('textbox',{name:'이메일',exact:true}).waitFor();assert.equal(await page.getByTestId('desktop-workspace').count(),0,'signed-out user never sees private workspace');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'results.json'),JSON.stringify({passed:true,source:'Exported Expo app, headless Chromium, synthetic account and API responses; no production/model calls',flows:['briefing to Calendar preview and one confirm','chat send and response','briefing display','existing todo update','chat draft survives overview switching','Todo/Calendar/ME navigation','1100-1920 overflow','phone bottom5tabs','dark theme'],writes,errors},null,2));console.log('PASS: desktop workspace and compact navigation; synthetic responses only');
}finally{await browser.close();}
