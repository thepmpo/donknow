import type {Todo} from './domain.ts';import type {CalendarEvent} from './calendar-model.ts';
import {wallTime,zonedDay,shiftDay} from './calendar-model.ts';
/** Only a confirmed edit to this exact imported event may change its cached display. */
export function importedCalendarPatch(todo:Todo,event:CalendarEvent,zone:string,fields:Record<string,unknown>):CalendarEvent{
 if(todo.source?.provider!=='google'||todo.sourceSync?.state!=='succeeded'||todo.source.externalId!==event.id||!todo.dueDate)return event;
 const content={...event,...('title' in fields?{title:todo.title}:{}),...('notes' in fields?{notes:todo.notes??''}:{})};
 if(!('dueDate' in fields)&&!('dueTime' in fields))return content;
 const allDay=todo.dueTime==null;
 if(allDay){const span=event.allDay&&event.endDate&&event.dueDate?Math.max(1,Math.round((Date.parse(event.endDate)-Date.parse(event.dueDate))/86400000)):1;return {...content,allDay:true,dueDate:todo.dueDate,endDate:shiftDay(todo.dueDate,span),startAt:null,endAt:null};}
 const startAt=wallTime(todo.dueDate,todo.dueTime!,todo.source.timeZone??event.timeZone??zone),duration=event.startAt&&event.endAt?Math.max(60000,Date.parse(event.endAt)-Date.parse(event.startAt)):3600000,endAt=new Date(Date.parse(startAt)+duration).toISOString();
 return {...content,allDay:false,startAt,endAt,dueDate:zonedDay(startAt,zone),endDate:zonedDay(endAt,zone)};
}
