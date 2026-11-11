// Native code-change UI only: every model, write, publish and deploy call is a fixture.
import {chromium} from '../mobile/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const target=new URL(process.env.AI_OFFICE_TEST_URL||'http://127.0.0.1:8810');
if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Loopback test URL required');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const mobile=process.env.AI_OFFICE_TEST_MOBILE==='1',page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000}});
const errors=[],confirmations=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{confirmations.push(d.message());return d.accept();});
const unknownPublish=process.env.AI_OFFICE_TEST_PUBLISH_UNKNOWN==='1';
let dev=null,receipt=null,deploymentStatus=null,releaseReads=0,starts=0,syncs=0,validations=0,publishes=0,deploys=0,nativeWrites=0;
await page.route('**/control-api/**',route=>{
 const req=route.request(),p=new URL(req.url()).pathname,body=req.method()==='POST'?req.postDataJSON():null,json=x=>route.fulfill({contentType:'application/json',body:JSON.stringify(x)});
 if(p.endsWith('/local-connect'))return route.continue();
 if(p==='/control-api/session')return json({csrf:'fixture'});
 if(p==='/control-api/projects')return json({projects:[{id:'project-one',name:'duckduck'}]});
 if(p==='/control-api/tasks')return json({tasks:[]});
 if(p==='/control-api/room')return json({events:[],before:null});
 if(p==='/control-api/team')return json({total:0,configuredCount:0,readyCount:0,roster:[],meetings:[],provider:{ready:true}});
 if(p==='/control-api/development/source')return json({projectId:'project-one',sourceHead:'1'.repeat(40),remoteHead:'2'.repeat(40),upToDate:false,digest:'source-digest'});
 if(p==='/control-api/development/source/sync'){assert.equal(body.expectedHead,'1'.repeat(40));assert.equal(body.expectedRemoteHead,'2'.repeat(40));assert.equal(body.digest,'source-digest');assert.equal(body.confirmation,true);syncs++;return json({synced:true,knowledgeReady:true});}
 if(p==='/control-api/development')return json({requests:dev?[dev]:[]});
 if(p==='/control-api/development/prepare'){dev={...body,taskId:'task-code',agentId:'dev',title:'가입 화면 개선',digest:'d'.repeat(64),state:'prepared',phase:'development',automaticPublication:false,expiresAt:Date.now()+600000};return json(dev);}
 if(p==='/control-api/development/'+dev?.id+'/start'){assert.equal(body.digest,dev.digest);assert.equal(body.confirmation,true);starts++;dev.state='started';dev.taskStatus='review';dev.candidateAvailable=true;dev.result='## 한 줄 결론\n별도 사본에서 가입 화면을 고쳤어요.\n## 지금 할 일\n검사를 실행한 뒤 반영해주세요.';return json({started:true,taskId:dev.taskId});}
 if(p==='/control-api/development/'+dev?.id)return json(dev);
 if(p==='/control-api/releases')return json({releases:receipt?[receipt]:[]});
 if(p==='/control-api/releases/release-one'){releaseReads++;return json({...receipt,...(deploymentStatus?{deployment:deploymentStatus}:{})});}
 if(p==='/control-api/development/'+dev?.id+'/validate'){validations++;receipt={id:'release-one',requestId:dev.id,state:'validated',digest:'a'.repeat(64),humanSummary:'수정본 검사 2개를 통과했어요.',diff:'diff --git a/src/signup.tsx b/src/signup.tsx\n- old\n+ new\n',diffTruncated:false,files:[{path:'src/signup.tsx',status:'modified'}],tests:[{name:'문법 검사',passed:true,exitCode:0},{name:'기존 기능 검사',passed:true,exitCode:0}],blockers:[],expiresAt:Date.now()+600000};return json(receipt);}
 if(p==='/control-api/releases/release-one/publish'){assert.equal(body.digest,receipt.digest);assert.equal(body.confirmation,true);publishes++;receipt={...receipt,state:'pushed',commit:'c'.repeat(40),githubUrl:'https://github.com/thepmpo/donknow/commit/'+'c'.repeat(40),deployDigest:'b'.repeat(64)};if(unknownPublish)return route.fulfill({status:502,json:{error:'office_publication_unconfirmed'}});return json(receipt);}
 if(p==='/control-api/releases/release-one/deploy'){assert.equal(body.digest,receipt.deployDigest);assert.equal(body.confirmation,true);deploys++;receipt.deployment={requested:true,commit:receipt.commit,url:'https://github.com/thepmpo/donknow/actions/workflows/office-render-deploy.yml',status:'requested',liveConfirmed:false};return json(receipt.deployment);}
 return route.fulfill({status:404,json:{error:'office_not_found'}});
});
await page.route('**/api/**',route=>{if(route.request().method()!=='GET'){nativeWrites++;return route.abort();}return route.fallback();});
try{
 await page.goto(target.origin+'/#access='+fs.readFileSync((process.env.AI_OFFICE_STATE_DIR||'/workspace/ai-office/state')+'/control-access.key','utf8').trim());
 const frame=page.frameLocator('#officeFrame');await frame.locator('canvas').waitFor();await frame.locator('canvas').evaluate(el=>{el.style.display='none';window.requestAnimationFrame=()=>0;});
 await page.locator('#openChat').click();const room=frame.locator('[data-office-native-room]');await room.getByRole('button',{name:'코드 수정',exact:true}).click();
 await room.getByRole('button',{name:'최신 코드 확인',exact:true}).click();const sourceDialog=room.getByRole('dialog',{name:'최신 코드 받기 확인'});await sourceDialog.waitFor();assert.equal(syncs,0);await sourceDialog.getByRole('button',{name:'확인하고 최신 코드 받기',exact:true}).click();await sourceDialog.waitFor({state:'hidden'});assert.equal(syncs,1);assert.equal(starts,0);
 await room.locator('textarea').fill('가입 화면의 안내 문구를 간결하게 바꿔줘.');await room.getByRole('button',{name:'전송',exact:true}).click();
 const dialog=room.getByRole('dialog',{name:'안건 실행 확인'});await dialog.getByText('코드 수정 시작 확인',{exact:true}).waitFor();await dialog.getByText(/별도 작업 사본/).waitFor();assert.equal(starts,0);assert.equal(publishes,0);
 await dialog.getByRole('button',{name:'확인하고 실행',exact:true}).click();await dialog.waitFor({state:'hidden'});assert.equal(starts,1);assert.equal(publishes,0);
 const code=room.getByRole('region',{name:'코드 수정과 배포'});await code.getByRole('button',{name:'수정 결과 보기',exact:true}).click();await code.getByRole('button',{name:'수정본 검사하기',exact:true}).click();
 await code.getByText('수정본 검사 2개를 통과했어요.',{exact:true}).waitFor();assert.equal(validations,1);assert.equal(publishes,0);assert.equal(deploys,0);
 const publish=code.getByRole('button',{name:'확인한 수정본을 GitHub에 반영',exact:true});assert.equal(await publish.isDisabled(),true);
 await code.getByText('실제 코드 변경 내용',{exact:true}).click();await code.getByText(/diff --git/).waitFor();await code.getByRole('checkbox').check();await publish.click();
 if(unknownPublish){await room.getByText(/GitHub 반영 결과가 미확인/).waitFor();assert.equal(await publish.isDisabled(),true);assert.equal(publishes,1);await code.getByRole('button',{name:'결과 새로 확인',exact:true}).click();}
 await code.getByRole('link',{name:'GitHub 반영 내용 보기',exact:true}).waitFor();assert.equal(publishes,1);assert.equal(deploys,0);assert.match(confirmations.at(-1),/TestFlight/);
 await code.getByRole('button',{name:'이 수정본을 운영 사이트에 배포',exact:true}).click();await code.getByRole('link',{name:'배포 진행 확인',exact:true}).waitFor();await code.getByText('배포 요청을 접수했어요. 실제 공개 완료는 아직 확인 전입니다.',{exact:true}).waitFor();assert.equal(deploys,1);assert.match(confirmations.at(-1),/사용자가 보는 사이트/);
 deploymentStatus={...receipt.deployment,status:'live',liveConfirmed:true,commit:'unexpected-commit'};await code.getByRole('button',{name:'결과 새로 확인',exact:true}).click();await code.getByText('배포 요청을 접수했어요. 실제 공개 완료는 아직 확인 전입니다.',{exact:true}).waitFor();assert.equal(await code.getByRole('heading',{name:'운영 사이트 반영 완료',exact:true}).count(),0);const previousReads=releaseReads;deploymentStatus={...receipt.deployment,status:'live',liveConfirmed:true};await code.getByRole('heading',{name:'운영 사이트 반영 완료',exact:true}).waitFor({timeout:15000});assert.ok(releaseReads>previousReads,'read-only release detail polling must refresh cached status');assert.equal(deploys,1);
 assert.equal(nativeWrites,0);assert.deepEqual(errors,[]);assert.equal(await room.evaluate(el=>el.scrollWidth>el.clientWidth),false);if(mobile){const box=await room.locator('textarea').boundingBox();assert.ok(box&&box.y+box.height<=844,'mobile composer must stay visible');}
 await page.screenshot({path:'/tmp/office-development-'+(mobile?'mobile':'desktop')+'-fixture.png'});
 console.log('PASS: code-change preview and explicit run; full diff/test review before main push; separate Render confirmation; live deployment requires exact commit and refreshed receipt; '+(mobile?'390px mobile':'desktop'));
}finally{await browser.close();}
