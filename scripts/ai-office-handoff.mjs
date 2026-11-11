// Collect concrete work and verification. Never transfer authentication or auto-import database/approvals.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync,execFileSync} from 'node:child_process';
import {allowedWorkFile,assertNoCredentials,fileHash,handoffText,collectOfficeSprites} from './lib/ai-office-handoff.mjs';
import {createOfficeClient,parseOfficeConfig} from './lib/ai-office-client.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),officeRoot=process.env.AI_OFFICE_ROOT??'/workspace/ai-office';
let known=[];try{known=Object.entries(parseOfficeConfig(fs.readFileSync('/workspace/ai-office-runtime/.env','utf8'))).filter(([k])=>/KEY|SECRET|TOKEN/.test(k)).map(([,v])=>v);}catch{}
function archiveDirectory(directory){
 const target=directory+'.zip';
 execFileSync('python3',['-c','import os,sys,zipfile; root=sys.argv[1]; archive=sys.argv[2]; z=zipfile.ZipFile(archive,"w",zipfile.ZIP_DEFLATED); [(z.write(os.path.join(folder,name),os.path.relpath(os.path.join(folder,name),root))) for folder,dirs,files in os.walk(root) for name in files]; z.close()',directory,target],{stdio:'pipe'});
 fs.chmodSync(target,0o600);return target;
}
if(process.argv[2]==='finalize'){
 const directory=fs.realpathSync(process.argv[3]??''),base=fs.realpathSync(path.join(officeRoot,'handoffs'));
 if(!directory.startsWith(base+path.sep))throw Error('handoff_directory_outside_private_root');
 const handoff=fs.readFileSync(path.join(directory,'HANDOFF.md'),'utf8');assertNoCredentials(handoff,known);
 if(/^[-] (이번 작업의 목표\/요청|완료한 실제 변경과 파일\/커밋|확정한 결정과 승인 범위|미완료\/막힌 이유\/다음 작업 순서|사용자 확인이 필요한 부분):\s*$/m.test(handoff))throw Error('handoff_summary_still_incomplete');
 const old=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
 const files=walk(directory).filter(file=>path.basename(file)!=='manifest.json').map(file=>{if(fs.lstatSync(file).isSymbolicLink())throw Error('handoff_symlink_refused');if(/(?:^|[\\/])(?:\.env(?:\.|$)|auth\.json$)|\.(pem|key|sqlite|db)$/.test(path.relative(directory,file)))throw Error('handoff_sensitive_file_refused');return {path:path.relative(directory,file),sha256:fileHash(file),bytes:fs.statSync(file).size};});
 fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify({...old,finalizedAt:new Date().toISOString(),files},null,2)+'\n',{mode:0o600});
 console.log(JSON.stringify({finalized:true,archive:archiveDirectory(directory),humanSummaryRequired:false}));process.exit(0);
}
const output=path.join(officeRoot,'handoffs',new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(output,{recursive:true,mode:0o700});
const git=(...args)=>execFileSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:32*1024*1024});
const save=(name,data)=>{assertNoCredentials(data,known);const file=path.join(output,name);fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});fs.writeFileSync(file,data,{mode:0o600,flag:'wx'});};
const head=git('rev-parse','HEAD').trim(),branch=git('branch','--show-current').trim(),dirty=!!git('status','--porcelain').trim();
const excluded=[],untracked=git('ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean);
for(const file of untracked){if(!allowedWorkFile(file)){excluded.push(file);continue;}const p=path.join(repo,file);if(fs.lstatSync(p).isSymbolicLink()||fs.statSync(p).size>8*1024*1024){excluded.push(file);continue;}save('untracked/'+file,fs.readFileSync(p));}
// Never include tracked credential files even if someone added one accidentally.
for(const file of git('ls-files','-z').split('\0').filter(Boolean))if(!file.endsWith('.env.example')&&/(?:^|\/)\.env(?:\.|$)|(?:^|\/)auth\.json$|\.(pem|key)$/.test(file))throw Error('handoff_tracked_sensitive_file_requires_manual_review');
const patch=execFileSync('git',['-C',repo,'diff','--binary','HEAD'],{maxBuffer:32*1024*1024});save('worktree.patch',patch);
execFileSync('git',['-C',repo,'bundle','create',path.join(output,'source.bundle'),'--all'],{stdio:'pipe'});
execFileSync('git',['-C',repo,'bundle','verify',path.join(output,'source.bundle')],{stdio:'pipe'});
execFileSync('git',['-C',repo,'archive','--format=tar','--output='+path.join(output,'source.tar'),'HEAD'],{stdio:'pipe'});
const commands=[['npm',['run','check']],['npm',['test']],['python3',['-m','unittest','discover','-s','test','-p','*_test.py']]];
if(process.argv.includes('--full'))commands.push(['npm',['--prefix','mobile','run','typecheck']],['npm',['--prefix','mobile','run','test:project']]);
const checks=[];for(const [command,args] of commands){const at=new Date().toISOString(),r=spawnSync(command,args,{cwd:repo,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024}),record={command:[command,...args].join(' '),at,exitCode:r.status,error:r.error?.code??null};checks.push(record);save('verification/'+checks.length+'.log',(r.stdout??'')+'\n'+(r.stderr??''));}
let officeExported=false;try{const api=(await createOfficeClient()).request;const [t,p,a]=await Promise.all(['/api/tasks','/api/projects?page=1&page_size=100','/api/agents'].map(v=>api(v)));const select=(rows,keys)=>rows.map(row=>Object.fromEntries(keys.map(k=>[k,row[k]??null])));save('office-records.json',JSON.stringify({exportedAt:new Date().toISOString(),tasks:select(t.tasks??t,['id','title','description','status','result','project_id','assigned_agent_id']),projects:select(p.projects??p,['id','name','core_goal']),agents:select(a.agents??a,['id','name','name_ko','department_id','role','sprite_number','avatar_emoji'])},null,2)+'\n');officeExported=true;}catch{}
const {customSprites,spriteCollection}=collectOfficeSprites(process.env.AI_OFFICE_RUNTIME_PATH??'/workspace/ai-office-runtime',save);
save('office-assets.json',JSON.stringify({customSprites,spriteCollection,restore:'Compare PNGs and staff sprite_number; register at a non-conflicting number in the next installation. Never overwrite existing characters automatically.'},null,2)+'\n');
save('verification.json',JSON.stringify({sourceHead:head,checks,notVerified:['Windows actual device','macOS actual device','provider real-account model response','public deployment']},null,2)+'\n');save('excluded.json',JSON.stringify(excluded,null,2)+'\n');save('HANDOFF.md',handoffText({head,branch,dirty,checks,officeExported,excluded}));
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const files=walk(output).map(file=>({path:path.relative(output,file),sha256:fileHash(file),bytes:fs.statSync(file).size}));save('manifest.json',JSON.stringify({version:1,createdAt:new Date().toISOString(),sourceHead:head,files},null,2)+'\n');
console.log(JSON.stringify({created:true,directory:output,archive:archiveDirectory(output),checksPassed:checks.every(c=>c.exitCode===0),officeExported,humanSummaryRequired:true,credentialsExported:false,customSprites,spriteCollection},null,2));
