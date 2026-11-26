import {useEffect,useRef,useSyncExternalStore} from 'react';
import {AppState,Platform} from 'react-native';
import {deviceCalendarQueue} from './calendar-device-queue';
import {HttpResponseError,retryableDocenCalendarCreate} from './http-response';
import type {CalendarEvent} from './calendar-model';
import type {TodoStore} from './useTodos';
import type {CalendarCreateQueue,QueuedCalendarCreate} from './calendar-create-queue';

const empty:readonly QueuedCalendarCreate[]=[];
const sending=new Set<string>();
export function useDeviceCalendarCreates(store:TodoStore,owner:string,onSaved:(event:CalendarEvent)=>Promise<void>,injectedQueue?:CalendarCreateQueue){
 const queue=injectedQueue??deviceCalendarQueue;
 const enabled=(Platform.OS==='ios'||!!injectedQueue)&&!!store.user?.emailVerified&&store.connection?.mode==='cloud';
 const jobs=useSyncExternalStore(fn=>enabled?queue.watch(owner,fn):()=>{},()=>enabled?queue.snapshot(owner)??empty:empty);
 const latest=useRef({store,owner,onSaved});latest.current={store,owner,onSaved};
 const reactivated=useRef<string|null>(null);
 useEffect(()=>{
  if(!enabled||!store.user)return;
  const retryInterrupted=()=>{for(const job of queue.snapshot(owner)??[]){
   if(job.blocked&&!job.failure){void queue.block(owner,job.id,false).catch(()=>{});}
  }};
  if(reactivated.current!==owner){
   reactivated.current=owner;
   void queue.read(owner).then(retryInterrupted).catch(()=>{});
  }
  return ()=>{if(reactivated.current===owner)reactivated.current=null;};
 },[enabled,owner,queue]);
 const retries=useRef(new Map<string,{attempt:number;at:number}>());
 useEffect(()=>{if(enabled)void queue.read(owner).catch(()=>{});},[enabled,owner,queue]);
 useEffect(()=>{
  if(!enabled||!jobs.some(job=>!job.blocked))return;
  let disposed=false;
  const process=async()=>{
   if(disposed||AppState.currentState!=='active'||sending.has(owner))return;
   const now=Date.now(),job=jobs.find(job=>!job.blocked&&(retries.current.get(job.id)?.at??0)<=now);
   if(!job)return;
   const context=latest.current,current=()=>latest.current.owner===owner&&context.store.isCurrentSession();
   if(context.owner!==owner||!current())return;
   sending.add(owner);
   try{
    let saved:CalendarEvent;
    try{
     const path='/api/calendar/docen/'+encodeURIComponent(job.id);
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
     await queue.put(owner,{...job,blocked:true,failure:reason});
     if(current()){
      const message=reason;
      context.store.reportWrite(job.id,message,()=>queue.block(owner,job.id,false));
     }
     return;
    }
    if(!current())return;
    await latest.current.onSaved(saved);
    if(!current())return;
    await queue.remove(owner,job.id);
    retries.current.delete(job.id);
    if(current()){context.store.writeResolved(job.id);context.store.reminders.retry();}
   }catch{
    const attempt=(retries.current.get(job.id)?.attempt??0)+1;
    retries.current.set(job.id,{attempt,at:Date.now()+Math.min(60000,1000*2**Math.min(attempt-1,6))});
   }finally{sending.delete(owner);}
  };
  const timer=setInterval(()=>void process(),1000);
  const subscription=AppState.addEventListener('change',state=>{
   if(state==='active'){retries.current.clear();void process();}
  });
  // Start after the tap has painted the device copy.
  const start=setTimeout(()=>void process(),32);
  return()=>{disposed=true;clearInterval(timer);clearTimeout(start);subscription.remove();};
 },[enabled,owner,jobs,queue]);
 return {jobs,enqueue:enabled?(job:QueuedCalendarCreate)=>queue.add(owner,job):undefined};
}
