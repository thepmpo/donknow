import {chromium} from 'playwright-core';
import {apiHarness} from '../../test-support/api.js';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const out=resolve(new URL('../../artifacts/admin-preview-2026-11-22/',import.meta.url).pathname);await mkdir(out,{recursive:true});
const h=await apiHarness({STORE_DRIVER:'sqlite',AI_ENABLED:'false'});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'ko-KR'}),errors=[],apiRequests=[];
page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiRequests.push(r.url());});
try{
 await page.goto(h.baseUrl+'/admin-preview');await page.getByRole('heading',{name:'회원 관리',exact:true}).waitFor();assert.equal(await page.getByRole('navigation',{name:'어드민 메뉴'}).getByRole('button').count(),7);await page.screenshot({path:resolve(out,'members.png')});
 await page.getByRole('searchbox',{name:'회원 검색'}).fill('DEMO-002');assert.equal(await page.locator('tbody tr').count(),1);await page.getByRole('button',{name:'이여유 회원 상세'}).click();await page.getByRole('heading',{name:'이여유',exact:true}).waitFor();await page.screenshot({path:resolve(out,'member-detail.png')});
 await page.getByRole('tab',{name:'이용권 목록'}).click();await page.getByText('월 결제 · 예시',{exact:true}).waitFor();await page.screenshot({path:resolve(out,'member-passes.png')});
 await page.getByRole('tab',{name:'결제 내역'}).click();await page.getByRole('cell',{name:'2026.11.10 10:32',exact:true}).waitFor();await page.screenshot({path:resolve(out,'member-payments.png')});
 await page.getByRole('button',{name:'← 회원 목록',exact:true}).click();await page.getByRole('searchbox',{name:'회원 검색'}).fill('DEMO-001');await page.getByRole('button',{name:'김하루 회원 상세'}).click();await page.getByRole('tab',{name:'결제 내역'}).click();await page.getByText('무료 제공 이용권은 결제 내역을 만들지 않아요.',{exact:false}).waitFor();
 for(const name of ['운영 현황','이용권','결제 내역','서비스 연결·동기화','AI·사용량','운영 기록']){await page.getByRole('navigation').getByRole('button',{name,exact:true}).click();await page.getByRole('heading',{name,exact:true}).waitFor();}
 await page.getByRole('navigation').getByRole('button',{name:'회원 관리 3',exact:true}).click();await page.getByRole('searchbox',{name:'회원 검색'}).fill('<script>window.pwned=1</script>');await page.getByRole('cell',{name:'검색 결과가 없어요.'}).waitFor();assert.equal(await page.evaluate(()=>window.pwned),undefined);await page.getByRole('searchbox',{name:'회원 검색'}).fill('');await page.getByRole('combobox',{name:'이용권 필터'}).selectOption('프로');assert.equal(await page.locator('tbody tr').count(),1);
 await page.getByRole('combobox',{name:'이용권 필터'}).selectOption('all');await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:resolve(out,'narrow.png')});assert.deepEqual(errors,[]);assert.deepEqual(apiRequests,[],'layout preview must not request live account or payment APIs');
 await writeFile(resolve(out,'results.json'),JSON.stringify({passed:true,source:'Actual local Node server routes and headless Chromium, fixed synthetic members/entitlements/payments only',flows:['7 navigation panels','member search and filter','member details','entitlement/payment tabs','complimentary entitlement has no payment','empty search and safe rendering','390px layout','no API requests'],errors,apiRequests},null,2));console.log('PASS: admin layout, member detail, passes/payments, navigation, responsive layout; no API requests');
}finally{await browser.close();await h.close();}
