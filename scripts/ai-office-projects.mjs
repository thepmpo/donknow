import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
const root='/workspace/ai-office',base='http://127.0.0.1:8790';
async function session(){const response=await fetch(base+'/api/auth/session');if(!response.ok)throw Error('Office session unavailable: '+response.status);return {cookie:response.headers.get('set-cookie')?.split(';')[0]??'',csrf:(await response.json()).csrf_token};}
async function api(path,method='GET',body){const s=await session();const response=await fetch(base+path,{method,headers:{cookie:s.cookie,'x-csrf-token':s.csrf,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(!response.ok)throw Error('Office API '+response.status+': '+(await response.text()).slice(0,150));return response.json();}
const [command,slug,source,name]=process.argv.slice(2);
if(command==='status'){
 const data=await api('/api/projects?page=1&page_size=100');console.log(JSON.stringify(data,null,2));
}else if(command==='add'){
 if(!/^[a-z][a-z0-9-]{1,40}$/.test(slug??'')||!source||!name)throw Error('Usage: projects.mjs add <slug> <existing local Git repository> <display name>');
 const original=resolve(source),destination=join(root,'projects',slug),copy=join(destination,'source');
 const check=spawnSync('git',['-C',original,'rev-parse','--show-toplevel'],{encoding:'utf8'});if(check.status!==0||check.stdout.trim()!==original)throw Error('Source must be an existing repository root');
 const all=await api('/api/projects?page=1&page_size=100');if((all.projects??[]).some(p=>p.project_path===destination))throw Error('Project already registered');
 await mkdir(destination,{recursive:true});
 const probe=spawnSync('git',['-C',copy,'rev-parse','--show-toplevel'],{encoding:'utf8'});
 if(probe.status!==0){const clone=spawnSync('git',['clone','--no-hardlinks','--',original,copy],{stdio:'ignore'});if(clone.status!==0)throw Error('Isolated repository clone failed');}
 const disabled=spawnSync('git',['-C',copy,'remote','set-url','--push','origin','DISABLED_PENDING_APPROVAL']);if(disabled.status!==0)throw Error('Could not disable push');
 const baseline=spawnSync('git',['-C',copy,'rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
 const policy={name,slug,source:original,isolatedSource:copy,baseline,stage:'product-review',developmentApproval:null,automaticExecution:false,automaticMerge:false,automaticPublish:false};
 await writeFile(join(destination,'project.json'),JSON.stringify(policy,null,2)+'\n');
 await writeFile(join(destination,'HANDOFF.md'),'# '+name+' — 제품 검토 및 개발 인계\n\n현재 단계: 제품 검토 준비. 승인된 인계서 없음.\n\n## 문제/목표\n아직 사용자가 작업을 지정하지 않았습니다.\n\n## 기존 기준\nsource/의 정책·문서를 먼저 읽습니다. source는 격리된 사본입니다.\n\n## 제품팀 결과\n근거, UX/UI 후보, 마케팅 메시지, 유지 조건, 예외, 완료 조건을 작성합니다.\n\n## 사용자 승인\n문서 버전·승인 범위·사용자 승인 원문·날짜를 기록합니다. 승인 전 개발 실행 금지.\n\n## 개발팀\n승인된 범위만 별도 브랜치에서 구현하고 QA 결과를 보고합니다. 병합·배포는 별도 확인합니다.\n');
 const result=await api('/api/projects','POST',{name,project_path:destination,core_goal:'제품팀의 UX·디자인·마케팅·정책 검토 → 사용자 승인 → 승인된 인계서만 개발팀 실행. 코드·정책·승인·기록은 이 프로젝트 안에서 분리. 자동 실행/병합/배포 금지.',assignment_mode:'manual',agent_ids:[],create_path_if_missing:false});
 console.log(JSON.stringify({registered:true,id:result.project.id,name,isolatedSource:copy,modelsConnected:false,developmentApproval:false},null,2));
}else{throw Error('Commands: status | add <slug> <local-repository> <display-name>');}
