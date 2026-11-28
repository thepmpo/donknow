import {useDeviceCalendarEdits} from './useDeviceCalendarEdits';
import {useEffect,useMemo,useRef} from 'react';
import {AppState,Platform} from 'react-native';
import type {CalendarEditQueue} from './calendar-device-queue';
import {syncAppleCalendarCreate,syncAppleCalendarDeletes} from './apple-calendar-delivery';
import {useCalendarLinkedSync} from './useCalendarLinkedSync';
import {appleCalendarDevice} from './apple-calendar-device';
import {matchesCalendarMirror,overlayCalendarWrites,removeCalendarEventWrites} from './calendar-write-overlay';
import {flushCalendarSnapshots} from './calendar-snapshot-cache';
import {useDeviceCalendarCreates} from './useDeviceCalendarCreates';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {CalendarCreateQueue} from './calendar-create-queue';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {docenCalendarId,eventOverlaps} from './calendar-model';
import {displayCalendarMirror,mergeCalendarCopies,mergeDeviceCalendarView} from './calendar-copies';
import {HttpResponseError} from './http-response';
import type {CalendarEvent,CalendarMirror,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
const docenSource:CalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1]&{hidden?:string[];syncWhileHidden?:boolean},device?:AppleCalendarDevice,deviceCreateQueue?:CalendarCreateQueue,deviceEditQueue?:CalendarEditQueue){
 const appleDevice=device??appleCalendarDevice;
 const refreshWhileHidden=!!options.syncWhileHidden&&appleDevice.available;
 const syncActive=options.active||refreshWhileHidden;
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id)),refreshWhileHidden}),
  owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',
  apple=useAppleCalendarData({owner,...options,hidden:undefined,refreshWhileHidden,enabled:!!store.user&&options.selectionReady!==false,device:appleDevice});
 const applePrimary=apple.available&&Platform.OS==='ios';
 const creates=useDeviceCalendarCreates(store,owner,async event=>{google.upsertEvent(event);await flushCalendarSnapshots(owner).catch(()=>{});void google.load();},deviceCreateQueue,options.active,event=>{google.removeEvent(event.id);void google.load();});
 const edits=useDeviceCalendarEdits(store,owner,appleDevice,google.detailsSupported,apple.save,async(saved,original)=>{
  if(saved.provider==='apple-calendar'){await apple.load();return;}
  if(saved.id!==original.id)google.removeEvent(original.id);
  google.upsertEvent(saved);
  await flushCalendarSnapshots(owner);
  void google.load(false,true);
 },deviceEditQueue);
 const cancelled=new Set(creates.jobs.filter(job=>job.cancelled).map(job=>job.event.id));
 const devicePending=(event:CalendarEvent)=>creates.jobs.some(job=>job.event.id===event.id&&!job.cancelled);
 const visible=useMemo(()=>{
  const known=new Set(google.baseEvents.map(event=>event.id));
  const deviceEvents=creates.jobs.filter(job=>!job.cancelled&&!known.has(job.event.id)).map(job=>job.event);
  return overlayCalendarWrites(owner,[...google.baseEvents.filter(event=>!cancelled.has(event.id)),...apple.events],options.start,options.end,options.timeZone,
   [...options.selected,docenCalendarId,...apple.sources.map(source=>source.id)],deviceEvents);
 },[owner,google.baseEvents,google.writeRevision,apple.events,apple.sources,options.start,options.end,options.timeZone,options.selected,creates.jobs]);
 const native=useRef({store,apple,device:appleDevice,owner});
 native.current={store,apple,device:appleDevice,owner};
 const appleCandidates=[...new Map([...google.appleCreates,...visible].filter(event=>!!event.etag
  &&event.mirror?.provider==='apple-calendar'&&['queued','sending','checking'].includes(event.mirror.state)
  &&apple.sources.some(source=>source.id===event.mirror?.calendarId&&source.canWrite)).map(event=>[event.id,event])).values()];
 const latestApple=useRef(appleCandidates);latestApple.current=appleCandidates;
 const appleWork=appleCandidates.map(event=>event.id+':'+event.mirror?.state).join('|');
 useEffect(()=>{
  if(!syncActive||!apple.available||!appleWork)return;
  const context=native.current, scope=context.owner;
  const current=()=>native.current.owner===scope&&context.store.isCurrentSession();
  async function process(){
   if(AppState.currentState==='active')await syncAppleCalendarCreate(scope,()=>latestApple.current,context.device,context.store.featureRequest,current,options.start,options.timeZone,()=>{
    void google.load();
    void context.apple.load();
   });
  }
  void process();
  const timer=setInterval(()=>void process(),5000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void process();});
  return ()=>{clearInterval(timer);subscription.remove();};
 },[appleWork,apple.available,owner,syncActive]);
 useCalendarLinkedSync({owner,active:syncActive,supported:google.reconcileSupported,
  observed:google.baseEvents,readAt:google.readAt,appleObserved:apple.observed,appleReadAt:apple.error?null:apple.readAt,store,device:appleDevice,saveApple:apple.save,
  changed:(items,removed)=>{for(const event of removed){removeCalendarEventWrites(owner,event);google.removeEvent(event.id);}for(const event of items)google.upsertEvent(event);void google.load(false,true);},
 });
 const pendingDeletes=google.hiddenMirrors.filter(target=>target.provider==='apple-calendar'&&target.state==='delete-queued'&&target.externalEventId);
 const pendingDeleteIds=JSON.stringify(pendingDeletes.map(target=>target.id));
 const latestDeletes=useRef(pendingDeletes);latestDeletes.current=pendingDeletes;
 useEffect(()=>{
  if(!syncActive||!apple.available||!latestDeletes.current.length)return;
  const context=native.current, current=()=>native.current.owner===context.owner&&context.store.isCurrentSession();
  const process=async()=>{
   if(AppState.currentState==='active')await syncAppleCalendarDeletes(owner,latestDeletes.current,context.device,context.store.featureRequest,current,
    id=>native.current.apple.sources.some(source=>source.id===id&&source.canWrite),async()=>{await context.apple.load();if(current())void google.load();});
  };
  const retry=()=>void process().catch(()=>{});
  retry();
  const timer=setInterval(retry,10000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')retry();});
  return ()=>{clearInterval(timer);subscription.remove();};
 },[apple.available,pendingDeleteIds,owner,syncActive]);
 const shown=useMemo(()=>{
  const editing=new Set(edits.jobs.map(job=>job.original.id));
  const local=edits.jobs.filter(job=>eventOverlaps(job.event,options.start,options.end,options.timeZone))
   .map(job=>({...job.event,saveState:job.blocked?'checking' as const:'saving' as const,canWrite:false}));
  return [...visible.filter(event=>!editing.has(event.id)),...local]
   .filter(event=>!google.hiddenMirrors.some(target=>matchesCalendarMirror(event,target)));
 },[visible,google.hiddenMirrors,edits.jobs,options.start,options.end,options.timeZone]);
 function editingOriginal(event:CalendarEvent){
  if(event.mirror?.provider!=='apple-calendar'||event.mirror.state!=='synced'||!event.providerDetails?.recurrence?.length)return event;
  return shown.find(row=>row.canWrite&&row.provider==='apple-calendar'&&matchesCalendarMirror(row,event.mirror!,event.dueDate))??event;
 }
 const events=useMemo(()=>{
 if(applePrimary)return mergeDeviceCalendarView(shown,options.hidden);
 const visibleSources=shown.filter(event=>event.provider!=='apple-calendar'||!options.hidden?.includes(event.calendarId??''));
 const owned=visibleSources.filter(event=>event.mirror);
 return mergeCalendarCopies(visibleSources.flatMap(event=>{
  if(!event.mirror&&owned.some(row=>matchesCalendarMirror(event,row.mirror!,row.dueDate)))return [];
   const remote=event.mirror?visibleSources.find(row=>matchesCalendarMirror(row,event.mirror!,event.dueDate)):null;
  return [remote?displayCalendarMirror(event,remote):event];
 }));
 },[shown,applePrimary,options.hidden]);
 async function checkEvent(event:CalendarEvent){
  if(!event.eventId)throw Error('원본 일정 번호를 확인하지 못했어요.');
  if(event.provider==='apple-calendar')return apple.checkEvent(event);
  if(event.provider==='docen'){
   try{return await store.featureRequest('/api/calendar/docen/'+encodeURIComponent(event.eventId)) as CalendarEvent;}
   catch(error){if(error instanceof HttpResponseError&&error.status===404)return null;throw error;}
  }
  const query=new URLSearchParams({calendarId:event.calendarId??'primary',eventId:event.eventId,timeZone:options.timeZone,
   ...(event.connectionId?{connectionId:event.connectionId}:{})});
  const result=await store.featureRequest('/api/calendar/event?'+query) as {item?:CalendarEvent|null};
  if(result.item===undefined)throw Error('원본 일정 응답을 확인하지 못했어요.');
  return result.item;
 }
 return {...google,applePrimary,checkEvent,enqueueEdit:edits.enqueue,confirmedAbsent:(event:CalendarEvent)=>apple.confirmedAbsent(event)||google.confirmedAbsent(event),enqueueCreate:creates.enqueue,devicePending,cancelDeviceCreate:creates.cancel,editingOriginal,phase:apple.error?'partial':google.phase==='unconnected'&&(apple.sources.length||google.docenSupported)?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources,...(google.docenSupported||creates.enqueue?[docenSource]:[])],events,appleAvailable:apple.available,allowApple:async()=>{const granted=await (device??appleCalendarDevice).authorize();if(granted)await apple.load();return granted;},saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>{
  const items=[...google.cachedEvents(),...apple.cached].filter(event=>{
   const id=event.mirror?.calendarId??event.calendarId??'primary';
   return !cancelled.has(event.id)&&(id===docenCalendarId||options.selected.includes(id)||applePrimary&&isAppleCalendar(id));
  });
  return applePrimary?mergeDeviceCalendarView(items,options.hidden):mergeCalendarCopies(items);
 },load:async(more=false,freshRequest=false)=>{await Promise.allSettled([google.load(more,freshRequest),apple.load()]);},loadSources:google.loadSources,upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}
