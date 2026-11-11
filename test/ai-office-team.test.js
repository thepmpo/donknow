import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createTeam} from '../tools/ai-office/control/lib/team.mjs';

async function fixture(fn){
 const stateDir=fs.mkdtempSync(path.join(os.tmpdir(),'office-team-'));const calls=[],drafts=[],taskRows=[];
 const agents=[{id:'lead-a',name_ko:'기획 팀장',department_id:'planning',role:'team_leader',cli_provider:'codex',cli_model:'existing-custom-model',cli_reasoning_level:'high'},{id:'lead-b',name_ko:'디자인 팀장',department_id:'design',role:'team_leader',cli_provider:'codex',cli_model:'provider-default',cli_reasoning_level:null},{id:'worker',name_ko:'개발 직원',department_id:'development',role:'senior',cli_provider:'claude',cli_model:'old-model',cli_reasoning_level:null},{id:'oauth-linked',name_ko:'기존 계정 직원',department_id:'operations',role:'senior',cli_provider:'claude',cli_model:'preserve',oauth_account_id:'existing-account-id'}];
 const project={id:'project-one',assignment_mode:'manual',assigned_agent_ids:['lead-a','lead-b']};let sourceHead='source-one',knowledgeRevision='knowledge-one',runs=0,locks=0,throwAfterStart=false,failPatch=false;
 const api=async(url,method='GET',body,options)=>{calls.push({url,method,body,options});if(url==='/api/agents'&&method==='GET')return {agents:structuredClone(agents)};if(url==='/api/projects/project-one'&&method==='GET')return {project:structuredClone(project)};if(url==='/api/tasks')return {tasks:structuredClone(taskRows)};if(url==='/api/office-policy/status')return {enabled:true,workersEnabled:false,developmentEnabled:false};if(url==='/api/office-policy/runtime/check')return {authReady:true,runnerConfigured:true,sandboxAvailable:true};if(url.startsWith('/api/agents/')&&method==='PATCH'){const row=agents.find(a=>url.endsWith(a.id));Object.assign(row,body);if(failPatch&&row.id==='worker'){failPatch=false;throw Error('response lost');}return {ok:true};}if(url==='/api/projects/project-one'&&method==='PATCH'){project.assignment_mode=body.assignment_mode;project.assigned_agent_ids=[...body.agent_ids];return {ok:true};}throw Error('Unexpected API '+url);};
 const draft=async input=>{drafts.push(structuredClone(input));const taskId=randomUUID();taskRows.push({id:taskId,project_id:input.projectId,agent:{id:input.agentId},status:'inbox',result:null,requestId:input.id,updated_at:Date.now()});return {id:input.id,taskId,digest:'digest-'+input.id,sourceHead,knowledgeRevision};};
 const start=async(requestId,approval)=>{assert.equal(approval.confirmation,true);assert.equal(approval.digest,'digest-'+requestId);const t=taskRows.find(t=>t.requestId===requestId);if(taskRows.some(other=>other.id!==t.id&&other.status==='in_progress'))throw Object.assign(Error('office_wait_for_running_task'),{code:'office_wait_for_running_task'});t.status='in_progress';runs++;if(throwAfterStart)throw Error('model start response lost');return {started:true,taskId:t.id};};
 const stop=async(taskId,input)=>{assert.equal(input.confirmation,true);taskRows.find(t=>t.id===taskId).status='cancelled';return {stopped:true};};
 const tasks=async()=>({tasks:structuredClone(taskRows)});const deps={apiFactory:async()=>api,stateDir,projects:async()=>({projects:[project]}),draft,start,tasks,stop,projectSnapshot:async()=>({project:structuredClone(project),sourceHead,knowledgeRevision}),exclusive:async fn=>{locks++;return fn();}};
 const team=createTeam(deps);const f={team,deps,stateDir,calls,drafts,agents,taskRows,project,runs:()=>runs,locks:()=>locks,setSource:s=>sourceHead=s,setThrow:v=>throwAfterStart=v,setPatchFail:v=>failPatch=v,complete(taskId,result='## 한 줄 결론\n쉽게 정리한 실제 의견\n## 지금 할 일\n확인해 주세요'){const t=taskRows.find(t=>t.id===taskId);Object.assign(t,{status:'review',result,executionSucceeded:true,reportEligible:true,reportHash:'verified',updated_at:Date.now()});}};
 try{await fn(f);}finally{fs.rmSync(stateDir,{recursive:true,force:true});}
}

