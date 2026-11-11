import fs from 'node:fs';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fail,hash,safeId} from './controller.mjs';

// Board cleanup is reversible. Never call the native task DELETE endpoint.
export function createTaskArchive({database,projectsRoot,stateDir,exclusive=fn=>fn()}) {
  const meetingDir=path.join(stateDir,'control-team','meetings');

  function checkMeetings(taskId) {
    if(!fs.existsSync(meetingDir))return;
    if(fs.realpathSync(meetingDir)!==path.resolve(meetingDir))fail('office_archive_meeting_state_requires_review');
    for(const name of fs.readdirSync(meetingDir)) {
      if(!/^[a-f0-9-]{36}\.json$/i.test(name))continue;
      const file=path.join(meetingDir,name);
      if(fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>1024*1024)fail('office_archive_meeting_state_requires_review');
      let meeting;
      try {meeting=JSON.parse(fs.readFileSync(file,'utf8'));}catch {fail('office_archive_meeting_state_requires_review');}
      if(meeting.version!==1||meeting.id!==name.slice(0,-5)||!meeting.spec||hash(JSON.stringify(meeting.spec))!==meeting.digest||!Array.isArray(meeting.children))fail('office_archive_meeting_state_requires_review');
      const belongs=meeting.children.some(child=>child.taskId===taskId)||meeting.finalTaskId===taskId||meeting.currentTaskId===taskId;
      if(belongs&&!['completed','stopped'].includes(meeting.state))fail('office_archive_meeting_active');
    }
  }

  function change(taskId,input,hidden) {
    safeId(taskId);
    if(input?.confirmation!==true)fail('office_archive_confirmation_required',400);
    const dbPath=path.resolve(database);
    if(fs.realpathSync(dbPath)!==dbPath)fail('office_archive_database_requires_review');
    const root=fs.realpathSync(projectsRoot),db=new DatabaseSync(dbPath);
    db.exec('PRAGMA busy_timeout=5000');
    try {
      db.exec('BEGIN IMMEDIATE');
      const task=db.prepare('SELECT * FROM tasks WHERE id=?').get(taskId);
      if(!task)fail('office_task_not_found',404);
      const project=db.prepare('SELECT id,assignment_mode,project_path FROM projects WHERE id=?').get(task.project_id);
      if(!project||project.assignment_mode!=='manual')fail('office_manual_assignment_required');
      let wrapper,source;
      try {wrapper=fs.realpathSync(project.project_path);source=fs.realpathSync(path.join(wrapper,'source'));}catch {fail('office_project_outside_root');}
      if(!wrapper.startsWith(root+path.sep)||!source.startsWith(wrapper+path.sep))fail('office_project_outside_root');
      if(task.status==='in_progress'||db.prepare("SELECT 1 FROM agents WHERE status='working' AND (current_task_id=? OR id=?)").get(taskId,task.assigned_agent_id??''))fail('office_archive_task_running');
      const permission=db.prepare('SELECT state FROM office_task_permissions WHERE task_id=?').get(taskId);
      if(permission&&['pending','prepared','approved','running'].includes(permission.state))fail('office_archive_approval_active');
      checkMeetings(taskId);
      const already=(task.hidden===1?1:0)===hidden;
      // Keep status, report text, its timestamp, approvals, messages and logs intact.
      if(!already)db.prepare('UPDATE tasks SET hidden=? WHERE id=?').run(hidden,taskId);
      db.exec('COMMIT');
      return {taskId,hidden,archived:hidden===1,restored:hidden===0,alreadyApplied:already,deleted:false,modelStarted:false};
    } catch(error) {
      try {db.exec('ROLLBACK');}catch {}
      throw error;
    } finally {db.close();}
  }

  return {
    archive:(taskId,input)=>exclusive(()=>change(taskId,input,1)),
    restore:(taskId,input)=>exclusive(()=>change(taskId,input,0)),
  };
}
