import {adminToken} from './admin-auth-routes.js';
import {adminPermissions} from './admin-operations.js';
import {fail} from './secrets.js';
import {assistantNotice} from './assistant-notices.js';
export async function adminManagementRoute(req,path,user,store,integrations,taskSync,json,send,limited,address){
 if(req.method==='GET')return false;
 if(user.mustChangePassword)throw fail(403,'임시 비밀번호를 먼저 변경해주세요.');
 if(!['POST','PATCH'].includes(req.method))return false;
 if(limited('admin-write:'+address))throw fail(429,'운영 변경 요청이 많아요. 잠시 뒤 다시 시도해주세요.');
 const operator=/^\/api\/admin\/operators(?:\/([a-f0-9-]{36}))?$/.exec(path);
 if(operator){if(user.role!=='owner')throw fail(403,'총관리자만 운영자 권한을 관리할 수 있어요.');const body=await json(req);Object.defineProperty(body,'sessionToken',{value:adminToken(req),enumerable:false});send(200,await store.adminSaveOperator(user,operator[1],body));return true;}
 const target=/^\/api\/admin\/members\/([a-f0-9-]{36})\/(.+)$/.exec(path);if(!target)return false;
 const id=target[1],action=target[2],body=await json(req);let result;
 if(action==='status'&&req.method==='POST')result=store.adminSetStatus(user,id,body);
 else if(action==='sessions/revoke'&&req.method==='POST')result=store.adminRevokeSessions(user,id,body);
 else if(action==='passes'&&req.method==='POST')result=store.adminGrantPass(user,id,body);
 else if(/^passes\/[a-f0-9-]{36}$/.test(action)&&req.method==='PATCH')result=store.adminChangePass(user,id,action.slice(7),body);
 else if(/^sync\/tasks\/[a-f0-9-]{36}\/retry$/.test(action)&&req.method==='POST'){
  const todoId=action.split('/')[2],todo=store.get(id,todoId),record=store.connections(id,'google').find(r=>todo?.source?.externalId?.startsWith((r.connectionId??'legacy')+':tasks:'));
  if(!record?.taskSyncEnabled||!record.features.includes('tasksWrite'))throw fail(409,'회원이 Google Tasks 동기화와 수정 권한을 승인해야 해요.');result=store.adminRetryTask(user,id,todoId,body);taskSync.wake();
 }
 else if(/^sync\/source\/[a-f0-9-]{36}\/retry$/.test(action)&&req.method==='POST')result=store.adminRetrySource(user,id,action.split('/')[2],body);
 else if(/^sync\/device\/[a-f0-9-]{36}\/notify$/.test(action)&&req.method==='POST'){
  result=store.adminOperate(user,'sync.device.notify',id,body,'sync.retry',()=>{if(!store.accountActive(id))throw fail(409,'정지된 회원에게 안내를 보낼 수 없어요.');const todo=store.get(id,action.split('/')[2]);if(todo?.source?.provider!=='apple-reminders')throw fail(404,'기기에서 처리할 작업을 찾지 못했어요.');assistantNotice(store,id,{code:'device-required',provider:'apple-reminders',title:todo.title,todoId:todo.id});return {notified:true,requiresDevice:true};});
 }
 else if(/^connections\/[^/]+\/(check|refresh)$/.test(action)&&req.method==='POST'){
  if(!adminPermissions(user.role).includes('connections.check'))throw fail(403,'연결 점검 권한이 없어요.');
  const key=decodeURIComponent(action.split('/')[1]),row=store.adminConnectionRows(id).find(c=>c.connectionKey===key);if(!row)throw fail(404,'연결을 찾지 못했어요.');const op=action.endsWith('/check')?'connection.check':'connection.refresh',cached=store.adminValidateOperation(user,op,id,body,'connections.check');if(cached){send(200,cached);return true;}
  if(!store.accountActive(id))throw fail(409,'정지된 회원의 연결은 점검하지 않아요.');
  const record=store.connectionByKey(id,key);
  if(!record)throw fail(409,'연결 정보가 바뀌었어요. 다시 확인해주세요.');
  let check,refreshed;
  try{
   if(!['google','slack','notion'].includes(row.provider))check={state:'unsupported',code:'user-device-or-reconnect-required'};
   else {await integrations.diagnose(id,row.provider,record.connectionId);check={state:'healthy',code:'authenticated'};if(action.endsWith('/refresh')){const choices=row.provider==='google'?['calendar','tasks','drive','gmail']:row.provider==='slack'?['channels']:['pages'],feature=choices.find(f=>record.features.includes(f));if(!feature)throw fail(409,'읽기 권한을 다시 승인해야 해요.');const page=await integrations.resources(id,row.provider,feature,undefined,undefined,'incomplete',undefined,record.connectionId);refreshed={feature,count:page.items.length,hasMore:!!page.hasMore};}}
  }catch(e){check={state:'failed',code:e.status===401||e.status===403?'reconnect-required':e.status===409?'connection-changed':'provider-unavailable'};}
  const fresh=store.adminSession(adminToken(req));if(!fresh||fresh.user.id!==user.id||fresh.user.mustChangePassword||!adminPermissions(fresh.user.role).includes('connections.check'))throw fail(403,'운영자 로그인을 다시 확인해주세요.');
  if(store.connectionByKey(id,key)?.connectionId!==record.connectionId)throw fail(409,'연결이 바뀌었어요. 다시 확인해주세요.');
  if(action.endsWith('/check'))result=store.adminRecordCheck(fresh.user,id,key,body,check);
  else result=store.adminOperate(fresh.user,op,id,body,'connections.check',()=>{if(check.state!=='healthy')throw fail(409,'연결 재승인 또는 기기 확인이 필요해요. 먼저 연결 상태를 확인해주세요.');const scheduled=store.wakeAssistantMonitor?.(id)??false;return {refreshed,monitorScheduled:scheduled,requiresExistingConsent:true};});
 }
 else return false;
 send(200,result);return true;
}
