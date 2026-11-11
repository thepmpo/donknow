import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {createDevelopment} from '../tools/ai-office/control/lib/development.mjs';
import {hash} from '../tools/ai-office/control/lib/controller.mjs';

const git=(cwd,...args)=>execFileSync('git',['-c','user.name=Office fixture','-c','user.email=fixture@localhost',...args],{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const fields=['id','title','description','task_type','assigned_agent_id','project_id','project_path','department_id','workflow_pack_key','base_branch'];

async function fixture(fn){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'office-development-'));
 const stateDir=path.join(root,'state'),projectsRoot=path.join(root,'projects'),wrapper=path.join(projectsRoot,'duckduck'),source=path.join(wrapper,'source');
 fs.mkdirSync(stateDir,{recursive:true});fs.mkdirSync(source,{recursive:true});fs.mkdirSync(path.join(wrapper,'knowledge'));
 fs.writeFileSync(path.join(wrapper,'HANDOFF.md'),'Approved fixture scope: improve greeting only.');
 const pointer=path.join(wrapper,'knowledge/CURRENT.json');fs.writeFileSync(pointer,JSON.stringify({revision:'a'.repeat(64)}));
 git(source,'init');fs.writeFileSync(path.join(source,'.gitignore'),'.climpire-worktrees/\n');fs.writeFileSync(path.join(source,'app.js'),'export const greeting = "hello";\n');fs.mkdirSync(path.join(source,'nested'));fs.writeFileSync(path.join(source,'nested/old.js'),'export const old = true;\n');git(source,'add','.');git(source,'commit','-m','Fixture baseline');
 const database=path.join(stateDir,'office.sqlite'),db=new DatabaseSync(database);db.exec('CREATE TABLE office_task_permissions(task_id TEXT PRIMARY KEY,phase TEXT,digest TEXT,payload TEXT,state TEXT,expires_at INTEGER)');
 const project={id:'project-one',name:'duckduck',project_path:wrapper,assignment_mode:'manual',assigned_agent_ids:['dev-lead']};
 const agents=[{id:'dev-lead',name:'개발 팀장',department_id:'dev',role:'team_leader',cli_provider:'codex',status:'idle',current_task_id:null}];
 const tasks=[],calls=[];let runtimeReady=true,providerReady=true,failRun=false,scopeGrants=0,locks=0;
 const getTask=id=>tasks.find(t=>t.id===id);
 const api=async(url,method='GET',body,options)=>{
  calls.push({url,method,body,options});
  if(url==='/api/projects/project-one')return {project:structuredClone(project)};
  if(url==='/api/agents')return {agents:structuredClone(agents)};
  if(url==='/api/office-policy/status')return {enabled:true,workersEnabled:false,developmentEnabled:false,developmentTaskUnlockAvailable:runtimeReady};
  if(url==='/api/office-policy/runtime/check')return {authReady:providerReady,runnerConfigured:true,sandboxAvailable:true};
  if(url==='/api/office-policy/runtime/lock'){locks++;scopeGrants=0;return {workersEnabled:false,developmentEnabled:false};}
  if(url==='/api/tasks'&&method==='GET')return {tasks:structuredClone(tasks)};
  if(url==='/api/tasks'&&method==='POST'){const t={...body,id:randomUUID(),workflow_meta_json:JSON.stringify(body.workflow_meta_json),base_branch:null};tasks.push(t);return {task:structuredClone(t)};}
  const taskGet=/^\/api\/tasks\/([^/]+)$/.exec(url);if(taskGet)return {task:structuredClone(getTask(taskGet[1]))};
  const policy=/^\/api\/office-policy\/tasks\/([^/]+)\/(prepare|approve|development-unlock)$/.exec(url);
  if(policy){assert.equal(options?.owner,true);const t=getTask(policy[1]);assert.ok(t);const action=policy[2];
   if(action==='prepare'){
    assert.equal(body.phase,'development');const approved={phase:'development',task:Object.fromEntries(fields.map(k=>[k,t[k]??null])),source,head:git(source,'rev-parse','HEAD'),knowledge:JSON.parse(fs.readFileSync(pointer,'utf8')).revision};
    const payload=JSON.stringify(approved),digest=hash(payload),expiresAt=Date.now()+600000;db.prepare("INSERT OR REPLACE INTO office_task_permissions VALUES (?,?,?,?,'pending',?)").run(t.id,'development',digest,payload,expiresAt);return {taskId:t.id,phase:'development',state:'pending',digest,expiresAt};
   }
   const permission=db.prepare('SELECT * FROM office_task_permissions WHERE task_id=?').get(t.id);assert.equal(body.expectedDigest,permission.digest);assert.equal(body.confirmation,true);
   if(action==='approve'){assert.equal(permission.state,'pending');db.prepare("UPDATE office_task_permissions SET state='approved' WHERE task_id=?").run(t.id);return {};}
   assert.equal(permission.state,'approved');scopeGrants++;return {taskId:t.id,phase:'development',workersEnabled:false,developmentEnabled:false,scoped:true};
  }
  const run=/^\/api\/tasks\/([^/]+)\/run$/.exec(url);if(run){assert.equal(scopeGrants,1);const t=getTask(run[1]);t.status='in_progress';db.prepare("UPDATE office_task_permissions SET state='running' WHERE task_id=?").run(t.id);if(failRun)throw Error('simulated lost start response');return {ok:true,pid:123};}
  throw Error('Unexpected fixture API '+url);
 };
 const deps={apiFactory:async()=>api,stateDir,projectsRoot,database},controller=createDevelopment(deps);
 const f={root,stateDir,projectsRoot,wrapper,source,database,db,project,agents,tasks,calls,controller,makeController:networkGit=>createDevelopment({...deps,networkGit}),locks:()=>locks,scopeGrants:()=>scopeGrants,setRuntime:v=>runtimeReady=v,setProvider:v=>providerReady=v,setFailRun:v=>failRun=v,
  input:()=>({id:randomUUID(),projectId:project.id,prompt:'인사 문구를 읽기 쉽게 바꿔줘'}),
  recordPath:id=>path.join(stateDir,'control-development',id+'.json'),
  changeKnowledge:()=>fs.writeFileSync(pointer,JSON.stringify({revision:'b'.repeat(64)})),
  async completed(){const prepared=await controller.prepare(this.input());await controller.start(prepared.id,{digest:prepared.digest,confirmation:true});const task=getTask(prepared.taskId);task.status='review';task.result='## 한 줄 결론\n인사 문구를 바꿨어요.';db.prepare("UPDATE office_task_permissions SET state='consumed' WHERE task_id=?").run(task.id);const worktree=path.join(source,'.climpire-worktrees',task.id.slice(0,8));git(source,'worktree','add','--detach',worktree);return {prepared,task,worktree};},
 };
 try{await fn(f);}finally{db.close();fs.rmSync(root,{recursive:true,force:true});}
}

