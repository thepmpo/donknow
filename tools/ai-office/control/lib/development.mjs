import fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {hash,fail,safeId} from './controller.mjs';
import {publishKnowledge} from './knowledge.mjs';

const MAX_PATCH=2*1024*1024;
const REPOSITORY='https://github.com/thepmpo/donknow.git';
const gitArgs=['--no-pager','-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false'];
function git(cwd,...args){try{return execFileSync('git',[...gitArgs,...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000,maxBuffer:MAX_PATCH});}catch{fail('office_development_git_check_failed');}}
const within=(candidate,root)=>candidate.startsWith(root+path.sep);
const uuid=value=>{safeId(value);if(!/^[a-f0-9-]{36}$/i.test(value))fail('office_development_request_id_required',400);return value;};
const promptFor=prompt=>`[사용자가 확인한 코드 수정 요청]\n${prompt}\n\n이 업무는 승인된 전용 작업 사본에서만 코드와 테스트를 수정합니다. /run/office-knowledge/INDEX.md와 프로젝트 AGENTS.md, README, 관련 제품·디자인 문서를 먼저 읽고 사용한 버전을 기록하세요. 원본 소스·Git 메타데이터·인증·데이터는 수정하지 않습니다. commit/merge/push/배포/외부 발송/추가 직원 실행을 하지 마세요. 비밀 파일과 .git/.codex를 만들거나 변경하지 마세요. duckduck의 브리핑·날씨 상세 변경과 Duo 구현은 별도 사용자 지시가 있기 전 금지입니다. 기존 데이터·로그인·사용자 작업을 보존하고 요청한 범위만 수정합니다. 가능한 검사를 실행하고 실제 명령·종료 결과를 보고하며 실행하지 못한 검사는 분명히 적으세요. 모델이 말한 통과는 게시 승인 증거가 아닙니다. 완료 후 별도의 격리 검증과 사용자의 변경 확인을 기다립니다.\n\n쉽고 짧은 한국어로 다음 제목을 사용하세요:\n## 한 줄 결론\n## 바뀐 점\n## 확인한 검사\n## 아직 확인하지 못한 것\n## 내가 결정할 것\n## 기술 근거\n경로·해시는 마지막 기술 근거에만 모으고 첫 화면에는 사용자가 이해할 변화를 설명하세요.`;

function captureChanges(worktree,sourceHead){
   const tracked=git(worktree,'diff','--name-only','-z','--no-renames','HEAD','--').split('\0').filter(Boolean),untracked=git(worktree,'ls-files','--others','--exclude-standard','-z').split('\0').filter(Boolean),namesChanged=[...new Set([...tracked,...untracked])].sort();if(!namesChanged.length)fail('office_development_no_changes');if(namesChanged.length>200)fail('office_development_changes_too_large');
   function stateFor(name){if(path.isAbsolute(name)||name.split('/').some(x=>!x||x==='.'||x==='..'||x==='.git'||x==='.codex')||/[\x00-\x1f\x7f]/.test(name)||/(^|\/)(\.env(?:\..*)?|auth\.json|.*\.sqlite(?:-wal|-shm)?|.*\.pem|.*\.key|credentials(?:\..*)?)$/i.test(name))fail('office_development_protected_file');const target=path.join(worktree,name);let current=worktree;for(const part of name.split('/')){current=path.join(current,part);try{if(fs.lstatSync(current).isSymbolicLink())fail('office_development_symlink_change');}catch(e){if(e.code!=='ENOENT')throw e;break;}}if(!fs.existsSync(target))return {path:name,status:'deleted',sha256:null,mode:null};const info=fs.statSync(target);if(!info.isFile()||info.size>MAX_PATCH)fail('office_development_changes_too_large');return {path:name,status:untracked.includes(name)?'added':'modified',sha256:hash(fs.readFileSync(target)),mode:info.mode&0o777};}
   const files=namesChanged.map(stateFor);let patch=git(worktree,'diff','--binary','--no-ext-diff','--no-textconv','--no-renames','HEAD','--');for(const name of untracked){const output=spawnSync('git',[...gitArgs,'diff','--no-index','--binary','--no-ext-diff','--no-textconv','--','/dev/null',name],{cwd:worktree,encoding:'utf8',timeout:10000,maxBuffer:MAX_PATCH});if(output.status!==1||output.error)fail('office_development_patch_failed');patch+=output.stdout;}if(Buffer.byteLength(patch)>MAX_PATCH)fail('office_development_changes_too_large');if(JSON.stringify(files)!==JSON.stringify(namesChanged.map(stateFor)))fail('office_development_changes_moved');
 return {files,patch,diffHash:hash(JSON.stringify({sourceHead,files,patch}))};
}

