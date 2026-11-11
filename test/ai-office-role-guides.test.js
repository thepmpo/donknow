import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRoleGuides, COMMON_ROLE_GUIDE, ROLE_GUIDES, ROLE_GUIDE_PACK} from '../tools/ai-office/control/lib/role-guides.mjs';

async function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'office-role-guides-'));
  const state=path.join(root,'state'), projects=path.join(root,'projects'), wrapper=path.join(projects,'duckduck');
  fs.mkdirSync(state,{mode:0o700});fs.mkdirSync(path.join(wrapper,'source'),{recursive:true});
  const project={id:'project-one',assignment_mode:'manual',project_path:wrapper};
  const calls=[], api=async(url,method='GET')=>{calls.push({url,method});assert.equal(method,'GET');assert.equal(url,'/api/projects/'+project.id);return {project};};
  const options={stateDir:state,projectsRoot:projects,apiFactory:async()=>api},guides=createRoleGuides(options);
  const receipt=path.join(state,'control-role-guides',project.id+'.json');
  try { await run({root,state,projects,wrapper,project,calls,guides,receipt,options}); }
  finally { fs.rmSync(root,{recursive:true,force:true}); }
}

test('listing an unconnected project changes no files and delivers no claimed learned skills',()=>fixture(async f=>{
  const before=fs.readdirSync(f.state);
  const status=await f.guides.status(f.project.id);
  assert.equal(status.connected,false);assert.equal(status.modelStarted,false);assert.equal(status.readVerified,false);
  assert.equal(status.roles.length,6);assert.equal(await f.guides.context(f.project.id,'design'),'');
  assert.deepEqual(fs.readdirSync(f.state),before);
  await assert.rejects(f.guides.connect({projectId:f.project.id}),{code:'office_role_guides_confirmation_required',status:400});
  assert.deepEqual(fs.readdirSync(f.state),before);
}));

test('one explicit connection is idempotent and preserves auth, tasks and source with no model or native writes',()=>fixture(async f=>{
  const auth=path.join(f.state,'auth-fixture.json'),task=path.join(f.state,'existing-task.json'),source=path.join(f.wrapper,'source','README.md');
  for(const [file,text] of [[auth,'fixture auth must remain'],[task,'running fixture task'],[source,'existing product guide']])fs.writeFileSync(file,text);
  const before=[auth,task,source].map(file=>fs.readFileSync(file));
  const first=await f.guides.connect({projectId:f.project.id,confirmation:true}),receipt=fs.readFileSync(f.receipt);
  assert.equal(first.connected,true);assert.equal(first.alreadyConnected,false);assert.equal(first.appliesTo,'new_requests');
  assert.equal(first.modelStarted,false);assert.equal(first.readVerified,false);
  const second=await f.guides.connect({projectId:f.project.id,confirmation:true});
  assert.equal(second.alreadyConnected,true);assert.deepEqual(fs.readFileSync(f.receipt),receipt);
  assert.equal(fs.statSync(f.receipt).mode&0o777,0o600);
  assert.equal(fs.statSync(path.dirname(f.receipt)).mode&0o777,0o700);
  [auth,task,source].forEach((file,i)=>assert.deepEqual(fs.readFileSync(file),before[i]));
  assert.ok(f.calls.every(call=>call.method==='GET'&&call.url==='/api/projects/project-one'));
  assert.deepEqual(fs.readdirSync(path.dirname(f.receipt)),['project-one.json']);
}));

