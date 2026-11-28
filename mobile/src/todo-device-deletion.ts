import {requireOptionalNativeModule} from 'expo';
import type {Todo} from './domain';
import type {createDeviceTodos,QueuedTodoDelete} from './todo-device-queue';
import {isDeviceTodo} from './todo-device-queue';
import {isAppleReminderPreview} from './apple-reminder-view';

type Request=(path:string,method?:string,body?:unknown)=>Promise<unknown>;

export function matchesTodoDeletion(todo:Todo,job:QueuedTodoDelete){
 return (todo.id===job.id||todo.id===job.resolvedId)||!!job.appleId&&todo.source?.provider==='apple-reminders'&&todo.source.externalId===job.appleId;
}

export async function missingAppleReminder(id:string){
 const Calendar=await import('expo-calendar');
 if(!(await Calendar.getRemindersPermissions()).granted)return false;
 try{await Calendar.ExpoCalendarReminder.get(id);return false;}
 catch(error){return (error as {code?:string})?.code==='ERR_REMINDER_NOT_FOUND';}
}

export async function sendTodoDeletion(owner:string,job:QueuedTodoDelete,device:ReturnType<typeof createDeviceTodos>,request:Request,current:()=>boolean){
 if(!current())return;
 const {id}=job;
 let target=job;
 if(isDeviceTodo(id)){
  const requestKey=id.slice('device-todo:'.length);
  const {todo}=await request('/api/todo-create-cancellations','POST',{requestKey}) as {todo:Todo|null};
  if(!current())return;
  if(!todo){
   await device.queue.remove(owner,requestKey);
   if(current())await device.deletes.remove(owner,id);
   return job;
  }
  const appleId=todo.source?.provider==='apple-reminders'?todo.source.externalId:undefined;
  target={...job,resolvedId:todo.id,sourceId:todo.source?.externalId??null,appleId,
   appleDeleted:appleId===job.appleId&&job.appleDeleted};
  await device.deletes.change(owner,id,()=>target);
 }
 const {sourceId,appleId}=target;
 if(appleId&&!target.appleDeleted){
  const native=requireOptionalNativeModule<{remove?:(id:string)=>Promise<void>}>('DuckduckReminderMove');
  if(!current())return;
  if(native?.remove)await native.remove(appleId);
  else {
   const Calendar=await import('expo-calendar');
   if(!(await Calendar.getRemindersPermissions()).granted)throw Error('아이폰의 미리알림 접근을 허용해주세요.');
   let source;
   try{source=await Calendar.ExpoCalendarReminder.get(appleId);}
   catch(error){
    if((error as {code?:string})?.code!=='ERR_REMINDER_NOT_FOUND')throw error;
   }
   if(!current())return;
   await source?.delete();
  }
  if(!current())return;
  await device.deletes.change(owner,id,entry=>({...entry,appleDeleted:true}));
 }
 if(!current())return;
 await request('/api/todo-deletions','POST',{id:isAppleReminderPreview(id)?null:target.resolvedId??id,sourceId,appleId});
 if(current()&&isDeviceTodo(id))await device.queue.remove(owner,id.slice('device-todo:'.length));
 if(!current())return;
 for(const edit of await device.edits.read(owner)){
  if(!current())return;
  if(matchesTodoDeletion(edit.before,target))await device.edits.remove(owner,edit.id);
 }
 const cached=await device.cache.read(owner);
 if(!current())return;
 await device.cache.write(owner,cached.filter(todo=>!matchesTodoDeletion(todo,target)));
 if(current())await device.deletes.remove(owner,id);
 return target;
}
