import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web',import.meta.url).pathname),output=resolve(process.env.CALENDAR_CAPTURE_DIR||new URL('../../artifacts/calendar-viewport-2026-11-13',import.meta.url).pathname),before=process.env.CAPTURE_PHASE==='before',origin='https://calendar-viewport.test';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
let account={id:'viewport-user',email:'viewport@example.test',emailVerified:true};let hold=false,fail=false,teamHold=false,title='디자인 검토',deleted=false,paged=false,capCalls=0,eventCalls=0;const errors=[],pending=[];function release(id){for(const p of pending.splice(0)){if(!id||p.id===id)p.resolve();else pending.push(p);}}
try{
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,timezoneId:'Asia/Seoul'});page.on('pageerror',e=>errors.push(e.message));await page.clock.setFixedTime(new Date('2026-11-14T00:00:00Z'));await page.emulateMedia({reducedMotion:'reduce'});
 await page.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
 await page.route(origin+'/**',async route=>{
  const p=new URL(route.request().url()).pathname;
  if(!p.startsWith('/api/')){const path=resolve(root,'.'+(p==='/'?'/index.html':p));assert.ok(path.startsWith(root+'/'));try{return route.fulfill({body:await readFile(path),contentType:({'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.png':'image/png'})[extname(path)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}}
  if(p==='/api/auth/session')return route.fulfill({json:{user:account}});
  if(p==='/api/auth/logout'){account=null;return route.fulfill({json:{ok:true}});}
  if(p==='/api/auth/login'){account={id:'second-user',email:'second@example.test',emailVerified:true};return route.fulfill({json:{user:account}});}
  if(p==='/api/todos')return route.fulfill({json:[{id:'viewport-task',title:'제안서 검토하기',dueDate:'2026-11-14',category:'업무',done:false}]});
  if(p==='/api/capabilities'){capCalls++;return route.fulfill({json:{todoNotes:true,calendarWorkspace:2}});}
  if(p==='/api/calendar/calendars')return route.fulfill({json:{items:[{id:'primary',primary:true,name:'내 일정',canWrite:true,color:'#1b64da'},{id:'team',name:'팀 일정',canWrite:false,color:'#00897b'}]}});
  if(p==='/api/calendar/events'){
   eventCalls++;const query=new URL(route.request().url()).searchParams,id=query.get('calendarId')??'primary',own=account?.id,capturedTitle=title;if(hold||id==='team'&&teamHold)await new Promise(resolve=>pending.push({id,resolve,owner:own}));
   if(fail)return route.fulfill({status:503,json:{error:'일시 조회 실패'}});
   const old={id:'removed',title:'이후 삭제된 일정',dueDate:'2026-11-13',allDay:true,endDate:'2026-11-14',calendarId:id},event={id:'review',title:capturedTitle,dueDate:'2026-11-13',allDay:true,endDate:'2026-11-14',calendarId:id};
   const items=id==='team'?[{...event,id:'team-event',title:'팀 일정 유지'}]:query.get('cursor')?[]:deleted?[event]:[event,old];
   return route.fulfill({json:{items,calendarId:id,connectionState:'connected',canWrite:true,nextCursor:paged&&!query.get('cursor')?'next':null,readAt:'2026-11-14T00:00:00Z'}});
  }
  if(p==='/api/assistant/status')return route.fulfill({json:{enabled:false,actions:[],scheduledMessages:false}});
  if(p==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
  if(p==='/api/duck-chat')return route.fulfill({json:{messages:[]}});
  if(p==='/api/integrations')return route.fulfill({json:{providers:{google:{connected:true},notion:{connected:false},slack:{connected:false},naver:{connected:false}}}});
  return route.fulfill({status:404,json:{error:'fixture endpoint unavailable'}});
 });
 const tab=name=>page.getByRole('tab',{name,exact:true}),button=name=>page.getByRole('button',{name,exact:true}),grid=()=>page.getByTestId('calendar-date-grid');
 async function command(name){await button('캘린더 더보기').click();if(name==='Google 일정 새로고침'||name==='일정 더 불러오기')await button('캘린더 상태·새로고침').click();await button(name).click();}
 async function close(){await page.getByTestId('calendar-sheet').getByRole('button',{name:'닫기',exact:true}).click();}
 const event=name=>grid().getByRole('button',{name:name+' 일정 상세',exact:true});
 async function shot(name){await page.screenshot({path:resolve(output,name+'.png')});}
 await page.goto(origin);await tab('캘린더').click();await event(title).waitFor();assert.equal(capCalls,1);
 hold=true;title='빠르게 갱신한 검토';await button('2주 보기로 전환').click();await event('디자인 검토').waitFor({timeout:500});for(let i=0;i<4;i++){await page.waitForTimeout(50);assert.ok(await event('디자인 검토').isVisible(),'cached schedule stays visible through delayed refresh frames');}await shot('cache-immediate-fortnight');assert.ok(pending.length>0);assert.equal(capCalls,1,'known capability skips repeated serial handshake');
 title='빠르게 갱신한 검토';hold=false;release();await event(title).waitFor();
 hold=true;await button('월 보기로 전환').click();await event(title).waitFor({timeout:500});await shot('cache-updated-month');hold=false;release();
 // Refresh failure must preserve the previous calendar and login.
 fail=true;await command('Google 일정 새로고침');await page.getByText('일정을 확인하지 못했어요. 빈 시간으로 판단하지 마세요.',{exact:true}).waitFor();await close();await event(title).waitFor();assert.equal(await page.getByRole('button',{name:'덕 로그인',exact:true}).count(),0);fail=false;
 // All sources do not wait for the slowest source.
 teamHold=true;await command('캘린더 보기 전환');await button('캘린더 보기 설정').click();await button('표시할 캘린더 선택').click();await page.getByRole('checkbox',{name:'팀 일정 표시',exact:true}).click();title='빠른 캘린더 먼저 반영';await button('선택한 캘린더 적용').click();await event(title).waitFor({timeout:1000});assert.ok(pending.some(p=>p.id==='team'));await shot('cache-fast-source-first');teamHold=false;release('team');await event('팀 일정 유지').waitFor();
 // Partial pagination keeps known items, and final authoritative completion removes deleted items.
 deleted=true;paged=true;await command('Google 일정 새로고침');await page.getByText('일부 일정만 표시 중이에요. 더 불러오거나 다시 확인해주세요.',{exact:true}).waitFor();await close();await event('이후 삭제된 일정').waitFor();
 await command('일정 더 불러오기');await page.getByText('업데이트 09:00',{exact:true}).waitFor();await close();assert.equal(await event('이후 삭제된 일정').count(),0);await shot('cache-authoritative-delete');paged=false;
 // Going to a different month and back keeps the current month snapshot; late responses are ignored.
 hold=true;await command('다음 달');await command('이전 달');await event(title).waitFor({timeout:500});await event('팀 일정 유지').waitFor({timeout:500});assert.equal(await event('이후 삭제된 일정').count(),0);hold=false;release();
 // Cache and late calendar results cannot cross a Duck account boundary.
 hold=true;await command('Google 일정 새로고침');await close();await tab('내정보').click();await button('로그아웃').click();
 await page.getByRole('textbox',{name:'이메일',exact:true}).fill('second@example.test');await page.getByRole('textbox',{name:'비밀번호',exact:true}).fill('fixture-password-only');title='두 번째 계정 일정';await button('로그인').click();await page.getByRole('heading',{name:'할 일',exact:true}).waitFor();await tab('캘린더').click();await grid().waitFor();assert.equal(await event('빠른 캘린더 먼저 반영').count(),0);
 for(const p of pending.filter(p=>p.owner==='viewport-user'))p.resolve();await page.waitForTimeout(100);assert.equal(await event('빠른 캘린더 먼저 반영').count(),0,'old owner response is ignored');hold=false;release();await event(title).waitFor();await shot('cache-account-isolation');
 assert.deepEqual(errors,[]);await writeFile(resolve(output,'cache-verification.json'),JSON.stringify({capCalls,eventCalls,errors,holdsReleased:pending.length,cache:'session memory, account/server/timezone scoped, 12 periods',nativeDeviceVerified:false},null,2));console.log('PASS: immediate cached ranges, source-by-source arrival, bounded capability cache, overlap updates, refresh failure preservation, pagination/deletion, late-range response isolation');
}finally{await browser.close();}
