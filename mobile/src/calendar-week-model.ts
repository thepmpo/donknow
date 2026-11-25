import {eventOccurs,minutesAt,shiftDay,timedLayout,wallTime,weekDays,zonedDay} from './calendar-model.ts';
import type {CalendarEvent} from './calendar-model.ts';
import type {Todo} from './domain.ts';
export const WEEK_HOUR_HEIGHT=72;
export function calendarWeekDays(selected:string){return weekDays(selected,1);}
export function eventDayRange(event:CalendarEvent,zone:string){
 const first=event.allDay?event.dueDate:event.startAt?zonedDay(event.startAt,zone):event.dueDate;
 const last=event.allDay?(event.endDate?shiftDay(event.endDate,-1):first):event.endAt?zonedDay(Date.parse(event.endAt)-1,zone):event.endDate??first;
 return first?{first,last:last??first}:null;
}
export function pinnedWeekEvent(event:CalendarEvent,zone:string){const range=eventDayRange(event,zone);return !!range&&(!!event.allDay||!event.startAt||!event.endAt||range.last>range.first);}
export function weekSpans(events:CalendarEvent[],weekdays:string[],zone:string){
 const entries=events.filter(e=>pinnedWeekEvent(e,zone)).map(event=>{const range=eventDayRange(event,zone)!;const first=weekdays.findIndex(day=>eventOccurs(event,day,zone));let last=-1;weekdays.forEach((day,i)=>{if(eventOccurs(event,day,zone))last=i;});return {event,first,last,continuesBefore:range.first<weekdays[0],continuesAfter:range.last>weekdays.at(-1)!};}).filter(e=>e.first>=0).sort((a,b)=>a.first-b.first||b.last-a.last||a.event.id.localeCompare(b.event.id));
 const lanes:Array<Array<{first:number;last:number}>>=[];
 return entries.map(entry=>{let lane=lanes.findIndex(row=>row.every(other=>entry.last<other.first||entry.first>other.last));if(lane<0){lane=lanes.length;lanes.push([]);}lanes[lane].push(entry);return {...entry,lane};});
}
export function weekTimedItems(events:CalendarEvent[],todos:Todo[],day:string,zone:string,minMinutes=30){
 const taskEvents=new Map<string,Todo>(),input=events.filter(e=>!pinnedWeekEvent(e,zone));
 for(const todo of todos){if(todo.done||todo.dueDate!==day||!todo.dueTime||!/^([01]\d|2[0-3]):[0-5]\d$/.test(todo.dueTime))continue;
  try{const start=wallTime(day,todo.dueTime,zone),id='week-todo:'+todo.id;taskEvents.set(id,todo);input.push({id,title:todo.title,dueDate:day,startAt:start,endAt:new Date(Date.parse(start)+minMinutes*60000).toISOString(),allDay:false});}catch{/* Invalid local/DST time stays available in the day details, never coerced. */}
 }
 return timedLayout(input,day,zone,minMinutes).map(item=>({...item,todo:taskEvents.get(item.event.id)}));
}
export function weekendItems(events:CalendarEvent[],todos:Todo[],day:string,zone:string){
 const entries:Array<{key:string;event?:CalendarEvent;todo?:Todo;minute:number}>=events.filter(e=>eventOccurs(e,day,zone)).map(event=>({key:'event:'+event.id,event,minute:event.allDay?-1:event.startAt?(zonedDay(event.startAt,zone)<day?0:minutesAt(event.startAt,zone)):Infinity}));
 for(const todo of todos.filter(t=>!t.done&&t.dueDate===day)){const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(todo.dueTime??'');entries.push({key:'todo:'+todo.id,todo,minute:match?Number(match[1])*60+Number(match[2]):Infinity});}
 return entries.sort((a,b)=>a.minute-b.minute||a.key.localeCompare(b.key));
}
