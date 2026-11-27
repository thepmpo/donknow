import {useEffect,useRef,useSyncExternalStore} from 'react';
import {AppState,Platform} from 'react-native';
import {calendarCreateSending,deviceCalendarQueue} from './calendar-device-queue';
import {HttpResponseError,retryableDocenCalendarCreate} from './http-response';
import type {CalendarEvent} from './calendar-model';
import type {TodoStore} from './useTodos';
import type {CalendarCreateQueue,QueuedCalendarCreate} from './calendar-create-queue';

const empty:readonly QueuedCalendarCreate[]=[];
export function useDeviceCalendarCreates(store:TodoStore,owner:string,onSaved:(event:CalendarEvent)=>Promise<void>,injectedQueue?:CalendarCreateQueue,active=true,onRemoved?:(event:CalendarEvent)=>void){
 const queue=injectedQueue??deviceCalendarQueue;
 const enabled=(Platform.OS==='ios'||!!injectedQueue)&&!!store.user?.emailVerified&&store.connection?.mode==='cloud';
 const jobs=useSyncExternalStore(fn=>enabled?queue.watch(owner,fn):()=>{},()=>enabled?queue.snapshot(owner)??empty:empty);
 const latest=useRef({store,owner,onSaved,onRemoved});latest.current={store,owner,onSaved,onRemoved};
 useEffect(()=>{
  if(!enabled)return;
  let disposed=false;
  void queue.read(owner).then(entries=>{
   if(disposed)return;
   for(const job of entries)if(job.blocked&&!job.failure&&!job.cancelled)void queue.block(owner,job.id,false).catch(()=>{});
  }).catch(()=>{});
  return ()=>{disposed=true;};
 },[enabled,owner,queue]);
 const retries=useRef(new Map<string,{attempt:number;at:number}>());
 useEffect(()=>{if(active)retries.current.clear();},[active,owner]);
 useEffect(()=>{
  if(!enabled||!jobs.some(job=>!job.blocked))return;
  let disposed=false;
  const process=async()=>{
   if(disposed||AppState.currentState!=='active'||calendarCreateSending.has(owner))return;
   const now=Date.now(),job=queue.snapshot(owner)?.find(job=>!job.blocked&&(retries.current.get(job.id)?.at??0)<=now);
   if(!job)return;
   const context=latest.current,current=()=>latest.current.owner===owner&&context.store.isCurrentSession();
   if(context.owner!==owner||!current())return;
   calendarCreateSending.add(owner);
   try{
    const path='/api/calendar/docen/'+encodeURIComponent(job.id);
    if(job.cancelled){
     try{await context.store.featureRequest(path,'DELETE',{revision:0});}
     catch(error){
      if(!(error instanceof HttpResponseError&&error.status===409))throw error;
      const committed=await context.store.featureRequest(path) as CalendarEvent;
      if(!current()||committed?.id!==job.event.id||!committed.duckDetails?.revision)throw error;
      // A server copy edited after this device create can be deleted from its fresh detail.
      await latest.current.onSaved(committed);
      await queue.change(owner,job.id,entry=>entry.cancelled?null:entry);
      context.store.writeResolved(job.id);
      return;
     }
     if(!current())return;
     latest.current.onRemoved?.(job.event);
     await queue.change(owner,job.id,entry=>entry.cancelled?null:entry);
     retries.current.delete(job.id);
     context.store.writeResolved(job.id);
     context.store.reminders.retry();
     return;
    }
    let saved:CalendarEvent;
    try{
     try{saved=await context.store.featureRequest(path,'PUT',job.payload) as CalendarEvent;}
     catch(error){
      if(!(error instanceof HttpResponseError&&error.status===409)||error.code==='calendar-event-deleted')throw error;
      try{
       saved=await context.store.featureRequest(path) as CalendarEvent;
       if(saved.mirror?.provider!==job.payload.target?.provider||saved.mirror?.calendarId!==job.payload.target?.calendarId||
          (saved.mirror?.connectionId??null)!==(job.payload.target?.connectionId??null))throw error;
      }catch(receiptError){
       if(retryableDocenCalendarCreate(receiptError))throw receiptError;
       throw error;
      }
     }
     if(saved?.id!==job.event.id)throw Error('Calendar create receipt unavailable');
    }catch(error){
     if(!current())return;
     const invalid=error instanceof HttpResponseError&&([400,422].includes(error.status)||error.code==='calendar-event-deleted');
     if(!invalid)throw error;
     const reason=error instanceof HttpResponseError?error.message:'저장 결과를 확인하지 못했어요.';
     await queue.change(owner,job.id,entry=>entry.cancelled?entry:{...entry,blocked:true,failure:reason});
     if(current()&&!queue.snapshot(owner)?.find(entry=>entry.id===job.id)?.cancelled){
      const message=reason;
      context.store.reportWrite(job.id,message,()=>queue.block(owner,job.id,false));
     }
     return;
    }
    if(!current()||queue.snapshot(owner)?.some(entry=>entry.id===job.id&&entry.cancelled))return;
    await latest.current.onSaved(saved);
    if(!current())return;
    await queue.change(owner,job.id,entry=>entry.cancelled?entry:null);
    retries.current.delete(job.id);
    if(current()){context.store.writeResolved(job.id);context.store.reminders.retry();}
   }catch{
    const attempt=(retries.current.get(job.id)?.attempt??0)+1;
    retries.current.set(job.id,{attempt,at:Date.now()+Math.min(60000,1000*2**Math.min(attempt-1,6))});
   }finally{calendarCreateSending.delete(owner);}
  };
  const timer=setInterval(()=>void process(),1000);
  const subscription=AppState.addEventListener('change',state=>{
   if(state==='active'){retries.current.clear();void process();}
  });
  // Start after the tap has painted the device copy.
  const start=setTimeout(()=>void process(),32);
  return()=>{disposed=true;clearInterval(timer);clearTimeout(start);subscription.remove();};
 },[enabled,owner,jobs,queue,active]);
 async function cancel(id:string){
  if(!enabled)throw Error('기기에서 일정을 확인하지 못했어요.');
  retries.current.delete(id);
  let found=false;
  await queue.change(owner,id,job=>{found=true;return {...job,cancelled:true,blocked:false};});
  if(!found)throw Error('일정이 서버에 반영됐어요. 다시 열어 삭제해주세요.');
 }
 return {jobs,cancel,enqueue:enabled?(job:QueuedCalendarCreate)=>queue.add(owner,job):undefined};
}
