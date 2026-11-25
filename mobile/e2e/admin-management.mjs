import {chromium} from 'playwright-core';
import {apiHarness} from '../../test-support/api.js';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const email='owner-ui-management@example.test',memberEmail='customer-ui-management@example.test',temporary='OwnerInitial123!',permanent='OwnerPermanent123!';
const webDir=process.env.ADMIN_TEST_WEB_DIR;
const h=await apiHarness({DUCK_ADMIN_EMAILS:email,DUCK_ADMIN_INITIAL_PASSWORD:temporary,...(webDir?{WEB_DIR:webDir}:{})});const member=await h.verified(memberEmail);
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);const out='/tmp/duck-admin-management-ui';await mkdir(out,{recursive:true});
async function login(p,address,password){await p.goto(h.baseUrl+'/admin');await p.getByLabel('아이디 (이메일)',{exact:true}).fill(address);await p.getByLabel('관리자 비밀번호',{exact:true}).fill(password);await p.getByRole('button',{name:'로그인',exact:true}).click();}
async function change(p,password){await p.getByRole('heading',{name:'비밀번호 변경',exact:true}).waitFor();await p.getByLabel('새 비밀번호',{exact:true}).fill(password);await p.getByLabel('새 비밀번호 확인',{exact:true}).fill(password);await p.getByRole('button',{name:'변경하고 들어가기',exact:true}).click();await p.getByRole('heading',{name:'회원 관리',exact:true}).waitFor();}
try{
 await login(page,email,temporary);assert.equal(await page.getByRole('navigation').count(),0);await change(page,permanent);
 const webLink=page.getByRole('link',{name:'웹 앱 열기',exact:true});
 assert.equal(await webLink.getAttribute('href'),'/app');
 async function openApp(){
  const tab=page.waitForEvent('popup');
  await webLink.click();
  const app=await tab;await app.waitForURL(h.baseUrl+'/app');
  return app;
 }
 const appEmail=app=>webDir?app.getByRole('textbox',{name:'이메일',exact:true}):app.locator('#auth-email');
 const appPassword=app=>webDir?app.getByLabel('비밀번호',{exact:true}):app.locator('#auth-password');
 const appLogin=app=>webDir?app.getByRole('button',{name:'로그인',exact:true}):app.locator('#auth-submit');
 async function waitForAppSession(app){
  if(webDir)await app.getByTestId('desktop-workspace').waitFor();
  else await app.waitForFunction(email=>document.getElementById('web-user-email')?.textContent===email,memberEmail);
  assert.equal((await (await app.request.get(h.baseUrl+'/api/auth/session')).json()).user.email,memberEmail);
 }
 const guestApp=await openApp();
 await appEmail(guestApp).waitFor();
 assert.equal((await guestApp.request.get(h.baseUrl+'/api/auth/session')).status(),401,'admin login is not an app session');
 await appEmail(guestApp).fill(memberEmail);
 await appPassword(guestApp).fill('fixture-password-123');
 await appLogin(guestApp).click();
 await waitForAppSession(guestApp);
 await guestApp.close();
 const returningApp=await openApp();
 await waitForAppSession(returningApp);
 await returningApp.close();
 assert.equal((await page.request.get(h.baseUrl+'/api/admin/session')).status(),200,'app login preserves the separate admin session');
 await page.getByRole('searchbox',{name:'회원 검색'}).fill(memberEmail);await page.getByRole('button',{name:'검색',exact:true}).click();await page.getByRole('button',{name:memberEmail+' 회원 상세',exact:true}).click();await page.getByRole('heading',{name:memberEmail,exact:true}).waitFor();await page.getByRole('heading',{name:'회원 상태 관리',exact:true}).waitFor();
 const memberPath='/api/admin/members/'+member.user.id;
 let detailReads=0;
 page.on('request',req=>{if(req.method()==='GET'&&new URL(req.url()).pathname===memberPath)detailReads++;});
 const grant=page.locator('form[data-operation$="/passes"]');
 assert.equal(await grant.locator('[name=plan]').inputValue(),'');
 await grant.getByLabel('이용권',{exact:true}).selectOption('lite');
 await grant.getByLabel('변경 사유',{exact:true}).fill('UI 이용권 발급 검사');
 await grant.getByRole('button',{name:'이용권 발급',exact:true}).click();
 await page.getByText('라이트 이용권을 적용했어요.',{exact:true}).waitFor();
 assert.equal((await h.request('/api/auth/session','GET',undefined,member.token)).data.user.plan,'lite');
 assert.equal(await page.locator('dt').filter({hasText:'현재 이용권'}).evaluate(el=>el.nextElementSibling.textContent),'라이트');
 assert.equal(detailReads,1,'confirmed mutation reloads the member');
 await page.getByRole('tab',{name:'이용권 목록'}).click();
 await page.getByRole('heading',{name:'현재 적용 이용권',exact:true}).waitFor();
 assert.equal(detailReads,1,'same member tabs reuse the loaded record');
 await page.screenshot({path:out+'/passes.png'});
 const edit=page.locator('form[data-method=PATCH]');await edit.getByLabel('변경 사유',{exact:true}).fill('UI 이용권 회수 검사');await edit.getByRole('button',{name:'이용권 회수',exact:true}).click();await page.getByText('변경 내용을 저장했어요.',{exact:true}).waitFor();assert.equal((await h.request('/api/auth/session','GET',undefined,member.token)).data.user.plan,'free');
 await page.getByRole('tab',{name:'회원 정보',exact:true}).click();let status=page.locator('form[data-operation$="/status"]');await status.getByLabel('이용 상태',{exact:true}).selectOption('suspended');await status.getByLabel('변경 사유',{exact:true}).fill('UI 상태 변경 검사');await status.getByRole('button',{name:'회원 상태 저장',exact:true}).click();await page.getByText('변경 내용을 저장했어요.',{exact:true}).waitFor();assert.equal((await h.request('/api/auth/session','GET',undefined,member.token)).status,401);await page.screenshot({path:out+'/suspended.png'});
 await page.getByRole('navigation').getByRole('button',{name:'운영자 관리',exact:true}).click();await page.getByRole('heading',{name:'운영자 관리',exact:true}).waitFor();const operator=page.locator('form[data-operation="/api/admin/operators"]');await operator.getByLabel('관리자 이메일',{exact:true}).fill('reader-ui-management@example.test');await operator.getByLabel('초기 비밀번호',{exact:true}).fill('ReaderInitial123!');await operator.getByLabel('변경 사유',{exact:true}).fill('UI 조회 운영자 등록');await operator.getByRole('button',{name:'운영자 등록',exact:true}).click();await page.getByRole('cell',{name:'reader-ui-management@example.test',exact:true}).waitFor();await page.screenshot({path:out+'/operators.png'});
 const context=await browser.newContext(),reader=await context.newPage();reader.on('pageerror',e=>errors.push(e.message));await login(reader,'reader-ui-management@example.test','ReaderInitial123!');await change(reader,'ReaderPermanent123!');await reader.getByRole('button',{name:memberEmail+' 회원 상세',exact:true}).click();await reader.getByRole('heading',{name:memberEmail,exact:true}).waitFor();assert.equal(await reader.getByRole('heading',{name:'회원 상태 관리',exact:true}).count(),0);assert.equal(await reader.getByRole('heading',{name:'이용권 발급',exact:true}).count(),0);assert.equal((await reader.request.post(h.baseUrl+'/api/admin/members/'+member.user.id+'/status',{headers:{'X-Duckduck-Client':'web'},data:{status:'active'}})).status(),403);await context.close();
 let releaseOverview;
 const overviewReply=new Promise(resolve=>{releaseOverview=resolve;});
 await page.route('**/api/admin/overview',async route=>{await overviewReply;await route.continue().catch(()=>{});});
 await page.getByRole('navigation').getByRole('button',{name:'운영 현황',exact:true}).click();
 await page.getByRole('heading',{name:'운영 현황',exact:true}).waitFor();
 await page.getByText('불러오는 중…',{exact:true}).waitFor();
 releaseOverview();
 await page.getByRole('heading',{name:'이용권·결제 상태',exact:true}).waitFor();
 let repeatedOverview=0;
 page.on('request',req=>{if(new URL(req.url()).pathname==='/api/admin/overview')repeatedOverview++;});
 await page.getByRole('navigation').getByRole('button',{name:'결제 내역',exact:true}).click();
 await page.getByRole('navigation').getByRole('button',{name:'운영 현황',exact:true}).click();
 await page.getByRole('heading',{name:'이용권·결제 상태',exact:true}).waitFor();
 assert.equal(repeatedOverview,0,'a recently viewed page returns without waiting for the API');
 await page.getByRole('navigation').getByRole('button',{name:'운영 기록',exact:true}).click();await page.getByRole('heading',{name:'변경 기록',exact:true}).waitFor();await page.getByRole('cell',{name:'UI 이용권 발급 검사',exact:false}).waitFor();await page.screenshot({path:out+'/audit.png'});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);console.log('PASS: actual owner/staff browser flows, grants/revoke, suspend, session denial, role-limited controls, audit, 390px');
}catch(e){await page.screenshot({path:out+'/failure.png'});throw e;}finally{await browser.close();await h.close();}
