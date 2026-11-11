// Readiness/operator control. Never approve/run a task just by checking or preparing it.
import {readFile,writeFile,mkdir,realpath} from 'node:fs/promises';
import {existsSync,statSync,readFileSync,realpathSync} from 'node:fs';
import {resolve,join,dirname,sep} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync,spawnSync,spawn} from 'node:child_process';
import {createOfficeClient} from './lib/ai-office-client.mjs';
import {retainOnlyProviderAuth} from './lib/ai-office-auth.mjs';
import {pilotPayload,validatePilot,textHash,readinessBlockers} from './lib/ai-office-pilot.mjs';
const [command,...args]=process.argv.slice(2),projectName=args.find(v=>!v.startsWith('--'))??'duckduck';
if(!/^[a-zA-Z0-9-]{1,50}$/.test(projectName))throw Error('office_project_name_required');
const client=await createOfficeClient(),stateDir=process.env.AI_OFFICE_STATE_DIR??'/workspace/ai-office/state',planPath=join(stateDir,'pilot-'+projectName.toLowerCase()+'.json');
const api=client.request;
const git=(where,...argv)=>execFileSync('git',['-C',where,...argv],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:5000}).trim();
async function plan(){return JSON.parse(await readFile(planPath,'utf8'));}
async function taskFor(p){const r=await api('/api/tasks/'+encodeURIComponent(p.taskId));return r.task??r;}
function probeNetwork(){return [['auth.openai.com','https://auth.openai.com/.well-known/openid-configuration'],['chatgpt.com','https://chatgpt.com/backend-api/codex/responses']].map(([host,url])=>{
 const r=spawnSync('curl',['--head','--max-time','8','--silent','--output','/dev/null','--write-out','%{http_code}',url],{encoding:'utf8',timeout:10000});
 const http=Number(r.stdout?.trim()??0);return {host,reachable:r.status===0&&http>=100&&http<600,httpStatus:http||null};
});}
async function doctor(){
 const server=await api('/api/office-policy/status');let provider;
 try{provider=await api('/api/office-policy/runtime/check','POST',{}, {owner:true});}catch{provider={runnerConfigured:false,authReady:false,sandboxAvailable:false,reasonCodes:['office_runtime_upgrade_or_owner_check_required']};}
 let pilot=false,pilotState=null;try{const p=await plan(),t=await taskFor(p);validatePilot(p,t,git(p.source,'rev-parse','HEAD'));pilot=true;pilotState={id:p.taskId,title:t.title,status:t.status,projectId:p.projectId,sourceHead:p.sourceHead};}catch{}
 const network=probeNetwork(),blockers=readinessBlockers({server,provider,pilot,network});return {ready:blockers.length===0,policy:server,provider,pilot:pilotState,network,blockers,developmentWillRemainLocked:true};
}
async function prepare(){
 await mkdir(stateDir,{recursive:true,mode:0o700});
 if(existsSync(planPath)){const p=await plan(),t=await taskFor(p);validatePilot(p,t,git(p.source,'rev-parse','HEAD'));return {prepared:true,reused:true,taskId:p.taskId,status:t.status,approved:false,executed:false};}
 const projects=await api('/api/projects?page=1&page_size=100'),project=(projects.projects??projects).find(p=>p.name===projectName||p.project_path?.split('/').at(-1)===projectName.toLowerCase());if(!project)throw Error('office_project_not_registered');
 if(project.assignment_mode!=='manual')throw Error('office_manual_project_assignment_required');
 const source=await realpath(join(project.project_path,'source')),root=await realpath(client.settings.projectsRoot);
 if(!source.startsWith(root+sep))throw Error('office_source_outside_registered_root');
 const agents=await api('/api/agents'),agent=(agents.agents??agents).find(a=>a.department_id==='planning'&&a.role==='team_leader'&&(!a.workflow_pack_key||a.workflow_pack_key==='development'));if(!agent)throw Error('office_product_lead_missing');
 if(agent.cli_provider&&agent.cli_provider!=='codex')throw Error('office_preserve_existing_provider_select_other_lead');
 const tasks=await api('/api/tasks'),payload=pilotPayload(project,agent);
 if((tasks.tasks??tasks).some(t=>t.project_id===project.id&&t.title===payload.title))throw Error('office_existing_pilot_requires_manual_review');
 await api('/api/agents/'+agent.id,'PATCH',{cli_provider:'codex',cli_model:'provider-default',cli_reasoning_level:null});
 await api('/api/projects/'+project.id,'PATCH',{assignment_mode:'manual',agent_ids:[...new Set([...(project.assigned_agent_ids??[]),agent.id])]});
 const result=await api('/api/tasks','POST',payload),task=result.task??result,id=task.id??result.id;if(!id)throw Error('office_task_creation_not_confirmed');
 const record={version:1,projectId:project.id,taskId:id,agentId:agent.id,source,sourceHead:git(source,'rev-parse','HEAD'),promptSha256:textHash(payload.description),createdAt:new Date().toISOString(),phase:'product',approved:false,executed:false};
 await writeFile(planPath,JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});return {prepared:true,reused:false,taskId:id,status:'inbox',approved:false,executed:false};
}
async function start(){
 if(!args.includes('--confirm'))throw Error('office_start_requires_explicit_user_confirmation');
 const checks=await doctor();if(!checks.ready)throw Error('office_not_ready:'+checks.blockers.join(','));
 const p=await plan();validatePilot(p,await taskFor(p),git(p.source,'rev-parse','HEAD'));
 let grant;try{
  await api('/api/office-policy/runtime/product-unlock','POST',{confirmation:true},{owner:true});
  grant=await api('/api/office-policy/tasks/'+p.taskId+'/prepare','POST',{phase:'product'},{owner:true});
  await api('/api/office-policy/tasks/'+p.taskId+'/approve','POST',{expectedDigest:grant.digest,confirmation:true},{owner:true});
  const result=await api('/api/tasks/'+p.taskId+'/run','POST',{});return {started:!!result.ok,taskId:p.taskId,phase:'product',pid:result.pid,developmentEnabled:false};
 }catch(error){
  if(grant)try{await api('/api/office-policy/tasks/'+p.taskId+'/revoke','POST',{}, {owner:true});}catch{}
  throw error;
 }finally{await api('/api/office-policy/runtime/lock','POST',{}, {owner:true});}
}
async function login(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw Error('office_login_requires_private_interactive_terminal_no_codes_in_chat');
 const checks=probeNetwork();if(checks.some(c=>!c.reachable))throw Error('office_network_allowlist_required_before_login');
 const bundle=realpathSync(client.settings.runnerBundle),binary=join(bundle,'bin','codex'),providerRoot=realpathSync(client.settings.providerRoot);
 if(!bundle.startsWith(providerRoot+sep)||!realpathSync(binary).startsWith(bundle+sep))throw Error('office_runner_outside_provider_root');
 if(textHash(readFileSync(binary))!==client.settings.runnerHash)throw Error('office_runner_hash_mismatch');
 if(!client.settings.providerHome||!existsSync(client.settings.providerHome))throw Error('office_scoped_auth_directory_required');
 const auth=realpathSync(client.settings.providerHome);if(auth===realpathSync(homedir())||!auth.startsWith(realpathSync(stateDir)+sep))throw Error('office_scoped_auth_directory_required');
 if(existsSync(join(auth,'.codex/auth.json')))retainOnlyProviderAuth({providerHome:auth,stateDir});
 const policy=await api('/api/office-policy/status');if(policy.authReady)return {authReady:true,alreadyAuthenticated:true,workersEnabled:policy.workersEnabled};if(!policy.enabled||policy.workersEnabled||policy.developmentEnabled)throw Error('office_lock_workers_before_login');
 const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>['PATH','HOME','USER','LANG','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY','http_proxy','https_proxy','all_proxy','no_proxy','SSL_CERT_FILE','SSL_CERT_DIR','NODE_EXTRA_CA_CERTS'].includes(k)));
 const argv=['--die-with-parent','--new-session','--unshare-pid','--unshare-ipc','--unshare-uts'];
 for(const dir of ['/usr','/bin','/sbin','/lib','/lib64','/opt','/etc/ssl','/etc/hosts','/etc/resolv.conf'])if(existsSync(dir))argv.push('--ro-bind',dir,dir);
 argv.push('--proc','/proc','--dev','/dev','--tmpfs','/tmp','--bind',auth,homedir(),'--ro-bind',bundle,'/run/office-provider','--chdir','/tmp','/run/office-provider/bin/codex','login','--device-auth');
 const result=await new Promise((resolve,reject)=>{const child=spawn('bwrap',argv,{env,stdio:'inherit'});child.on('error',reject);child.on('close',code=>resolve(code));});if(result!==0)throw Error('office_login_not_completed');
 retainOnlyProviderAuth({providerHome:auth,stateDir});
 const check=await api('/api/office-policy/runtime/check','POST',{}, {owner:true});if(!check.authReady)throw Error('office_login_not_ready:'+check.reasonCodes.join(','));
 return {authReady:true,workersEnabled:false,developmentEnabled:false};
}
try{
 if(command==='doctor')console.log(JSON.stringify(await doctor(),null,2));
 else if(command==='prepare')console.log(JSON.stringify(await prepare(),null,2));
 else if(command==='start')console.log(JSON.stringify(await start(),null,2));
 else if(command==='login')console.log(JSON.stringify(await login(),null,2));
 else if(command==='stop'){const p=await plan();try{await api('/api/tasks/'+p.taskId+'/stop','POST',{mode:'cancel'});}finally{await api('/api/office-policy/runtime/lock','POST',{}, {owner:true});}console.log(JSON.stringify({taskId:p.taskId,stopped:true,workersEnabled:false}));}
 else if(command==='report'){const p=await plan(),t=await taskFor(p),out=await api('/api/tasks/'+p.taskId+'/terminal?pretty=1&lines=20000');console.log(JSON.stringify({taskId:p.taskId,status:t.status,result:t.result??null,terminal:out},null,2));}
 else throw Error('Commands: prepare | doctor | login | start --confirm | stop | report (optional project name, default duckduck)');
}catch(error){console.error(error instanceof Error?error.message:'office_operation_failed');process.exitCode=1;}
