// Isolated component fixture: all project/session/connection responses are fake; no office data or models.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {createRequire} from 'node:module';
import {chromium} from '../mobile/node_modules/playwright-core/index.mjs';

const runtime=process.env.AI_OFFICE_RUNTIME_PATH||'/workspace/ai-office-runtime',runtimeRequire=createRequire(path.join(runtime,'package.json'));
const {build}=createRequire(runtimeRequire.resolve('vite'))('esbuild');
const fragment=fs.readFileSync(new URL('../tools/ai-office/native-chat/role-library.tsx.fragment',import.meta.url),'utf8');
const wrapped=process.env.AI_OFFICE_ROLE_WRAPPER==='1';
const entry=wrapped ? 'import {createRoot} from "react-dom/client";import SkillsLibrary from "./src/components/SkillsLibrary";createRoot(document.getElementById("app")).render(<SkillsLibrary agents={[]}/>);' :
  'import {useState,useEffect,useRef} from "react";import {createRoot} from "react-dom/client";\n'+fragment+'\ncreateRoot(document.getElementById("app")).render(<OfficeRoleGuidesLibrary/>);';
const bundle=await build({stdin:{contents:entry,resolveDir:runtime,loader:'tsx'},bundle:true,write:false,format:'iife',jsx:'automatic',define:{'import.meta.env':'{}'},logLevel:'silent'});
const server=http.createServer((req,res)=>{res.setHeader('content-type',req.url==='/app.js'?'text/javascript':'text/html');res.end(req.url==='/app.js'?bundle.outputFiles[0].text:'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="app"></div><script src="/app.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const roles=[['planning','기획'],['development','개발'],['design','디자인'],['qa','품질'],['devsecops','보안'],['operations','운영']].map(([id,label])=>({id,label}));
try {
  for(const mobile of [false,true]) {
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900}});
    const waitForFixture=async ready=>{const deadline=Date.now()+5000;while(!ready()){assert.ok(Date.now()<deadline,'Fixture request did not arrive');await page.waitForTimeout(10);}};
    const errors=[],posts=[],external=[];let sessions=0,firstStatus=true,holdSession=true,pendingSession,holdConnection=false,pendingConnection,failConnection=false;
    const connected={'project-a':false,'project-b':false,'project-c':false};
    const status=projectId=>({projectId,connected:connected[projectId],version:1,roles});
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url()),json=(data,code=200)=>route.fulfill({status:code,contentType:'application/json',body:JSON.stringify(data)});
      if(url.origin!==origin){external.push(url.origin);return route.abort();}
      if(url.pathname==='/control-api/projects')return json({projects:[{id:'project-a',name:'프로젝트 A'},{id:'project-b',name:'프로젝트 B'},{id:'project-c',name:'프로젝트 C'}]});
      if(url.pathname==='/control-api/role-guides'){
        if(firstStatus){firstStatus=false;return json({error:'office_role_guides_unavailable'},503);}
        return json(status(url.searchParams.get('projectId')));
      }
      if(url.pathname==='/control-api/session'){
        sessions++;
        if(holdSession){pendingSession=()=>json({csrf:'fixture-csrf'});return;}
        return json({csrf:'fixture-csrf'});
      }
      if(url.pathname==='/control-api/role-guides/connect'){
        const body=route.request().postDataJSON();posts.push(body);assert.equal(body.confirmation,true);assert.equal(route.request().headers()['x-control-csrf'],'fixture-csrf');
        if(failConnection){failConnection=false;return json({error:'office_role_guides_unavailable'},503);}
        connected[body.projectId]=true;
        if(holdConnection){pendingConnection=()=>json(status(body.projectId));return;}
        return json(status(body.projectId));
      }
      if(url.pathname.startsWith('/control-api/')||url.pathname.startsWith('/api/'))throw Error('Unexpected fixture endpoint '+url.pathname);
      return route.continue();
    });
    const room=page.locator('[data-office-role-guides]');
    await page.goto(origin+(wrapped?'/office/':'/'));
    await room.getByRole('alert').getByText(/지침 연결 상태를 확인하지 못했어요/).waitFor();
    assert.equal(posts.length,0);
    await room.getByRole('button',{name:'상태 다시 확인',exact:true}).click();
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).waitFor();
    assert.equal(await room.locator('article').count(),6);assert.equal(posts.length,0);

    // Switching projects while getting fresh CSRF must not submit the previous project's connection.
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).click();
    await page.waitForFunction(()=>document.body.textContent.includes('연결 확인 중'));
    await waitForFixture(()=>!!pendingSession);
    await room.getByRole('combobox',{name:'지침을 연결할 프로젝트'}).selectOption('project-b');
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).waitFor();
    await pendingSession().catch(()=>{});holdSession=false;
    await page.waitForTimeout(30);assert.equal(posts.length,0);

    // A connection response for B arriving after switching to A cannot mark A as connected.
    holdConnection=true;
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).click();
    await waitForFixture(()=>!!pendingConnection);
    await room.getByRole('combobox',{name:'지침을 연결할 프로젝트'}).selectOption('project-a');
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).waitFor();
    await pendingConnection().catch(()=>{});holdConnection=false;
    await page.waitForTimeout(30);
    assert.equal(await room.getByText('다음 새 업무에 연결됨',{exact:true}).count(),0);
    assert.equal(posts.length,1);assert.equal(posts[0].projectId,'project-b');
    await room.getByRole('combobox',{name:'지침을 연결할 프로젝트'}).selectOption('project-b');
    await room.getByText('다음 새 업무에 연결됨',{exact:true}).waitFor();
    assert.equal(await room.getByRole('button',{name:'추천 지침 연결됨',exact:true}).isDisabled(),true);

    // A failed connection is never automatically retried; refresh reads state before another explicit click.
    await room.getByRole('combobox',{name:'지침을 연결할 프로젝트'}).selectOption('project-c');
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).waitFor();
    failConnection=true;
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).click();
    await room.getByText(/연결 결과를 확인하지 못했어요/).waitFor();
    assert.equal(await room.getByRole('button',{name:'상태 확인 필요',exact:true}).isDisabled(),true);
    await page.waitForTimeout(50);assert.equal(posts.length,2);
    await room.getByRole('button',{name:'상태 다시 확인',exact:true}).click();
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).waitFor();assert.equal(posts.length,2);
    await room.getByRole('button',{name:'추천 스킬 한 번에 연결',exact:true}).click();
    await room.getByText('다음 새 업무에 연결됨',{exact:true}).waitFor();
    assert.equal(posts.length,3);assert.equal(sessions,4);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    console.log('PASS: '+(wrapped?'managed SkillsLibrary wrapper; ':'')+(mobile?'390px':'desktop')+' recommended guides; explicit connection, fresh CSRF, status retry and stale project responses');
    await page.close();
  }
} finally {
  await browser.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
}
