import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import http from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
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
await promisify(execFile)(process.execPath,[resolve(project,'node_modules/expo/bin/cli'),'export:embed','--platform','web','--entry-file',resolve(project,'e2e/fixtures/background-controls.tsx'),'--bundle-output',bundleFile,'--assets-dest',temporary,'--dev','false','--max-workers','2'],{cwd:project,env:{...process.env,EXPO_NO_TELEMETRY:'1',CI:'1'},maxBuffer:2*1024*1024});
const bundle=readFileSync(bundleFile,'utf8');
const server=http.createServer((req,res)=>{if(req.url.includes('.ttf')){res.setHeader('Content-Type','font/ttf');res.end(readFileSync(resolve(project,'node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/'+(req.url.includes('MaterialCommunityIcons')?'MaterialCommunityIcons.ttf':'Ionicons.ttf'))));return;}res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const output=resolve(project,'../artifacts/background-controls-2026-11-15/current');mkdirSync(output,{recursive:true});
const errors=[],captures=[];let page;
const geometry=(width,height,open=false)=>({apiAvailable:true,hasHinge:true,width,height,hingeStatus:open?'fullyOpen':'closed',safeArea:{top:20,bottom:20,left:16,right:80},regions:[{kind:'occlusion',active:!open,frame:{x:width-60,y:24,width:28,height:28}}]});
try{
 page=await browser.newPage({viewport:{width:431,height:640},hasTouch:true});page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>!!window.backgroundControls);
 const root=page.getByTestId('root-layer'),top=page.getByTestId('editor-layer'),nested=page.getByTestId('nested-layer'),capture=async name=>{await page.screenshot({path:resolve(output,name+'.png')});captures.push(name+'.png');};
 for(const [name,g] of [['folded',geometry(431,640)],['open',geometry(960,740,true)]]){
  await page.setViewportSize({width:g.width,height:g.height});await page.evaluate(g=>window.backgroundControls.geometry(g),g);await root.getByTestId('DuoTodayButton').waitFor();const before=await root.getByTestId('DuoTodayButton').boundingBox();await capture(name+'-before');
  await page.evaluate(()=>window.backgroundControls.open(true));await top.getByTestId('todo-editor-surface').waitFor();await root.getByTestId('DuoTodayDim').waitFor();assert.equal(await root.getByTestId('DuoTodayButton').isDisabled(),true);assert.equal(await root.getByTestId('DuoCalendarViewButton').isDisabled(),true);assert.equal(await root.getByRole('tab',{includeHidden:true}).first().isDisabled(),true);assert.deepEqual(await root.getByTestId('DuoTodayButton').boundingBox(),before);assert.equal(await top.getByTestId('DuoBackButton').isDisabled(),false);await capture(name+'-editor-dim');
  await page.evaluate(()=>window.backgroundControls.keyboard(true));await top.getByTestId('DuoKeyboardDismissButton').waitFor();assert.equal(await top.getByTestId('DuoKeyboardDismissDim').count(),0);assert.equal(await top.getByTestId('DuoBackDim').count(),0);const close=await top.getByTestId('DuoBackButton').boundingBox(),keyboard=await top.getByTestId('DuoKeyboardDismissButton').boundingBox();assert.ok(keyboard.y+keyboard.height<=close.y);await capture(name+'-keyboard-clear');
  await top.getByTestId('DuoKeyboardDismissButton').click();await page.evaluate(()=>window.backgroundControls.keyboard(false));await top.getByTestId('DuoKeyboardDismissButton').waitFor({state:'detached'});assert.equal(await top.getByRole('textbox',{name:'메모',exact:true}).inputValue(),'작성 중인 메모');await page.evaluate(()=>window.backgroundControls.keyboard(false));
  await page.evaluate(()=>window.backgroundControls.nested(true));await nested.getByText('확인 창',{exact:true}).waitFor();await top.getByTestId('DuoBackDim').waitFor();assert.equal(await top.getByTestId('DuoBackButton').isDisabled(),true);assert.equal(await nested.getByTestId('DuoBackButton').isDisabled(),false);await nested.getByTestId('DuoBackButton').click();await nested.waitFor({state:'detached'});await top.getByTestId('DuoBackDim').waitFor({state:'detached'});assert.equal(await root.getByTestId('DuoTodayButton').isDisabled(),true,'closing nested layer keeps underlying page blocked');
  await top.getByTestId('DuoBackButton').click();await top.waitFor({state:'detached'});await root.getByTestId('DuoTodayDim').waitFor({state:'detached'});await root.getByTestId('DuoTodayButton').click();await root.getByTestId('DuoCalendarViewButton').click();
 }
 await page.emulateMedia({colorScheme:'dark'});await page.evaluate(()=>window.backgroundControls.open(true));await root.getByTestId('BackgroundNavigationDim').waitFor();await capture('dark-editor-dim');await top.getByTestId('DuoBackButton').click();await top.waitFor({state:'detached'});
 await page.evaluate(()=>window.backgroundControls.geometry(null));await page.setViewportSize({width:390,height:844});await page.evaluate(()=>window.backgroundControls.open(true));await root.getByTestId('BackgroundNavigationDim').waitFor();assert.equal(await root.getByRole('tab',{includeHidden:true}).first().isDisabled(),true);await capture('ordinary-bottom-dim');await top.getByRole('button',{name:'닫기',exact:true}).click();await top.waitFor({state:'detached'});await root.getByTestId('BackgroundNavigationDim').waitFor({state:'detached'});
 const counts=await page.evaluate(()=>window.backgroundControls.counts);assert.equal(counts.writes,0);assert.equal(counts.back,0);assert.equal(counts.tab,0);assert.equal(counts.today,2);assert.equal(counts.view,2);assert.deepEqual(errors,[]);writeFileSync(resolve(output,'verification.json'),JSON.stringify({syntheticOnly:true,captures,counts,nestedLayerRestoration:true,backgroundDisabledAndDimmed:true,foregroundControlsClear:true,errors},null,2));console.log('PASS: folded/open/dark/ordinary; blocked background controls dim and disabled; active keyboard/X clear; nested modal restores one layer at a time; unchanged background geometry, drafts and zero writes. Synthetic Expo/geometry only.');
}catch(error){if(page){console.log('DEBUG',await page.evaluate(()=>document.body.innerText.slice(-1500)));await page.screenshot({path:resolve(output,'debug-failure.png')});}throw error;}finally{await browser.close();await new Promise(done=>server.close(done));rmSync(temporary,{recursive:true,force:true});}
