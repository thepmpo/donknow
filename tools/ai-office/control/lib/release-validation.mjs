import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
export const validationEnvironment=()=>({PATH:'/usr/bin:/bin',LANG:'C.UTF-8',CI:'1',EXPO_OFFLINE:'1',EXPO_NO_TELEMETRY:'1'});
export async function runCommand(file,args,options={}){
 try {const {input,...settings}=options;const running=exec(file,args,{encoding:'utf8',maxBuffer:4*1024*1024,timeout:600000,...settings});if(input!==undefined)running.child.stdin.end(input);const r=await running;return {code:0,stdout:r.stdout,stderr:r.stderr};}
 catch(e){return {code:Number.isInteger(e.code)?e.code:1,stdout:typeof e.stdout==='string'?e.stdout:'',stderr:typeof e.stderr==='string'?e.stderr:'',timedOut:!!e.killed};}
}
const safeFile=name=>name==='.env.example'||typeof name==='string'&&name&&!name.startsWith('/')&&!name.split('/').some(p=>['.','..','.git','.codex'].includes(p))&&!/(^|\/)(\.env(?:\..*)?|auth\.json|[^/]*\.sqlite(?:-wal|-shm)?|[^/]*\.pem|control-access\.key)$/.test(name);
export async function snapshotCandidate(candidate,destination,command=runCommand){
 const git=['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','--literal-pathspecs','-C',candidate.source];
 const listing=await command('git',[...git,'ls-tree','-r','-z',candidate.sourceHead],{env:validationEnvironment()});
 if(listing.code)throw Error('office_release_snapshot_failed');
 const entries=listing.stdout.split('\0').filter(Boolean).map(row=>{const split=row.indexOf('\t'),[mode,type,oid]=row.slice(0,split).split(' '),name=row.slice(split+1);if(split<0||type!=='blob'||!['100644','100755'].includes(mode)||!safeFile(name))throw Error('office_release_snapshot_path_blocked');return {name,mode,oid};});
 const blobs=await command('git',[...git,'cat-file','--batch'],{env:validationEnvironment(),input:entries.map(e=>e.oid+'\n').join(''),encoding:'buffer',maxBuffer:256*1024*1024});
 if(blobs.code||!Buffer.isBuffer(blobs.stdout))throw Error('office_release_snapshot_failed');let cursor=0;const packageChecks=new Map();
 for(const entry of entries){const end=blobs.stdout.indexOf(10,cursor);if(end<0)throw Error('office_release_snapshot_failed');const [oid,type,sizeText]=blobs.stdout.subarray(cursor,end).toString().split(' '),size=Number(sizeText);if(oid!==entry.oid||type!=='blob'||!Number.isSafeInteger(size)||size<0||end+1+size>=blobs.stdout.length)throw Error('office_release_snapshot_failed');const content=blobs.stdout.subarray(end+1,end+1+size),target=path.join(destination,entry.name);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,content,{mode:entry.mode==='100755'?0o700:0o600,flag:'wx'});if(['package.json','mobile/package.json'].includes(entry.name))packageChecks.set(entry.name,JSON.parse(content));cursor=end+size+2;}
 const patch=path.join(os.tmpdir(),'office-patch-'+createHash('sha256').update(destination).digest('hex'));fs.writeFileSync(patch,candidate.patch,{mode:0o600,flag:'wx'});
 try{const result=await command('git',['-c','core.hooksPath=/dev/null','--literal-pathspecs','-C',destination,'apply','--binary','--whitespace=nowarn',patch],{env:validationEnvironment()});if(result.code)throw Error('office_release_snapshot_patch_failed');}finally{fs.unlinkSync(patch);}
 function inspect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const target=path.join(dir,entry.name),relative=path.relative(destination,target);if(entry.isDirectory()){if(!safeFile(relative))throw Error('office_release_snapshot_path_blocked');inspect(target);}else if(!entry.isFile()||!safeFile(relative))throw Error('office_release_snapshot_path_blocked');}}inspect(destination);
 for(const name of ['package.json','mobile/package.json'])if(fs.existsSync(path.join(destination,name))&&!packageChecks.has(name))throw Error('office_release_validation_commands_changed');
 for(const [name,before] of packageChecks){let after;try{after=JSON.parse(fs.readFileSync(path.join(destination,name),'utf8'));}catch{throw Error('office_release_validation_commands_changed');}for(const field of ['scripts','engines','workspaces'])if(JSON.stringify(before[field])!==JSON.stringify(after[field]))throw Error('office_release_validation_commands_changed');}
 return entries.map(e=>e.name);
}
function dependencies(candidate,snapshot,prefix,stateDir){
 const copiedLock=path.join(snapshot,prefix,'package-lock.json');if(!fs.existsSync(copiedLock))throw Error('office_release_dependencies_required');
 const expected=fs.readFileSync(copiedLock),digest=createHash('sha256').update(expected).digest('hex'),cache=path.join(stateDir,'validation-dependencies',digest);
 const bases=[path.join(candidate.source,prefix),...(candidate.originalSource?[path.join(candidate.originalSource,prefix)]:[]),cache];
 for(const base of bases){const dep=path.join(base,'node_modules'),lock=path.join(base,'package-lock.json');if(!fs.existsSync(dep)||!fs.existsSync(lock)||!fs.statSync(dep).isDirectory()||fs.realpathSync(dep)!==dep||!fs.readFileSync(lock).equals(expected))continue;
  if(base===cache){let receipt;try{receipt=JSON.parse(fs.readFileSync(path.join(base,'dependency-ready.json'),'utf8'));}catch{continue;}if(receipt.lockSha256!==digest||receipt.installScripts!==false)continue;}
  const target=path.join(snapshot,prefix,'node_modules');fs.mkdirSync(target,{recursive:true,mode:0o700});return ['--ro-bind',dep,target];
 }
 throw Error('office_release_dependencies_required');
}
function browserSettings(snapshot,stateDir){
 const version=JSON.parse(fs.readFileSync(path.join(snapshot,'mobile/package.json'),'utf8')).devDependencies?.['playwright-core'];
 if(!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version??''))throw Error('office_release_browser_version_required');
 const root=path.join(stateDir,'validation-dependencies/browsers',version);let receipt;
 try{receipt=JSON.parse(fs.readFileSync(path.join(root,'browser-ready.json'),'utf8'));}catch{}
 if(receipt?.version===version&&typeof receipt.executablePath==='string'&&receipt.executablePath.startsWith(root+path.sep)&&fs.existsSync(receipt.executablePath)&&fs.realpathSync(receipt.executablePath)===receipt.executablePath)return {mounts:['--ro-bind',root,root],executable:receipt.executablePath};
 if(fs.existsSync('/usr/bin/chromium'))return {mounts:[],executable:'/usr/bin/chromium'};
 throw Error('office_release_browser_required');
}
export function validationPlan(candidate,snapshot,node=process.execPath,stateDir='/workspace/ai-office/state'){
 const root=path.resolve(node,'../..');
 if(!fs.existsSync(path.join(root,'bin/node'))||fs.realpathSync(node)!==node)throw Error('office_release_node_toolchain_required');
 const npm=path.join(root,'lib/node_modules/npm/bin/npm-cli.js');if(!fs.existsSync(npm))throw Error('office_release_npm_required');
 const mobile=candidate.files.some(f=>(typeof f==='string'?f:f.path)?.startsWith('mobile/'));
 const commands=[{name:'문법 검사',args:[node,npm,'run','check']},{name:'기능 테스트',args:[node,npm,'test']}];
 if(mobile)commands.push({name:'앱 타입 검사',args:[node,npm,'--prefix','mobile','run','typecheck']},
  {name:'웹 화면 빌드',args:[node,npm,'--prefix','mobile','run','export:web']},
  {name:'앱 화면 검사',args:[node,npm,'--prefix','mobile','run','test:e2e']},
  {name:'로그인 화면 검사',args:[node,npm,'--prefix','mobile','run','test:web-auth']},
  {name:'모션 검사',args:[node,npm,'--prefix','mobile','run','test:motion']},
  {name:'iOS JS 번들',args:[node,npm,'--prefix','mobile','run','export:ios']});
 const mounts=[];for(const dir of ['/usr','/bin','/lib','/lib64'])if(fs.existsSync(dir))mounts.push('--ro-bind',dir,dir);
 mounts.push('--ro-bind',root,root,'--bind',snapshot,snapshot,...dependencies(candidate,snapshot,'',stateDir));
 if(mobile)mounts.push(...dependencies(candidate,snapshot,'mobile',stateDir));
 const browser=mobile?browserSettings(snapshot,stateDir):null;if(browser)mounts.push(...browser.mounts);
 return {commands,args:['--unshare-all','--die-with-parent','--new-session','--tmpfs','/tmp',...mounts,'--proc','/proc','--dev','/dev','--dir','/tmp/office-test-home','--setenv','HOME','/tmp/office-test-home','--setenv','PATH',path.dirname(node)+':/usr/bin:/bin','--setenv','CI','1','--setenv','EXPO_OFFLINE','1','--setenv','EXPO_NO_TELEMETRY','1',...(browser?['--setenv','PLAYWRIGHT_CHROMIUM_EXECUTABLE',browser.executable]:[]),'--chdir',snapshot]};
}
export async function validateCandidate(candidate,{command=runCommand,node=process.execPath,stateDir='/workspace/ai-office/state'}={}){
 const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'office-validation-'));fs.chmodSync(snapshot,0o700);
 try{
  await snapshotCandidate(candidate,snapshot,command);const plan=validationPlan(candidate,snapshot,node,stateDir),tests=[];
  for(const check of plan.commands){const result=await command('bwrap',[...plan.args,'--',...check.args],{env:validationEnvironment(),timeout:600000});tests.push({name:check.name,passed:result.code===0,exitCode:result.code,timedOut:!!result.timedOut});if(result.code!==0)break;}
  return {tests,passed:tests.length===plan.commands.length&&tests.every(t=>t.passed),blockers:[]};
 }catch(e){return {tests:[],passed:false,blockers:[/^office_release_[a-z_]+$/.test(e.message)?e.message:'office_release_validation_unavailable']};}
 finally{fs.rmSync(snapshot,{recursive:true,force:true});}
}
