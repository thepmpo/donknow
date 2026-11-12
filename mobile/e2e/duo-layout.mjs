import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const require=createRequire(import.meta.url),project=resolve(fileURLToPath(new URL('..',import.meta.url)));
const Metro=require('metro'),{getDefaultConfig}=require('expo/metro-config');
const config=getDefaultConfig(project);config.maxWorkers=2;config.watchFolders=[project];config.resolver.useWatchman=false;
config.resolver.resolveRequest=(context,name,platform)=>context.resolveRequest(context,platform==='web'&&name==='react-native'?'react-native-web':name,platform);
config.reporter={update(){}};
const bundle=await Metro.runBuild(config,{entry:resolve(project,'e2e/fixtures/duo-layout.tsx'),platform:'web',dev:false,minify:false});
const server=http.createServer((req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?bundle.code:'<!doctype html><style>html,body,#root{margin:0;width:100%;height:100%;display:flex;flex-direction:column}</style><div id="root"></div><script src="/fixture.js"></script>');});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:960,height:740}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);await page.getByText('편집 시작',{exact:true}).click();await page.getByTestId('draft').fill('접었다 펴도 이 초안 보존');
 await page.getByTestId('scroll').evaluate(node=>{node.scrollTop=600;window.duoScrollNode=node;});
 const geometry=(width,height,regions=[])=>({apiAvailable:true,hasHinge:true,width,height,safeArea:{top:20,right:20,bottom:20,left:20},regions});
 for(const state of [geometry(960,740),geometry(960,740,[{kind:'division',active:true,frame:{x:520,y:0,width:40,height:740}}]),geometry(390,844),geometry(960,740,[{kind:'division',active:true,frame:{x:0,y:350,width:960,height:40}}]),geometry(960,740),null]){
  if(state)await page.setViewportSize({width:state.width,height:state.height});
  await page.evaluate(state=>window.duoFixture.change(state),state);
  await page.getByTestId(state?'duo-layout-surface':'standard-layout-surface').waitFor();
  assert.equal(await page.getByTestId('draft').inputValue(),'접었다 펴도 이 초안 보존');assert.equal(await page.getByTestId('current-tab').textContent(),'duckduck');assert.equal(await page.getByTestId('editing').textContent(),'editing');
  assert.deepEqual(await page.getByTestId('scroll').evaluate(node=>({same:node===window.duoScrollNode,top:node.scrollTop})),{same:true,top:600});
  assert.deepEqual(await page.evaluate(()=>({mounts:window.duoFixture.mounts,unmounts:window.duoFixture.unmounts})),{mounts:1,unmounts:0});
  const nav=await page.getByTestId('navigation').boundingBox(),safe=await page.getByTestId('duo-safe-content').boundingBox();
  if(state)assert.ok(Math.abs(nav.x+nav.width-safe.x-safe.width)<1,'navigation stays on safe content right edge');
 }
 assert.deepEqual(errors,[]);console.log('Duo resize fixture passed: open/book/closed/tabletop/fallback retain draft, tab, edit, scroll and child identity.');
}finally{await browser.close();await new Promise(done=>server.close(done));}
