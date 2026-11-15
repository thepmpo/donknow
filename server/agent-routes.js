import {computerRoutes} from './agent-computer-routes.js';
import {fail} from './secrets.js';
const view=job=>{const {id,parentId,responsibilityId,title,goal,status,revision,progress,plan,summary,result,nextAt,createdAt,updatedAt,requirements,computerId,providers,channel,awaiting}=job;return {id,parentId,responsibilityId,title,goal,status,revision,progress,plan,summary,result,nextAt,createdAt,updatedAt,requirements,computerId,providers,channel:channel?.type,question:awaiting?.result?.question??null,actionId:awaiting?.result?.actionId??null,options:awaiting?.result?.options??[]};};
async function fileBody(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))throw fail(415,'JSON 파일 요청이 필요해요.');const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>17*1024*1024)throw fail(413,'파일은12MB 이내로 넣어주세요.');chunks.push(chunk);}try{const value=JSON.parse(Buffer.concat(chunks));if(!value||typeof value!=='object'||Array.isArray(value))throw Error();return value;}catch{throw fail(400,'파일 요청을 확인해주세요.');}}
export function createAgentRoutes({store,engine,assistant,computer,voice,channels,limited}){
 return async(req,path,url,user,json,send)=>{
  if(!path.startsWith('/api/agent/'))return false;if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
  if(await channels.routes(req,path,user,json,send))return true;
  if(await computerRoutes({store,computer,engine,req,path,url,user,json,send}))return true;
  if(req.method!=='GET'&&limited('agent:'+user.id))throw fail(429,'작업 요청이 많아요. 잠시 뒤 다시 해주세요.');
  const receipt=/^\/api\/agent\/chat\/([a-f\d-]{36})$/.exec(path);if(receipt){if(req.method==='GET'){send(200,store.agentChat(user.id,receipt[1]));return true;}if(req.method==='DELETE'){send(200,store.deleteAgentChat(user.id,receipt[1]));return true;}}
  if(path==='/api/agent/calls'&&req.method==='POST'){send(201,await voice.start(user.id,await json(req)));return true;}
  if(path==='/api/agent/profile'){
   if(req.method==='GET'){send(200,{profile:store.agentProfile(user.id),capabilities:engine.capabilities()});return true;}
   if(req.method==='PATCH'){const {consent,...body}=await json(req),actual=assistant.status(user.id).consentScopes,old=store.agentProfile(user.id);if(body.providers||body.proactive){if(consent!==true)throw fail(400,'선택한 자료로 지속 업무를 확인하는 데 동의해주세요.');}if(body.providers&&(!Array.isArray(body.providers)||body.providers.some(p=>!assistant.status(user.id).connections.some(c=>c.provider===p&&c.connected))))throw fail(400,'먼저 연결한 서비스에서 확인할 자료를 선택해주세요.');if(body.providers?.length===0)body.proactive=false;if(body.proactive===true&&!(body.providers??old.providers).length)throw fail(400,'먼저 확인할 자료를 선택해주세요.');const next=store.configureAgent(user.id,body,consent===true?actual:null);if(next.paused)engine.pauseOwner(user.id);if(body.voice===false)voice.closeUser(user.id);send(200,next);return true;}
  }
  if(path==='/api/agent/jobs'){
   if(req.method==='GET'){const result=store.agentJobs(user.id,{before:url.searchParams.get('before')});send(200,{...result,jobs:result.jobs.map(view)});return true;}
   if(req.method==='POST'){if(!engine.capabilities().enabled)throw fail(503,'AI 연결 설정을 먼저 완료해주세요.');send(202,view(await engine.start(user.id,await json(req))));return true;}
  }
  const job=/^\/api\/agent\/jobs\/([a-f\d-]{36})(?:\/(steps|steer|approve))?$/.exec(path);
  if(job){const [,id,action]=job;
   if(req.method==='GET'){send(200,action==='steps'?{steps:store.agentSteps(user.id,id).filter(s=>s.tool!=='model').map(({args,result,...s})=>({...s,result:result?{commandId:result.commandId,question:result.question,error:result.error,status:result.status,exitCode:result.exitCode,artifact:result.artifact,files:result.files}:null}))}:view(store.agentJob(user.id,id)));return true;}
   if(req.method==='DELETE'&&!action){const body=await json(req);if(body.confirmation!==true)throw fail(400,'삭제할 작업과 파일을 확인해주세요.');engine.stop(id);send(200,store.deleteAgentJob(user.id,id));return true;}
   if(req.method==='POST'&&action==='steer'){const body=await json(req);if(body.renewConsent===true){const j=store.agentJob(user.id,id),status=assistant.status(user.id);if(j.providers.some(p=>!status.connections.some(c=>c.provider===p&&c.connected)))throw fail(409,'사용할 서비스를 먼저 다시 연결해주세요.');engine.stop(id);store.renewAgentConsent(user.id,id,status.consentScopes);}send(200,view(await engine.steer(user.id,id,body.action,body.text??'')));return true;}
   if(req.method==='POST'&&action==='approve'){const body=await json(req);if(body.confirmation!==true)throw fail(400,'실행 내용을 확인해주세요.');send(200,view(await engine.approve(user.id,id,body.actionId)));return true;}
  }
  if(path==='/api/agent/responsibilities'){
   if(req.method==='GET'){send(200,{responsibilities:store.agentResponsibilities(user.id)});return true;}
   if(req.method==='POST'){const body=await json(req),scopes=assistant.status(user.id).consentScopes;send(201,store.saveAgentResponsibility(user.id,{...body,consentScopes:scopes}));return true;}
  }
  const duty=/^\/api\/agent\/responsibilities\/([a-f\d-]{36})$/.exec(path);if(duty){if(req.method==='PATCH'){send(200,store.saveAgentResponsibility(user.id,{...await json(req),consentScopes:assistant.status(user.id).consentScopes},duty[1]));return true;}if(req.method==='DELETE'){send(200,store.deleteAgentResponsibility(user.id,duty[1]));return true;}}
  if(path==='/api/agent/files'){
   if(req.method==='GET'){send(200,{files:store.agentArtifacts(user.id,url.searchParams.get('job')).filter(f=>!f.metadata?.internal)});return true;}
   if(req.method==='POST'){const body=await fileBody(req);send(201,store.saveAgentArtifact(user.id,{name:body.name,mime:body.mime,data:body.data,metadata:{input:true}}));return true;}
  }
  const file=/^\/api\/agent\/files\/([a-f\d-]{36})$/.exec(path);if(file){if(req.method==='GET'){send(200,store.agentArtifact(user.id,file[1],{content:url.searchParams.get('content')==='1'}));return true;}if(req.method==='DELETE'){send(200,store.deleteAgentArtifact(user.id,file[1]));return true;}}
  if(path==='/api/agent/rules'){if(req.method==='GET'){send(200,{rules:store.agentRules(user.id)});return true;}if(req.method==='POST'){send(201,store.saveAgentRule(user.id,{...await json(req),consentScopes:assistant.status(user.id).consentScopes}));return true;}}
  const rule=/^\/api\/agent\/rules\/([a-f\d-]{36})$/.exec(path);if(rule){if(req.method==='PATCH'){send(200,store.saveAgentRule(user.id,{...await json(req),consentScopes:assistant.status(user.id).consentScopes},rule[1]));return true;}if(req.method==='DELETE'){send(200,store.deleteAgentRule(user.id,rule[1]));return true;}}
  if(path==='/api/agent/notes'&&req.method==='GET'){send(200,{notes:store.agentPrivateNotes(user.id)});return true;}
  const note=/^\/api\/agent\/notes\/([a-f\d-]{36})$/.exec(path);if(note&&req.method==='DELETE'){send(200,store.deleteAgentNote(user.id,note[1]));return true;}
  if(path==='/api/agent/data'&&req.method==='DELETE'){const body=await json(req);if(body.confirmation!=='DELETE')throw fail(400,'진행 중인 작업·예약·파일·규칙 삭제를 확인해주세요.');for(const job of store.agentJobs(user.id,{limit:100}).jobs)engine.stop(job.id);send(200,store.clearAgentData(user.id));return true;}
  throw fail(404,'비서 기능을 찾을 수 없어요.');
 };
}
