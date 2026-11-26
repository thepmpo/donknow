import {useEffect,useRef} from 'react';
import {appleCalendarDevice} from './apple-calendar-device';
import {eventDraft} from './calendar-edit-model';
import {overlayCalendarWrites} from './calendar-write-overlay';
import {useCalendarData} from './useCalendarData';
import {useAppleCalendarData} from './useAppleCalendarData';
import {isAppleCalendar} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {docenCalendarId} from './calendar-model';
import type {CalendarEvent,CalendarMirror,CalendarSource} from './calendar-model';
import type {TodoStore} from './useTodos';
const docenSource:CalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
export function useUnifiedCalendarData(store:TodoStore,options:Parameters<typeof useCalendarData>[1],device?:AppleCalendarDevice){
 const google=useCalendarData(store,{...options,selected:options.selected.filter(id=>!isAppleCalendar(id))}),owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo',apple=useAppleCalendarData({owner,...options,enabled:!!store.user,device});
 const visible=overlayCalendarWrites(owner,[...google.baseEvents,...apple.events],options.start,options.end,options.timeZone,[...options.selected,...(google.docenSupported?[docenCalendarId]:[])]);
 const native=useRef({store,apple,device:device??appleCalendarDevice,owner});
 native.current={store,apple,device:device??appleCalendarDevice,owner};
 const pendingApple=visible.find(event=>event.mirror?.provider==='apple-calendar'&&event.mirror.state==='queued');
 const handling=useRef(new Set<string>());
 useEffect(()=>{
  if(!options.active||!pendingApple?.mirror||!pendingApple.eventId||!apple.available||handling.current.has(pendingApple.id))return;
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
   if(current())await context.store.featureRequest(path,'POST',{state:'synced',externalEventId:external.eventId});
  })().catch(()=>{}).finally(()=>{handling.current.delete(event.id);if(current())void google.load();});
 },[options.active,pendingApple?.id,apple.available,apple.sources.length,owner]);
 function matchesMirror(event:CalendarEvent,mirror:CalendarMirror,day:string|null){
  return mirror.calendarId===event.calendarId&&(mirror.connectionId??null)===(event.connectionId??null)&&!!mirror.externalEventId
   &&(event.eventId===mirror.externalEventId||event.seriesId===mirror.externalEventId&&event.dueDate===day);
 }
 const owned=visible.filter(event=>event.mirror);
 const events=visible.flatMap(event=>{
  if(!event.mirror&&owned.some(row=>matchesMirror(event,row.mirror!,row.dueDate)))return [];
  const original=event.mirror?visible.find(row=>matchesMirror(row,event.mirror!,event.dueDate)):null;
  return [original?{...event,color:original.color??event.mirror?.color??event.color}:event];
 });
 return {...google,phase:apple.error?'partial':google.phase==='unconnected'&&(apple.sources.length||google.docenSupported)?'ready':google.phase,readAt:[google.readAt,apple.readAt].filter((v):v is string=>!!v).sort().at(-1)??null,error:[google.error,apple.error].filter(Boolean).join(' '),sources:[...google.sources,...apple.sources,...(google.docenSupported?[docenSource]:[])],events,appleAvailable:apple.available,allowApple:async()=>{const granted=await (device??appleCalendarDevice).authorize();if(granted)await apple.load();return granted;},saveApple:apple.save,deleteApple:apple.remove,cachedEvents:()=>[...google.cachedEvents(),...apple.cached],load:async(more=false)=>{await Promise.allSettled([google.load(more),apple.load()]);},loadSources:async(more=false)=>{await Promise.allSettled([google.loadSources(more),apple.load()]);},upsertEvent:(e:CalendarEvent)=>{if(e.provider!=='apple-calendar')google.upsertEvent(e);},nativeError:apple.error};
}