test('connect preserves existing model/reasoning and OAuth binding, merges assignment and performs no model calls',()=>fixture(async f=>{
 await assert.rejects(f.team.connect({projectId:f.project.id}),/confirmation_required/);
 const connected=await f.team.connect({projectId:f.project.id,confirmation:true});assert.equal(connected.modelStarted,false);assert.equal(connected.authenticationChanged,false);assert.equal(f.runs(),0);assert.equal(f.locks(),1);assert.equal(f.agents[0].cli_model,'existing-custom-model');assert.equal(f.agents[0].cli_reasoning_level,'high');assert.equal(f.agents[2].cli_provider,'codex');assert.equal(f.agents[3].oauth_account_id,'existing-account-id');assert.equal(f.agents[3].cli_provider,'claude');assert.deepEqual(f.project.assigned_agent_ids,['lead-a','lead-b','worker']);assert.deepEqual(connected.skipped,[{id:'oauth-linked',reason:'existing_account_binding_preserved'}]);
 const saved=path.join(f.stateDir,'control-team/connections',connected.backupId+'.json');assert.equal(fs.statSync(saved).mode&0o777,0o600);assert.equal(fs.readFileSync(saved,'utf8').includes('existing-account-id'),false);assert.equal(f.calls.filter(c=>c.method==='PATCH'&&c.url==='/api/agents/lead-a').length,0);const status=await f.team.status({projectId:f.project.id});assert.equal(status.readyCount,3);assert.equal(status.roster[0].lastExecution,null);
}));

test('a lost connection-patch response restores changed nonsecret fields instead of resetting auth or project',()=>fixture(async f=>{f.setPatchFail(true);await assert.rejects(f.team.connect({projectId:f.project.id,confirmation:true}),/failed_restored/);assert.equal(f.agents[2].cli_provider,'claude');assert.equal(f.agents[2].cli_model,'old-model');assert.equal(f.agents[3].oauth_account_id,'existing-account-id');assert.deepEqual(f.project.assigned_agent_ids,['lead-a','lead-b']);assert.equal(f.runs(),0);}));

test('meeting confirmation freezes membership/budget and runs actual leads then synthesis sequentially once',()=>fixture(async f=>{
 const prepared=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'가입 흐름의 우선순위를 정리해줘'});assert.equal(prepared.maxCalls,3);assert.equal(prepared.participants.length,2);assert.equal(f.runs(),0);assert.equal(f.drafts.length,2);assert.equal(f.drafts[0].origin,'meeting');assert.equal(f.drafts[0].displayPrompt,prepared.prompt);assert.match(f.drafts[0].prompt,/## 내가 결정할 것/);await f.team.tick();assert.equal(f.runs(),0);await assert.rejects(f.team.startMeeting({id:prepared.id,digest:'wrong',confirmation:true}),/confirmation_required/);
 let running=await f.team.startMeeting({id:prepared.id,digest:prepared.digest,confirmation:true});assert.equal(f.runs(),1);await f.team.startMeeting({id:prepared.id,digest:prepared.digest,confirmation:true});await f.team.tick();assert.equal(f.runs(),1);f.complete(running.currentTaskId);await f.team.tick();assert.equal(f.runs(),2);running=(await f.team.status()).meetings[0];f.complete(running.currentTaskId,'## 한 줄 결론\n다른 분야의 실제 의견');await f.team.tick();assert.equal(f.runs(),3);assert.equal(f.drafts.length,3);assert.match(f.drafts[2].prompt,/다른 분야의 실제 의견/);assert.doesNotMatch(f.drafts[2].prompt,/앞1,000자/);running=(await f.team.status()).meetings[0];f.complete(running.currentTaskId,'## 한 줄 결론\n최종 정리');await f.team.tick();const done=(await f.team.status()).meetings[0];assert.equal(done.state,'completed');assert.equal(done.completedCalls,3);assert.ok(done.finalTaskId);await f.team.tick();assert.equal(f.runs(),3);assert.equal((await f.team.status()).roster.find(a=>a.id==='lead-a').lastExecution.verified,true);
}));

