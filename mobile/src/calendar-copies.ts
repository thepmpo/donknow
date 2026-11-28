import type {CalendarEvent} from './calendar-model.ts';
import {matchesCalendarMirror} from './calendar-write-overlay.ts';

export function appleCalendarView(events:CalendarEvent[]){
 const originals=mergeCalendarCopies(events.filter(event=>event.provider==='apple-calendar'));
 const pending=events.filter(event=>{
  const mirror=event.mirror;
  return mirror?.provider==='apple-calendar'&&(event.saveState||
   ['queued','sending','checking'].includes(mirror.state)||
   mirror.state==='synced'&&typeof mirror.syncRevision==='number'&&(event.duckDetails?.revision??0)>mirror.syncRevision);
 });
 return [...originals.filter(original=>!pending.some(event=>matchesCalendarMirror(original,event.mirror!,event.dueDate))),...pending];
}

export function displayCalendarMirror(event:CalendarEvent,original:CalendarEvent){
 const mirror=event.mirror;
 const copy={...event,externalUid:original.externalUid,color:original.color??mirror?.color??event.color};
 if(mirror?.state!=='synced'||mirror.provider!=='apple-calendar'||original.provider!=='apple-calendar'||
   !original.etag||!event.duckDetails?.revision||mirror.syncRevision!==event.duckDetails.revision)return copy;
 // The last sync already included this Docen revision. Show fresh EventKit data
 // while the server reconciles, using the existing Docen ID and write revision.
 return {...copy,title:original.title,notes:original.notes,allDay:original.allDay,dueDate:original.dueDate,
  endDate:original.endDate,startAt:original.startAt,endAt:original.endAt,timeZone:original.timeZone};
}

function occurrenceKey(event:CalendarEvent){
 if(!event.externalUid)return null;
 if(event.allDay)return event.dueDate?JSON.stringify([event.externalUid,event.dueDate]):null;
 const start=Date.parse(event.startAt??'');
 return Number.isFinite(start)?JSON.stringify([event.externalUid,start]):null;
}

/** EventKit can expose the same Google calendar that an account also connects directly. */
export function mergeCalendarCopies(events:CalendarEvent[]):CalendarEvent[]{
 const sameCalendar=new Map<string,CalendarEvent>();
 for(const event of events){
  const occurrence=(event.provider==='apple-calendar'||event.provider==='google')&&occurrenceKey(event);
  const key=occurrence?JSON.stringify([event.provider,event.connectionId,event.calendarId,occurrence]):event.id;
  sameCalendar.set(key,event);
 }
 const unique=[...sameCalendar.values()];
 const groups=new Map<string,{apple:CalendarEvent[];google:CalendarEvent[]}>();
 for(const event of unique){
  const provider=event.mirror?.provider??event.provider;
  if(provider!=='google'&&provider!=='apple-calendar')continue;
  const key=occurrenceKey(event);
  if(!key)continue;
  const group=groups.get(key)??{apple:[],google:[]};
  (provider==='google'?group.google:group.apple).push(event);
  groups.set(key,group);
 }
 const copies=new Set<string>();
 for(const {apple,google} of groups.values()){
  // Ambiguous subscriptions can intentionally put a copy in more than one calendar.
  if(apple.length!==1||google.length!==1)continue;
  const [device]=apple,[cloud]=google;
  copies.add(device.mirror||device.canWrite&&!cloud.canWrite?cloud.id:device.id);
 }
 return unique.filter(event=>!copies.has(event.id));
}