/** One exact code request per approval, with no persistent global development unlock. */
export function createDevelopment({apiFactory,stateDir,projectsRoot,database,exclusive=fn=>fn(),networkGit}={}){
 const ledger=path.join(stateDir,'control-development');
 function ensure(){if(fs.realpathSync(stateDir)!==path.resolve(stateDir))fail('office_development_state_path_invalid');if(fs.existsSync(ledger)&&fs.lstatSync(ledger).isSymbolicLink())fail('office_development_state_path_invalid');fs.mkdirSync(ledger,{recursive:true,mode:0o700});}
 const file=id=>path.join(ledger,uuid(id)+'.json');
 function save(record){ensure();const target=file(record.id);if(fs.existsSync(target)&&fs.lstatSync(target).isSymbolicLink())fail('office_development_record_changed');const temp=target+'.'+randomUUID();fs.writeFileSync(temp,JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temp,target);}
 function read(id){const target=file(id);if(!fs.existsSync(target))fail('office_development_request_missing',404);if(fs.lstatSync(target).isSymbolicLink())fail('office_development_record_changed');const r=JSON.parse(fs.readFileSync(target,'utf8'));if(r.id!==id||r.version!==1||hash(JSON.stringify(r.spec))!==r.digest)fail('office_development_record_changed');return r;}
 const publicRecord=r=>({id:r.id,taskId:r.taskId,projectId:r.spec.projectId,agentId:r.spec.agentId,title:r.spec.title,prompt:r.spec.prompt,digest:r.digest,sourceHead:r.spec.sourceHead,knowledgeRevision:r.spec.knowledgeRevision,expiresAt:r.expiresAt,createdAt:r.createdAt,updatedAt:r.startedAt??r.createdAt,state:r.state,phase:'development',automaticPublication:false,errorCode:r.errorCode??null});
 const api=async()=>await apiFactory();
 const getTask=async(a,id)=>{const result=await a('/api/tasks/'+safeId(id));return result.task??result;};
 async function snapshot(a,projectId){
  const p=await a('/api/projects/'+safeId(projectId)),project=p.project??p;if(project.id!==projectId||project.assignment_mode!=='manual')fail('office_manual_assignment_required');
  const root=fs.realpathSync(projectsRoot),wrapper=fs.realpathSync(project.project_path),source=fs.realpathSync(path.join(wrapper,'source'));
  if(!within(wrapper,root)||!within(source,wrapper)||git(source,'rev-parse','--show-toplevel').trim()!==source)fail('office_project_outside_root');
  if(git(source,'status','--porcelain','--untracked-files=no').trim())fail('office_source_dirty');
  const handoff=path.join(wrapper,'HANDOFF.md');if(fs.realpathSync(handoff)!==handoff||fs.statSync(handoff).size>65536)fail('office_invalid_handoff');
  const text=fs.readFileSync(handoff,'utf8');if(!text.trim())fail('office_handoff_required');
  const pointer=path.join(wrapper,'knowledge/CURRENT.json');if(fs.realpathSync(pointer)!==pointer)fail('office_knowledge_not_ready');
  const knowledge=JSON.parse(fs.readFileSync(pointer,'utf8'));if(!/^[a-f0-9]{64}$/.test(knowledge.revision??''))fail('office_knowledge_not_ready');
  return {project,source,sourceHead:git(source,'rev-parse','HEAD').trim(),knowledgeRevision:knowledge.revision,handoffHash:hash(text)};
 }
 function provenance(snap,required=false){
  const wrapper=fs.realpathSync(snap.project.project_path),metadataFile=path.join(wrapper,'project.json');
  if(!fs.existsSync(metadataFile)&&!required)return {originalSource:null,repositoryOrigin:null,metadata:null};
  if(fs.realpathSync(metadataFile)!==metadataFile||!fs.statSync(metadataFile).isFile()||fs.statSync(metadataFile).size>32768)fail('office_development_project_metadata_invalid');
  const raw=fs.readFileSync(metadataFile,'utf8'),metadata=JSON.parse(raw),originalSource=fs.realpathSync(metadata.originalSource??metadata.source);
  if(metadata.isolatedSource!==snap.source||![originalSource,snap.source].includes(metadata.source)||path.basename(wrapper)!==metadata.slug||!/^\w[\w-]{1,40}$/.test(metadata.slug)||git(originalSource,'rev-parse','--show-toplevel').trim()!==originalSource)fail('office_development_project_metadata_invalid');
  const origin=git(originalSource,'remote','get-url','origin').trim();if(![REPOSITORY,REPOSITORY.slice(0,-4)].includes(origin))fail('office_development_repository_not_configured');
  return {originalSource,repositoryOrigin:REPOSITORY,metadata,metadataFile,metadataHash:hash(raw)};
 }
 function remoteGit(source,args){
  const result=networkGit?networkGit(source,args):spawnSync('git',[...gitArgs,'-C',source,'-c','credential.helper=',...args],{encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'},timeout:30000,maxBuffer:MAX_PATCH,stdio:['ignore','pipe','pipe']});
  if(result.status!==0||result.error)fail('office_development_source_connection_required');return result.stdout.trim();
 }
 function remoteHead(source){const output=remoteGit(source,['ls-remote','--exit-code',REPOSITORY,'refs/heads/main']),head=output.split(/\s+/)[0];if(!/^[a-f0-9]{40}$/.test(head))fail('office_development_remote_head_invalid');return head;}
 function sourcePreview(snap,origin,head){const scope={projectId:snap.project.id,sourceHead:snap.sourceHead,remoteHead:head,metadataHash:origin.metadataHash};return {...scope,upToDate:head===snap.sourceHead,knowledgeUsesCode:origin.metadata.source===snap.source,digest:hash(JSON.stringify(scope))};}
 async function idle(a){const policy=await a('/api/office-policy/status');if(!policy.enabled||policy.workersEnabled||policy.developmentEnabled)fail('office_policy_must_be_locked');if(policy.developmentTaskUnlockAvailable!==true)fail('office_development_runtime_update_required');const tasks=await a('/api/tasks'),agents=await a('/api/agents');if((tasks.tasks??tasks).some(t=>t.status==='in_progress')||(agents.agents??agents).some(a=>a.status==='working'))fail('office_wait_for_running_task');return agents.agents??agents;}
 function checkRecord(r,t,snap){if(t.project_id!==r.spec.projectId||t.assigned_agent_id!==r.spec.agentId||hash(t.description??'')!==r.spec.descriptionHash||t.title!==r.spec.title||snap.sourceHead!==r.spec.sourceHead||snap.knowledgeRevision!==r.spec.knowledgeRevision||snap.handoffHash!==r.spec.handoffHash)fail('office_development_scope_changed_prepare_again');}
 function permission(taskId){const db=new DatabaseSync(fs.realpathSync(database),{readOnly:true});try{return db.prepare('SELECT * FROM office_task_permissions WHERE task_id=?').get(taskId);}finally{db.close();}}
 function verifyCompleted(r,t,snap){checkRecord(r,t,snap);const p=permission(r.taskId);if(t.status!=='review'||!t.result?.trim()||p?.phase!=='development'||p.state!=='consumed'||hash(p.payload)!==p.digest||p.digest!==r.permissionDigest)fail('office_development_result_not_confirmed');const approved=JSON.parse(p.payload);if(approved.phase!=='development'||approved.head!==r.spec.sourceHead||approved.source!==snap.source||approved.knowledge!==r.spec.knowledgeRevision)fail('office_development_result_context_changed');for(const [key,value]of Object.entries(approved.task??{}))if((t[key]??null)!==value)fail('office_development_result_context_changed');return p;}
 function publishedWorktreeReceipt(source,worktree){
  const directory=path.join(stateDir,'release-requests');if(!fs.existsSync(directory)||fs.realpathSync(directory)!==directory)return null;
  for(const name of fs.readdirSync(directory).filter(n=>/^[a-f0-9-]{36}\.json$/i.test(n))){
   try{
    const receiptPath=path.join(directory,name),info=fs.lstatSync(receiptPath);if(!info.isFile()||info.isSymbolicLink()||(info.mode&0o077)!==0||info.uid!==process.getuid())continue;
    const receipt=JSON.parse(fs.readFileSync(receiptPath,'utf8'));
    if(receipt.id+'.json'!==name||receipt.state!=='pushed'||receipt.source!==source||receipt.worktree!==worktree||!/^([a-f0-9]{40})$/.test(receipt.commit??'')||!/^([a-f0-9]{40})$/.test(receipt.sourceHead??''))continue;
    const request=read(receipt.requestId),prefix=safeId(request.taskId).slice(0,8),worktreeName=path.basename(worktree);
    if(receipt.taskId!==request.taskId||receipt.projectId!==request.spec.projectId||receipt.contextHash!==request.digest||receipt.sourceHead!==request.spec.sourceHead||path.dirname(worktree)!==path.join(source,'.climpire-worktrees')||![prefix,prefix+'-1',prefix+'-2',prefix+'-3'].includes(worktreeName)||fs.realpathSync(worktree)!==worktree||git(worktree,'rev-parse','HEAD').trim()!==receipt.sourceHead||fs.realpathSync(git(worktree,'rev-parse','--absolute-git-dir').trim())!==path.join(source,'.git','worktrees',worktreeName))continue;
    const observed=captureChanges(worktree,receipt.sourceHead);
    if(observed.diffHash===receipt.diffHash&&observed.patch===receipt.diff&&JSON.stringify(observed.files)===JSON.stringify(receipt.files))return {worktree,receiptId:receipt.id,commit:receipt.commit,diffHash:receipt.diffHash};
   }catch{}
  }
  return null;
 }
 async function inspect(id){const r=read(id),a=await api(),t=await getTask(a,r.taskId);let candidateAvailable=false;try{verifyCompleted(r,t,await snapshot(a,r.spec.projectId));candidateAvailable=true;}catch{}return {...publicRecord(r),taskStatus:t.status,result:t.result??null,candidateAvailable};}
 return {
  sourceStatus:async projectId=>{const a=await api(),snap=await snapshot(a,projectId),origin=provenance(snap,true);return sourcePreview(snap,origin,remoteHead(snap.source));},
  syncSource:input=>exclusive(async()=>{
   if(input.confirmation!==true)fail('office_development_source_confirmation_required',400);const a=await api();await idle(a);const snap=await snapshot(a,input.projectId),origin=provenance(snap,true),preview=sourcePreview(snap,origin,remoteHead(snap.source));
   if(input.expectedHead!==preview.sourceHead||input.expectedRemoteHead!==preview.remoteHead||input.digest!==preview.digest)fail('office_development_source_changed_preview_again');
   if(fs.existsSync(ledger))for(const name of fs.readdirSync(ledger).filter(n=>/^[a-f0-9-]{36}\.json$/i.test(n))){const existing=read(name.slice(0,-5));if(existing.spec.projectId===input.projectId&&['prepared','launching'].includes(existing.state)&&existing.expiresAt>Date.now())fail('office_development_pending_request_preserved');}
   const worktrees=git(snap.source,'worktree','list','--porcelain').split('\n').filter(line=>line.startsWith('worktree ')).map(line=>line.slice(9)),published=[];for(const worktree of worktrees)if(worktree!==snap.source&&git(worktree,'status','--porcelain').trim()){const receipt=publishedWorktreeReceipt(snap.source,worktree);if(!receipt)fail('office_development_unreviewed_worktree_preserved');published.push(receipt);}
   const filters=spawnSync('git',[...gitArgs,'-C',snap.source,'config','--get-regexp','^filter\\.'],{encoding:'utf8'});if(filters.status!==1)fail('office_development_source_filters_require_review');
   remoteGit(snap.source,['fetch','--no-tags','--no-recurse-submodules',REPOSITORY,'main']);if(git(snap.source,'rev-parse','FETCH_HEAD').trim()!==preview.remoteHead)fail('office_development_source_changed_preview_again');
   // A kept worktree is exempt only when its exact approved bytes are already
   // published in this fetched main history. Never delete or commit the worktree.
   for(const previous of published){const current=publishedWorktreeReceipt(snap.source,previous.worktree),ancestor=spawnSync('git',[...gitArgs,'-C',snap.source,'merge-base','--is-ancestor',previous.commit,preview.remoteHead],{encoding:'utf8',timeout:10000});if(!current||current.receiptId!==previous.receiptId||current.commit!==previous.commit||current.diffHash!==previous.diffHash||ancestor.status!==0)fail('office_development_unreviewed_worktree_preserved');}
   // Fast-forward preserves local work; it never resets, rebases, or changes remotes.
   git(snap.source,'merge','--ff-only','--no-edit','--no-stat','FETCH_HEAD');if(git(snap.source,'rev-parse','HEAD').trim()!==preview.remoteHead)fail('office_development_source_sync_not_confirmed');
   const backups=path.join(stateDir,'project-source-backups');if(fs.existsSync(backups)&&fs.lstatSync(backups).isSymbolicLink())fail('office_development_project_metadata_invalid');fs.mkdirSync(backups,{recursive:true,mode:0o700});
   if(hash(fs.readFileSync(origin.metadataFile,'utf8'))!==origin.metadataHash)fail('office_development_project_metadata_changed');
   fs.writeFileSync(path.join(backups,randomUUID()+'.json'),fs.readFileSync(origin.metadataFile),{flag:'wx',mode:0o600});
   const metadata={...origin.metadata,originalSource:origin.originalSource,source:snap.source};const temporary=origin.metadataFile+'.'+randomUUID();fs.writeFileSync(temporary,JSON.stringify(metadata,null,2)+'\n',{flag:'wx',mode:0o600});fs.renameSync(temporary,origin.metadataFile);
   try{const knowledge=publishKnowledge({officeRoot:path.dirname(fs.realpathSync(projectsRoot)),project:metadata.slug,source:snap.source});return {synced:true,sourceHead:preview.remoteHead,knowledgeRevision:knowledge.revision,knowledgeReady:true,originalRepositoryChanged:false};}
   catch{return {synced:true,sourceHead:preview.remoteHead,knowledgeReady:false,errorCode:'office_development_knowledge_refresh_required',originalRepositoryChanged:false};}
  }),
  prepare:input=>exclusive(async()=>{
   const id=uuid(input.id??randomUUID()),prompt=typeof input.prompt==='string'?input.prompt.trim():'';if(!prompt||prompt.length>12000)fail('office_prompt_required_max_12000',400);safeId(input.projectId);if(input.agentId)safeId(input.agentId);
   const inputHash=hash(JSON.stringify({projectId:input.projectId,prompt,agentId:input.agentId??null}));if(fs.existsSync(file(id))){const old=read(id);if(old.inputHash!==inputHash)fail('office_request_id_already_used');return publicRecord(old);}
   const a=await api(),agents=await idle(a),snap=await snapshot(a,input.projectId),assigned=new Set(snap.project.assigned_agent_ids??[]),origin=provenance(snap);if(origin.metadata){if(origin.metadata.source!==snap.source||remoteHead(snap.source)!==snap.sourceHead)fail('office_development_source_update_required');try{const knowledge=publishKnowledge({officeRoot:path.dirname(fs.realpathSync(projectsRoot)),project:origin.metadata.slug,source:snap.source});snap.knowledgeRevision=knowledge.revision;}catch{fail('office_development_knowledge_refresh_required');}}
   const available=agents.filter(agent=>agent.cli_provider==='codex'&&(!agent.workflow_pack_key||agent.workflow_pack_key==='development')&&assigned.has(agent.id));
   const agent=input.agentId?available.find(a=>a.id===input.agentId):available.find(a=>a.department_id==='dev'&&a.role==='team_leader')??available.find(a=>a.department_id==='dev');if(!agent)fail('office_development_agent_not_configured');
   const title=prompt.split('\n')[0].slice(0,70),description=promptFor(prompt),payload={title,description,project_id:snap.project.id,project_path:snap.project.project_path,department_id:agent.department_id,assigned_agent_id:agent.id,status:'inbox',priority:0,task_type:'general',workflow_pack_key:'development',workflow_meta_json:{office_development_request_id:id},output_format:'markdown'};
   const all=await a('/api/tasks'),existing=(all.tasks??all).filter(t=>{try{return JSON.parse(t.workflow_meta_json??'{}').office_development_request_id===id;}catch{return false;}});if(existing.length>1)fail('office_development_existing_task_requires_review');if(existing[0]&&(existing[0].description!==description||existing[0].assigned_agent_id!==agent.id||existing[0].project_id!==input.projectId||existing[0].status!=='inbox'))fail('office_request_id_already_used');
   const created=existing[0]??await a('/api/tasks','POST',payload),task=created.task??created;safeId(task.id);
   const grant=await a('/api/office-policy/tasks/'+task.id+'/prepare','POST',{phase:'development'},{owner:true});if(!/^[a-f0-9]{64}$/.test(grant.digest??'')||grant.phase!=='development'||grant.state!=='pending')fail('office_development_permission_not_prepared');
   const spec={projectId:input.projectId,agentId:agent.id,title,prompt,sourceHead:snap.sourceHead,knowledgeRevision:snap.knowledgeRevision,handoffHash:snap.handoffHash,descriptionHash:hash(description),permissionDigest:grant.digest};
   const record={version:1,id,taskId:task.id,inputHash,spec,digest:hash(JSON.stringify(spec)),permissionDigest:grant.digest,expiresAt:grant.expiresAt,createdAt:Date.now(),state:'prepared'};save(record);return publicRecord(record);
  }),
  start:(id,input)=>exclusive(async()=>{
   const r=read(id);if(input.confirmation!==true||input.digest!==r.digest)fail('office_development_confirmation_required',400);if(r.state==='started')return {started:true,alreadyStarted:true,taskId:r.taskId};if(r.state!=='prepared')fail('office_development_inspection_required');if(r.expiresAt<=Date.now())fail('office_development_approval_expired');
   const a=await api();await idle(a);const t=await getTask(a,r.taskId),snap=await snapshot(a,r.spec.projectId);checkRecord(r,t,snap);if(t.status!=='inbox')fail('office_development_task_not_waiting');
   const provider=await a('/api/office-policy/runtime/check','POST',{}, {owner:true});if(!provider.authReady||!provider.runnerConfigured||!provider.sandboxAvailable)fail('office_provider_not_ready');
   r.state='launching';save(r);
   try{await a('/api/office-policy/tasks/'+r.taskId+'/approve','POST',{expectedDigest:r.permissionDigest,confirmation:true},{owner:true});await a('/api/office-policy/tasks/'+r.taskId+'/development-unlock','POST',{expectedDigest:r.permissionDigest,confirmation:true},{owner:true});const result=await a('/api/tasks/'+r.taskId+'/run','POST',{});if(!result.ok)fail('office_task_start_not_confirmed');r.state='started';r.startedAt=Date.now();save(r);return {started:true,taskId:r.taskId,phase:'development',automaticPublication:false};}
   catch(error){r.state='inspection_required';r.errorCode=/^office_[a-z0-9_]+$/.test(error.code??'')?error.code:'office_development_start_not_confirmed';save(r);throw error;}
   finally{await a('/api/office-policy/runtime/lock','POST',{}, {owner:true});}
  }),
  list:async()=>{if(!fs.existsSync(ledger))return {requests:[]};const requests=[];for(const name of fs.readdirSync(ledger).filter(n=>/^[a-f0-9-]{36}\.json$/i.test(n)))requests.push(await inspect(name.slice(0,-5)));return {requests};},
  inspect,
  candidate:async id=>{
   const r=read(id),a=await api(),t=await getTask(a,r.taskId),snap=await snapshot(a,r.spec.projectId);verifyCompleted(r,t,snap);const agents=await a('/api/agents');if((agents.agents??agents).some(a=>a.current_task_id===r.taskId&&a.status==='working'))fail('office_wait_for_running_task');
   const prefix=safeId(r.taskId).slice(0,8),parent=path.join(snap.source,'.climpire-worktrees'),names=[prefix,prefix+'-1',prefix+'-2',prefix+'-3'];const worktrees=names.map(n=>path.join(parent,n)).filter(p=>fs.existsSync(p));if(worktrees.length!==1)fail('office_development_worktree_requires_review');const worktree=worktrees[0];if(fs.realpathSync(worktree)!==worktree||git(worktree,'rev-parse','HEAD').trim()!==r.spec.sourceHead||fs.realpathSync(git(worktree,'rev-parse','--absolute-git-dir').trim())!==path.join(snap.source,'.git','worktrees',path.basename(worktree)))fail('office_development_worktree_changed');
   const {files,patch,diffHash}=captureChanges(worktree,r.spec.sourceHead);
   const origin=provenance(snap);return {requestId:r.id,taskId:r.taskId,projectId:r.spec.projectId,source:snap.source,sourceHead:r.spec.sourceHead,originalSource:origin.originalSource,dependencySource:origin.originalSource,repositoryOrigin:origin.repositoryOrigin,worktree,diffHash,files,patch,contextHash:r.digest};
  },
 };
}