test('development preparation is idempotent and creates no model call or global unlock',()=>fixture(async f=>{
 const input=f.input(),r=await f.controller.prepare(input);assert.equal(r.phase,'development');assert.equal(r.automaticPublication,false);assert.equal(r.agentId,'dev-lead');assert.equal((await f.controller.prepare(input)).digest,r.digest);assert.equal(f.tasks.length,1);assert.equal(f.calls.some(c=>/\/run$|unlock$|approve$/.test(c.url)),false);assert.match(f.tasks[0].description,/전용 작업 사본/);assert.match(f.tasks[0].description,/브리핑·날씨/);assert.equal(fs.statSync(f.recordPath(r.id)).mode&0o777,0o600);await assert.rejects(f.controller.prepare({...input,prompt:'다른 요청'}),/id_already_used/);
}));

test('old runtime, missing dev assignment, busy office and provider failure stop before execution',()=>fixture(async f=>{
 f.setRuntime(false);await assert.rejects(f.controller.prepare(f.input()),/runtime_update_required/);f.setRuntime(true);f.project.assigned_agent_ids=[];await assert.rejects(f.controller.prepare(f.input()),/agent_not_configured/);f.project.assigned_agent_ids=['dev-lead'];f.agents[0].status='working';await assert.rejects(f.controller.prepare(f.input()),/wait_for_running_task/);f.agents[0].status='idle';const r=await f.controller.prepare(f.input());f.setProvider(false);await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:true}),/provider_not_ready/);assert.equal(f.calls.some(c=>/unlock$|approve$|\/run$/.test(c.url)),false);
}));

