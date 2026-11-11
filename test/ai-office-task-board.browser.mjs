// Local UI fixture. Every task mutation is mocked; native task writes must remain unused.
import {chromium} from '../mobile/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const target=new URL(process.env.AI_OFFICE_TEST_URL||'http://127.0.0.1:8810');
if(target.protocol!=='http:'||!['127.0.0.1','localhost'].includes(target.hostname))throw Error('Loopback test URL required');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],dialogs=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
const now=Date.now(),draftId='11111111-1111-4111-8111-111111111111',digest='a'.repeat(64);
let lead='lead',runs=0,archives=0,restores=0,nativeWrites=0,draftCreates=0,denyArchive=false;
const tasks=[
  {id:'board-draft',title:'기존 요청 실행 확인',status:'inbox',result:null,request:{id:draftId,digest,taskId:'board-draft',projectId:'project-one',projectName:'duckduck',agentName:'검토 담당',prompt:'기존 요청 실행 확인',origin:'owner',kind:'question',state:'draft'}},
  {id:'board-report',title:'보관할 보고서',status:'review',result:'## 한 줄 결론\n보존해야 할 보고서입니다.',reportEligible:true,reportHash:'b'.repeat(64)},
].map(t=>({...t,project_id:'project-one',workflow_pack_key:'development',assigned_agent_id:lead,department_id:'planning',priority:1,task_type:'general',hidden:0,created_at:now-1000,updated_at:now,agent:{id:lead,name:'검토 담당'}}));
await page.route('**/api/agents',async route=>{
  const response=await route.fetch(),data=await response.json();lead=(data.agents||data).find(a=>a.department_id==='planning'&&a.role==='team_leader')?.id||lead;
  tasks.forEach(t=>{t.assigned_agent_id=lead;t.agent.id=lead;});await route.fulfill({response,json:data});
});
await page.route('**/api/tasks**',route=>{
  if(route.request().method()!=='GET'){nativeWrites++;return route.abort();}
  const url=new URL(route.request().url());
  if(url.pathname==='/api/tasks')return route.fulfill({json:{tasks}});
  return route.fallback();
});
await page.route('**/control-api/**',route=>{
  const path=new URL(route.request().url()).pathname,json=value=>route.fulfill({json:value});
  if(path.endsWith('/local-connect'))return route.continue();
  if(path.endsWith('/session'))return json({csrf:'fixture'});
  if(path.endsWith('/projects'))return json({projects:[{id:'project-one',name:'duckduck'}]});
  if(path.endsWith('/tasks'))return json({tasks});
  if(path.endsWith('/room'))return json({events:[],before:null});
  if(path.endsWith('/development'))return json({requests:[]});
  if(path.endsWith('/team'))return json({total:1,configuredCount:1,readyCount:1,provider:{ready:true},roster:[{id:lead,name:'검토 담당',configured:true,ready:true}],meetings:[]});
  if(path.endsWith('/requests')){draftCreates++;return json({});}
  if(path.endsWith('/start')){assert.equal(path,'/control-api/requests/'+draftId+'/start');assert.deepEqual(route.request().postDataJSON(),{digest,confirmation:true});runs++;tasks[0].status='in_progress';return json({started:true});}
  if(path.endsWith('/archive')||path.endsWith('/restore')){
    assert.equal(route.request().headers()['x-control-csrf'],'fixture');assert.deepEqual(route.request().postDataJSON(),{confirmation:true});
    if(denyArchive)return route.fulfill({status:409,json:{error:'office_archive_approval_active'}});
    const task=tasks.find(t=>path.includes('/'+t.id+'/'));assert.ok(task);
    if(path.endsWith('/archive')){archives++;task.hidden=1;}else {restores++;task.hidden=0;}
    return json({taskId:task.id,hidden:task.hidden,deleted:false,modelStarted:false});
  }
  return json({});
});
await page.route('**/api/**',route=>{if(route.request().method()!=='GET'){nativeWrites++;return route.abort();}return route.fallback();});
try {
  await page.goto(target.origin+'/#access='+fs.readFileSync((process.env.AI_OFFICE_STATE_DIR||'/workspace/ai-office/state')+'/control-access.key','utf8').trim());
  const frame=page.frameLocator('#officeFrame');await frame.getByRole('button',{name:/업무 관리/}).click();
  const card=title=>frame.locator('div.group.rounded-xl').filter({has:frame.getByRole('button',{name:title,exact:true})});
  const report=card('보관할 보고서');await report.waitFor();
  const reportBody=tasks[1].result,reportTime=tasks[1].updated_at;
  await report.getByTitle('업무 보관',{exact:true}).click();await report.waitFor({state:'hidden'});
  assert.equal(archives,1);assert.equal(tasks[1].result,reportBody);assert.equal(tasks[1].updated_at,reportTime);assert.equal(runs,0);
  await frame.getByRole('button',{name:/모두보기/}).click();await report.waitFor();
  await report.getByTitle('숨긴 작업 복원',{exact:true}).click();
  await report.getByTitle('업무 보관',{exact:true}).waitFor();assert.equal(restores,1);
  denyArchive=true;const blocked=page.waitForEvent('dialog',{predicate:d=>d.type()==='alert'});await report.getByTitle('업무 보관',{exact:true}).click();
  await blocked;assert.ok(dialogs.some(text=>text.includes('실행 승인이 남아 있는 업무')));assert.equal(tasks[1].hidden,0);denyArchive=false;
  await card('기존 요청 실행 확인').getByTitle('실행 내용 확인',{exact:true}).click();
  const room=frame.locator('[data-office-native-room]'),confirm=room.getByRole('dialog',{name:'안건 실행 확인'});
  await confirm.waitFor();await confirm.getByText('기존 요청 실행 확인',{exact:true}).waitFor();
  assert.equal(runs,0);assert.equal(draftCreates,0);
  await confirm.getByRole('button',{name:'확인하고 실행',exact:true}).click();await confirm.waitFor({state:'hidden'});
  assert.equal(runs,1);assert.equal(draftCreates,0);assert.equal(nativeWrites,0);assert.deepEqual(errors,[]);
  console.log('PASS: managed board explicit existing-request confirmation, reversible archive/restore, visible failure, no native task writes');
} finally {await browser.close();}
