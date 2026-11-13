import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import http from 'node:http';
import {readFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
// The official Expo resolver is required for web fonts, blur and native-module web shims.
const temporary=mkdtempSync(join(tmpdir(),'duck-duo-layout-'));
const bundleFile=join(temporary,'fixture.js');
await promisify(execFile)(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/duo-layout.tsx'),'--bundle-output',bundleFile,'--assets-dest',temporary,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:2*1024*1024});
const bundle=readFileSync(bundleFile,'utf8');
const server=http.createServer((req,res)=>{if(req.url.includes('.ttf')){res.setHeader('Content-Type','font/ttf');res.end(readFileSync(resolve(project,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf')));return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:960,height:740}}),errors=[];page.on('pageerror',error=>{errors.push(error.message);console.error('FIXTURE_PAGE_ERROR',error.stack);});
 await page.addInitScript(()=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'demo'})));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('편집 시작',{exact:true}).click();await page.getByTestId('draft').fill('접었다 펴도 이 초안 보존');
 await page.getByTestId('scroll').evaluate(node=>{node.scrollTop=600;window.duoScrollNode=node;});
 const geometry=(width,height,regions=[])=>({apiAvailable:true,hasHinge:true,width,height,safeArea:{top:20,right:20,bottom:20,left:20},regions});
 mkdirSync(resolve(project,'../artifacts/duo-bottom-stack-2026-11-13'),{recursive:true});let step=0;
 for(const state of [geometry(960,740),geometry(960,740,[{kind:'division',active:true,frame:{x:520,y:0,width:40,height:740}}]),geometry(390,844),geometry(320,700),geometry(960,740,[{kind:'division',active:true,frame:{x:0,y:350,width:960,height:40}}]),geometry(960,740),null]){
  if(state)await page.setViewportSize({width:state.width,height:state.height});
  await page.evaluate(state=>window.duoFixture.change(state),state);
  await page.getByTestId(state?'duo-layout-surface':'standard-layout-surface').waitFor();
  assert.equal(await page.getByTestId('draft').inputValue(),'접었다 펴도 이 초안 보존');assert.equal(await page.getByTestId('current-tab').textContent(),'duckduck');assert.equal(await page.getByTestId('editing').textContent(),'editing');
  assert.deepEqual(await page.getByTestId('scroll').evaluate(node=>({same:node===window.duoScrollNode,top:node.scrollTop})),{same:true,top:600});
  assert.deepEqual(await page.evaluate(()=>({mounts:window.duoFixture.mounts,unmounts:window.duoFixture.unmounts})),{mounts:1,unmounts:0});
  const nav=await page.getByTestId(state?'DuoTrailingNavigation':'BottomNavigation').boundingBox(),safe=await page.getByTestId('duo-safe-content').boundingBox();
  if(state){assert.ok(Math.abs(nav.x+nav.width-(safe.x+safe.width-8))<2,'vertical stack follows the safe right edge');assert.ok(Math.abs(nav.y+nav.height-(safe.y+safe.height-8))<2,'same 8px inset at the lower safe edge');assert.ok(nav.width<=49&&nav.height>nav.width*4&&nav.height<=227,'short vertical stack, never a horizontal header or full-height panel');const body=await page.getByTestId('full-width-body').boundingBox();assert.equal(body.width,safe.width,'body surface keeps its full safe width');const back=await page.getByTestId('DuoBackButton').boundingBox();assert.ok(back.y>=safe.y+7&&back.y<=safe.y+9&&Math.abs(back.x-nav.x)<1,'back stays at the upper right while tabs stay below');assert.ok(back.width>=44&&back.width===back.height,'back has a circular touch target');assert.ok(back.y+back.height<nav.y,'back and tabs do not overlap');assert.ok(await page.getByTestId('DuoBackButton').evaluate(el=>parseFloat(getComputedStyle(el).borderRadius)>=el.getBoundingClientRect().width/2),'back has a visible circular boundary');let previous=null;for(const tab of await page.getByRole('tab').all()){const box=await tab.boundingBox();assert.ok(box.width>=44&&box.height>=44,'every tab keeps a 44px target');assert.ok(box.x>=nav.x&&box.x+box.width<=nav.x+nav.width+1,'tabs stay inside the stack');if(previous){assert.ok(Math.abs(box.x-previous.x)<1,'all five tabs share one vertical column');assert.ok(box.y>=previous.y+previous.height-1,'each tab is below the previous tab');}previous=box;}const input=await page.getByTestId('draft').boundingBox();assert.ok(input.x+input.width<=nav.x,'input is not covered by the stack');}
  await page.screenshot({path:resolve(project,'../artifacts/duo-bottom-stack-2026-11-13/'+(++step)+'-geometry-fixture.png')});
 }
 await page.evaluate(state=>window.duoFixture.change(state),geometry(960,740));await page.getByTestId('DuoBackButton').waitFor();await page.getByText('작업 중 전환',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid="DuoBackButton"]')?.getAttribute('aria-disabled')==='true');assert.ok(await page.getByTestId('DuoBackButton').isDisabled());await page.getByText('작업 중 전환',{exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid="DuoBackButton"]')?.getAttribute('aria-disabled')!=='true');assert.equal(await page.getByTestId('DuoBackButton').isDisabled(),false);
 // Short safe areas scroll the same vertical stack instead of shrinking touch targets.
 await page.setViewportSize({width:390,height:240});await page.evaluate(state=>window.duoFixture.change(state),geometry(390,240));
 const last=page.getByRole('tab',{name:'내정보',exact:true});await last.scrollIntoViewIfNeeded();const shortNav=await page.getByTestId('DuoTrailingNavigation').boundingBox(),lastBox=await last.boundingBox();assert.ok(lastBox.height>=44&&lastBox.y>=shortNav.y&&lastBox.y+lastBox.height<=shortNav.y+shortNav.height+1,'last vertical tab remains reachable in short safe areas');await last.click();assert.equal(await page.getByTestId('current-tab').textContent(),'profile');await page.getByTestId('DuoBackButton').click();await page.getByTestId('DuoBackButton').waitFor({state:'detached'});assert.equal(await page.getByTestId('editing').textContent(),'closed');
 await page.setViewportSize({width:390,height:844});await page.evaluate(state=>{window.duoFixture.change(state);window.duoFixture.showApp();},geometry(390,844));
 await page.getByRole('tab',{name:'duckduck',exact:true}).click();await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).waitFor();assert.equal(await page.getByTestId('DuoBackButton').count(),0,'root tabs have no fake back action');await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).fill('초안 보존');await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).evaluate(el=>el.blur());
 const inputBox=await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).boundingBox(),sendBox=await page.getByRole('button',{name:'덕에게 보내기',exact:true}).boundingBox(),tabsBox=await page.getByTestId('DuoTrailingNavigation').boundingBox();assert.ok(inputBox.x+inputBox.width<=tabsBox.x&&sendBox.x+sendBox.width<=tabsBox.x,'lower-right tabs never cover the actual composer or send button');
 await page.screenshot({path:resolve(project,'../artifacts/duo-bottom-stack-2026-11-13/7-duck-closed-demo-fixture.png')});
 await page.setViewportSize({width:960,height:740});await page.evaluate(state=>window.duoFixture.change(state),geometry(960,740));await page.screenshot({path:resolve(project,'../artifacts/duo-bottom-stack-2026-11-13/8-duck-open-demo-fixture.png')});
 // A real nested screen registers a real back callback; switching tabs alone does not.
 await page.getByRole('tab',{name:'내정보',exact:true}).click();assert.equal(await page.getByTestId('DuoBackButton').count(),0);await page.getByRole('button',{name:'아이폰 미리 알림 가져오기',exact:true}).click();await page.getByTestId('DuoBackButton').waitFor();
 await page.screenshot({path:resolve(project,'../artifacts/duo-bottom-stack-2026-11-13/9-back-open-demo-fixture.png')});await page.setViewportSize({width:390,height:844});await page.evaluate(state=>window.duoFixture.change(state),geometry(390,844));await page.screenshot({path:resolve(project,'../artifacts/duo-bottom-stack-2026-11-13/10-back-closed-demo-fixture.png')});await page.getByTestId('DuoBackButton').click();await page.getByTestId('DuoBackButton').waitFor({state:'detached'});await page.getByRole('button',{name:'아이폰 미리 알림 가져오기',exact:true}).waitFor();await page.getByRole('tab',{name:'duckduck',exact:true}).click();assert.equal(await page.getByRole('textbox',{name:'덕에게 이야기하기',exact:true}).inputValue(),'초안 보존');
 assert.equal(await page.getByTestId('BottomNavigation').count(),0,'Duo never leaves a duplicate bottom navigation');
 assert.deepEqual(errors,[]);console.log('Duo lower-right vertical navigation passed: equal top/bottom safe gaps, circular contextual back, disabled dismiss guard, real return and preserved chat draft, 44px scrollable tabs; open/book/closed/tabletop/fallback retain draft, tab, edit, scroll and child identity.');
}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