test('new request context contains exact common and matching role content, version and hash',()=>fixture(async f=>{
  const alreadyPrepared=await f.guides.context(f.project.id,'design');
  await f.guides.connect({projectId:f.project.id,confirmation:true});
  for(const [department,guide] of Object.entries(ROLE_GUIDES)) {
    const text=await f.guides.context(f.project.id,department);
    assert.ok(text.includes(COMMON_ROLE_GUIDE));assert.ok(text.includes(guide.text));
    assert.ok(text.includes(ROLE_GUIDE_PACK.hash));assert.ok(text.includes('버전: '+ROLE_GUIDE_PACK.version));
    for(const [other,otherGuide] of Object.entries(ROLE_GUIDES))if(other!==department)assert.equal(text.includes(otherGuide.text),false);
  }
  assert.equal(alreadyPrepared,'');
  assert.equal(await f.guides.context(f.project.id,'dev'),await f.guides.context(f.project.id,'development'));
  for(const unknown of ['unknown','__proto__','constructor',undefined]) {
    const text=await f.guides.context(f.project.id,unknown);
    assert.ok(text.includes(COMMON_ROLE_GUIDE));
    for(const guide of Object.values(ROLE_GUIDES))assert.equal(text.includes(guide.text),false);
  }
}));

test('connection survives process restart without silently changing approved content',()=>fixture(async f=>{
  await f.guides.connect({projectId:f.project.id,confirmation:true});
  const original=await f.guides.context(f.project.id,'qa'),restarted=createRoleGuides(f.options);
  assert.equal((await restarted.status(f.project.id)).connected,true);
  assert.equal(await restarted.context(f.project.id,'qa'),original);
}));

test('modified receipt and changed pack identity are rejected and preserved',()=>fixture(async f=>{
  await f.guides.connect({projectId:f.project.id,confirmation:true});
  const original=JSON.parse(fs.readFileSync(f.receipt,'utf8'));
  for(const change of [{digest:'invalid'},{packVersion:999},{packHash:'0'.repeat(64)},{projectPath:f.root},{unreviewedText:'extra instructions'}]) {
    const modified={...original,...change};
    if(!Object.hasOwn(change,'digest')){const {digest,...body}=modified;modified.digest=createHash('sha256').update(JSON.stringify(body)).digest('hex');}
    fs.writeFileSync(f.receipt,JSON.stringify(modified));const bytes=fs.readFileSync(f.receipt);
    for(const operation of [()=>f.guides.status(f.project.id),()=>f.guides.context(f.project.id,'planning'),()=>f.guides.connect({projectId:f.project.id,confirmation:true})])await assert.rejects(operation(),{code:'office_role_guides_receipt_changed'});
    assert.deepEqual(fs.readFileSync(f.receipt),bytes);
  }
}));

test('project scope and receipt symlinks are refused without touching their targets',()=>fixture(async f=>{
  f.project.assignment_mode='automatic';await assert.rejects(f.guides.status(f.project.id),{code:'office_manual_assignment_required'});
  f.project.assignment_mode='manual';f.project.project_path=f.root;
  await assert.rejects(f.guides.connect({projectId:f.project.id,confirmation:true}),{code:'office_project_outside_root'});
  f.project.project_path=f.wrapper;
  await assert.rejects(f.guides.status('../project-one'),{code:'office_role_guides_invalid_project'});
  await f.guides.connect({projectId:f.project.id,confirmation:true});
  const target=path.join(f.root,'preserve.txt');fs.writeFileSync(target,'untouched');fs.unlinkSync(f.receipt);fs.symlinkSync(target,f.receipt);
  await assert.rejects(f.guides.connect({projectId:f.project.id,confirmation:true}),{code:'office_role_guides_receipt_changed'});
  assert.equal(fs.readFileSync(target,'utf8'),'untouched');
  fs.unlinkSync(f.receipt);fs.rmdirSync(path.dirname(f.receipt));fs.symlinkSync(path.join(f.root,'missing'),path.dirname(f.receipt));
  await assert.rejects(f.guides.status(f.project.id),{code:'office_role_guides_path_requires_review'});
}));

test('separate controllers concurrently connect a single complete receipt',()=>fixture(async f=>{
  const other=createRoleGuides(f.options);
  const results=await Promise.all([f.guides.connect({projectId:f.project.id,confirmation:true}),other.connect({projectId:f.project.id,confirmation:true})]);
  assert.ok(results.every(r=>r.connected));assert.equal(results.filter(r=>!r.alreadyConnected).length,1);
  assert.deepEqual(fs.readdirSync(path.dirname(f.receipt)),['project-one.json']);
}));
