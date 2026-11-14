import {parseTodos,validateDraft} from './domain.ts';
import type {Todo} from './domain.ts';
import type {AssistantDraft,AssistantProposal} from './useAssistant';

export type ChecklistEntry={excluded?:boolean;todoId?:string;action?:AssistantDraft;busy?:boolean;error?:string};
type Context={request:(path:string,method?:string,body?:unknown)=>Promise<unknown>;current:()=>boolean;refresh:()=>Promise<void>;todo:(id:string)=>Todo|undefined;update:(id:string,patch:{done:boolean})=>Promise<boolean>;changed:()=>void};
const resultTodo=(action:AssistantDraft)=>{
 const value=action.result?.todo;
 if(!value||typeof value!=='object')throw new Error('저장 결과를 확인하지 못했어요. 다시 확인해주세요.');
 return parseTodos([value])[0];
};
/** Only an explicit checkbox/swipe/button calls this. No title-based matching or external writes. */
export async function saveChecklist(entry:ChecklistEntry,proposal:AssistantProposal,done:boolean,ctx:Context){
 if(entry.busy||!ctx.current())return;
 entry.busy=true;entry.error='';ctx.changed();
 const check=()=>{if(!ctx.current())throw new Error('계정이나 연결이 바뀌었어요.');};
 async function reconcile(){
  const response=await ctx.request('/api/assistant/actions') as {actions:AssistantDraft[]};check();
  const action=response.actions.find(a=>a.id===entry.action?.id);
  if(!action)throw new Error('저장 결과를 찾지 못했어요. 목록을 다시 확인해주세요.');
  entry.action=action;return action;
 }
 function accept(action:AssistantDraft){const todo=resultTodo(action);entry.todoId=todo.id;entry.excluded=false;return todo;}
 try{
  // A lost acknowledgement must be read back by its original action ID first.
  // Never make another create draft when that action is running or uncertain.
  if(entry.action&&!entry.todoId){
   const action=await reconcile();
   if(action.status==='succeeded')accept(action);
   else if((['failed','cancelled','expired','restored-cancelled'].includes(action.status)||(action.status==='pending'&&action.expiresAt<=Date.now())))entry.action=undefined;
   else if(action.status!=='pending')throw new Error('저장 결과를 확인 중이에요. 중복 추가하지 않고 잠시 뒤 다시 확인해주세요.');
  }
  if(entry.todoId){
   // The returned server ID is the identity. Same titles may be different tasks.
   await ctx.refresh();check();
   const todo=ctx.todo(entry.todoId);
   if(!todo)throw new Error('연결된 할 일을 찾지 못했어요. Todo와 log를 확인해주세요.');
   if(todo.done!==done){if(!await ctx.update(todo.id,{done}))throw new Error('상태를 저장하지 못했어요. 현재 목록을 확인하고 다시 시도해주세요.');check();}
   entry.excluded=false;return;
  }
  if(!entry.action){
   const capabilities=await ctx.request('/api/capabilities') as {assistantChecklist?:number};check();
   if(capabilities.assistantChecklist!==1)throw new Error('채팅 할 일 저장을 지원하는 최신 서버가 필요해요.');
   if(proposal.operation!=='todo.create')throw new Error('할 일 후보만 저장할 수 있어요.');
   const draft=validateDraft({title:String(proposal.args.title??''),dueDate:typeof proposal.args.dueDate==='string'?proposal.args.dueDate:null,notes:String(proposal.args.notes??''),category:'업무'});
   entry.action=await ctx.request('/api/assistant/actions','POST',{operation:'todo.create',args:{title:draft.title,dueDate:draft.dueDate,notes:draft.notes,done}}) as AssistantDraft;check();ctx.changed();
  }
  let action:AssistantDraft;
  try{
   action=await ctx.request(`/api/assistant/actions/${encodeURIComponent(entry.action.id)}/confirm`,'POST',{confirmation:true}) as AssistantDraft;check();
  }catch(error){check();action=await reconcile();if(action.status!=='succeeded')throw error;}
  entry.action=action;
  if(action.status!=='succeeded')throw new Error('저장 결과를 확인 중이에요. 잠시 뒤 다시 확인해주세요.');
  const todo=accept(action);
  await ctx.refresh();check();
  // Retry reconciles the first intent. A different gesture must be explicit again.
  if(todo.done!==done)entry.error='이전 요청의 저장을 확인했어요. 원하는 동작을 다시 선택해주세요.';
 }catch(error){if(ctx.current())entry.error=error instanceof Error?error.message:'저장하지 못했어요. 다시 확인해주세요.';}
 finally{entry.busy=false;if(ctx.current())ctx.changed();}
}
