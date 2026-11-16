import {eventOccurs,shiftDay} from './calendar-model.ts';
import type {CalendarEvent} from './calendar-model.ts';
type Entry={event:CalendarEvent;replaces?:string};
const writes=new Map<string,Map<string,Entry>>(),listeners=new Map<string,Set<()=>void>>();
function notify(owner:string){listeners.get(owner)?.forEach(fn=>fn());}
export function putCalendarWrite(owner:string,key:string,event:CalendarEvent,replaces?:string){let entries=writes.get(owner);if(!entries){entries=new Map();writes.set(owner,entries);}entries.set(key,{event,replaces});notify(owner);}
export function removeCalendarWrite(owner:string,key:string){writes.get(owner)?.delete(key);if(!writes.get(owner)?.size)writes.delete(owner);notify(owner);}
export function clearCalendarWrites(owner:string){writes.delete(owner);notify(owner);}
export function watchCalendarWrites(owner:string,fn:()=>void){const set=listeners.get(owner)??new Set();set.add(fn);listeners.set(owner,set);return()=>{set.delete(fn);if(!set.size)listeners.delete(owner);};}
/** Optimism lives only in memory, outside persisted provider snapshots and their
 * permission/ETag authority. Both Duo panes and Todo consume the same overlay. */
export function overlayCalendarWrites(owner:string,events:CalendarEvent[],start:string,end:string,zone:string,selected:string[]){
 let result=[...events];
 for(const {event,replaces} of writes.get(owner)?.values()??[]){
  result=result.filter(e=>e.id!==replaces&&e.id!==event.id);
  if(!selected.includes(event.calendarId??'primary'))continue;
  for(let day=start;day<end;day=shiftDay(day,1))if(eventOccurs(event,day,zone)){result.push(event);break;}
 }
 return result;
}
