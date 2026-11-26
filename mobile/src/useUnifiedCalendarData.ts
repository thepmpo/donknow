import {useEffect,useMemo,useRef} from 'react';
import {retryableDocenCalendarCreate} from './http-response';
import {appleCalendarDevice} from './apple-calendar-device';
import {eventDraft} from './calendar-edit-model';
import {matchesCalendarMirror,overlayCalendarWrites} from './calendar-write-overlay';
import {useDeviceCalendarCreates} from './useDeviceCalendarCreates';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {CalendarCreateQueue} from './calendar-create-queue';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {docenCalendarId} from './calendar-model';
import type {CalendarEvent,CalendarMirror,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
const appleDeletesInFlight=new Set<string>();
const docenSource:CalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1],device?:AppleCalendarDevice,deviceCreateQueue?:CalendarCreateQueue){
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id))}),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',apple=useAppleCalendarData({owner,...options,enabled:!!store.user,device});
 const creates=useDeviceCalendarCreates(store,owner,event=>{google.upsertEvent(event);void google.load();},deviceCreateQueue);
 const visible=useMemo(()=>{
  const known=new Set(google.baseEvents.map(event=>event.id));
  const deviceEvents=creates.jobs.filter(job=>!known.has(job.event.id)).map(job=>job.event);
  return overlayCalendarWrites(owner,[...google.baseEvents,...apple.events],options.start,options.end,options.timeZone,
   [...options.selected,docenCalendarId],deviceEvents);
 },[owner,google.baseEvents,google.writeRevision,apple.events,options.start,options.end,options.timeZone,options.selected,creates.jobs]);
 const native=useRef({store,apple,device:device??appleCalendarDevice,owner});
 native.current={store,apple,device:device??appleCalendarDevice,owner};
 const pendingApple=[...google.appleCreates,...visible].find(event=>!!event.etag&&event.mirror?.provider==='apple-calendar'&&event.mirror.state==='queued'
  &&apple.sources.some(source=>source.id===event.mirror?.calendarId&&source.canWrite));
 const handling=useRef(new Set<string>());
 useEffect(()=>{
  if(!pendingApple?.mirror||!pendingApple.eventId||!apple.available||handling.current.has(pendingApple.id))return;
  const context=native.current, event=pendingApple,target=pendingApple.mirror, path='/api/calendar/docen/'+encodeURIComponent(pendingApple.eventId)+'/apple-delivery';
  handling.current.add(event.id);
  const current=()=>native.current.owner===context.owner&&context.store.isCurrentSession();
  void (async()=>{
   if(!await context.device.granted()||!current())return;
   // A single device claims the write. An interrupted EventKit call is never replayed blindly.
   await context.store.featureRequest(path,'POST',{state:'sending'});
   if(!current())return;
   const draft={...eventDraft(event.dueDate??options.start,event.timeZone??options.timeZone,target.calendarId,event),calendarId:target.calendarId,reminderMinutes:null};
   const recurrence=event.providerDetails?.recurrence?.[0]?.slice('RRULE:FREQ='.length).toLowerCase();
   if(recurrence==='daily'||recurrence==='weekly'||recurrence==='monthly'||recurrence==='yearly')draft.repeat=recurrence;
   let external:CalendarEvent;
   try{external=await context.apple.save(draft);}
   catch{if(current())await context.store.featureRequest(path,'POST',{state:'checking'});return;}
   const acknowledge=()=>context.store.featureRequest(path,'POST',{state:'synced',externalEventId:external.eventId});
   if(current())try{await acknowledge();}catch(error){
    if(!current()||!retryableDocenCalendarCreate(error))throw error;
    await acknowledge();
   }
  })().catch(()=>{}).finally(()=>{handling.current.delete(event.id);if(current())void google.load();});
 },[pendingApple?.id,apple.available,owner]);
 const pendingDeletes=google.hiddenMirrors.filter(target=>target.provider==='apple-calendar'&&target.state==='delete-queued'
  &&target.externalEventId&&apple.sources.some(source=>source.id===target.calendarId&&source.canWrite));
 const pendingDeleteIds=JSON.stringify(pendingDeletes.map(target=>target.id));
 useEffect(()=>{
  if(!apple.available)return;
  const context=native.current, current=()=>native.current.owner===context.owner&&context.store.isCurrentSession();
  const available=pendingDeletes.filter(target=>!appleDeletesInFlight.has(owner+'|'+target.id)).slice(0,4);
  for(const target of available){
   const key=owner+'|'+target.id,externalEventId=target.externalEventId!;
   appleDeletesInFlight.add(key);
   void (async()=>{
    if(!await context.device.granted()||!current())return;
    try{
     const event=await context.device.read(externalEventId);
     if('@apple/'+encodeURIComponent(event.calendarId)!==target.calendarId||!current())return;
     await context.device.remove(externalEventId);
    }catch(e){if(!e||typeof e!=='object'||!('code' in e)||!['ERR_EVENT_NOT_FOUND','ERR_ITEM_NO_LONGER_EXISTS'].includes(String(e.code)))return;}
    if(!current())return;
    await context.store.featureRequest('/api/calendar/docen/'+encodeURIComponent(target.id)+'/apple-delivery','POST',{state:'deleted',externalEventId});
    await context.apple.load();
    if(current())await google.load();
   })().catch(()=>{}).finally(()=>appleDeletesInFlight.delete(key));
  }
 },[apple.available,pendingDeleteIds,google.readAt,owner]);
 const shown=useMemo(()=>visible.filter(event=>!google.hiddenMirrors.some(target=>matchesCalendarMirror(event,target))),[visible,google.hiddenMirrors]);
 function originalFor(event:CalendarEvent){
  return event.mirror?.provider==='apple-calendar'&&event.mirror.state==='synced'
   ?shown.find(row=>matchesCalendarMirror(row,event.mirror!,event.dueDate)):undefined;
 }
 const events=useMemo(()=>{
 const owned=shown.filter(event=>event.mirror);
 return shown.flatMap(event=>{
  if(!event.mirror&&owned.some(row=>matchesCalendarMirror(event,row.mirror!,row.dueDate)))return [];
  const original=originalFor(event);
  if(original){
   const {id,eventId,calendarId,calendarName,provider,etag,duckDetails,mirror}=event;
   return [{...event,...original,id,eventId,calendarId,calendarName,provider,etag,duckDetails,mirror}];
  }
  if(event.mirror?.provider==='apple-calendar'&&event.mirror.state==='synced'&&apple.covered.includes(event.mirror.calendarId))return [];
  const remote=event.mirror?shown.find(row=>matchesCalendarMirror(row,event.mirror!,event.dueDate)):null;
  return [remote?{...event,color:remote.color??event.mirror?.color??event.color}:event];
 });
 },[shown,apple.covered]);
 return {...google,enqueueCreate:creates.enqueue,originalFor,phase:apple.error?'partial':google.phase==='unconnected'&&(apple.sources.length||google.docenSupported)?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources,...(google.docenSupported?[docenSource]:[])],events,appleAvailable:apple.available,allowApple:async()=>{const granted=await (device??appleCalendarDevice).authorize();if(granted)await apple.load();return granted;},saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>[...google.cachedEvents(),...apple.cached],load:async(more=false)=>{await Promise.allSettled([google.load(more),apple.load()]);},loadSources:async(more=false)=>{await Promise.allSettled([google.loadSources(more),apple.load()]);},upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}
