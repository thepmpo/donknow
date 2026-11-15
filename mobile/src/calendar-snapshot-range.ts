import type {CalendarSnapshot} from './calendar-snapshot-store.ts';
import {zonedDay} from './calendar-model.ts';
/** Reuse overlapping saved ranges after a cold launch, including a changed week boundary. */
export function savedCalendarRange(periods:Iterable<CalendarSnapshot>,key:string,family:string,selected:string[],start:string,end:string,zone:string){
 const rows=[...periods],exact=rows.find(p=>p.key===key&&p.family===family);
 if(exact)return {items:[...exact.items],readAt:exact.readAt,cursors:{...exact.cursors}};
 const compatible=rows.filter(p=>p.family===family&&p.start<end&&p.end>start),items=new Map();
 for(const p of compatible)for(const e of p.items){
  if(!selected.includes(e.calendarId??'primary'))continue;
  const first=e.allDay?e.dueDate:e.startAt?zonedDay(e.startAt,zone):e.dueDate;
  const last=e.allDay?e.endDate:e.endAt?zonedDay(Math.max(Date.parse(e.startAt??e.endAt),Date.parse(e.endAt)-1),zone):first;
  if(first&&first<end&&(e.allDay&&e.endDate?e.endDate>start:(last??first)>=start))items.set(JSON.stringify([e.connectionId??'',e.calendarId??'primary',e.eventId??e.id]),e);
 }
 return {items:[...items.values()] as CalendarSnapshot['items'],readAt:compatible.map(p=>p.readAt).filter((v):v is string=>!!v).sort().at(-1)??null,cursors:{}};
}
