import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {createTaskArchive} from '../tools/ai-office/control/lib/task-archive.mjs';
import {hash} from '../tools/ai-office/control/lib/controller.mjs';

async function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'office-archive-')),database=path.join(root,'office.sqlite'),state=path.join(root,'state'),projects=path.join(root,'projects'),wrapper=path.join(projects,'duckduck');
  fs.mkdirSync(path.join(wrapper,'source'),{recursive:true});fs.mkdirSync(state);
  const db=new DatabaseSync(database);
  db.exec(`CREATE TABLE projects(id TEXT PRIMARY KEY,assignment_mode TEXT,project_path TEXT);
    CREATE TABLE tasks(id TEXT PRIMARY KEY,project_id TEXT,assigned_agent_id TEXT,status TEXT,hidden INTEGER,result TEXT,updated_at INTEGER);
    CREATE TABLE agents(id TEXT PRIMARY KEY,status TEXT,current_task_id TEXT);
    CREATE TABLE office_task_permissions(task_id TEXT PRIMARY KEY,state TEXT);
    CREATE TABLE task_logs(task_id TEXT,message TEXT);
    CREATE TABLE messages(task_id TEXT,content TEXT);`);
  db.prepare('INSERT INTO projects VALUES(?,?,?)').run('project','manual',wrapper);
  db.prepare('INSERT INTO tasks VALUES(?,?,?,?,?,?,?)').run('task','project','lead','review',0,'Saved report, preserve verbatim',12345);
  db.prepare('INSERT INTO agents VALUES(?,?,?)').run('lead','idle',null);
  db.prepare('INSERT INTO office_task_permissions VALUES(?,?)').run('task','consumed');
  db.prepare('INSERT INTO task_logs VALUES(?,?)').run('task','Original execution evidence');
  db.prepare('INSERT INTO messages VALUES(?,?)').run('task','Original conversation');
  let locks=0;
  const controller=createTaskArchive({database,projectsRoot:projects,stateDir:state,exclusive:fn=>{locks++;return fn();}});
  const task=()=>({...db.prepare('SELECT * FROM tasks WHERE id=?').get('task')});
  const ancillary=()=>Object.fromEntries(['agents','office_task_permissions','task_logs','messages'].map(table=>[table,db.prepare('SELECT * FROM '+table).all().map(row=>({...row}))]));
  const meeting=(meetingState,valid=true)=>{
    const dir=path.join(state,'control-team','meetings');fs.mkdirSync(dir,{recursive:true});
    const id=randomUUID(),spec={projectId:'project',prompt:'Fixture meeting'},record={version:1,id,spec,digest:valid?hash(JSON.stringify(spec)):'changed',state:meetingState,children:[{taskId:'task'}]};
    fs.writeFileSync(path.join(dir,id+'.json'),JSON.stringify(record));return dir;
  };
  try {await run({controller,db,root,state,wrapper,task,ancillary,meeting,locks:()=>locks});}
  finally {db.close();fs.rmSync(root,{recursive:true,force:true});}
}

test('archive and restore only change visibility; preserve report, timestamps, approval, messages and logs',()=>fixture(async f=>{
  const before=f.task(),records=f.ancillary();
  await assert.rejects(async()=>f.controller.archive('task',{}),{code:'office_archive_confirmation_required'});
  assert.deepEqual(f.task(),before);
  const archived=await f.controller.archive('task',{confirmation:true});
  assert.equal(archived.archived,true);assert.equal(archived.deleted,false);assert.equal(archived.modelStarted,false);
  assert.deepEqual(f.task(),{...before,hidden:1});assert.deepEqual(f.ancillary(),records);
  assert.equal((await f.controller.archive('task',{confirmation:true})).alreadyApplied,true);
  await assert.rejects(async()=>f.controller.restore('task',{}),{code:'office_archive_confirmation_required'});
  const restored=await f.controller.restore('task',{confirmation:true});assert.equal(restored.restored,true);assert.equal(restored.modelStarted,false);
  assert.deepEqual(f.task(),before);assert.deepEqual(f.ancillary(),records);assert.equal(f.locks(),5);
}));

test('running tasks, working agents and pending/approved/running grants cannot be archived',()=>fixture(async f=>{
  const preserved=f.ancillary();
  f.db.prepare("UPDATE tasks SET status='in_progress'").run();
  await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_archive_task_running'});
  f.db.prepare("UPDATE tasks SET status='review'").run();
  f.db.prepare("UPDATE agents SET status='working',current_task_id='task'").run();
  await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_archive_task_running'});
  f.db.prepare("UPDATE agents SET status='idle',current_task_id=NULL").run();
  for(const state of ['pending','prepared','approved','running']) {
    f.db.prepare('UPDATE office_task_permissions SET state=?').run(state);
    await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_archive_approval_active'});
    assert.equal(f.task().hidden,0);
  }
  f.db.prepare("UPDATE office_task_permissions SET state='consumed'").run();assert.deepEqual(f.ancillary(),preserved);
}));

test('prepared or unfinished meeting children remain visible, including paused/uncertain meetings',async()=>{
  for(const state of ['prepared','preparing','drafting','launching','running','paused','inspection_required','failed'])await fixture(async f=>{
    f.meeting(state);const before=f.task();
    await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_archive_meeting_active'});
    assert.deepEqual(f.task(),before);
  });
  for(const state of ['completed','stopped'])await fixture(async f=>{
    f.meeting(state);assert.equal((await f.controller.archive('task',{confirmation:true})).archived,true);
  });
});

test('altered meeting records, foreign project roots and non-manual projects fail without writes',async()=>{
  await fixture(async f=>{f.meeting('completed',false);const before=f.task();await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_archive_meeting_state_requires_review'});assert.deepEqual(f.task(),before);});
  await fixture(async f=>{f.db.prepare("UPDATE projects SET assignment_mode='auto'").run();const before=f.task();await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_manual_assignment_required'});assert.deepEqual(f.task(),before);});
  await fixture(async f=>{const foreign=path.join(f.root,'foreign');fs.mkdirSync(path.join(foreign,'source'),{recursive:true});f.db.prepare('UPDATE projects SET project_path=?').run(foreign);const before=f.task();await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_project_outside_root'});assert.deepEqual(f.task(),before);});
  await fixture(async f=>{fs.rmdirSync(path.join(f.wrapper,'source'));fs.symlinkSync(f.root,path.join(f.wrapper,'source'));await assert.rejects(async()=>f.controller.archive('task',{confirmation:true}),{code:'office_project_outside_root'});assert.equal(f.task().hidden,0);});
});

test('invalid identifiers, unknown task and symlinked database never mutate preserved data',()=>fixture(async f=>{
  const before=f.task();
  await assert.rejects(async()=>f.controller.archive('../task',{confirmation:true}),{code:'office_invalid_id'});
  await assert.rejects(async()=>f.controller.archive('missing',{confirmation:true}),{code:'office_task_not_found'});
  const link=path.join(f.root,'linked.sqlite');fs.symlinkSync(path.join(f.root,'office.sqlite'),link);
  const linked=createTaskArchive({database:link,projectsRoot:path.join(f.root,'projects'),stateDir:f.state});
  await assert.rejects(async()=>linked.archive('task',{confirmation:true}),{code:'office_archive_database_requires_review'});
  assert.deepEqual(f.task(),before);
}));
