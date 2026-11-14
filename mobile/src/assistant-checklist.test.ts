import {test} from 'node:test';
import assert from 'node:assert/strict';
import {saveChecklist} from './assistant-checklist.ts';
import type {ChecklistEntry} from './assistant-checklist.ts';
import type {AssistantDraft,AssistantProposal} from './useAssistant';
import type {Todo} from './domain';
const proposal:AssistantProposal={operation:'todo.create',label:'Todo 추가',args:{title:'검토하기',notes:'맥락 유지',dueDate:null},sourceRefs:[]};
function harness(){
 let active=true,capability=1,confirms=0,creates=0,updates=0;
 let failConfirm:'none'|'saved'|'unknown'|'pending'='none',hold:(()=>Promise<void>)|undefined;
 const todos:Todo[]=[],actions:AssistantDraft[]=[],calls:{path:string;method:string}[]=[];
 const ctx={current:()=>active,refresh:async()=>{},todo:(id:string)=>todos.find(t=>t.id===id),changed:()=>{},update:async(id:string,patch:{done:boolean})=>{updates++;Object.assign(todos.find(t=>t.id===id)!,patch);return true;},request:async(path:string,method='GET',body?:unknown):Promise<unknown>=>{
  calls.push({path,method});if(path==='/api/capabilities')return {assistantChecklist:capability};if(path==='/api/assistant/actions'&&method==='GET')return structuredClone({actions});
  if(path==='/api/assistant/actions'&&method==='POST'){creates++;const a={id:'a'+creates,operation:'todo.create',label:'Todo 추가',args:(body as {args:Record<string,unknown>}).args,status:'pending',expiresAt:Date.now()+600000};actions.push(a);if(hold)await hold();return structuredClone(a);}
  if(path.endsWith('/confirm')){confirms++;const a=actions.find(a=>path.includes('/'+a.id+'/'))!;if(failConfirm==='unknown'){a.status='unknown';throw Error('연결 끊김');}if(failConfirm==='pending')throw Error('연결 끊김');if(a.status!=='succeeded'){const todo:Todo={id:'t'+creates,title:String(a.args.title),notes:String(a.args.notes),dueDate:null,category:'업무',done:a.args.done===true};todos.push(todo);a.status='succeeded';a.result={todo};}if(failConfirm==='saved')throw Error('응답 유실');return structuredClone(a);}
  throw Error('Unexpected '+path);
 }};
 return {ctx,todos,actions,calls,counts:()=>({confirms,creates,updates}),active:(value:boolean)=>active=value,capability:(value:number)=>capability=value,fail:(value:typeof failConfirm)=>failConfirm=value,hold:(value:()=>Promise<void>)=>hold=value};
}
test('chat checkbox creates one completed record; right swipe then checkbox updates the same returned ID',async()=>{
 const h=harness(),entry:ChecklistEntry={};await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.todos.length,1);assert.equal(h.todos[0].done,true);assert.equal(entry.todoId,'t1');assert.equal(h.counts().updates,0);
 await saveChecklist(entry,proposal,true,h.ctx);assert.deepEqual(h.counts(),{creates:1,confirms:1,updates:0});await saveChecklist(entry,proposal,false,h.ctx);assert.equal(h.todos[0].done,false);await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.todos[0].done,true);assert.equal(h.counts().creates,1);assert.equal(h.counts().updates,2);
});
test('a Todo candidate uses its saved ID, not a different task with an identical title',async()=>{
 const h=harness(),entry:ChecklistEntry={};h.todos.push({id:'other',title:'검토하기',dueDate:null,category:'업무',done:false});await saveChecklist(entry,proposal,false,h.ctx);await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.todos.length,2);assert.equal(h.todos[0].done,false);assert.equal(h.todos[1].done,true);
});
test('double gesture while create is unresolved performs one prepare and one confirm',async()=>{
 const h=harness(),entry:ChecklistEntry={};let release!:()=>void;h.hold(()=>new Promise(r=>release=r));const first=saveChecklist(entry,proposal,false,h.ctx);while(!release)await Promise.resolve();await saveChecklist(entry,proposal,true,h.ctx);release();await first;assert.deepEqual(h.counts(),{creates:1,confirms:1,updates:0});assert.equal(h.todos[0].done,false);
});
test('lost confirmation acknowledgement reconciles success by the original action ID',async()=>{
 const h=harness(),entry:ChecklistEntry={};h.fail('saved');await saveChecklist(entry,proposal,true,h.ctx);assert.equal(entry.error,'');assert.equal(entry.todoId,'t1');await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.todos.length,1);assert.equal(h.counts().confirms,1);
});
test('uncertain execution is never replayed or replaced by a new create',async()=>{
 const h=harness(),entry:ChecklistEntry={};h.fail('unknown');await saveChecklist(entry,proposal,true,h.ctx);assert.ok(entry.error);await saveChecklist(entry,proposal,true,h.ctx);assert.deepEqual(h.counts(),{creates:1,confirms:1,updates:0});assert.equal(h.todos.length,0);assert.match(entry.error!,/중복/);
});
test('an explicit retry confirms the same still-pending action; opposite intent is not silently applied',async()=>{
 const h=harness(),entry:ChecklistEntry={};h.fail('pending');await saveChecklist(entry,proposal,true,h.ctx);assert.ok(entry.error);h.fail('none');await saveChecklist(entry,proposal,false,h.ctx);assert.equal(h.counts().creates,1);assert.equal(h.todos[0].done,true);assert.match(entry.error!,/다시 선택/);await saveChecklist(entry,proposal,false,h.ctx);assert.equal(h.todos[0].done,false);assert.equal(h.counts().creates,1);
});
test('owner change after preview prevents confirmation and cross-account follow-up',async()=>{
 const h=harness(),entry:ChecklistEntry={};let release!:()=>void;h.hold(()=>new Promise(r=>release=r));const first=saveChecklist(entry,proposal,true,h.ctx);while(!release)await Promise.resolve();h.active(false);release();await first;assert.equal(h.counts().confirms,0);assert.equal(h.todos.length,0);
});
test('old server and missing saved Todo never silently create another item',async()=>{
 const h=harness(),entry:ChecklistEntry={};h.capability(0);await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.counts().creates,0);assert.match(entry.error!,/최신 서버/);h.capability(1);entry.todoId='deleted';await saveChecklist(entry,proposal,true,h.ctx);assert.equal(h.counts().creates,0);assert.match(entry.error!,/찾지 못/);
});
