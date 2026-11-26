import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import type {CalendarEvent} from './calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {appleCalendarPrefix,normalizeAppleEvent} from './apple-calendar-model';
import {eventDraft} from './calendar-edit-model';
import type {TodoStore} from './useTodos';

const running=new Set<string>();
function originalSnapshot(event:CalendarEvent,linkedId:string){
 return {id:event.eventId,linkedId,externalUid:event.externalUid,version:event.etag,updatedAt:event.updatedAt,fields:{
  title:event.title,notes:event.notes??'',allDay:!!event.allDay,startDate:event.dueDate,endDate:event.endDate,start:event.startAt,end:event.endAt,
 }};
}
type Options={
 owner:string;active:boolean;supported:boolean;observed:CalendarEvent[];readAt:string|null;
 store:TodoStore;device:AppleCalendarDevice;saveApple:(draft:ReturnType<typeof eventDraft>,event:CalendarEvent)=>Promise<CalendarEvent>;
 changed:(events:CalendarEvent[])=>void;
};
export function useCalendarLinkedSync(options:Options){
 const {owner,active,supported,observed,readAt}=options;
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
     const other=context.observed.find(e=>e.provider===target.provider&&e.calendarId===target.calendarId&&
      (e.connectionId??null)===(target.connectionId??null)&&e.eventId===target.externalEventId);
     const version=[event.etag,other?.etag??'outside-range'].join('|');
     const previous=attempted.current.get(event.id);
     if(other?.recurring||other?.notesPartial||other?.etag&&other.etag===target.syncVersion&&event.duckDetails?.revision===target.syncRevision)return [];
     if(previous?.version===version&&Date.now()<previous.retryAt)return [];
     return [{event,other,version}];
    }).slice(0,3);
    const changed:CalendarEvent[]=[];
    await Promise.all(ready.map(async ({event,other,version})=>{
     const target=event.mirror!,revision=event.duckDetails!.revision;
     const previous=attempted.current.get(event.id);
     const attempts=previous?.version===version&&!previous.done?previous.attempts+1:1;
     const attempt={version,retryAt:Date.now()+Math.min(60000,4000*2**Math.min(attempts,4)),attempts,done:false};
     attempted.current.set(event.id,attempt);
     const path='/api/calendar/docen/'+encodeURIComponent(event.eventId!)+'/reconcile';
     type Result={action:'done'|'push';event:CalendarEvent};
     try{
      let original=other;
      if(target.provider==='apple-calendar'){
       if(!context.device.available||!await context.device.granted()||!current())return;
       // Re-read the bound EventKit ID, including an original moved outside the rendered dates.
       const calendarId=decodeURIComponent(target.calendarId.slice(appleCalendarPrefix.length));
       const linkedId=target.externalEventId!;
       const raw=await context.device.read(linkedId,undefined,calendarId).catch(error=>{
        if(!target.externalUid||!context.device.readLinked)throw error;
        return context.device.readLinked(target.externalUid,calendarId);
       });
       if(raw.calendarId!==calendarId||raw.id!==linkedId&&(!target.externalUid||raw.externalUid!==target.externalUid)
        ||raw.recurrence||raw.notes.length>4000)return;
       original=normalizeAppleEvent(raw,{id:calendarId,title:target.name??'',writable:true});
      }
      if(!current()||target.provider==='apple-calendar'&&!original)return;
      let result=await context.store.featureRequest(path,'POST',{revision,...(original&&target.provider==='apple-calendar'?{original:originalSnapshot(original,target.externalEventId!)}:{})}) as Result;
      if(!current())return;
      if(result.action==='push'&&original?.provider==='apple-calendar'){
       const local=result.event,zone=local.timeZone??original.timeZone??'Asia/Seoul';
       const draft={...eventDraft(local.dueDate!,zone,target.calendarId,local),calendarId:target.calendarId,
        duckUrl:original.duckDetails?.fields.url??'',reminderMinutes:original.duckDetails?.fields.reminderMinutes??null};
       const synced=await context.saveApple(draft,original);
       if(!current())return;
       result=await context.store.featureRequest(path,'POST',{revision,original:originalSnapshot(synced,target.externalEventId!),ack:true}) as Result;
      }
      if(!current()||result.action!=='done'||result.event?.id!==event.id)return;
      attempt.done=true;attempt.retryAt=Date.now()+45000;
      if(result.event.etag!==event.etag||result.event.mirror?.syncVersion!==event.mirror?.syncVersion)changed.push(result.event);
     }catch{
      // Keep the last read visible. The next successful refresh checks the same binding again.
     }
    }));
    if(changed.length&&current())latest.current.changed(changed);
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
 },[active,supported,owner,observed,readAt]);
}
