import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {inspectLock,installEnvironment,preparePackage,prepareBrowser,prepareValidation,sha256,repository} from '../tools/ai-office/install/prepare-validation.mjs';

function fixture(t){
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'office-validation-setup-test-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const office=path.join(base,'office'),state=path.join(office,'state'),project=path.join(office,'projects/duckduck'),source=path.join(base,'source');
 for(const p of [state,project,source])fs.mkdirSync(p,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(project,'project.json'),JSON.stringify({slug:'duckduck',source:path.join(project,'source'),originalSource:source,isolatedSource:path.join(project,'source')}));
 const node=path.join(base,'toolchain/bin/node'),npm=path.join(base,'toolchain/lib/node_modules/npm/bin/npm-cli.js');
 fs.mkdirSync(path.dirname(node),{recursive:true});fs.mkdirSync(path.dirname(npm),{recursive:true});fs.writeFileSync(node,'fixture');fs.writeFileSync(npm,'fixture');
 const rootPackage=JSON.stringify({name:'root-fixture',version:'1.0.0',scripts:{postinstall:'NEVER_RUN_THIS'}})+'\n';
 const mobilePackage=JSON.stringify({name:'mobile-fixture',version:'1.0.0',devDependencies:{'playwright-core':'1.64.1'}})+'\n';
 const lock=name=>JSON.stringify({name,lockfileVersion:3,packages:{'':{name},'node_modules/example':{version:'1.0.0',resolved:'https://registry.npmjs.org/example/-/example-1.0.0.tgz',integrity:'sha512-Zml4dHVyZQ=='}}})+'\n';
 const files={'package.json':rootPackage,'package-lock.json':lock('root-fixture'),'mobile/package.json':mobilePackage,'mobile/package-lock.json':lock('mobile-fixture')};
 const calls=[];
 const run=async(file,args,options)=>{
  calls.push({file,args,options});
  for(const key of ['OPENAI_API_KEY','GITHUB_TOKEN','GH_TOKEN','AWS_SECRET_ACCESS_KEY','NPM_TOKEN','HTTP_PROXY','HTTPS_PROXY','CODEX_HOME'])assert.equal(options.env[key],undefined);
  assert.equal(options.env.GIT_CONFIG_GLOBAL,'/dev/null');assert.equal(options.env.npm_config_ignore_scripts,'true');
  if(file==='git'){
   if(args.includes('--show-toplevel'))return {stdout:source+'\n'};
   if(args.includes('get-url'))return {stdout:repository+'\n'};
   if(args.includes('rev-parse'))return {stdout:'a'.repeat(40)+'\n'};
   if(args.includes('clone')){fs.mkdirSync(args.at(-1));return {stdout:''};}
   if(args.includes('show'))return {stdout:files[args.at(-1).split(':').slice(1).join(':')]};
   return {stdout:''};
  }
  if(args.includes('ci')){
   assert.ok(args.includes('--ignore-scripts'));assert.ok(args.includes('--no-audit'));
   const modules=path.join(options.cwd,'node_modules');fs.mkdirSync(modules);
   if(JSON.parse(fs.readFileSync(path.join(options.cwd,'package.json'))).devDependencies){
    const core=path.join(modules,'playwright-core');fs.mkdirSync(core);fs.writeFileSync(path.join(core,'package.json'),JSON.stringify({version:'1.64.1'}));
    fs.writeFileSync(path.join(core,'cli.js'),'fixture');fs.writeFileSync(path.join(core,'index.js'),'fixture');
   }
   return {stdout:''};
  }
  if(args.includes('install-deps')){assert.equal(options.interactive,true);return {stdout:''};}
  if(args.includes('install')){const executable=path.join(options.env.PLAYWRIGHT_BROWSERS_PATH,'chromium-fixture/chrome');fs.mkdirSync(path.dirname(executable));fs.writeFileSync(executable,'fixture');return {stdout:''};}
  if(args.includes('-e')&&args.at(-1).includes('executablePath()'))return {stdout:path.join(options.env.PLAYWRIGHT_BROWSERS_PATH,'chromium-fixture/chrome')};
  if(args.includes('-e'))return {stdout:''};
  throw Error('unexpected fixture command');
 };
 return {base,office,state,project,source,node,npm,files,calls,run};
}

