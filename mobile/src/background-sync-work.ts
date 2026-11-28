import {appleCalendarDevice} from './apple-calendar-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appleCalendarSource,saveAppleCalendar} from './apple-calendar-model';
import {syncAppleCalendarCreate,syncAppleCalendarDeletes} from './apple-calendar-delivery';
import type {PendingAppleDelete} from './apple-calendar-delivery';
import {linkedCalendarSyncRunning,reconcileLinkedCalendar} from './calendar-linked-reconciliation';
import {deviceZone,zonedDay} from './calendar-model';
import type {CalendarEvent} from './calendar-model';
import {saveBackgroundCalendarResult} from './calendar-snapshot-cache';
import {updateAppleSource} from './apple-source-edit';
import {pendingAppleTodoEdit,queuedTodoEditBase,waitingForAppleTodoDelivery} from './apple-todo-edit-queue';
import {calendarCreateSending,deviceCalendarEdits,deviceCalendarQueue,todoCreateSending} from './calendar-device-queue';
import {deviceTodos,todoEditSending} from './todo-device-queue';
import {calendarEditSending,sendCalendarEdit} from './useDeviceCalendarEdits';
import {refreshTodoSources} from './todo-source-refresh';
import {parseTodos} from './domain';
import type {Todo} from './domain';
import {HttpResponseError} from './http-response';
import type {TodoStore} from './useTodos';
import {syncAppleTodoDelivery} from './useAppleTodoDelivery';
import {refreshStoredAppleCalendar} from './useAppleCalendarData';

type Request=TodoStore['featureRequest'];
type AppleWork={items:CalendarEvent[];creates:CalendarEvent[];deletes:PendingAppleDelete[];nextCursor:string|null};

async function syncAppleCalendars(owner:string,request:Request,current:()=>boolean){
 const device=appleCalendarDevice;
 if(!device.available||!await device.granted()||!current())return;
 await refreshStoredAppleCalendar(owner,device,current).catch(()=>{});
 if(!current())return;
 const keys=new Set((await device.calendars()).filter(calendar=>calendar.writable).map(calendar=>appleCalendarSource(calendar).id));
 if(!current()||!keys.size)return;
 const cursorKey='docen.apple.background.cursor.'+owner;
 const after=await AsyncStorage.getItem(cursorKey);
 const work=await request('/api/calendar/docen/apple-work'+(after?'?cursor='+encodeURIComponent(after):'')) as AppleWork;
 if(!current())return;
 const zone=deviceZone(),day=zonedDay(Date.now(),zone);
 await Promise.allSettled([
  syncAppleCalendarCreate(owner,()=>work.creates.filter(event=>event.mirror&&keys.has(event.mirror.calendarId)),
   device,request,current,day,zone,()=>{}),
  syncAppleCalendarDeletes(owner,work.deletes.filter(target=>target.state==='delete-queued'&&target.externalEventId),
   device,request,current,id=>keys.has(id),()=>{}),
  (async()=>{
   let last=after;
   for(const event of work.items){
    if(!current())break;
    if(event.mirror?.externalEventId&&keys.has(event.mirror.calendarId)&&event.duckDetails?.revision&&!event.providerDetails?.recurrence?.length){
     const result=await reconcileLinkedCalendar(event,undefined,{device,request,appleRead:true,
      saveApple:(draft,original)=>saveAppleCalendar(device,draft,original,current)},current).catch(()=>undefined);
     if(result?.removed||result?.event&&result.event.etag!==event.etag){
      await saveBackgroundCalendarResult(owner,event.id,result.event??null,current).catch(()=>{});
     }
    }
    if(current()&&event.eventId)last=event.eventId;
   }
   const finished=last===work.items.at(-1)?.eventId||!work.items.length;
   if(finished&&!work.nextCursor)await AsyncStorage.removeItem(cursorKey);
   else if(last&&last!==after)await AsyncStorage.setItem(cursorKey,last);
  })(),
 ]);
}

