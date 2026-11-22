import {chromium} from 'playwright-core';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const origin='https://duck-oauth.test',root=resolve('mobile/dist-web'),out=resolve('artifacts/web-complete-2026-11-22');await mkdir(out,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(12000);await page.emulateMedia({reducedMotion:'reduce'});const errors=[],requests=[];let invalid=false,fail=false;
const services=['google','slack','notion'].map(provider=>({provider,configured:true,connected:false,features:[]}));
await context.addInitScript(origin=>localStorage.setItem('duckduck.mobile.connection.v1',JSON.stringify({mode:'cloud',baseUrl:origin})),origin);
await context.route(/https:\/\/(accounts\.google\.com|slack\.com|api\.notion\.com)\//,r=>r.fulfill({body:'<h1>Provider authorization fixture</h1>',contentType:'text/html'}));
await page.route(origin+'/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname;const json=v=>route.fulfill({json:v});
 if(!path.startsWith('/api/')){const f=resolve(root,'.'+(path==='/'?'/index.html':path));assert.ok(f.startsWith(root+'/'));try{return route.fulfill({body:await readFile(f),contentType:({'.js':'text/javascript','.ttf':'font/ttf','.html':'text/html','.png':'image/png'})[extname(f)]||'application/octet-stream'});}catch{return route.fulfill({status:404,body:''});}}
 if(path==='/api/auth/session')return json({user:{id:'oauth-user',email:'oauth@example.test',emailVerified:true}});
 if(path==='/api/todos'||path==='/api/integrations')return json(path==='/api/todos'?[]:services);
 if(path==='/api/assistant/status')return json({enabled:false,scheduledMessages:false,actions:[],connections:[]});
 if(path==='/api/assistant/actions')return json({actions:[]});
 if(path.endsWith('/authorize')){const provider=path.split('/')[3];requests.push({provider,...req.postDataJSON()});if(fail)return route.fulfill({status:503,json:{error:'지금 연결을 시작하지 못했어요. 다시 확인해주세요.'}});return json({url:invalid?'https://untrusted.example.test/':({google:'https://accounts.google.com/o/oauth2/auth',slack:'https://slack.com/oauth/v2/authorize',notion:'https://api.notion.com/v1/oauth/authorize'})[provider]});}
 if(path==='/api/calendar/calendars')return json({items:[],nextCursor:null});
 if(path==='/api/calendar/events')return json({items:[],nextCursor:null});
 return json({items:[],actions:[],messages:[],turns:[],enabled:false});
});page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin);await page.getByTestId('desktop-workspace').waitFor();
 for(const provider of ['google','slack','notion']){
  const name={google:'Google',slack:'Slack',notion:'Notion'}[provider];await page.getByRole('button',{name:'웹 서비스 연결 관리',exact:true}).click();await page.getByRole('button',{name:name+' 연결 안내',exact:true}).click();await page.getByRole('button',{name:'연결할 자료 선택',exact:true}).click();
  const popupPromise=context.waitForEvent('page');await page.getByRole('button',{name:name+' 연결',exact:true}).click();const popup=await popupPromise;await popup.getByRole('heading',{name:'Provider authorization fixture'}).waitFor();assert.equal(await popup.evaluate(()=>window.opener),null,'authorization cannot access parent');services.find(s=>s.provider===provider).connected=true;services.find(s=>s.provider===provider).features=provider==='google'?['calendar','tasks']:provider==='slack'?['channels','messages']:['pages'];await popup.close();await page.waitForTimeout(650);await page.getByRole('button',{name:'돌아가기',exact:true}).click();await page.getByRole('button',{name:'자료 가져오기',exact:true}).waitFor();await page.screenshot({path:resolve(out,'oauth-'+provider+'-connected-fixture.png')});
 }
 await page.getByRole('button',{name:'웹 서비스 연결 관리',exact:true}).click();await page.getByRole('button',{name:'Google 연결 안내',exact:true}).click();await page.getByRole('button',{name:'연결 권한 관리',exact:true}).click();invalid=true;const before=(await context.pages()).length;await page.getByRole('button',{name:'연결 권한 다시 선택',exact:true}).click();await page.getByText('연결 주소를 확인하지 못했어요.',{exact:true}).waitFor();assert.equal((await context.pages()).length,before,'invalid destination closes blank popup');invalid=false;fail=true;await page.getByRole('button',{name:'연결 권한 다시 선택',exact:true}).click();await page.getByText('지금 연결을 시작하지 못했어요. 다시 확인해주세요.',{exact:true}).waitFor();
 assert.deepEqual(errors,[]);assert.deepEqual(requests.slice(0,3).map(x=>x.provider),['google','slack','notion']);await writeFile(resolve(out,'oauth-results.json'),JSON.stringify({passed:true,scope:'Browser authorization wiring with fully intercepted provider pages/API. No real OAuth grants, service accounts, tokens or provider network calls.',requests,errors},null,2));console.log('PASS: web Google/Slack/Notion authorization window, automatic status return and error cleanup');
}catch(e){await page.screenshot({path:resolve(out,'oauth-failure.png')});throw e;}finally{await browser.close();}