test('exact owner confirmation starts one scoped task and always relocks',()=>fixture(async f=>{
 const r=await f.controller.prepare(f.input());await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:false}),/confirmation_required/);await assert.rejects(f.controller.start(r.id,{digest:'wrong',confirmation:true}),/confirmation_required/);const started=await f.controller.start(r.id,{digest:r.digest,confirmation:true});assert.equal(started.phase,'development');assert.equal(f.locks(),1);assert.equal(f.scopeGrants(),0);await f.controller.start(r.id,{digest:r.digest,confirmation:true});assert.equal(f.calls.filter(c=>/\/run$/.test(c.url)).length,1);assert.equal(f.calls.filter(c=>/product-unlock/.test(c.url)).length,0);assert.equal(f.calls.find(c=>/development-unlock$/.test(c.url)).options.owner,true);
}));

test('handoff, knowledge, source and task changes invalidate prepared scope before grants',async()=>{
 for(const mutate of [f=>fs.appendFileSync(path.join(f.wrapper,'HANDOFF.md'),' changed'),f=>f.changeKnowledge(),f=>{fs.appendFileSync(path.join(f.source,'app.js'),'// changed\n');git(f.source,'add','.');git(f.source,'commit','-m','Changed baseline');},f=>{f.tasks[0].title='Changed task';}])await fixture(async f=>{const r=await f.controller.prepare(f.input());mutate(f);await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:true}),/scope_changed/);assert.equal(f.calls.some(c=>/unlock$|approve$|\/run$/.test(c.url)),false);});
});

test('expired preparation never approves or executes',()=>fixture(async f=>{
 const r=await f.controller.prepare(f.input()),file=f.recordPath(r.id),record=JSON.parse(fs.readFileSync(file,'utf8'));record.expiresAt=Date.now()-1;fs.writeFileSync(file,JSON.stringify(record));await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:true}),/approval_expired/);assert.equal(f.calls.some(c=>/unlock$|approve$|\/run$/.test(c.url)),false);
}));

test('lost run response is locked and requires inspection instead of blind retry',()=>fixture(async f=>{
 const r=await f.controller.prepare(f.input());f.setFailRun(true);await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:true}),/lost start response/);assert.equal(f.locks(),1);assert.equal(f.scopeGrants(),0);await assert.rejects(f.controller.start(r.id,{digest:r.digest,confirmation:true}),/inspection_required/);assert.equal(f.calls.filter(c=>/\/run$/.test(c.url)).length,1);assert.equal((await f.controller.inspect(r.id)).candidateAvailable,false);
}));

test('completed candidate includes tracked and new files with stable applicable patch',()=>fixture(async f=>{
 const {prepared,worktree}=await f.completed();fs.writeFileSync(path.join(worktree,'app.js'),'export const greeting = "안녕하세요";\n');fs.writeFileSync(path.join(worktree,'new-test.js'),'export const test = true;\n');const c=await f.controller.candidate(prepared.id);assert.deepEqual(c.files.map(x=>[x.path,x.status]),[['app.js','modified'],['new-test.js','added']]);assert.equal(c.sourceHead,git(f.source,'rev-parse','HEAD'));assert.equal(c.contextHash,prepared.digest);assert.equal((await f.controller.inspect(prepared.id)).candidateAvailable,true);assert.equal((await f.controller.candidate(prepared.id)).diffHash,c.diffHash);execFileSync('git',['apply','--check','-'],{cwd:f.source,input:c.patch,stdio:['pipe','pipe','pipe']});assert.match(fs.readFileSync(path.join(f.source,'app.js'),'utf8'),/hello/);fs.appendFileSync(path.join(worktree,'new-test.js'),'// changed\n');assert.notEqual((await f.controller.candidate(prepared.id)).diffHash,c.diffHash);
}));

test('unconfirmed permission and changed completed assignment cannot produce a candidate',()=>fixture(async f=>{
 const {prepared,task,worktree}=await f.completed();fs.appendFileSync(path.join(worktree,'app.js'),'// change\n');f.db.prepare("UPDATE office_task_permissions SET state='failed' WHERE task_id=?").run(task.id);await assert.rejects(f.controller.candidate(prepared.id),/result_not_confirmed/);assert.equal((await f.controller.inspect(prepared.id)).candidateAvailable,false);f.db.prepare("UPDATE office_task_permissions SET state='consumed' WHERE task_id=?").run(task.id);task.assigned_agent_id='another-person';await assert.rejects(f.controller.candidate(prepared.id),/scope_changed/);
}));