export async function syncInBackground(owner:string,request:Request,current:()=>boolean){
 async function isolated(lock:Set<string>,run:()=>Promise<unknown>){
  if(!current()||lock.has(owner))return;
  lock.add(owner);
  try{await run();}finally{lock.delete(owner);}
 }
 async function cacheTodo(todo:Todo){
  const prior=await deviceTodos.cache.read(owner);
  if(current())await deviceTodos.cache.write(owner,[...prior.filter(row=>row.id!==todo.id),todo]);
 }
 await Promise.allSettled([
  (async()=>{
   await isolated(calendarCreateSending,async()=>{
    for(const job of await deviceCalendarQueue.read(owner)){
     if(!current())return;
     if(job.blocked)continue;
     const path='/api/calendar/docen/'+encodeURIComponent(job.id);
     try{
      const result=await request(path,job.cancelled?'DELETE':'PUT',job.cancelled?{revision:0}:job.payload) as CalendarEvent;
      if(!job.cancelled&&result.id!==job.event.id)continue;
      if(await saveBackgroundCalendarResult(owner,job.event.id,job.cancelled?null:result,current)&&current()){
       await deviceCalendarQueue.change(owner,job.id,entry=>entry.cancelled===job.cancelled?null:entry);
      }
     }catch(error){if(error instanceof HttpResponseError&&[400,422].includes(error.status))await deviceCalendarQueue.block(owner,job.id,true);}
    }
   });
   await isolated(calendarEditSending,async()=>{
    for(const job of await deviceCalendarEdits.read(owner)){
     if(!current())return;
     if(job.blocked)continue;
     try{
      const saved=await sendCalendarEdit(job,{device:appleCalendarDevice,request,current,
       saveApple:(draft,event)=>saveAppleCalendar(appleCalendarDevice,draft,event,current),
       saveAction:actionId=>deviceCalendarEdits.change(owner,job.id,entry=>({...entry,actionId}))});
      const cached=saved.provider==='apple-calendar'
       ?await refreshStoredAppleCalendar(owner,appleCalendarDevice,current)
       :await saveBackgroundCalendarResult(owner,job.original.id,saved,current);
      if(cached&&current())await deviceCalendarEdits.remove(owner,job.id);
     }catch(error){if(error instanceof HttpResponseError&&[400,404,409,422].includes(error.status))await deviceCalendarEdits.block(owner,job.id,true);}
    }
   });
   await isolated(linkedCalendarSyncRunning,()=>syncAppleCalendars(owner,request,current));
  })(),
  (async()=>{
   // Serialize cache writes for creates and edits during this background pass.
   await isolated(todoCreateSending,async()=>{
    for(const job of await deviceTodos.queue.read(owner)){
     if(!current())return;
     if(job.blocked)continue;
     try{
      const saved=await request('/api/todos','POST',{...job.draft,clientRequestKey:job.id}) as Todo;
      if(!current())return;
      await cacheTodo(saved);
      if(current())await deviceTodos.queue.remove(owner,job.id);
     }catch(error){if(error instanceof HttpResponseError&&[400,422].includes(error.status))await deviceTodos.queue.block(owner,job.id,true);}
    }
   });
   await isolated(todoEditSending,async()=>{
    const skipped=new Set<string>();
    for(const job of await deviceTodos.edits.read(owner)){
     if(!current())return;
     const id=job.before.id;
     if(job.blocked||skipped.has(id)){skipped.add(id);continue;}
     try{
      const path='/api/todos/'+encodeURIComponent(id);
      let saved=await request(path) as Todo;
      if(!current())return;
      if(waitingForAppleTodoDelivery(saved)){skipped.add(id);continue;}
      if(Object.entries(job.patch).some(([key,value])=>JSON.stringify(saved[key as keyof Todo]??null)!==JSON.stringify(value??null))){
       saved=await request(path,'PATCH',{...job.patch,deviceEditBase:queuedTodoEditBase(job,saved)}) as Todo;
      }
      if(!current())return;
      if(pendingAppleTodoEdit(saved)){
       saved=await updateAppleSource(saved,request,current,false);
       if(pendingAppleTodoEdit(saved)){skipped.add(id);continue;}
      }
      if(!current())return;
      await cacheTodo(saved);
      if(current())await deviceTodos.edits.remove(owner,job.id);
     }catch(error){
      skipped.add(id);
      if(error instanceof HttpResponseError&&error.code!=='todo-delivery-in-progress'&&[400,404,409,422].includes(error.status)){
       await deviceTodos.edits.change(owner,job.id,entry=>({...entry,blocked:true,failure:error.message}));
      }
     }
    }
   });
   if(!current())return;
   const todos=parseTodos(await request('/api/todos'));
   if(!current())return;
   await deviceTodos.cache.write(owner,todos);
   if(current())await syncAppleTodoDelivery(owner,()=>todos,request,current,cacheTodo);
   if(!current())return;
   if(await refreshTodoSources(request,current,new Map(),{google:false})&&current()){
    const refreshed=parseTodos(await request('/api/todos'));
    if(current())await deviceTodos.cache.write(owner,refreshed);
   }
  })(),
 ]);
}
