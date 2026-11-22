import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),out=resolve(new URL('../../artifacts/web-format-correction-2026-11-22/',import.meta.url).pathname),origin='https://duck-workspace.test';await mkdir(out,{recursive:true});
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
// The landing example is synthetic, so use equivalent synthetic content for comparison only.
todos.splice(0);messages[0].items=[
 {key:'1'.repeat(64),title:'다음 주 제안서 검토하기',notes:'공유받은 제안서에서 확인할 내용 세 가지를 정리했어요.',dueDate:today,sourceRefs:['gmail:fixture:1']},
 {key:'2'.repeat(64),title:'디자인 피드백 미팅 잡기',notes:'내일 오후에 가능한 시간을 확인해보세요.',dueDate:null,sourceRefs:['slack:fixture:1']},
 {key:'3'.repeat(64),title:'도서관에 책 반납하기',notes:'미리알림에 남아 있는 이번 주 할 일이에요.',dueDate:null,sourceRefs:['apple:fixture:1']}
];messages[0].text='';messages[0].sources=[{ref:'gmail:fixture:1',title:'Gmail',provider:'gmail'},{ref:'slack:fixture:1',title:'Slack',provider:'slack'},{ref:'apple:fixture:1',title:'미리알림',provider:'apple-reminders'}];
try{
 await page.goto(origin);await page.getByTestId('desktop-briefing').getByText('도서관에 책 반납하기',{exact:true}).waitFor();
 await page.getByTestId('desktop-workspace').screenshot({path:resolve(out,'format-matched-content.png')});
 const source=await browser.newPage({viewport:{width:1440,height:1400},locale:'ko-KR'}),siteRoot=resolve(new URL('../../website/dist/client/',import.meta.url).pathname);
 await source.route('https://duck-landing.test/**',async route=>{const url=new URL(route.request().url()),f=resolve(siteRoot,'.'+(url.pathname==='/'?'/index.html':url.pathname.replace(/^\/site\//,'/')));assert.ok(f.startsWith(siteRoot+'/'));try{await route.fulfill({body:await readFile(f),contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.woff2':'font/woff2'})[extname(f)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}});
 await source.goto('https://duck-landing.test/');await source.locator('.demo-frame').waitFor();await source.locator('.demo-frame').screenshot({path:resolve(out,'landing-source.png')});
 console.log('PASS: source and implementation screenshots captured at 1440 CSS px, device scale 1, equivalent synthetic briefing items');
}finally{await browser.close();}
