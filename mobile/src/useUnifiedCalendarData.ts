import {useEffect,useMemo,useRef} from 'react';
import {AppState} from 'react-native';
import {appleCalendarReceipts} from './calendar-device-queue';
import {useCalendarLinkedSync} from './useCalendarLinkedSync';
import {HttpResponseError} from './http-response';
import {appleCalendarDevice} from './apple-calendar-device';
import {eventDraft} from './calendar-edit-model';
import {matchesCalendarMirror,overlayCalendarWrites} from './calendar-write-overlay';
import {flushCalendarSnapshots} from './calendar-snapshot-cache';
import {useDeviceCalendarCreates} from './useDeviceCalendarCreates';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {CalendarCreateQueue} from './calendar-create-queue';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {docenCalendarId} from './calendar-model';
import {mergeCalendarCopies} from './calendar-copies';
import type {CalendarEvent,CalendarMirror,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
const appleCreatesInFlight=new Set<string>();
const appleDeletesInFlight=new Set<string>();
const docenSource:CalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1]&{hidden?:string[]},device?:AppleCalendarDevice,deviceCreateQueue?:CalendarCreateQueue){
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id))}),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',apple=useAppleCalendarData({owner,...options,enabled:!!store.user&&options.selectionReady!==false,device});
 const creates=useDeviceCalendarCreates(store,owner,async event=>{google.upsertEvent(event);await flushCalendarSnapshots(owner).catch(()=>{});void google.load();},deviceCreateQueue);
 const visible=useMemo(()=>{
  const known=new Set(google.baseEvents.map(event=>event.id));
  const deviceEvents=creates.jobs.filter(job=>!known.has(job.event.id)).map(job=>job.event);
  return overlayCalendarWrites(owner,[...google.baseEvents,...apple.events],options.start,options.end,options.timeZone,
   [...options.selected,docenCalendarId],deviceEvents);
 },[owner,google.baseEvents,google.writeRevision,apple.events,options.start,options.end,options.timeZone,options.selected,creates.jobs]);
 const native=useRef({store,apple,device:device??appleCalendarDevice,owner});
 native.current={store,apple,device:device??appleCalendarDevice,owner};
 const appleCandidates=[...new Map([...google.appleCreates,...visible].filter(event=>!!event.etag
  &&event.mirror?.provider==='apple-calendar'&&['queued','sending','checking'].includes(event.mirror.state)
  &&apple.sources.some(source=>source.id===event.mirror?.calendarId&&source.canWrite)).map(event=>[event.id,event])).values()];
 const latestApple=useRef(appleCandidates);latestApple.current=appleCandidates;
 const appleWork=appleCandidates.map(event=>event.id+':'+event.mirror?.state).join('|');
 useEffect(()=>{
  if(!options.active||!apple.available||!appleWork)return;
  const context=native.current, scope=context.owner;
  const current=()=>native.current.owner===scope&&context.store.isCurrentSession();
  async function process(){
   if(AppState.currentState!=='active'||!current()||appleCreatesInFlight.has(scope))return;
   appleCreatesInFlight.add(scope);
   let refresh=false;
   try{
    if(!await context.device.granted()||!current())return;
    const receipts=await appleCalendarReceipts.read(scope);
    const candidates=latestApple.current;
    const event=candidates.find(value=>receipts.some(receipt=>receipt.id===value.id&&!!receipt.externalEventId))
      ??candidates.find(value=>{
       const known=receipts.find(receipt=>receipt.id===value.id);
       return known?!known.started:value.mirror?.state==='queued';
      });
    if(!event?.eventId||!event.mirror||!current())return;
    const target=event.mirror,path='/api/calendar/docen/'+encodeURIComponent(event.eventId)+'/apple-delivery';
    let receipt=receipts.find(value=>value.id===event.id);
    if(!receipt){
     const claimId='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const digit=Math.floor(Math.random()*16);
      return (c==='x'?digit:(digit&3)|8).toString(16);
     });
     receipt={id:event.id,claimId};
     await appleCalendarReceipts.add(scope,receipt);
    }
    if(!current())return;
    if(!receipt.externalEventId){
     if(receipt.started)return;
     try{await context.store.featureRequest(path,'POST',{state:'sending',claimId:receipt.claimId});}
     catch(error){
      if(error instanceof HttpResponseError&&error.status===409){await appleCalendarReceipts.remove(scope,receipt.id);refresh=true;}
      throw error;
     }
     if(!current())return;
     const draft={...eventDraft(event.dueDate??options.start,event.timeZone??options.timeZone,target.calendarId,event),calendarId:target.calendarId,reminderMinutes:null};
     const recurrence=event.providerDetails?.recurrence?.[0]?.slice('RRULE:FREQ='.length).toLowerCase();
     if(recurrence==='daily'||recurrence==='weekly'||recurrence==='monthly'||recurrence==='yearly')draft.repeat=recurrence;
     await appleCalendarReceipts.put(scope,{...receipt,started:true});
     if(!current())return;
     let external:CalendarEvent;
     try{external=await context.apple.save(draft);}
     catch{if(current())await context.store.featureRequest(path,'POST',{state:'checking',claimId:receipt.claimId});refresh=true;return;}
     if(!external.eventId)return;
     receipt={...receipt,started:true,externalEventId:external.eventId,externalUid:external.externalUid};
     await appleCalendarReceipts.put(scope,receipt);
    }
    if(!current())return;
    await context.store.featureRequest(path,'POST',{state:'synced',claimId:receipt.claimId,externalEventId:receipt.externalEventId,externalUid:receipt.externalUid});
    await appleCalendarReceipts.remove(scope,receipt.id);
    refresh=true;
   }catch{
    // A reserved claim or an acknowledged EventKit identifier can be replayed safely.
   }finally{
    appleCreatesInFlight.delete(scope);
    if(refresh&&current())void google.load();
   }
  }
  void process();
  const timer=setInterval(()=>void process(),5000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void process();});
  return ()=>{clearInterval(timer);subscription.remove();};
 },[appleWork,apple.available,owner,options.active]);
 useCalendarLinkedSync({owner,active:options.active,supported:google.reconcileSupported,
  observed:visible,readAt:google.readAt,store,device:device??appleCalendarDevice,saveApple:apple.save,
  changed:items=>{for(const event of items)google.upsertEvent(event);void google.load();},
 });
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
 function editingOriginal(event:CalendarEvent){
  if(event.mirror?.provider!=='apple-calendar'||event.mirror.state!=='synced'||!event.providerDetails?.recurrence?.length)return event;
  return shown.find(row=>row.canWrite&&row.provider==='apple-calendar'&&matchesCalendarMirror(row,event.mirror!,event.dueDate))??event;
 }
 const events=useMemo(()=>{
 const owned=shown.filter(event=>event.mirror);
 return mergeCalendarCopies(shown.flatMap(event=>{
  if(!event.mirror&&owned.some(row=>matchesCalendarMirror(event,row.mirror!,row.dueDate)))return [];
   const remote=event.mirror?shown.find(row=>matchesCalendarMirror(row,event.mirror!,event.dueDate)):null;
  return [remote?{...event,externalUid:remote.externalUid,color:remote.color??event.mirror?.color??event.color}:event];
 }));
 },[shown]);
 return {...google,enqueueCreate:creates.enqueue,editingOriginal,phase:apple.error?'partial':google.phase==='unconnected'&&(apple.sources.length||google.docenSupported)?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources,...(google.docenSupported||creates.enqueue?[docenSource]:[])],events,appleAvailable:apple.available,allowApple:async()=>{const granted=await (device??appleCalendarDevice).authorize();if(granted)await apple.load();return granted;},saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>mergeCalendarCopies([...google.cachedEvents(),...apple.cached].filter(event=>{const id=event.mirror?.calendarId??event.calendarId??'primary';return id===docenCalendarId||options.selected.includes(id);})),load:async(more=false)=>{await Promise.allSettled([google.load(more),apple.load()]);},loadSources:async(more=false)=>{await Promise.allSettled([google.loadSources(more),apple.load()]);},upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}
