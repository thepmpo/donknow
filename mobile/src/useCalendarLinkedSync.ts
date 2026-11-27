import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import type {CalendarEvent} from './calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {eventDraft} from './calendar-edit-model';
import type {TodoStore} from './useTodos';

import {linkedCalendarSyncRunning as running,reconcileLinkedCalendar} from './calendar-linked-reconciliation';

type Options={
 owner:string;active:boolean;supported:boolean;observed:CalendarEvent[];readAt:string|null;appleObserved:CalendarEvent[];appleReadAt:string|null;
 store:TodoStore;device:AppleCalendarDevice;saveApple:(draft:ReturnType<typeof eventDraft>,event:CalendarEvent)=>Promise<CalendarEvent>;
 changed:(events:CalendarEvent[],removed:CalendarEvent[])=>void;
};
export function useCalendarLinkedSync(options:Options){
 const {owner,active,supported,observed,readAt,appleObserved,appleReadAt}=options;
 const latest=useRef(options);latest.current=options;
 const attempted=useRef(new Map<string,{version:string;retryAt:number;done:boolean;attempts:number}>());
 useEffect(()=>{attempted.current.clear();},[owner]);
 useEffect(()=>{
  if(active)for(const attempt of attempted.current.values())if(!attempt.done)attempt.retryAt=0;
 },[active]);
 useEffect(()=>{
  if(!active||!supported||!readAt)return;
  const scope=owner;
  let disposed=false;
  async function refresh(){
   if(disposed||AppState.currentState!=='active'||running.has(scope))return;
   const context=latest.current;
   const current=()=>latest.current.owner===scope&&context.store.isCurrentSession();
   if(context.owner!==scope||!current())return;
   running.add(scope);
   try{
    const events=context.observed.filter(e=>e.provider==='docen'&&e.mirror?.state==='synced'&&
      e.mirror.externalEventId&&e.duckDetails?.revision&&e.canWrite&&!e.recurring&&!e.providerDetails?.recurrence?.length);
    const liveIds=new Set(events.map(event=>event.id));
    for(const id of attempted.current.keys())if(!liveIds.has(id))attempted.current.delete(id);
    const ready=events.flatMap(event=>{
     const target=event.mirror!;
     const originals=target.provider==='apple-calendar'?context.appleObserved:context.observed;
     const other=originals.find(e=>e.provider===target.provider&&e.calendarId===target.calendarId&&
      (e.connectionId??null)===(target.connectionId??null)&&e.eventId===target.externalEventId);
     const originalVersion=other?.etag??(target.provider==='apple-calendar'?context.appleReadAt:'outside-range');
     const version=[event.etag,originalVersion].join('|');
     const previous=attempted.current.get(event.id);
     if(other?.recurring||other?.notesPartial||other?.etag&&other.etag===target.syncVersion&&event.duckDetails?.revision===target.syncRevision)return [];
     if(previous?.version===version&&Date.now()<previous.retryAt)return [];
     return [{event,other,version}];
    }).slice(0,3);
    const changed:CalendarEvent[]=[],removed:CalendarEvent[]=[];
    await Promise.all(ready.map(async ({event,other,version})=>{
     const previous=attempted.current.get(event.id);
     const attempts=previous?.version===version&&!previous.done?previous.attempts+1:1;
     const attempt={version,retryAt:Date.now()+Math.min(60000,4000*2**Math.min(attempts,4)),attempts,done:false};
     attempted.current.set(event.id,attempt);
     try{
      const result=await reconcileLinkedCalendar(event,other,{device:context.device,request:context.store.featureRequest,
       appleRead:!!context.appleReadAt,saveApple:context.saveApple},current);
      if(result?.removed)removed.push(result.removed);
      if(!result?.event)return;
      attempt.done=true;attempt.retryAt=Date.now()+45000;
      if(result.event.etag!==event.etag||result.event.mirror?.syncVersion!==event.mirror?.syncVersion)changed.push(result.event);
     }catch{
      // Keep the last read visible. The next successful refresh checks the same binding again.
     }
    }));
    if((changed.length||removed.length)&&current())latest.current.changed(changed,removed);
   }finally{running.delete(scope);}
  }
  void refresh();
  const timer=setInterval(()=>void refresh(),6000);
  const foreground=AppState.addEventListener('change',state=>{
   if(state!=='active')return;
   for(const attempt of attempted.current.values())if(!attempt.done)attempt.retryAt=0;
   void refresh();
  });
  return ()=>{disposed=true;clearInterval(timer);foreground.remove();};
 },[active,supported,owner,observed,readAt,appleObserved,appleReadAt]);
}
