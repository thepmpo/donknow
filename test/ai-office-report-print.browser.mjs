// Synthetic reports only: no office authentication, live tasks, model or mail requests.
import { chromium } from '../mobile/node_modules/playwright-core/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { execFileSync } from 'node:child_process';

const fragment = fs.readFileSync(new URL('../tools/ai-office/native-chat/friendly-report.tsx.fragment', import.meta.url), 'utf8');
const helpers = stripTypeScriptTypes(fragment.split('export function FriendlyOfficeReport')[0]);
const content = '## 한 줄 결론\n가입 첫 화면부터 확인하세요.\n## 지금 할 일\n먼저 화면을 열고 저장 버튼을 확인하세요.\n## 아직 확인하지 못한 것\n실계정은 미검증입니다. Revision abcdef0123456789abcdef\n## 기술 근거\n/workspace/product/source.ts\n<img src="https://blocked.invalid/private"><script>window.injected=true</script>\n' + Array.from({length:120}, (_,i)=>'근거 '+(i+1)+': 누락 없이 원문을 보존합니다.').join('\n');
const title = '제품 검토 <실제 발송 없음>';
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'office-print-browser-'));
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    const network=[];
    await context.route('**/*',route=>{network.push(route.request().url());return route.abort();});
    const page = await context.newPage();
    await page.setContent('<button id="export">PDF로 저장·인쇄</button>');
    await page.addScriptTag({content:helpers});
    await page.evaluate(({content,title})=>document.getElementById('export').addEventListener('click',()=>openOfficeReportPrint(content,title)),{content,title});
    const popupPromise=page.waitForEvent('popup');
    await page.getByRole('button',{name:'PDF로 저장·인쇄'}).click();
    const preview=await popupPromise;
    await preview.getByRole('heading',{name:title,exact:true}).waitFor();
    assert.equal(await preview.evaluate(()=>window.opener),null);
    assert.equal(await preview.locator('.original pre').textContent(),content);
    assert.equal(await preview.locator('img,script').count(),0);
    assert.equal(await preview.evaluate(()=>window.injected),undefined);
    assert.equal(await preview.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
    await preview.evaluate(()=>{window.printCalls=0;window.print=()=>{window.printCalls++;};});
    await preview.getByRole('button',{name:'인쇄 / PDF로 저장'}).click();
    assert.equal(await preview.evaluate(()=>window.printCalls),1);
    const pdf=path.join(temporary,'report-'+width+'.pdf');
    await preview.pdf({path:pdf,preferCSSPageSize:true,printBackground:true});
    assert.equal(fs.readFileSync(pdf).subarray(0,5).toString(),'%PDF-');
    const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
    assert.match(text,/가입 첫 화면부터 확인하세요/);
    assert.match(text,/실계정은 미검증입니다/);
    assert.match(text,/근거 120/);
    assert.match(text,/abcdef0123456789abcdef/);
    assert.deepEqual(network,[]);
    await context.close();
  }
  console.log('PASS: desktop/mobile print preview, blocked report HTML, full original and Korean PDF text; no model or mail request');
} finally {
  await browser.close();
  fs.rmSync(temporary,{recursive:true,force:true});
}