test('preparation uses published registered source and private locked caches without executing install scripts',async t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.source,'package.json'),'UNCOMMITTED MODEL CANDIDATE MUST NOT BE READ');
 const result=await prepareValidation({officeRoot:f.office,node:f.node,run:f.run});assert.equal(result.prepared,true);assert.equal(result.modelStarted,false);
 const cache=path.join(f.state,'validation-dependencies');
 for(const prefix of ['','mobile/']){const key=sha256(f.files[prefix+'package-lock.json']),dir=path.join(cache,key),r=JSON.parse(fs.readFileSync(path.join(dir,'dependency-ready.json')));assert.equal(r.installScripts,false);assert.equal(r.packageJsonSha256,sha256(f.files[prefix+'package.json']));assert.equal(r.sourceHead,'a'.repeat(40));assert.equal(fs.readFileSync(path.join(dir,'package.json'),'utf8'),f.files[prefix+'package.json']);}
 const browser=JSON.parse(fs.readFileSync(path.join(cache,'browsers/1.64.1/browser-ready.json')));assert.ok(browser.executablePath.startsWith(path.join(cache,'browsers/1.64.1')+'/'));assert.ok(fs.existsSync(browser.executablePath));
 const clone=f.calls.find(c=>c.file==='git'&&c.args.includes('clone'));assert.ok(clone.args.includes(repository));assert.ok(f.calls.some(c=>c.args.includes('--is-ancestor')));
 assert.equal(f.calls.filter(c=>c.args.includes('ci')).length,2);assert.equal(f.calls.filter(c=>c.args.includes('install-deps')).length,1);
 const probe=f.calls.find(c=>c.file==='bwrap');assert.ok(probe);assert.ok(probe.args.includes('--unshare-all'));assert.ok(probe.args.includes('--die-with-parent'));assert.ok(probe.args.includes('/tmp/office-browser-home'));assert.ok(!probe.args.includes(f.office));assert.ok(!probe.args.includes(f.source));
 assert.equal(fs.readFileSync(path.join(f.source,'package.json'),'utf8'),'UNCOMMITTED MODEL CANDIDATE MUST NOT BE READ');
 assert.equal(fs.readdirSync(cache).filter(p=>p.startsWith('setup-home-')).length,0);
});

test('same lock caches are reused without reinstalling npm packages or browser',async t=>{
 const f=fixture(t);await prepareValidation({officeRoot:f.office,node:f.node,run:f.run});const first=f.calls.length;
 await prepareValidation({officeRoot:f.office,node:f.node,run:f.run});assert.equal(f.calls.slice(first).filter(c=>c.file!=='git').length,0);
});

test('repository mismatch or unpublished HEAD stops before installing dependencies',async t=>{
 for(const mismatch of ['origin','published']){
  const f=fixture(t);const run=async(file,args,options)=>{if(mismatch==='origin'&&args.includes('get-url'))return {stdout:'https://github.com/other/project.git\n'};if(mismatch==='published'&&args.includes('--is-ancestor'))throw Error('not published');return f.run(file,args,options);};
  await assert.rejects(prepareValidation({officeRoot:f.office,node:f.node,run}));assert.equal(f.calls.filter(c=>c.args.includes('ci')).length,0);
 }
});

test('dependency URLs cannot read local files or carry registry credentials',()=>{
 const pkg='{"name":"fixture"}',base={lockfileVersion:3,packages:{'':{},'node_modules/example':{version:'1.0.0',integrity:'sha512-Zml4dHVyZQ=='}}};
 for(const url of ['file:/home/user/.codex/auth.json','https://user:password@registry.npmjs.org/example.tgz','https://evil.example/example.tgz','git+ssh://github.com/private/package']){const lock=structuredClone(base);lock.packages['node_modules/example'].resolved=url;assert.throws(()=>inspectLock(pkg,JSON.stringify(lock)),/dependency_origin_blocked/);}
});

test('failed install never writes a ready receipt and preserves existing data',async t=>{
 const f=fixture(t),sentinel=path.join(f.state,'auth.json');fs.writeFileSync(sentinel,'preserve-auth');
 const run=async(file,args,options)=>{if(args.includes('ci'))throw Error('fixture download failed');return f.run(file,args,options);};
 await assert.rejects(prepareValidation({officeRoot:f.office,node:f.node,run}));
 const cache=path.join(f.state,'validation-dependencies');assert.equal(fs.readdirSync(cache).length,0);assert.equal(fs.readFileSync(sentinel,'utf8'),'preserve-auth');
});

test('existing altered cache is preserved rather than overwritten',async t=>{
 const f=fixture(t);await prepareValidation({officeRoot:f.office,node:f.node,run:f.run});
 const pkg=path.join(f.state,'validation-dependencies',sha256(f.files['package-lock.json']),'package.json');fs.writeFileSync(pkg,'preserve modified cache');
 await assert.rejects(prepareValidation({officeRoot:f.office,node:f.node,run:f.run}),/existing_dependency_cache_preserved/);assert.equal(fs.readFileSync(pkg,'utf8'),'preserve modified cache');
});

test('browser download or launch failure cannot publish a browser-ready marker',async t=>{
 for(const failure of ['install','probe']){
  const f=fixture(t);const run=async(file,args,options)=>{if((failure==='install'&&args.includes('install'))||(failure==='probe'&&args.includes('-e')&&args.at(-1).includes('chromium.launch')))throw Error('fixture browser failed');return f.run(file,args,options);};
  await assert.rejects(prepareValidation({officeRoot:f.office,node:f.node,run}));
  assert.equal(fs.existsSync(path.join(f.state,'validation-dependencies/browsers/1.64.1/browser-ready.json')),false);
 }
});

test('clean installation environment never inherits host credentials or npm configuration',()=>{
 const env=installEnvironment('/private/fixture-home','/private/node/bin/node','/private/browsers');assert.equal(env.HOME,'/private/fixture-home');assert.equal(env.npm_config_userconfig,'/private/fixture-home/empty.npmrc');assert.equal(env.npm_config_globalconfig,'/private/fixture-home/empty-global.npmrc');assert.equal(env.PLAYWRIGHT_BROWSERS_PATH,'/private/browsers');assert.equal(env.GIT_CONFIG_NOSYSTEM,'1');assert.equal(env.npm_config_registry,'https://registry.npmjs.org');
});