test('wrong task worktree and changed worktree HEAD are rejected',async()=>{
 await fixture(async f=>{const {prepared,worktree}=await f.completed();git(f.source,'worktree','move',worktree,path.join(f.source,'.climpire-worktrees','wrong-task'));await assert.rejects(f.controller.candidate(prepared.id),/worktree_requires_review/);});
 await fixture(async f=>{const {prepared,worktree}=await f.completed();fs.appendFileSync(path.join(worktree,'app.js'),'// different commit\n');git(worktree,'add','.');git(worktree,'commit','-m','Unexpected worker commit');await assert.rejects(f.controller.candidate(prepared.id),/worktree_changed/);});
});

test('secret, symlink and oversized output never enter a publish candidate',async()=>{
 for(const kind of ['secret','symlink','large'])await fixture(async f=>{const {prepared,worktree}=await f.completed();if(kind==='secret')fs.writeFileSync(path.join(worktree,'.env'),'TOKEN=fixture-only');if(kind==='symlink')fs.symlinkSync(path.join(f.source,'app.js'),path.join(worktree,'linked.js'));if(kind==='large')fs.writeFileSync(path.join(worktree,'large.js'),'x'.repeat(2*1024*1024+1));await assert.rejects(f.controller.candidate(prepared.id),kind==='secret'?/protected_file/:kind==='symlink'?/symlink_change/:/changes_too_large/);});
});

test('empty candidate and changed source after completion cannot pass validation',async()=>{
 await fixture(async f=>{const {prepared}=await f.completed();await assert.rejects(f.controller.candidate(prepared.id),/no_changes/);});
 await fixture(async f=>{const {prepared,worktree}=await f.completed();fs.appendFileSync(path.join(worktree,'app.js'),'// worktree change\n');fs.appendFileSync(path.join(f.source,'app.js'),'// source modified\n');await assert.rejects(f.controller.candidate(prepared.id),/source_dirty/);});
});

test('deleting a tracked directory produces a deletion patch without reading missing parents',()=>fixture(async f=>{
 const {prepared,worktree}=await f.completed();fs.rmSync(path.join(worktree,'nested'),{recursive:true});const c=await f.controller.candidate(prepared.id);assert.deepEqual(c.files.map(x=>[x.path,x.status]),[['nested/old.js','deleted']]);execFileSync('git',['apply','--check','-'],{cwd:f.source,input:c.patch,stdio:['pipe','pipe','pipe']});
}));

function registered(f){
 const repository='https://github.com/thepmpo/donknow.git',original=path.join(f.root,'original'),remote=path.join(f.root,'remote-fixture');
 git(f.source,'branch','-M','main');git(f.root,'clone','--no-hardlinks',f.source,original);git(original,'remote','set-url','origin',repository);git(f.root,'clone','--no-hardlinks',original,remote);git(f.source,'remote','add','origin',original);
 const metadataFile=path.join(f.wrapper,'project.json'),metadata={slug:'duckduck',source:original,isolatedSource:f.source,custom:'preserve'};fs.writeFileSync(metadataFile,JSON.stringify(metadata));
 fs.writeFileSync(path.join(original,'user-work.txt'),'Existing user work must stay.');fs.writeFileSync(path.join(f.stateDir,'auth-sentinel'),'fixture credentials remain private');
 let advertised=null,fetchHook=null;const networkCalls=[];
 const networkGit=(source,args)=>{
  networkCalls.push({source,args:[...args]});assert.equal(source,f.source);
  if(args[0]==='ls-remote'){assert.deepEqual(args,['ls-remote','--exit-code',repository,'refs/heads/main']);return {status:0,stdout:(advertised??git(remote,'rev-parse','main'))+'\trefs/heads/main\n'};}
  assert.deepEqual(args,['fetch','--no-tags','--no-recurse-submodules',repository,'main']);fetchHook?.();git(f.source,'fetch','--no-tags','--no-recurse-submodules',remote,'main');return {status:0,stdout:''};
 };
 const controller=f.makeController(networkGit);
 const input=preview=>({projectId:f.project.id,expectedHead:preview.sourceHead,expectedRemoteHead:preview.remoteHead,digest:preview.digest,confirmation:true});
 function advance(text='New remote product notes.'){fs.mkdirSync(path.join(remote,'docs'),{recursive:true});fs.writeFileSync(path.join(remote,'docs/product.md'),text);git(remote,'add','.');git(remote,'commit','-m','New product notes');return git(remote,'rev-parse','HEAD');}
 return {controller,repository,original,remote,metadataFile,networkCalls,input,advance,setAdvertised:value=>advertised=value,onFetch:fn=>fetchHook=fn};
}

