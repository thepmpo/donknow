// Native UI only. Every mail mutation is mocked; no SMTP, model or real task changes.
import { chromium } from '../mobile/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const target=new URL(process.env.AI_OFFICE_TEST_URL||'http://127.0.0.1:18821');
if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Loopback test URL required');
const access=fs.readFileSync((process.env.AI_OFFICE_STATE_DIR||'/workspace/ai-office/state')+'/control-access.key','utf8').trim();
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const pdf=Buffer.from('%PDF-1.7\n% synthetic browser fixture only\n%%EOF');
try {
  for(const scenario of ["accepted","unknown","authentication","remote"]) {
    const local=scenario!=="remote";
    const context=await browser.newContext({viewport:local?{width:1440,height:1000}:{width:390,height:844}});
    const page=await context.newPage(),errors=[],mutations=[],receipts=[],dialogs=[];
    let configured=false,lead='fixture-lead',allowConfirmation=false,nativeWrites=0;
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',dialog=>{dialogs.push({type:dialog.type(),message:dialog.message()});return allowConfirmation?dialog.accept():dialog.dismiss();});
    const task={id:'report-fixture',title:'제품 검토 결과',status:'review',project_id:'project-fixture',agent:{id:lead,name:'검토 담당'},result:'## 한 줄 결론\n먼저 가입 화면을 확인하세요.\n## 지금 할 일\n저장 버튼의 동작을 확인하세요.\n## 내가 결정할 것\n지금 결정할 것은 없어요.\n## 아직 확인하지 못한 것\n실제 사용자 반응은 미확인입니다.\n## 기술 근거\n이 보고서는 자동 검사 전용 자료입니다.',reportEligible:true,reportHash:'a'.repeat(64),updated_at:Date.now()};
    await page.route('**/api/agents',async route=>{const response=await route.fetch(),data=await response.json();lead=(data.agents||data).find(a=>a.department_id==='planning'&&a.role==='team_leader')?.id||lead;task.agent.id=lead;return route.fulfill({response,json:data});});
    await page.route('**/api/decision-inbox**',route=>route.fulfill({json:{items:[]}}));
    await page.route('**/control-api/**',route=>{
      const request=route.request(),pathname=new URL(request.url()).pathname,json=data=>route.fulfill({json:data});
      if(pathname==='/control-api/local-connect')return route.continue();
      if(pathname==='/control-api/session')return json({csrf:'mail-fixture-csrf'});
      if(pathname==='/control-api/projects')return json({projects:[{id:task.project_id,name:'duckduck'}]});
      if(pathname==='/control-api/tasks')return json({tasks:[task]});
      if(pathname==='/control-api/room')return json({events:[{id:'report-message',time:task.updated_at,kind:'report',source:'task_result',senderType:'agent',senderId:lead,senderName:'검토 담당',taskId:task.id,content:task.result}],before:null});
      if(pathname==='/control-api/development')return json({requests:[]});
      if(pathname==='/control-api/team')return json({total:1,configuredCount:1,readyCount:1,provider:{ready:true},roster:[],meetings:[]});
      if(pathname==='/control-api/report-mail')return json({configured,sender:configured?'office.fixture@gmail.com':undefined,localConfigurationAllowed:local});
      if(pathname==='/control-api/report-mail/configure'){
        assert.equal(local,true);assert.equal(request.method(),'POST');assert.equal(request.headers()['x-control-csrf'],'mail-fixture-csrf');
        const body=request.postDataJSON();assert.deepEqual(body,{sender:'office.fixture@gmail.com',appPassword:'aaaabbbbccccdddd',confirmation:true});
        mutations.push({kind:'configure'});configured=true;return json({configured:true,authenticationVerified:false});
      }
      if(pathname==='/control-api/report-mail/send'){
        assert.equal(request.method(),'POST');assert.equal(request.headers()['x-control-csrf'],'mail-fixture-csrf');
        const body=request.postDataJSON();assert.equal(body.confirmation,true);assert.equal(body.pdfBase64,pdf.toString('base64'));assert.match(body.id,/^[a-f0-9-]{36}$/);assert.equal(typeof body.reportTitle,'string');
        assert.equal('to' in body,false);assert.equal('appPassword' in body,false);mutations.push({kind:'send',id:body.id});const failed=scenario==='authentication'&&mutations.filter(m=>m.kind==='send').length===1;return json(failed?{state:'failed',errorCode:'office_report_mail_authentication_failed'}:scenario==='unknown'?{state:'unknown'}:{state:'accepted'});
      }
      if(pathname.startsWith('/control-api/report-mail/deliveries/')){assert.equal(request.method(),'GET');receipts.push(pathname.split('/').at(-1));const failed=scenario==='authentication'&&mutations.filter(m=>m.kind==='send').length===1;return json(failed?{state:'failed',errorCode:'office_report_mail_authentication_failed'}:scenario==='unknown'?{state:'unknown'}:{state:'accepted'});}
      assert.equal(request.method(),'GET','Unexpected control mutation');return json({});
    });
    await page.route('**/api/**',route=>{if(route.request().method()!=='GET'){nativeWrites++;return route.abort();}return route.fallback();});
    await page.goto(target.origin+'/#access='+access);
    const frame=page.frameLocator('#officeFrame');
    await frame.locator('canvas').waitFor();
    await page.locator('#openChat').click();
    const room=frame.locator('[data-office-native-room]'),report=room.getByRole('region',{name:'읽기 쉬운 보고서'}).first();
    await report.getByRole('heading',{name:'한 줄 결론'}).waitFor();
    if(scenario==='accepted'){
      const popupPromise=page.waitForEvent('popup');
      await report.getByRole('button',{name:'PDF로 저장·인쇄',exact:true}).click();
      const preview=await popupPromise;
      await preview.getByRole('button',{name:'인쇄 / PDF로 저장',exact:true}).waitFor();
      assert.equal(await preview.locator('.original pre').textContent(),task.result);
      assert.equal(await preview.evaluate(()=>window.opener),null);
      await preview.close();
    }
    await report.getByRole('button',{name:'Gmail로 PDF 받기',exact:true}).click();
    const mail=report.getByRole('region',{name:'Gmail 보고서 보내기'}),send=mail.getByRole('button',{name:'선택한 PDF를 내 Gmail로 보내기',exact:true});
    await mail.waitFor();assert.equal(await send.isDisabled(),true);assert.equal(mutations.length,0);
    if(local){
      await mail.getByLabel('본인 Gmail 주소',{exact:true}).fill('office.fixture@gmail.com');
      await mail.getByLabel('Google 앱 비밀번호',{exact:true}).fill('aaaabbbbccccdddd');
      await mail.getByRole('button',{name:'본인 Gmail 연결 정보 저장',exact:true}).click();
      await mail.getByText('받을 주소: office.fixture@gmail.com',{exact:true}).waitFor();
      assert.equal(await mail.getByLabel('Google 앱 비밀번호',{exact:true}).inputValue(),'');
      assert.equal(mutations.filter(m=>m.kind==='send').length,0);assert.equal(await send.isDisabled(),true);
      const file=mail.getByLabel('저장한 PDF 선택',{exact:true});
      await file.setInputFiles({name:'검토-보고서.pdf',mimeType:'application/pdf',buffer:pdf});
      await send.waitFor();
      await send.click(); // Dismiss the first confirmation: no send and no consumed attempt.
      assert.equal(dialogs.at(-1)?.type,'confirm');assert.match(dialogs.at(-1).message,/검토-보고서\.pdf.*office\.fixture@gmail\.com/);
      assert.equal(mutations.filter(m=>m.kind==='send').length,0);assert.equal(await send.isEnabled(),true);
      allowConfirmation=true;await send.click();
      const resultText=scenario==='authentication'?/Gmail 인증에 실패했어요/:scenario==='unknown'?/발송 결과를 확인해야 해요/:/Gmail 서버가 메일을 접수했어요/;
      await mail.getByText(resultText).waitFor();
      if(scenario==='accepted')assert.match(await mail.innerText(),/실제 도착 여부는 아직 확인하지 않았습니다/);
      assert.equal(mutations.filter(m=>m.kind==='send').length,1);assert.equal(await send.isDisabled(),true);assert.equal(await file.isDisabled(),true);
      const receiptResponse=page.waitForResponse(response=>new URL(response.url()).pathname.startsWith('/control-api/report-mail/deliveries/'));
      await mail.getByRole('button',{name:'발송 결과 확인',exact:true}).click();await receiptResponse;
      await mail.getByText(resultText).waitFor();
      assert.deepEqual(receipts,[mutations.find(m=>m.kind==='send').id]);assert.equal(mutations.filter(m=>m.kind==='send').length,1);
      const prepareAgain=mail.getByRole('button',{name:'수정 후 새 발송 준비',exact:true});
      if(scenario==='authentication'){
        await prepareAgain.waitFor();
        await mail.getByText('Gmail 연결 설정',{exact:true}).click();
        await mail.getByLabel('Google 앱 비밀번호',{exact:true}).fill('aaaabbbbccccdddd');
        await mail.getByRole('button',{name:'본인 Gmail 연결 정보 저장',exact:true}).click();
        await mail.getByText(/연결 정보를 저장했어요/).waitFor();
        assert.equal(mutations.filter(m=>m.kind==='send').length,1);
        await prepareAgain.click();
        await mail.getByText(/새 발송을 준비했어요/).waitFor();
        assert.equal(mutations.filter(m=>m.kind==='send').length,1);assert.equal(await send.isEnabled(),true);
        await send.click();await mail.getByText(/Gmail 서버가 메일을 접수했어요/).waitFor();
        const sent=mutations.filter(m=>m.kind==='send');assert.equal(sent.length,2);assert.notEqual(sent[0].id,sent[1].id);
        assert.equal(await send.isDisabled(),true);
      }else{
        assert.equal(await prepareAgain.count(),0);
        if(scenario==='unknown')assert.match(await mail.innerText(),/자동으로 다시 보내지 않습니다/);
      }
    }else{
      await mail.getByText(/처음 연결은 Mac에서 0번으로 연 사무실에서/).waitFor();
      assert.equal(await mail.locator('input[type=password]').count(),0);
      assert.equal(await mail.getByRole('button',{name:'본인 Gmail 연결 정보 저장'}).count(),0);
      assert.equal(await mail.evaluate(element=>element.scrollWidth>element.clientWidth),false);
      assert.equal(mutations.length,0);
    }
    assert.equal(nativeWrites,0);assert.deepEqual(errors,[]);
    await context.close();
  }
  console.log('PASS: native report PDF preview; mocked local Gmail setup, explicit selected-PDF confirmation, one send and receipt check, uncertain send stays blocked, authentication repair requires a new explicit attempt; remote setup gated; no actual mail or model request');
}finally{await browser.close();}
