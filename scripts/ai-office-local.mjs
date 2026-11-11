import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,spawn} from 'node:child_process';
import {ensureLocalConfig} from './lib/ai-office-local.mjs';
import {createOfficeClient} from './lib/ai-office-client.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root='/workspace/ai-office';
const metadata=JSON.parse(fs.readFileSync(path.join(repo,'tools/ai-office/runtime-policy.json'),'utf8'));
const cmd=process.argv[2];
if(cmd==='setup'){
 let occupied=false;try{await fetch('http://127.0.0.1:8790/health',{signal:AbortSignal.timeout(1000)});occupied=true;}catch{}
 if(occupied)throw Error('office_existing_server_preserved_stop_it_before_initial_setup');
 const child=spawn(process.execPath,[path.join(repo,'scripts/start-ai-office.mjs')],{cwd:repo,stdio:['ignore','ignore','ignore'],env:process.env});
 try{
  let ready=false;for(let n=0;n<60;n++){if(child.exitCode!==null)throw Error('office_setup_server_failed');try{const r=await fetch('http://127.0.0.1:8790/health',{signal:AbortSignal.timeout(1000)});if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
  if(!ready)throw Error('office_setup_server_timeout');
  execFileSync(process.execPath,[fileURLToPath(import.meta.url),'initialize'],{stdio:'inherit'});
  execFileSync(process.execPath,[path.join(repo,'scripts/ai-office-ready.mjs'),'prepare'],{stdio:'inherit'});
  console.log('Local office and first waiting review prepared; no login or model execution.');
 }finally{child.kill('SIGTERM');}
}else if(cmd==='configure'){
 const result=ensureLocalConfig({metadata});
 const shell='#!/bin/sh\nset -eu\nexport PATH="/workspace/ai-office/toolchain/node/bin:$PATH"\ncd /workspace/donknow\n';
 const wrappers={'start.sh':'exec node scripts/start-ai-office.mjs\n','login.sh':'exec node scripts/ai-office-ready.mjs login\n','doctor.sh':'exec node scripts/ai-office-ready.mjs doctor\n','review.sh':'exec node scripts/ai-office-ready.mjs start --confirm\n','handoff.sh':'exec node scripts/ai-office-handoff.mjs\n'};
 for(const [name,tail] of Object.entries(wrappers)){const file=path.join(root,'bin',name),body=shell+tail;if(fs.existsSync(file)&&fs.readFileSync(file,'utf8')!==body)throw Error('office_existing_launcher_preserved:'+name);if(!fs.existsSync(file))fs.writeFileSync(file,body,{mode:0o700,flag:'wx'});}
 console.log(JSON.stringify({...result,workersEnabled:false,developmentEnabled:false}));
}else if(cmd==='initialize'){
 const marker=path.join(root,'state/local-initialized.json');if(fs.existsSync(marker)){console.log('Existing office initialization preserved.');process.exit(0);}
 const client=await createOfficeClient(),api=client.request,tasks=await api('/api/tasks'),projects=await api('/api/projects?page=1&page_size=100');
 if((tasks.tasks??tasks).length||(projects.projects??projects).length)throw Error('office_existing_work_preserved_initialization_refused');
 await api('/api/settings','PUT',{companyName:'프로젝트 AI 사무실',ceoName:'사용자',language:'ko',autoAssign:false,yoloMode:false,autoUpdateEnabled:false,oauthAutoSwap:false,defaultProvider:'codex'});
 const agents=await api('/api/agents');for(const a of agents.agents??agents)await api('/api/agents/'+a.id,'PATCH',{cli_provider:null,cli_model:null,cli_reasoning_level:null});
 execFileSync(process.execPath,[path.join(repo,'scripts/ai-office-projects.mjs'),'add','duckduck',repo,'duckduck'],{stdio:'inherit'});
 fs.writeFileSync(marker,JSON.stringify({version:1,createdAt:new Date().toISOString(),sourceCommit:execFileSync('git',['-C',repo,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),restoredFromCloud:false},null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log('New local office initialized; no cloud data or authentication was imported.');
}else throw Error('Commands: configure | initialize | setup');
