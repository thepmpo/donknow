import {chromium} from 'playwright-core';
import {apiHarness} from '../../test-support/api.js';
import assert from 'node:assert/strict';
const email='bootstrap-ui@example.test',temporary='Temp123!',replacement='permanent-ui-password-123';
const h=await apiHarness({DUCK_ADMIN_EMAILS:email,DUCK_ADMIN_INITIAL_PASSWORD:temporary});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(h.baseUrl+'/admin');await page.getByRole('heading',{name:'어드민 로그인',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);
 await page.getByLabel('아이디 (이메일)',{exact:true}).fill(email);await page.getByLabel('관리자 비밀번호',{exact:true}).fill(temporary);await page.getByRole('button',{name:'로그인',exact:true}).click();await page.getByRole('heading',{name:'비밀번호 변경',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);
 assert.equal((await page.request.get(h.baseUrl+'/api/admin/members')).status(),403);await page.reload();await page.getByRole('heading',{name:'비밀번호 변경',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);
 await page.getByLabel('새 비밀번호',{exact:true}).fill(replacement);await page.getByLabel('새 비밀번호 확인',{exact:true}).fill(replacement);await page.getByRole('button',{name:'변경하고 들어가기',exact:true}).click();await page.getByRole('heading',{name:'회원 관리',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),1);
 await page.getByRole('button',{name:'로그아웃',exact:true}).click();await page.getByRole('heading',{name:'어드민 로그인',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);assert.deepEqual(errors,[]);console.log('PASS: temporary login, forced change with reload, blocked data, new password, logout');
}finally{await browser.close();await h.close();}