test('restart never auto-advances, explicit confirmation resumes only a known running meeting',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});const r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});f.complete(r.currentTaskId);const restarted=createTeam(f.deps);await restarted.tick();assert.equal(f.runs(),1);assert.equal((await restarted.status()).meetings[0].resumeRequired,true);await restarted.startMeeting({id:p.id,digest:p.digest,confirmation:true});assert.equal(f.runs(),2);
}));

test('lost model-start response enters inspection and never launches another worker',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});f.setThrow(true);const result=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});assert.equal(result.state,'inspection_required');assert.equal(f.runs(),1);await f.team.tick();await assert.rejects(f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true}),/inspection_required/);assert.equal(f.runs(),1);
}));

test('source or participant configuration changes stop subsequent work rather than approving fresh scope',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});const r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});f.complete(r.currentTaskId);f.setSource('new-head');await f.team.tick();assert.equal((await f.team.status()).meetings[0].state,'failed');assert.equal(f.runs(),1);
}));

test('oversized complete reports stop synthesis explicitly without dropping uncertainty or launching another call',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});let r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});f.complete(r.currentTaskId,'x'.repeat(12000));await f.team.tick();r=(await f.team.status()).meetings[0];f.complete(r.currentTaskId);await f.team.tick();r=(await f.team.status()).meetings[0];assert.equal(r.state,'failed');assert.equal(r.errorCode,'office_meeting_reports_too_long');assert.equal(f.runs(),2);assert.equal(f.taskRows.filter(t=>t.result).length,2);
}));

test('stopping a meeting cancels only its tracked child and does not start the next step',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});const r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});await f.team.stopMeeting({id:p.id,confirmation:true});assert.equal(f.taskRows.find(t=>t.id===r.currentTaskId).status,'cancelled');await f.team.tick();assert.equal(f.runs(),1);assert.equal((await f.team.status()).meetings[0].state,'stopped');
}));


test('unsuccessful worker result never advances the next lead or becomes verified roster output',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});const r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});f.complete(r.currentTaskId,'실패 결과');f.taskRows.find(t=>t.id===r.currentTaskId).executionSucceeded=false;await f.team.tick();assert.equal((await f.team.status()).meetings[0].state,'failed');assert.equal(f.runs(),1);assert.equal((await f.team.status()).roster.find(a=>a.id==='lead-a').lastExecution.verified,false);
}));

test('completed reports and approved membership remain immutable across later steps',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});let r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});const first=r.currentTaskId;f.complete(first);await f.team.tick();r=(await f.team.status()).meetings[0];f.complete(r.currentTaskId);f.taskRows.find(t=>t.id===first).result='changed after completion';await f.team.tick();assert.equal((await f.team.status()).meetings[0].errorCode,'office_meeting_report_changed');assert.equal(f.runs(),2);
}));

test('a changed provider or project membership cannot be silently approved after meeting preparation',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});f.agents[1].cli_model='changed-model';await assert.rejects(f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true}),/membership_changed/);assert.equal(f.runs(),0);
}));

test('unrelated manual work pauses a meeting and requires explicit resume without cancelling that work',()=>fixture(async f=>{
 const p=await f.team.prepareMeeting({id:randomUUID(),projectId:f.project.id,prompt:'회의'});const r=await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});f.complete(r.currentTaskId);f.taskRows.push({id:'unrelated',status:'in_progress',agent:{id:'worker'},project_id:f.project.id});await f.team.tick();assert.equal((await f.team.status()).meetings[0].state,'paused');assert.equal(f.runs(),1);await f.team.tick();assert.equal(f.runs(),1);assert.equal(f.taskRows.find(t=>t.id==='unrelated').status,'in_progress');f.taskRows.find(t=>t.id==='unrelated').status='done';await f.team.startMeeting({id:p.id,digest:p.digest,confirmation:true});assert.equal(f.runs(),2);
}));


test('agent working state blocks rebinding even if the task table has no in-progress row',()=>fixture(async f=>{
 f.agents[2].status='working';await assert.rejects(f.team.connect({projectId:f.project.id,confirmation:true}),/wait_for_running_task/);assert.equal(f.calls.some(c=>c.method==='PATCH'),false);assert.equal(f.runs(),0);
}));
