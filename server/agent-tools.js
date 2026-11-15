import {createHash} from 'node:crypto';
import {fail} from './secrets.js';
import {reviewAgentAction,guardAgentScope,safeCitation} from './agent-policy.js';
import {buildAgentFileAsync as buildAgentFile} from './agent-file-queue.js';
const definition=(name,description)=>({type:'function',name,description,strict:true,parameters:{type:'object',properties:{argsJson:{type:'string',description:'도구 설명에 맞는 JSON 객체'}},required:['argsJson'],additionalProperties:false}});
export const agentToolDefinitions=[
 definition('search_sources','연결 자료 전체 검색/다음 페이지. {provider:google|slack|notion|naver,query,kind:documents|mail|calendar|tasks|database,connectionId?,channel?,cursor?}. 필요한 자료를 찾을 때까지 이어 검색한다.'),
 definition('read_source','검색으로 확인한 자료 읽기. {ref,cursor?,range?}. ref는 검색 결과의 provider:id. Sheets는 먼저 시트 목록을 읽고 range로 셀을 읽는다. 긴 문서는 cursor로 끝까지 이어 읽는다.'),
 definition('read_work_log','현재 작업의 원래 도구 결과를 이어 읽는다. {before?:stepId}. 요약 이전의 정확한 원본 근거를 다시 확인할 때 사용한다.'),
 definition('list_files','내 작업 파일 목록. {jobId?:string}. 파일 id를 읽기/분석/수정할 수 있다.'),
 definition('read_file','내 파일 읽기. {id,offset?:number}. Office 텍스트·표와 일반 텍스트를 읽고 PDF/이미지는 분석 입력에 연결한다.'),
 definition('create_file','실제 파일 만들기/수정본 보관. {name,format:md|txt|csv|json|html|docx|xlsx|pptx|pdf,title,content:string,sourceRefs?:string[]}. 이전 파일을 지우지 않고 새 버전을 만든다. CSV/Excel은 content에 JSON 배열의 행을 넣을 수 있다.'),
 definition('request_action','원본 자료 수정/발송/할 일 저장. {operation,args:object,sourceRefs:string[]}. 실제 권한·규칙으로 자동 심사하며 필요할 때 사용자 승인 대기한다. 실행 결과가 확인되기 전 완료라고 하지 않는다.'),
 definition('delegate_task','독립된 일을 배경 작업으로 위임. {title,goal,requirements?:string[]}. 현재 자료·권한을 넘기며 자기 작업 결과를 받는다. 실행기에서 최대3개를 동시에 처리한다.'),
 definition('inspect_task','내가 위임했거나 사용자가 지정한 작업 확인. {id}. 자식 작업의 결과·파일·중지 상태를 확인한다.'),
 definition('steer_task','작업 후속 지시/중지/재개. {id,action:message|pause|resume|cancel,text?}.'),
 definition('remember_work','현재 작업의 확인된 결정/진행을 비공개 작업 노트로 저장. {text,sourceRefs:string[]}. 개인 사실을 꾸미지 않는다. 원본 문서를 수정하거나 타인에게 발송하지 않는다.'),
 definition('search_memory','모든 내 대화/기억/작업 노트의 관련 문맥 검색. {query}. 비공개 문맥 사용이 허용된 작업에서만 사용할 수 있다.'),
 definition('run_code','연결된 격리 컴퓨터에서 코드/데이터 분석/소프트웨어 작업. {language:python|javascript|shell,code,files?:string[]}. 파일 ID만 전달하며 호스트의 비밀값/임의 파일은 볼 수 없다. /input은 선택 파일 읽기 전용이고 /output은 같은 컴퓨터의 이 작업에서만 이어 쓰는 작업 폴더다. 전달할 결과는 /output 루트에 저장하고 프로젝트는 zip으로 묶어라. 파일 분석도 이 도구를 사용할 수 있다.'),
 definition('computer','내 컴퓨터의 브라우저/화면에서 작업. {surface:browser|desktop,operation:navigate|screenshot|actions, ...}. actions는 click,double_click,move,scroll,keyPress,type,drag,wait,upload 배열. upload는 {type:upload,fileIds:내 파일 ID[],selector?:input[type=file]}로 실제 내 파일만 올린다. 로그인/권한 결정이 필요하면 사용자에게 컴퓨터를 넘긴다. 확인 없이 계정 변경/발송/결제를 하지 않는다.'),
 definition('ask_user','작업을 계속하는 데 꼭 필요한 결정/정보 하나를 요청. {question,options?:string[]}. 답을 받을 때까지 이 작업만 기다리며 다른 작업은 계속된다.'),
 definition('sleep_until','상황을 기다렸다가 스스로 다시 확인. {at:ISO8601,reason}. 반복 예약과 다르며 최대7일 뒤까지 깨울 수 있다. 위임 작업을 기다릴 때도 사용한다.'),
 definition('complete_work','결과 검토 후 작업 완료. {summary,sourceRefs:string[],artifactIds:string[],checklist?:[{title,notes?,dueDate?}],checks:[{criterion,evidence:string[]}],significant?:boolean,nextCheckAt?:ISO8601}. 실제 도구 결과/파일 근거를 확인한다. 요청한 파일·코드 실행 근거가 없으면 완료할 수 없다.')
];
export function createAgentTools({store,assistant,integrations,memory,computer}){
 return {async call(run,call){
  guardAgentScope(store,assistant,run);let args;try{const input=JSON.parse(call.arguments);args=JSON.parse(input.argsJson);if(!args||typeof args!=='object'||Array.isArray(args)||JSON.stringify(args).length>120000)throw Error();}catch{const result={error:'도구 인자를 확인해주세요.',status:400,retryable:false},step=store.beginAgentStep(run,call.call_id,call.name,{});store.finishAgentStep(run,step.id,result,'failed');return {result};}
  const step=store.beginAgentStep(run,call.call_id,call.name,args);run.verified??={};
  if(step.status==='succeeded'||step.status==='failed'){if(step.status==='succeeded'&&step.result?.screenFile)run.pendingFiles=[...new Set([...(run.pendingFiles??[]),step.result.screenFile.id])];return {result:step.result,...(step.status==='succeeded'&&call.name==='complete_work'?{complete:true}:{}),...(step.status==='succeeded'&&call.name==='sleep_until'&&step.result.at>Date.now()?{sleep:step.result.at}:{})};}
  if(step.status==='waiting_computer'&&step.result?.commandId){const value=computer?.resultForStep(run,step.id);if(value?.done){if(value.result.screenFile){run.pendingFiles=[...new Set([...(run.pendingFiles??[]),value.result.screenFile.id])];}store.reviseAgentStep(run.userId,run.id,step.id,{result:value.result},value.result.error?'failed':'succeeded');return {result:value.result};}return {wait:'waiting_computer',result:step.result};}
  if(['waiting_approval','awaiting_action'].includes(step.status)){
   const action=store.assistantAction(run.userId,step.result.actionId);if(action?.status==='succeeded'){const result={...step.result,status:'succeeded',result:action.result};store.reviseAgentStep(run.userId,run.id,step.id,{result},'succeeded');return {result};}
   if(action?.status==='pending')return {wait:'waiting_approval',result:step.result};return {wait:'waiting_input',result:{...step.result,status:action?.status??'unknown',question:'원본 실행 결과를 확인한 뒤 다음 지시를 알려주세요.'}};
  }
  if(step.status==='running'&&['request_action','run_code','computer'].includes(call.name))return {wait:'waiting_input',result:{question:'중단된 실행의 결과를 확인해야 해요. 같은 작업을 다시 실행하지 않았어요.',stepId:step.id}};
  const done=result=>{store.finishAgentStep(run,step.id,result);return {result};};
  const refs=values=>{if(!Array.isArray(values)||values.some(ref=>typeof ref!=='string'||!Object.hasOwn(run.verified,ref)))throw fail(400,'실제로 확인한 근거만 사용해주세요.');return values;};
  try{
   if(call.name==='search_sources'){
    if(!run.providers.includes(args.provider)||!['google','notion','slack','naver'].includes(args.provider))throw fail(403,'선택한 서비스에서 검색해주세요.');
    const result=await integrations.searchAgentSources(run.userId,args);guardAgentScope(store,assistant,run);for(const item of result.items){const ref=args.provider+':'+item.id;run.verified[ref]={...item,provider:args.provider,ref,read:false,partial:true};}return done(result);
   }
   if(call.name==='read_source'){
    const source=Object.hasOwn(run.verified,args.ref)?run.verified[args.ref]:null;if(!source)throw fail(403,'검색으로 확인한 자료를 읽어주세요.');
    const result=await integrations.readAgentSource(run.userId,{provider:source.provider,id:source.id??source.ref.slice(source.provider.length+1),cursor:args.cursor??null,range:args.range??null});guardAgentScope(store,assistant,run);source.read=true;source.partial=!!result.partial;source.text=String(result.text??'').slice(0,22000);
    if(result.items)for(const item of result.items){if(typeof item.id==='string'){const ref=source.provider+':'+item.id;run.verified[ref]={...item,provider:source.provider,ref,read:!!item.text};}}
    if(result.binary){const file=store.saveAgentArtifact(run.userId,{jobId:run.id,...result.binary,sourceRefs:[args.ref],metadata:{input:true}});delete result.binary;result.file=file;source.read=false;run.pendingFiles=[...new Set([...(run.pendingFiles??[]),file.id])];}
    return done({...result,ref:args.ref});
   }
   if(call.name==='read_work_log'){const all=store.agentSteps(run.userId,run.id).filter(s=>s.tool!=='model'&&s.id!==step.id),i=args.before?all.findIndex(s=>s.id===args.before):0;if(i<0)throw fail(404,'작업 기록 위치를 확인해주세요.');const page=all.slice(i,i+8).map(({args,...s})=>({...s,result:JSON.stringify(s.result??{}).length>20000?{notice:'원본 자료 읽기 도구로 다시 확인해주세요.',preview:JSON.stringify(s.result).slice(0,18000)}:s.result}));return done({steps:page,next:i+8<all.length?all[i+8].id:null});}
   if(call.name==='list_files')return done({files:store.agentArtifacts(run.userId,args.jobId??null)});
   if(call.name==='read_file'){
    const file=store.agentArtifact(run.userId,args.id,{content:true});const offset=Number.isInteger(args.offset)&&args.offset>=0?args.offset:0;
    if(/\.(docx|xlsx|pptx)$/i.test(file.name)){const {readOfficeDocument}=await import('./office-document.js');const value=readOfficeDocument(Buffer.from(file.data,'base64'),file.name);run.verified['file:'+file.id]={id:file.id,provider:'file',read:true,title:file.name,ref:'file:'+file.id};return done({...value,text:value.text.slice(offset,offset+20000),nextOffset:offset+20000<value.text.length?offset+20000:null,ref:'file:'+file.id});}
    if(file.mime.startsWith('text/')||/\.(json|csv|md|txt)$/i.test(file.name)){const text=Buffer.from(file.data,'base64').toString('utf8');run.verified['file:'+file.id]={id:file.id,provider:'file',read:true,title:file.name,ref:'file:'+file.id};return done({text:text.slice(offset,offset+20000),nextOffset:offset+20000<text.length?offset+20000:null,ref:'file:'+file.id});}
    run.pendingFiles=[...new Set([...(run.pendingFiles??[]),file.id])];run.verified['file:'+file.id]={id:file.id,provider:'file',read:true,title:file.name,ref:'file:'+file.id};return done({file:{id:file.id,name:file.name,mime:file.mime},analysisInput:true,notice:'다음 모델 입력에 실제 PDF/이미지/분석 파일을 넣어요.'});
   }
   if(call.name==='create_file'){
    if(!store.agentProfile(run.userId).files)throw fail(403,'파일 생성 사용을 켜주세요.');const sourceRefs=refs(args.sourceRefs??[]),file=await buildAgentFile(args);guardAgentScope(store,assistant,run);const artifact=store.saveAgentArtifact(run.userId,{jobId:run.id,...file,sourceRefs,metadata:{...file.metadata,idempotencyKey:'step:'+run.id+':'+step.id}});return done({artifact});
   }
   if(call.name==='request_action'){
    const sourceRefs=refs(args.sourceRefs??[]),decision=reviewAgentAction({operation:args.operation,args:args.args,job:run,rules:store.agentRules(run.userId),available:assistant.status(run.userId).actions.filter(a=>a.provider==='todo'||run.providers.includes(a.provider))});if(decision.decision==='handoff'){store.finishAgentStep(run,step.id,{...decision},'needs_user');return {wait:'waiting_input',result:{question:decision.reason,operation:args.operation}};}
    const draft=await assistant.prepare(run.userId,args.operation,args.args);store.linkAgentAction?.(run.userId,run.id,draft.id);guardAgentScope(store,assistant,run);const result={actionId:draft.id,decision,sourceRefs};store.finishAgentStep(run,step.id,result,'awaiting_action');
    const currentReview=reviewAgentAction({operation:args.operation,args:args.args,job:run,rules:store.agentRules(run.userId),available:assistant.status(run.userId).actions});if(decision.decision!=='allow'||currentReview.decision!=='allow'||currentReview.ruleId!==decision.ruleId)return {wait:'waiting_approval',result:{...result,question:'실행할 내용을 확인해주세요.'}};
    // Persist the provider action ID BEFORE executing; interrupted writes are never blindly repeated.
    const executed=await assistant.confirm(run.userId,draft.id,true,()=>{try{guardAgentScope(store,assistant,run);const latest=reviewAgentAction({operation:args.operation,args:args.args,job:run,rules:store.agentRules(run.userId),available:assistant.status(run.userId).actions});return latest.decision==='allow'&&latest.ruleId===currentReview.ruleId;}catch{return false;}});const final={...result,status:executed.status,result:executed.result};store.reviseAgentStep(run.userId,run.id,step.id,{result:final},executed.status==='succeeded'?'succeeded':'needs_user');return executed.status==='succeeded'?{result:final}:{wait:'waiting_input',result:final};
   }
   if(call.name==='delegate_task'){
    if(run.mode==='research'&&args.requirements?.some(x=>x==='code'||x==='computer'))throw fail(403,'자료 조사는 읽기 작업만 위임할 수 있어요.');if(run.parentId&&store.agentJob(run.userId,run.parentId).parentId)throw fail(409,'위임 단계가 깊어졌어요. 현재 작업에서 처리해주세요.');
    const key='child:'+run.id+':'+call.call_id,child=store.createAgentJob(run.userId,{goal:args.goal,userRequest:run.userRequest,title:args.title,requestKey:key,parentId:run.id,responsibilityId:run.responsibilityId,providers:run.providers,consent:true,consentScopes:run.consentScopes,channel:{type:'app',audience:'owner'},allowPrivateContext:run.allowPrivateContext,requirements:args.requirements??[],computerId:run.computerId,mode:run.mode});return done({jobId:child.id,status:child.status,title:child.title});
   }
   if(call.name==='inspect_task'){const child=store.agentJob(run.userId,args.id);return done({id:child.id,title:child.title,status:child.status,summary:child.summary,result:child.result,files:store.agentArtifacts(run.userId,child.id)});}
   if(call.name==='steer_task'){const child=store.agentJob(run.userId,args.id);if(child.parentId!==run.id)throw fail(403,'이 작업이 위임한 일만 변경할 수 있어요.');const updated=store.steerAgentJob(run.userId,child.id,args.action,args.text??'');return done({id:updated.id,status:updated.status});}
   if(call.name==='remember_work'){const sourceRefs=refs(args.sourceRefs);store.saveAgentPrivateNote(run.userId,'job:'+run.id,args.text,sourceRefs);return done({saved:true});}
   if(call.name==='search_memory'){if(!run.allowPrivateContext)throw fail(403,'이 대화에 개인 기억을 공유할 수 없어요.');const result=memory?await memory.search(run.userId,args.query):store.searchConversation(run.userId,args.query);if(result.turns?.length)run.privateContextUsed=true;for(const t of result.turns??[]){const ref=t.ref??'conversation:'+t.id;run.verified[ref]={...t,ref,read:true,provider:'memory'};}return done(result);}
   if(call.name==='run_code'||call.name==='computer'){
    if(run.mode==='research')throw fail(403,'자료 조사는 컴퓨터나 실행 도구를 사용하지 않아요.');if(!computer) return {wait:'waiting_computer',result:{question:'사용할 컴퓨터를 연결해주세요.'}};
    const result=await computer.request(run,call.name,args,step.id);if(result.wait){store.reviseAgentStep(run.userId,run.id,step.id,{result},'waiting_computer');return {wait:'waiting_computer',result};}return done(result);
   }
   if(call.name==='ask_user'){
    if(typeof args.question!=='string'||!args.question.trim()||args.question.length>2000||args.options!==undefined&&(!Array.isArray(args.options)||args.options.some(o=>typeof o!=='string'||o.length>200)))throw fail(400,'필요한 질문 하나를 적어주세요.');if(/비밀번호|인증번호|API.?키|password|verification code|api.?key/i.test(args.question))throw fail(400,'로그인·비밀값은 컴퓨터의 비공개 인계 화면에서 사용자가 직접 입력하게 하세요.');store.finishAgentStep(run,step.id,{question:args.question,options:(args.options??[]).slice(0,5)},'needs_user');return {wait:'waiting_input',result:{question:args.question,options:(args.options??[]).slice(0,5)}};
   }
   if(call.name==='sleep_until'){
    const at=Date.parse(args.at);if(!Number.isFinite(at)||at<Date.now()+30000||at>Date.now()+7*86400000)throw fail(400,'다시 확인할 시각을30초~7일 안으로 정해주세요.');return {sleep:at,...done({at,reason:String(args.reason??'상황을 기다린 뒤 다시 확인해요.').slice(0,1000)})};
   }
   if(call.name==='complete_work'){
    const sourceRefs=refs(args.sourceRefs??[]);if(sourceRefs.some(ref=>!run.verified[ref].read))throw fail(409,'검색 결과나 파일 이름만으로 완료하지 말고 실제 내용을 먼저 확인해주세요.');if(typeof args.summary!=='string'||!args.summary.trim()||args.summary.length>20000||!Array.isArray(args.artifactIds)||!Array.isArray(args.checks)||!args.checks.length)throw fail(400,'실제 결과와 확인 근거를 남겨주세요.');const files=args.artifactIds.map(id=>store.agentArtifact(run.userId,id));const steps=store.agentSteps(run.userId,run.id);
    if(run.requirements.includes('file')&&!files.length)throw fail(409,'요청한 실제 파일을 먼저 만들어주세요.');if(run.requirements.includes('code')&&!steps.some(s=>s.status==='succeeded'&&s.tool==='run_code'&&s.result?.exitCode===0)&&!run.hostedCodeSucceeded)throw fail(409,'실제 코드 실행 결과를 먼저 확인해주세요.');
    if(run.requirements.includes('computer')&&!steps.some(s=>s.tool==='computer'&&s.status==='succeeded'&&!s.result?.error))throw fail(409,'실제 컴퓨터 작업 결과를 확인해주세요.');if((run.mode==='research'||run.requirements.includes('research'))&&!Object.values(run.verified).some(s=>s.read)&&!steps.some(s=>s.status==='succeeded'&&s.tool==='search_sources'&&Array.isArray(s.result?.items)&&s.result.items.length===0&&!s.result.nextCursor&&!s.result.partial))throw fail(409,'조사한 원문을 먼저 확인해주세요.');
    if(run.requirements.includes('file')&&!files.some(f=>{if(!f.jobId)return false;let owner=store.agentJob(run.userId,f.jobId);for(let n=0;n<3;n++){if(owner.id===run.id)return true;if(!owner.parentId)break;owner=store.agentJob(run.userId,owner.parentId);}return false;}))throw fail(409,'이번 작업에서 만든 결과 파일을 확인해주세요.');const evidence=new Set([...Object.keys(run.verified).filter(ref=>run.verified[ref].read),...files.map(f=>'file:'+f.id),...steps.filter(s=>s.status==='succeeded').map(s=>'step:'+s.id)]);if(args.checks.some(c=>!c.criterion||!Array.isArray(c.evidence)||!c.evidence.length||c.evidence.some(e=>!evidence.has(e))))throw fail(400,'검증한 결과를 근거로 연결해주세요.');
    if(run.mode==='research'&&typeof args.significant!=='boolean')throw fail(400,'지금 알려야 할 중요한 변화인지 significant 값으로 판단해주세요.');const nextCheckAt=args.nextCheckAt?Date.parse(args.nextCheckAt):null;if(args.nextCheckAt&&(!Number.isFinite(nextCheckAt)||nextCheckAt<Date.now()+300000||nextCheckAt>Date.now()+7*86400000))throw fail(400,'다음 확인은5분~7일 안으로 정해주세요.');const result={nextCheckAt,summary:args.summary,significant:args.significant!==false,sourceRefs,files,checks:args.checks,citations:(run.citations??[]).filter(c=>safeCitation(c.url)),checklist:(args.checklist??[]).filter(i=>typeof i.title==='string'&&i.title.trim()).slice(0,40).map((i,n)=>({key:createHash('sha256').update('agent:'+run.id+':'+n).digest('hex'),title:i.title.slice(0,120),notes:String(i.notes??'').slice(0,4000),dueDate:/^\d{4}-\d{2}-\d{2}$/.test(i.dueDate??'')?i.dueDate:null,sourceRefs}))};store.finishAgentStep(run,step.id,result);return {complete:true,result};
   }
   throw fail(400,'지원하지 않는 작업 도구예요.');
  }catch(error){if(call.name==='read_source'&&error.status===404&&Object.hasOwn(run.verified,args.ref))Object.assign(run.verified[args.ref],{read:true,partial:false,deleted:true});const result={error:error.status?error.message:'도구 실행을 확인하지 못했어요.',status:error.status??502,retryable:error.status===429||error.status>=500};store.finishAgentStep(run,step.id,result,'failed');return {result};}
 }};
}
