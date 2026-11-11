import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validateCandidate,runCommand} from './release-validation.mjs';

const REPO='thepmpo/donknow',REMOTE='https://github.com/'+REPO+'.git',WORKFLOW='office-render-deploy.yml';
const hash=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const id=x=>{if(typeof x!=='string'||!/^[a-f0-9-]{36}$/i.test(x))throw Error('office_release_id_required');return x;};
const code=e=>/^office_release_[a-z_]+$/.test(e.message)?e.message:'office_release_inspection_required';
const gitBase=['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false','--literal-pathspecs'];
const authArgs=['-c','credential.helper=','-c','credential.helper=!gh auth git-credential'];

export function createReleases({development,stateDir,now=Date.now,command=runCommand,validator=validateCandidate}={}){
 if(!development||typeof development.candidate!=='function')throw Error('office_release_development_required');
 const dir=path.join(stateDir,'release-requests');if(fs.existsSync(dir)&&fs.realpathSync(dir)!==dir)throw Error('office_release_state_path_invalid');
 fs.mkdirSync(dir,{recursive:true,mode:0o700});let queue=Promise.resolve();
 const serial=fn=>{const next=queue.then(fn,fn);queue=next.catch(()=>{});return next;};
 const file=key=>path.join(dir,id(key)+'.json');
 const write=row=>{const target=file(row.id);if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())throw Error('office_release_state_path_invalid');const temporary=target+'.'+randomUUID();fs.writeFileSync(temporary,JSON.stringify(row),{mode:0o600,flag:'wx'});fs.renameSync(temporary,target);};
 const read=key=>{const target=file(key);if(fs.realpathSync(target)!==target)throw Error('office_release_state_path_invalid');return JSON.parse(fs.readFileSync(target,'utf8'));};
 const publicRow=row=>{const {source,worktree,originalSource,...visible}=row;return visible;};
 const git=async(source,args,options={})=>command('git',[...gitBase,'-C',source,...args],options);
 async function requiredGit(source,args,options){const result=await git(source,args,options);if(result.code)throw Error('office_release_git_check_failed');return result.stdout.trim();}
 async function githubReady(){return (await command('gh',['auth','status','--hostname','github.com'],{timeout:10000})).code===0;}
 async function checkCandidate(row){const candidate=await development.candidate(row.requestId);if(candidate.sourceHead!==row.sourceHead||candidate.diffHash!==row.diffHash||candidate.contextHash!==row.contextHash||candidate.source!==row.source||candidate.worktree!==row.worktree||candidate.originalSource!==row.originalSource||candidate.repositoryOrigin!==row.repositoryOrigin)throw Error('office_release_candidate_changed_validate_again');return candidate;}
 const deployDigest=row=>hash({id:row.id,commit:row.commit,repository:REPO,workflow:WORKFLOW});
 async function remoteHead(source){return (await requiredGit(source,[...authArgs,'ls-remote','--exit-code',REMOTE,'refs/heads/main'])).split(/\s/)[0];}
 function authorized(row,input){if(input?.confirmation!==true||input?.digest!==row.digest)throw Error('office_release_confirmation_required');if(row.expiresAt<=now())throw Error('office_release_confirmation_expired');}
 async function refreshDeployment(row){
  if(!row.deployment||row.deployment.liveConfirmed)return row;
  const result=await command('gh',['run','list','--workflow',WORKFLOW,'--repo',REPO,'--limit','30','--json','databaseId,headSha,status,conclusion,url,displayTitle,event'],{timeout:15000});
  if(result.code)return row;let runs;try{runs=JSON.parse(result.stdout).filter(r=>r.displayTitle==='AI office release '+row.id&&r.headSha===row.commit&&r.event==='workflow_dispatch');}catch{return row;}
  if(runs.length!==1)return row;const run=runs[0];
  row.deployment={...row.deployment,requested:true,runId:run.databaseId,url:run.url,status:run.status==='completed'?(run.conclusion==='success'?'live':'checks_or_deployment_failed'):'running',conclusion:run.conclusion||null,liveConfirmed:run.status==='completed'&&run.conclusion==='success'};write(row);return row;
 }
 return {
  status:async()=>{const ready=await githubReady();return {githubReady:ready,githubLoginRequired:!ready,workflow:WORKFLOW,repository:REPO,developmentPublication:true,renderConnection:'repository_secret_required',secretsUrl:'https://github.com/'+REPO+'/settings/secrets/actions',deploymentLiveConfirmed:false};},
  inspect:async key=>publicRow(await refreshDeployment(read(key))),
  list:({requestId}={})=>({releases:fs.readdirSync(dir).filter(n=>/^[a-f0-9-]{36}\.json$/i.test(n)).map(n=>read(n.slice(0,-5))).filter(r=>!requestId||r.requestId===requestId).sort((a,b)=>b.createdAt-a.createdAt).map(publicRow)}),
  validate:requestId=>serial(async()=>{
   const candidate=await development.candidate(requestId);const row={id:randomUUID(),requestId,taskId:candidate.taskId,projectId:candidate.projectId,source:candidate.source,worktree:candidate.worktree,originalSource:candidate.originalSource,repositoryOrigin:candidate.repositoryOrigin,sourceHead:candidate.sourceHead,diffHash:candidate.diffHash,contextHash:candidate.contextHash,files:candidate.files,diff:candidate.patch,diffTruncated:false,state:'validating',tests:[],blockers:[],createdAt:now(),expiresAt:now()+600000};
   if(typeof row.diff!=='string'||Buffer.byteLength(row.diff)>2*1024*1024)throw Error('office_release_full_diff_required');write(row);
   try{
    if(row.files.some(file=>{const p=typeof file==='string'?file:file.path;return p.startsWith('.github/')||p.startsWith('tools/ai-office/')||['render.yaml','Dockerfile','.npmrc','mobile/eas.json','scripts/check.mjs'].includes(p);}))throw Error('office_release_infrastructure_review_required');
    const origin=await requiredGit(row.source,['remote','get-url','origin']);
    if(![REMOTE,REMOTE.slice(0,-4)].includes(origin)){if(!candidate.originalSource||origin!==candidate.originalSource||candidate.repositoryOrigin!==REMOTE||![REMOTE,REMOTE.slice(0,-4)].includes(await requiredGit(candidate.originalSource,['remote','get-url','origin'])))throw Error('office_release_repository_not_configured');}
    const result=await validator(candidate,{command,stateDir});row.tests=result.tests;row.blockers=result.blockers??[];
    await checkCandidate(row);row.state=result.passed?'validated':row.blockers.length?'blocked':'validation_failed';
    row.humanSummary=result.passed?'수정 내용과 자동 검사를 확인했습니다. 아래 변경을 확인한 뒤 GitHub에 반영할 수 있어요.':'검사가 완료되지 않아 GitHub 반영을 멈췄어요. 실패하거나 준비가 필요한 항목을 먼저 확인해 주세요.';
   }catch(e){row.state='blocked';row.blockers=[code(e)];row.humanSummary='수정 내용이나 실행 환경을 다시 확인해야 해요. 원본과 로그인은 유지했어요.';}
   row.expiresAt=now()+600000;row.digest=hash({...row,digest:undefined});write(row);return publicRow(row);
  }),
  publish:(key,input)=>serial(async()=>{
   const row=read(key);if(row.state==='pushed')return {...publicRow(row),alreadyPublished:true};authorized(row,input);if(row.state!=='validated'||!row.tests.length||!row.tests.every(t=>t.passed))throw Error('office_release_successful_validation_required');
   const candidate=await checkCandidate(row);if(!(await githubReady()))throw Error('office_release_github_login_required');
   if(await requiredGit(row.source,['status','--porcelain','--untracked-files=no']))throw Error('office_release_source_changes_preserved');
   if(await requiredGit(row.source,['rev-parse','HEAD'])!==row.sourceHead||await remoteHead(row.source)!==row.sourceHead)throw Error('office_release_remote_changed_validate_again');
   row.state='publishing';write(row);
   const index=path.join(dir,row.id+'.index'),patch=path.join(dir,row.id+'.patch');
   try{
    // Plumbing never executes project hooks, add filters, or arbitrary model commands.
    fs.writeFileSync(patch,candidate.patch,{flag:'wx',mode:0o600});
    const env={...process.env,GIT_INDEX_FILE:index,GIT_AUTHOR_NAME:'AI Office',GIT_AUTHOR_EMAIL:'ai-office@localhost',GIT_COMMITTER_NAME:'AI Office',GIT_COMMITTER_EMAIL:'ai-office@localhost'};
    await requiredGit(row.source,['read-tree',row.sourceHead],{env});
    await requiredGit(row.source,['apply','--cached','--binary','--whitespace=nowarn',patch],{env});
    const tree=await requiredGit(row.source,['write-tree'],{env});
    await checkCandidate(row);if(await remoteHead(row.source)!==row.sourceHead)throw Error('office_release_remote_changed_validate_again');
    row.commit=await requiredGit(row.source,['commit-tree',tree,'-p',row.sourceHead,'-m','office: approved development '+row.taskId],{env});
    if(!/^[a-f0-9]{40}$/.test(row.commit))throw Error('office_release_commit_not_confirmed');write(row);
    const pushed=await git(row.source,[...authArgs,'push',REMOTE,row.commit+':refs/heads/main'],{timeout:120000});
    if(pushed.code!==0)throw Error('office_release_push_result_requires_inspection');
    if(await remoteHead(row.source)!==row.commit)throw Error('office_release_push_result_requires_inspection');
    row.state='pushed';row.githubUrl='https://github.com/'+REPO+'/commit/'+row.commit;row.deployDigest=deployDigest(row);row.publishedAt=now();row.localSourceUpdateRequired=true;
    // Keep all local source/worktrees stable for other running readers. The
    // separate owner-confirmed source-sync route updates only while idle.
    row.humanSummary='검사한 변경을 GitHub main에 반영했어요. 공개 사이트 배포는 아래에서 확인하고 실행하세요. 다음 코드 수정 전에는 최신 소스 가져오기를 눌러주세요.';write(row);return publicRow(row);
   }catch(e){row.state='inspection_required';row.blockers=[code(e)];row.humanSummary='반영 결과를 확인해야 해요. 같은 변경을 자동으로 다시 보내지 않았습니다.';write(row);return publicRow(row);}
   finally{for(const temporary of [index,patch])try{fs.unlinkSync(temporary);}catch{}}
  }),
  deploy:(key,input)=>serial(async()=>{
   const row=read(key);if(input?.confirmation!==true||input?.digest!==row.deployDigest||row.deployDigest!==deployDigest(row))throw Error('office_release_deploy_confirmation_required');
   if(row.state!=='pushed')throw Error('office_release_publish_first');if(row.deployment) return {...row.deployment,alreadyRequested:true};
   if(!(await githubReady()))throw Error('office_release_github_login_required');if(await remoteHead(row.source)!==row.commit)throw Error('office_release_remote_changed_review_deployment');
   const secret=await command('gh',['secret','list','--repo',REPO,'--json','name'],{timeout:15000});
   let configured=false;try{configured=secret.code===0&&JSON.parse(secret.stdout).some(x=>x.name==='RENDER_API_KEY');}catch{}
   if(!configured)throw Error('office_release_render_connection_required');
   row.deployment={requested:false,commit:row.commit,status:'requesting',url:'https://github.com/'+REPO+'/actions/workflows/'+WORKFLOW,liveConfirmed:false};write(row);
   const result=await command('gh',['workflow','run',WORKFLOW,'--repo',REPO,'--ref','main','-f','commit_sha='+row.commit,'-f','request_id='+row.id],{timeout:30000});
   row.deployment.status=result.code===0?'requested':'inspection_required';row.deployment.requested=result.code===0;row.deployment.requestedAt=now();write(row);return row.deployment;
  }),
 };
}