test('source preview is read-only and reports a fixed GitHub main without copying user work',()=>fixture(async f=>{
 const r=registered(f),oldHead=git(f.source,'rev-parse','HEAD'),beforeMetadata=fs.readFileSync(r.metadataFile),beforeKnowledge=fs.readFileSync(path.join(f.wrapper,'knowledge/CURRENT.json'));r.advance();const p=await r.controller.sourceStatus(f.project.id);assert.equal(p.sourceHead,oldHead);assert.equal(p.remoteHead,git(r.remote,'rev-parse','HEAD'));assert.equal(p.upToDate,false);assert.equal(p.knowledgeUsesCode,false);assert.equal(git(f.source,'rev-parse','HEAD'),oldHead);assert.deepEqual(fs.readFileSync(r.metadataFile),beforeMetadata);assert.deepEqual(fs.readFileSync(path.join(f.wrapper,'knowledge/CURRENT.json')),beforeKnowledge);assert.equal(fs.existsSync(path.join(f.stateDir,'project-source-backups')),false);assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);assert.equal(fs.existsSync(path.join(f.source,'user-work.txt')),false);
}));

test('source sync requires exact confirmation and preserves auth, remotes and original checkout',()=>fixture(async f=>{
 const r=registered(f),originalHead=git(r.original,'rev-parse','HEAD'),sourceRemote=git(f.source,'remote','get-url','origin'),originalRemote=git(r.original,'remote','get-url','origin'),auth=fs.readFileSync(path.join(f.stateDir,'auth-sentinel')),originalMetadata=fs.readFileSync(r.metadataFile);r.advance();const p=await r.controller.sourceStatus(f.project.id);
 await assert.rejects(r.controller.syncSource({...r.input(p),confirmation:false}),/confirmation_required/);await assert.rejects(r.controller.syncSource({...r.input(p),digest:'wrong'}),/changed_preview_again/);assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);
 const synced=await r.controller.syncSource(r.input(p));assert.equal(synced.synced,true);assert.equal(synced.knowledgeReady,true);assert.equal(synced.originalRepositoryChanged,false);assert.equal(git(f.source,'rev-parse','HEAD'),p.remoteHead);assert.equal(git(r.original,'rev-parse','HEAD'),originalHead);assert.equal(git(f.source,'remote','get-url','origin'),sourceRemote);assert.equal(git(r.original,'remote','get-url','origin'),originalRemote);assert.deepEqual(fs.readFileSync(path.join(f.stateDir,'auth-sentinel')),auth);assert.equal(fs.readFileSync(path.join(r.original,'user-work.txt'),'utf8'),'Existing user work must stay.');
 const metadata=JSON.parse(fs.readFileSync(r.metadataFile,'utf8'));assert.equal(metadata.originalSource,r.original);assert.equal(metadata.source,f.source);assert.equal(metadata.isolatedSource,f.source);assert.equal(metadata.custom,'preserve');const backups=fs.readdirSync(path.join(f.stateDir,'project-source-backups'));assert.equal(backups.length,1);assert.deepEqual(fs.readFileSync(path.join(f.stateDir,'project-source-backups',backups[0])),originalMetadata);assert.equal(fs.statSync(path.join(f.stateDir,'project-source-backups',backups[0])).mode&0o777,0o600);
}));

