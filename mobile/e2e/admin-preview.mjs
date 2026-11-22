import {chromium} from 'playwright-core';
import {apiHarness} from '../../test-support/api.js';
import assert from 'node:assert/strict';
const h=await apiHarness({AI_ENABLED:'false'}),browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{const page=await browser.newPage();await page.goto(h.baseUrl+'/admin-preview');assert.ok(page.url().endsWith('/admin'));await page.getByRole('heading',{name:'어드민 로그인',exact:true}).waitFor();assert.equal(await page.getByRole('navigation').count(),0);assert.equal(await page.getByRole('heading',{name:'회원 관리',exact:true}).count(),0);const html=await(await fetch(h.baseUrl+'/admin')).text();assert.equal(html.includes('<nav'),false);assert.equal((await fetch(h.baseUrl+'/admin-preview.js')).status,404);console.log('PASS: former preview redirects to login-only gate; dashboard and preview asset not publicly shown');}finally{await browser.close();await h.close();}
