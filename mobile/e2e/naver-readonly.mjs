import {openDuckTools} from './helpers.mjs';
import {chromium} from 'playwright-core';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve(new URL('../dist-web/',import.meta.url).pathname),origin='https://duck-naver.test';
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion:'reduce'});
 const errors=[],connections=[];page.on('pageerror',error=>errors.push(error.message));
 const status={configured:true,connected:false,readOnly:true,sendAvailable:false,features:[],availableFeatures:['mail']};
 await page.addInitScript(({origin})=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),{origin});
 await page.route(origin+'/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(!path.startsWith('/api/')){const file=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(file.startsWith(root+'/'));try{await route.fulfill({body:await readFile(file),contentType:({'.js':'text/javascript','.html':'text/html','.ttf':'font/ttf','.png':'image/png','.ico':'image/x-icon'})[extname(file)]||'application/octet-stream'});}catch{await route.fulfill({status:404,body:''});}return;}
  if(path==='/api/auth/session')return route.fulfill({json:{user:{id:'fixture',email:'fixture@example.test',emailVerified:true}}});
  if(path==='/api/todos'||path==='/api/integrations')return route.fulfill({json:[]});
  if(path==='/api/calendar/events')return route.fulfill({json:{items:[],nextCursor:null}});
  if(path==='/api/capabilities')return route.fulfill({json:{todoNotes:true,assistant:true,externalActions:true}});
  if(path==='/api/assistant/status')return route.fulfill({json:{enabled:true,actions:[],message:'준비됨'}});
  if(path==='/api/assistant/actions')return route.fulfill({json:{actions:[]}});
  if(path==='/api/integrations/naver'){
   if(req.method()==='POST'){connections.push(req.postDataJSON());return route.fulfill({json:{...status,connected:true,features:['mail']}});}
   return route.fulfill({json:status});
  }
  if(path==='/api/operations/backup')return route.fulfill({json:{enabled:false,offsite:false,failed:false,lastLocalSuccess:null}});
  throw Error('Unexpected API '+req.method()+' '+path);
 });
 await page.goto(origin);await page.getByRole('tab',{name:'duckduck',exact:true}).click();await openDuckTools(page);await page.getByRole('button',{name:'덕 AI 비서 열기',exact:true}).click();
 await page.getByRole('button',{name:'네이버 메일 연결 설정',exact:true}).click();await page.getByText('원본의 읽음 상태를 바꾸거나 메일을 보내지 않아요.',{exact:true}).waitFor();
 assert.equal(await page.getByRole('checkbox',{name:'읽음 상태 변경 허용',exact:true}).count(),0);assert.equal(await page.getByRole('checkbox',{name:'메일 발송·답장 허용',exact:true}).count(),0);
 await page.getByRole('textbox',{name:'네이버 메일 주소',exact:true}).fill('fixture@naver.com');await page.getByLabel('네이버 앱 비밀번호',{exact:true}).fill('fixture-password');await page.getByRole('button',{name:'네이버 메일 연결',exact:true}).click();
 await page.getByLabel('네이버 앱 비밀번호',{exact:true}).waitFor({state:'detached'});assert.equal(connections.length,1);assert.deepEqual(connections[0].permissions,{modify:false,send:false});
 await page.getByRole('button',{name:'네이버 메일 연결 설정',exact:true}).click();assert.equal(await page.getByLabel('네이버 앱 비밀번호',{exact:true}).inputValue(),'');assert.deepEqual(errors,[]);
 console.log('PASS: read-only Naver explains policy, hides all write choices, submits read-only permissions and clears the app password; fixture only');
}finally{await browser.close();}