test('source sync publishes documents from the updated isolated code, then candidates retain provenance',()=>fixture(async f=>{
 const r=registered(f);r.advance('Use the current isolated source for this requirement.');const p=await r.controller.sourceStatus(f.project.id),synced=await r.controller.syncSource(r.input(p));const pointer=JSON.parse(fs.readFileSync(path.join(f.wrapper,'knowledge/CURRENT.json'),'utf8'));assert.equal(pointer.revision,synced.knowledgeRevision);assert.equal(fs.readFileSync(path.join(f.wrapper,'knowledge/versions',pointer.revision,'product/docs/product.md'),'utf8'),'Use the current isolated source for this requirement.');assert.equal(fs.existsSync(path.join(r.original,'docs/product.md')),false);
 const prepared=await r.controller.prepare(f.input());assert.equal(prepared.knowledgeRevision,pointer.revision);await r.controller.start(prepared.id,{digest:prepared.digest,confirmation:true});const task=f.tasks.find(t=>t.id===prepared.taskId);task.status='review';task.result='Verified fixture completion.';f.db.prepare("UPDATE office_task_permissions SET state='consumed' WHERE task_id=?").run(task.id);const worktree=path.join(f.source,'.climpire-worktrees',task.id.slice(0,8));git(f.source,'worktree','add','--detach',worktree);fs.appendFileSync(path.join(worktree,'app.js'),'// isolated edit\n');const candidate=await r.controller.candidate(prepared.id);assert.equal(candidate.originalSource,r.original);assert.equal(candidate.dependencySource,r.original);assert.equal(candidate.repositoryOrigin,r.repository);
}));

test('modified source, unreviewed worktree and pending request prevent source replacement',async()=>{
 await fixture(async f=>{const r=registered(f);r.advance();const p=await r.controller.sourceStatus(f.project.id);fs.appendFileSync(path.join(f.source,'app.js'),'// user change\n');await assert.rejects(r.controller.syncSource(r.input(p)),/source_dirty/);assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);});
 await fixture(async f=>{const r=registered(f);r.advance();const p=await r.controller.sourceStatus(f.project.id),worktree=path.join(f.source,'.climpire-worktrees','unfinished');git(f.source,'worktree','add','--detach',worktree);fs.writeFileSync(path.join(worktree,'pending.js'),'user-owned unfinished change');await assert.rejects(r.controller.syncSource(r.input(p)),/unreviewed_worktree_preserved/);assert.equal(fs.readFileSync(path.join(worktree,'pending.js'),'utf8'),'user-owned unfinished change');assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);});
 await fixture(async f=>{const r=registered(f);await r.controller.syncSource(r.input(await r.controller.sourceStatus(f.project.id)));await r.controller.prepare(f.input());r.advance();const p=await r.controller.sourceStatus(f.project.id),fetches=r.networkCalls.filter(c=>c.args[0]==='fetch').length;await assert.rejects(r.controller.syncSource(r.input(p)),/pending_request_preserved/);assert.equal(r.networkCalls.filter(c=>c.args[0]==='fetch').length,fetches);});
});

test('remote movement before confirmation or during fetch never advances source to unseen code',async()=>{
 await fixture(async f=>{const r=registered(f),old=git(f.source,'rev-parse','HEAD');r.advance();const p=await r.controller.sourceStatus(f.project.id);r.advance('Remote moved again.');await assert.rejects(r.controller.syncSource(r.input(p)),/changed_preview_again/);assert.equal(git(f.source,'rev-parse','HEAD'),old);assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);});
 await fixture(async f=>{const r=registered(f),old=git(f.source,'rev-parse','HEAD');r.advance();const p=await r.controller.sourceStatus(f.project.id);r.onFetch(()=>r.advance('Remote moved during fetch.'));await assert.rejects(r.controller.syncSource(r.input(p)),/changed_preview_again/);assert.equal(git(f.source,'rev-parse','HEAD'),old);assert.equal(JSON.parse(fs.readFileSync(r.metadataFile,'utf8')).source,r.original);});
});

test('diverged local history is preserved by fast-forward-only source sync',()=>fixture(async f=>{
 const r=registered(f);fs.appendFileSync(path.join(f.source,'app.js'),'// preserved local commit\n');git(f.source,'add','.');git(f.source,'commit','-m','Local committed work');const localHead=git(f.source,'rev-parse','HEAD');r.advance();const p=await r.controller.sourceStatus(f.project.id);await assert.rejects(r.controller.syncSource(r.input(p)),/git_check_failed/);assert.equal(git(f.source,'rev-parse','HEAD'),localHead);assert.match(fs.readFileSync(path.join(f.source,'app.js'),'utf8'),/preserved local commit/);assert.equal(JSON.parse(fs.readFileSync(r.metadataFile,'utf8')).source,r.original);
}));

