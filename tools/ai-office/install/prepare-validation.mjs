// Prepare immutable, lock-keyed validation tools from the registered published source.
// No model execution, project-file changes, login copying or package install scripts.
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

export const repository='https://github.com/thepmpo/donknow.git';
export const sha256=value=>createHash('sha256').update(value).digest('hex');
const fail=code=>{throw Error('office_validation_'+code);};
function exact(value){const p=path.resolve(value);if(fs.realpathSync(p)!==p)fail('existing_path_preserved');return p;}
function privateDirectory(p){if(!fs.existsSync(p))fs.mkdirSync(p,{mode:0o700});const s=fs.lstatSync(p);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||(s.mode&0o077))fail('private_directory_required');return p;}
function writePrivate(file,value){fs.writeFileSync(file,value,{mode:0o600,flag:'wx'});}
export function installEnvironment(home,node,browsers){
 return {PATH:path.dirname(node)+':/usr/bin:/bin',HOME:home,LANG:'C.UTF-8',CI:'1',GIT_TERMINAL_PROMPT:'0',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',
  npm_config_userconfig:path.join(home,'empty.npmrc'),npm_config_globalconfig:path.join(home,'empty-global.npmrc'),npm_config_cache:path.join(home,'npm-cache'),
  npm_config_registry:'https://registry.npmjs.org',npm_config_ignore_scripts:'true',npm_config_audit:'false',npm_config_fund:'false',EXPO_NO_TELEMETRY:'1',
  ...(browsers?{PLAYWRIGHT_BROWSERS_PATH:browsers}:{}),};
}
export function runCommand(file,args,options={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{cwd:options.cwd,env:options.env,stdio:options.interactive?'inherit':['inherit','pipe','pipe']});let stdout='',bytes=0;
  const timer=setTimeout(()=>{child.kill('SIGTERM');reject(Error('office_validation_download_timeout'));},options.timeout??1200000);
  child.stdout?.on('data',b=>{bytes+=b.length;if(bytes<8*1024*1024)stdout+=b;});
  // Tool errors can include registry/account configuration; report a fixed error instead.
  child.stderr?.on('data',()=>{});
  child.on('error',()=>{clearTimeout(timer);reject(Error('office_validation_tool_unavailable'));});
  child.on('exit',code=>{clearTimeout(timer);if(code!==0)reject(Error('office_validation_command_failed'));else resolve({stdout});});
 });
}
export function inspectLock(packageText,lockText){
 const pkg=JSON.parse(packageText),lock=JSON.parse(lockText);
 if(![2,3].includes(lock.lockfileVersion)||!lock.packages||typeof lock.packages!=='object')fail('package_lock_required');
 for(const [name,row] of Object.entries(lock.packages)){
  if(name&&(!name.startsWith('node_modules/')||name.split('/').includes('..')))fail('package_path_blocked');
  if(row.link)fail('linked_dependency_blocked');
  if(row.resolved){let url;try{url=new URL(row.resolved);}catch{fail('dependency_origin_blocked');}
   if(url.protocol!=='https:'||url.hostname!=='registry.npmjs.org'||url.username||url.password||url.port||url.search||url.hash)fail('dependency_origin_blocked');
   if(typeof row.integrity!=='string'||!/^sha(?:256|384|512)-[A-Za-z0-9+/=]+$/.test(row.integrity))fail('dependency_integrity_required');
  }
 }
 return {pkg,lock,lockSha256:sha256(lockText),packageJsonSha256:sha256(packageText)};
}
function receiptAt(cache,info){
 if(!fs.existsSync(cache))return null;
 exact(cache);const receipt=path.join(cache,'dependency-ready.json');
 if(!fs.existsSync(receipt)||['dependency-ready.json','package.json','package-lock.json'].some(name=>fs.lstatSync(path.join(cache,name)).isSymbolicLink()))fail('existing_dependency_cache_preserved');
 const saved=JSON.parse(fs.readFileSync(receipt,'utf8'));
 if(saved.lockSha256!==info.lockSha256||saved.packageJsonSha256!==info.packageJsonSha256||saved.installScripts!==false||
    !fs.readFileSync(path.join(cache,'package-lock.json')).equals(Buffer.from(info.lockText))||
    !fs.readFileSync(path.join(cache,'package.json')).equals(Buffer.from(info.packageText))||
    exact(path.join(cache,'node_modules'))!==path.join(cache,'node_modules')||!fs.statSync(path.join(cache,'node_modules')).isDirectory())fail('existing_dependency_cache_preserved');
 return saved;
}
export async function preparePackage({base,packageText,lockText,sourceHead,env,node,npm,run=runCommand}){
 const info={...inspectLock(packageText,lockText),packageText,lockText};const cache=path.join(base,info.lockSha256);
 if(receiptAt(cache,info))return {cache,reused:true,...info};
 const staging=fs.mkdtempSync(path.join(base,'install-'));fs.chmodSync(staging,0o700);
 try{
  writePrivate(path.join(staging,'package.json'),packageText);writePrivate(path.join(staging,'package-lock.json'),lockText);
  try{await run(node,[npm,'ci','--ignore-scripts','--no-audit','--no-fund'],{cwd:staging,env});}catch{fail('dependency_download_failed_retry_setup');}
  if(exact(path.join(staging,'node_modules'))!==path.join(staging,'node_modules')||!fs.statSync(path.join(staging,'node_modules')).isDirectory())fail('dependency_install_failed');
  writePrivate(path.join(staging,'dependency-ready.json'),JSON.stringify({version:1,lockSha256:info.lockSha256,packageJsonSha256:info.packageJsonSha256,installScripts:false,sourceHead})+'\n');
  if(fs.existsSync(cache)){receiptAt(cache,info);}else fs.renameSync(staging,cache);
  return {cache,reused:false,...info};
 }finally{if(fs.existsSync(staging))fs.rmSync(staging,{recursive:true,force:true});}
}
function browserReceipt(folder,version){
 const file=path.join(folder,'browser-ready.json');if(!fs.existsSync(folder))return null;
 exact(folder);if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink())fail('existing_browser_cache_preserved');
 const result=JSON.parse(fs.readFileSync(file,'utf8'));
 if(result.version!==version||typeof result.executablePath!=='string'||!result.executablePath.startsWith(folder+path.sep)||
    exact(result.executablePath)!==result.executablePath||!fs.statSync(result.executablePath).isFile())fail('existing_browser_cache_preserved');
 return result;
}
export async function prepareBrowser({base,mobile,home,node,run=runCommand}){
 const version=mobile.pkg.devDependencies?.['playwright-core'];if(!/^\d+\.\d+\.\d+$/.test(version??''))fail('pinned_playwright_required');
 const core=exact(path.join(mobile.cache,'node_modules/playwright-core'));
 if(JSON.parse(fs.readFileSync(path.join(core,'package.json'),'utf8')).version!==version)fail('playwright_version_mismatch');
 const browsers=privateDirectory(path.join(base,'browsers')),destination=path.join(browsers,version),existing=browserReceipt(destination,version);
 if(existing)return {...existing,reused:true};
 const staging=fs.mkdtempSync(path.join(browsers,'download-'));fs.chmodSync(staging,0o700);
 const env=installEnvironment(home,node,staging),cli=exact(path.join(core,'cli.js'));
 try{
  // The pinned official Playwright CLI installs Ubuntu packages; it may ask for sudo in this terminal.
  try{await run(node,[cli,'install-deps','chromium'],{env,interactive:true});}catch{fail('browser_system_dependencies_required');}
  try{await run(node,[cli,'install','chromium'],{env});}catch{fail('browser_download_failed_retry_setup');}
  const modulePath=JSON.stringify(path.join(core,'index.js'));
  const query=await run(node,['-e',`process.stdout.write(require(${modulePath}).chromium.executablePath())`],{env});
  const executable=String(query.stdout).trim();
  if(!executable.startsWith(staging+path.sep)||exact(executable)!==executable)fail('browser_path_blocked');
  const probe=`(async()=>{const b=await require(${modulePath}).chromium.launch({executablePath:${JSON.stringify(executable)},headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});const p=await b.newPage();await p.goto('about:blank');await b.close();})().catch(()=>process.exit(1));`;
  const mounts=[];for(const dir of ['/usr','/bin','/lib','/lib64','/etc/fonts','/etc/ssl'])if(fs.existsSync(dir))mounts.push('--ro-bind',dir,dir);
  const toolchain=path.resolve(node,'../..');
  try{await run('bwrap',['--unshare-all','--die-with-parent','--new-session',...mounts,
   '--ro-bind',toolchain,toolchain,'--ro-bind',mobile.cache,mobile.cache,'--ro-bind',staging,staging,
   '--proc','/proc','--dev','/dev','--tmpfs','/tmp','--dir','/tmp/office-browser-home','--setenv','HOME','/tmp/office-browser-home',
   '--',node,'-e',probe],{env,timeout:60000});}catch{fail('browser_probe_failed_keep_sandbox_protection');}
  const result={version,executablePath:path.join(destination,path.relative(staging,executable))};
  writePrivate(path.join(staging,'browser-ready.json'),JSON.stringify(result)+'\n');
  if(fs.existsSync(destination)){browserReceipt(destination,version);}else fs.renameSync(staging,destination);
  return {...result,reused:false};
 }finally{if(fs.existsSync(staging))fs.rmSync(staging,{recursive:true,force:true});}
}
export async function prepareValidation({officeRoot='/workspace/ai-office',slug='duckduck',node=process.execPath,run=runCommand,progress=()=>{}}={}){
 if(slug!=='duckduck')fail('project_not_configured');
 officeRoot=exact(officeRoot);node=exact(node);const state=privateDirectory(exact(path.join(officeRoot,'state')));
 const metadataFile=exact(path.join(officeRoot,'projects',slug,'project.json')),metadata=JSON.parse(fs.readFileSync(metadataFile,'utf8'));
 if(metadata.slug!==slug)fail('project_registration_changed');
 const source=exact(metadata.originalSource??metadata.source),base=privateDirectory(path.join(state,'validation-dependencies'));
 const home=fs.mkdtempSync(path.join(base,'setup-home-'));fs.chmodSync(home,0o700);
 writePrivate(path.join(home,'empty.npmrc'),'');writePrivate(path.join(home,'empty-global.npmrc'),'');
 const env=installEnvironment(home,node),npm=exact(path.resolve(node,'../../lib/node_modules/npm/bin/npm-cli.js'));
 const git=async(args)=>String((await run('git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args],{env})).stdout).trim();
 const published=path.join(home,'published.git');
 try{
  if(await git(['-C',source,'rev-parse','--show-toplevel'])!==source)fail('registered_repository_required');
  const origin=await git(['-C',source,'remote','get-url','origin']);
  if(!['https://github.com/thepmpo/donknow','https://github.com/thepmpo/donknow.git','git@github.com:thepmpo/donknow.git'].includes(origin))fail('repository_origin_changed');
  const sourceHead=await git(['-C',source,'rev-parse','HEAD']);if(!/^[a-f0-9]{40}$/.test(sourceHead))fail('published_source_required');
  progress('공개된 프로젝트 버전과 검사 도구를 확인하고 있어요.');
  try{await git(['clone','--bare','--filter=blob:none','--single-branch','--branch','main','--',repository,published]);}catch{fail('published_repository_unreachable');}
  try{await git(['-C',published,'merge-base','--is-ancestor',sourceHead,'refs/heads/main']);}catch{fail('registered_head_not_published');}
  const files={};for(const name of ['package.json','package-lock.json','mobile/package.json','mobile/package-lock.json']){
   const result=await run('git',['-c','core.hooksPath=/dev/null','-C',published,'show',sourceHead+':'+name],{env});files[name]=result.stdout;
  }
  progress('앱 검사에 필요한 파일을 준비하고 있어요. 처음에는 시간이 걸릴 수 있어요.');
  const root=await preparePackage({base,packageText:files['package.json'],lockText:files['package-lock.json'],sourceHead,env,node,npm,run});
  const mobile=await preparePackage({base,packageText:files['mobile/package.json'],lockText:files['mobile/package-lock.json'],sourceHead,env,node,npm,run});
  progress('화면 검사에 사용할 브라우저를 준비하고 있어요. 권한 확인이 나오면 이 터미널에서 진행해주세요.');
  const browser=await prepareBrowser({base,mobile,home,node,run});
  return {prepared:true,sourceHead,rootLockSha256:root.lockSha256,mobileLockSha256:mobile.lockSha256,browserVersion:browser.version,modelStarted:false,authenticationChanged:false};
 }finally{fs.rmSync(home,{recursive:true,force:true});}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 prepareValidation({progress:message=>console.log(message)}).then(result=>console.log(JSON.stringify(result))).catch(error=>{
  console.error(/^office_validation_[a-z_]+$/.test(error.message)?error.message:'office_validation_setup_failed_existing_state_preserved');process.exitCode=1;
 });
}
