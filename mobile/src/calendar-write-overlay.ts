import {eventOccurs,shiftDay} from './calendar-model.ts';
import type {CalendarEvent} from './calendar-model.ts';
type Entry={event:CalendarEvent;replaces?:string;confirmedUntil?:number};
const writes=new Map<string,Map<string,Entry>>(),listeners=new Map<string,Set<()=>void>>();
function matchesEvent(e:CalendarEvent,event:CalendarEvent){
 if(e.id===event.id)return true;
 if(!event.eventId||(e.calendarId??'primary')!==(event.calendarId??'primary')||(e.connectionId??null)!==(event.connectionId??null))return false;
 if(e.provider==='apple-calendar')return e.eventId===event.eventId&&e.nativeStart===event.nativeStart;
 return e.eventId===event.eventId||e.seriesId===event.eventId&&e.dueDate===event.dueDate;
}
export function removeCalendarEventWrites(owner:string,event:CalendarEvent){
 const entries=writes.get(owner);if(!entries)return;
 for(const [key,value] of entries)if(matchesEvent(event,value.event)||value.replaces===event.id)entries.delete(key);
 if(!entries.size)writes.delete(owner);
 notify(owner);
}
const deletions=new Map<string,Map<string,CalendarEvent>>();
export function hideCalendarDeletion(owner:string,event:CalendarEvent){
 let pending=deletions.get(owner);
 if(!pending){pending=new Map();deletions.set(owner,pending);}
 pending.set(event.id,event);notify(owner);
 return (committed:boolean)=>{
  const release=()=>{if(pending.get(event.id)===event){pending.delete(event.id);if(!pending.size&&deletions.get(owner)===pending)deletions.delete(owner);notify(owner);}};
  if(committed)setTimeout(release,90_000);else release();
 };
}
export function matchesCalendarMirror(event:CalendarEvent,mirror:Omit<NonNullable<CalendarEvent['mirror']>,'state'>,day?:string|null){
 return mirror.calendarId===event.calendarId
  &&(mirror.connectionId??null)===(event.connectionId??null)&&!!mirror.externalEventId
  &&(event.eventId===mirror.externalEventId||event.seriesId===mirror.externalEventId)
  &&(day===undefined||event.dueDate===day||!event.recurring&&event.eventId===mirror.externalEventId);
}
function notify(owner:string){listeners.get(owner)?.forEach(fn=>fn());}
export function putCalendarWrite(owner:string,key:string,event:CalendarEvent,replaces?:string,confirmed=false){let entries=writes.get(owner);if(!entries){entries=new Map();writes.set(owner,entries);}const entry={event,replaces,confirmedUntil:confirmed?Date.now()+90_000:undefined};entries.set(key,entry);notify(owner);
 if(confirmed)setTimeout(()=>{if(writes.get(owner)?.get(key)===entry)removeCalendarWrite(owner,key);},90_000);}
export function removeCalendarWrite(owner:string,key:string){writes.get(owner)?.delete(key);if(!writes.get(owner)?.size)writes.delete(owner);notify(owner);}
export function clearCalendarWrites(owner:string){writes.delete(owner);deletions.delete(owner);notify(owner);}
export function watchCalendarWrites(owner:string,fn:()=>void){const set=listeners.get(owner)??new Set();set.add(fn);listeners.set(owner,set);return()=>{set.delete(fn);if(!set.size)listeners.delete(owner);};}
/** Optimism lives only in memory, outside persisted provider snapshots and their
 * permission/ETag authority. Both Duo panes and Todo consume the same overlay. */
export function overlayCalendarWrites(owner:string,events:CalendarEvent[],start:string,end:string,zone:string,selected:string[]){
 let result=[...events];
 for(const {event,replaces,confirmedUntil} of writes.get(owner)?.values()??[]){
  if(confirmedUntil&&confirmedUntil<=Date.now())continue;
  const same=(e:CalendarEvent)=>matchesEvent(e,event);
  const current=confirmedUntil&&result.some(e=>same(e)&&e.title===event.title&&!!e.allDay===!!event.allDay&&(event.allDay
   ?e.dueDate===event.dueDate&&e.endDate===event.endDate
   :Date.parse(e.startAt??'')===Date.parse(event.startAt??'')&&Date.parse(e.endAt??'')===Date.parse(event.endAt??'')));
  result=result.filter(e=>current?same(e)||e.id!==replaces:e.id!==replaces&&!same(e));
  if(current)continue;
  if(!selected.includes(event.calendarId??'primary'))continue;
  for(let day=start;day<end;day=shiftDay(day,1))if(eventOccurs(event,day,zone)){result.push(event);break;}
 }
 for(const removed of deletions.get(owner)?.values()??[])result=result.filter(e=>!matchesEvent(e,removed)&&(!removed.mirror||!matchesCalendarMirror(e,removed.mirror)));
 return result;
}