test('source filters and an unexpected registered remote block fetching or credential reuse',async()=>{
 await fixture(async f=>{const r=registered(f);r.advance();const p=await r.controller.sourceStatus(f.project.id);git(f.source,'config','filter.fixture.smudge','cat');await assert.rejects(r.controller.syncSource(r.input(p)),/filters_require_review/);assert.equal(r.networkCalls.some(c=>c.args[0]==='fetch'),false);assert.equal(git(f.source,'config','filter.fixture.smudge'),'cat');});
 await fixture(async f=>{const r=registered(f);git(r.original,'remote','set-url','origin','https://example.invalid/unrelated/repository.git');await assert.rejects(r.controller.sourceStatus(f.project.id),/repository_not_configured/);assert.equal(r.networkCalls.length,0);});
});

test('registered projects require source and knowledge synchronization before preparing edits',()=>fixture(async f=>{
 const r=registered(f);await assert.rejects(r.controller.prepare(f.input()),/source_update_required/);assert.equal(f.tasks.length,0);await r.controller.syncSource(r.input(await r.controller.sourceStatus(f.project.id)));r.advance();await assert.rejects(r.controller.prepare(f.input()),/source_update_required/);assert.equal(f.tasks.length,0);
}));

test('failed document publication after source sync blocks code preparation before task creation',()=>fixture(async f=>{
 const r=registered(f);r.advance();fs.writeFileSync(path.join(r.remote,'docs/invalid-utf8.md'),Buffer.from([0xff,0xfe,0xff]));git(r.remote,'add','.');git(r.remote,'commit','-m','Invalid fixture document');
 const oldPointer=fs.readFileSync(path.join(f.wrapper,'knowledge/CURRENT.json')),preview=await r.controller.sourceStatus(f.project.id),synced=await r.controller.syncSource(r.input(preview));assert.equal(synced.synced,true);assert.equal(synced.knowledgeReady,false);assert.equal(synced.errorCode,'office_development_knowledge_refresh_required');assert.deepEqual(fs.readFileSync(path.join(f.wrapper,'knowledge/CURRENT.json')),oldPointer);assert.equal(JSON.parse(fs.readFileSync(r.metadataFile,'utf8')).source,f.source);
 await assert.rejects(r.controller.prepare(f.input()),/knowledge_refresh_required/);assert.equal(f.tasks.length,0);assert.equal(f.calls.some(c=>c.url.endsWith('/prepare')),false);assert.equal(f.calls.some(c=>/unlock$|approve$|\/run$/.test(c.url)),false);
}));

test('registered code preparation republishes stale knowledge and binds the actual code revision',()=>fixture(async f=>{
 const r=registered(f);r.advance('Actual code-side product document.');const synced=await r.controller.syncSource(r.input(await r.controller.sourceStatus(f.project.id)));assert.equal(synced.knowledgeReady,true);const pointer=path.join(f.wrapper,'knowledge/CURRENT.json');fs.writeFileSync(pointer,JSON.stringify({revision:'c'.repeat(64)}));fs.writeFileSync(path.join(r.original,'README.md'),'Original checkout must not override current code documents.');
 const prepared=await r.controller.prepare(f.input()),current=JSON.parse(fs.readFileSync(pointer,'utf8'));assert.equal(current.revision,synced.knowledgeRevision);assert.equal(prepared.knowledgeRevision,current.revision);const permission=f.db.prepare('SELECT payload FROM office_task_permissions WHERE task_id=?').get(prepared.taskId);assert.equal(JSON.parse(permission.payload).knowledge,current.revision);const document=path.join(f.wrapper,'knowledge/versions',current.revision,'product/docs/product.md');assert.equal(fs.readFileSync(document,'utf8'),'Actual code-side product document.');assert.equal(fs.existsSync(path.join(f.wrapper,'knowledge/versions',current.revision,'product/README.md')),false);assert.equal(fs.readFileSync(path.join(r.original,'README.md'),'utf8'),'Original checkout must not override current code documents.');
}));

async function publishedFixture(f){
 const r=registered(f);await r.controller.syncSource(r.input(await r.controller.sourceStatus(f.project.id)));
 const prepared=await r.controller.prepare(f.input());await r.controller.start(prepared.id,{digest:prepared.digest,confirmation:true});
 const task=f.tasks.find(t=>t.id===prepared.taskId);task.status='review';task.result='Published fixture result.';f.db.prepare("UPDATE office_task_permissions SET state='consumed' WHERE task_id=?").run(task.id);
 const worktree=path.join(f.source,'.climpire-worktrees',task.id.slice(0,8));git(f.source,'worktree','add','--detach',worktree);fs.appendFileSync(path.join(worktree,'app.js'),'// approved improvement\n');fs.writeFileSync(path.join(worktree,'new.js'),'export const added = true;\n');
 const candidate=await r.controller.candidate(prepared.id);execFileSync('git',['apply','-'],{cwd:r.remote,input:candidate.patch,stdio:['pipe','pipe','pipe']});git(r.remote,'add','.');git(r.remote,'commit','-m','Approved development fixture');
 const receipt={id:randomUUID(),requestId:prepared.id,taskId:task.id,projectId:f.project.id,source:f.source,worktree,sourceHead:candidate.sourceHead,diffHash:candidate.diffHash,contextHash:candidate.contextHash,files:candidate.files,diff:candidate.patch,commit:git(r.remote,'rev-parse','HEAD'),state:'pushed',publishedAt:Date.now(),localSourceUpdateRequired:true};
 const directory=path.join(f.stateDir,'release-requests');fs.mkdirSync(directory,{mode:0o700});const receiptPath=path.join(directory,receipt.id+'.json');fs.writeFileSync(receiptPath,JSON.stringify(receipt),{mode:0o600});
 return {r,prepared,task,worktree,candidate,receipt,receiptPath};
}

test('source sync preserves an unchanged published worktree and supports the next code request',()=>fixture(async f=>{
 const {r,worktree,candidate,receipt,receiptPath}=await publishedFixture(f),receiptBytes=fs.readFileSync(receiptPath);r.advance('Product notes after the approved publish.');const preview=await r.controller.sourceStatus(f.project.id),updated=await r.controller.syncSource(r.input(preview));
 assert.equal(updated.synced,true);assert.equal(updated.knowledgeReady,true);assert.equal(git(f.source,'rev-parse','HEAD'),preview.remoteHead);assert.equal(git(worktree,'rev-parse','HEAD'),candidate.sourceHead);assert.equal(fs.readFileSync(path.join(worktree,'new.js'),'utf8'),'export const added = true;\n');assert.deepEqual(fs.readFileSync(receiptPath),receiptBytes);assert.match(fs.readFileSync(path.join(f.source,'app.js'),'utf8'),/approved improvement/);assert.equal(fs.readFileSync(path.join(f.source,'new.js'),'utf8'),'export const added = true;\n');
 const next=await r.controller.prepare(f.input());assert.equal(next.sourceHead,preview.remoteHead);assert.notEqual(next.taskId,receipt.taskId);
}));

test('source sync blocks a subsequently edited published worktree without losing any file',()=>fixture(async f=>{
 const {r,worktree,receiptPath}=await publishedFixture(f);r.advance();const preview=await r.controller.sourceStatus(f.project.id),fetches=r.networkCalls.filter(c=>c.args[0]==='fetch').length,before=git(f.source,'rev-parse','HEAD'),receiptBytes=fs.readFileSync(receiptPath);fs.appendFileSync(path.join(worktree,'new.js'),'// unfinished follow-up\n');
 await assert.rejects(r.controller.syncSource(r.input(preview)),/unreviewed_worktree_preserved/);assert.equal(git(f.source,'rev-parse','HEAD'),before);assert.equal(r.networkCalls.filter(c=>c.args[0]==='fetch').length,fetches);assert.match(fs.readFileSync(path.join(worktree,'new.js'),'utf8'),/unfinished follow-up/);assert.deepEqual(fs.readFileSync(receiptPath),receiptBytes);
}));

test('source sync requires the published commit to exist in the fetched main history',()=>fixture(async f=>{
 const {r,worktree,receipt,receiptPath,candidate}=await publishedFixture(f);r.advance();receipt.commit='a'.repeat(40);fs.writeFileSync(receiptPath,JSON.stringify(receipt));const preview=await r.controller.sourceStatus(f.project.id),before=git(f.source,'rev-parse','HEAD');
 await assert.rejects(r.controller.syncSource(r.input(preview)),/unreviewed_worktree_preserved/);assert.equal(git(f.source,'rev-parse','HEAD'),before);assert.equal(git(worktree,'rev-parse','HEAD'),candidate.sourceHead);assert.equal(fs.readFileSync(path.join(worktree,'new.js'),'utf8'),'export const added = true;\n');
}));
