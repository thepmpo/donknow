import {localTime,wallTime,zonedDay} from './calendar-model.ts';
import type {CalendarEvent} from './calendar-model.ts';

/** A continuation is not a new start at the previous day's clock time. */
export function calendarStartLabel(event:CalendarEvent,day:string,zone:string){
 if(event.allDay)return '';
 if(!event.startAt||!Number.isFinite(Date.parse(event.startAt)))return '시간 미정';
 return zonedDay(event.startAt,zone)<day?'계속':localTime(event.startAt,zone);
}
export const reminderChoices=[null,0,5,10,15,30,60,120,1440,2880,10080] as const;
export function reminderOffsetLabel(minutes:number|null){
 if(minutes===null)return '없음';if(minutes===0)return '이벤트 시간';
 if(minutes===10080)return '1주 전';if(minutes%1440===0)return minutes/1440+'일 전';
 if(minutes%60===0)return minutes/60+'시간 전';return minutes+'분 전';
}
export function reminderDateLabel(instant:string,zone:string){
 return new Intl.DateTimeFormat('ko-KR',{timeZone:zone,year:'numeric',month:'long',day:'numeric',weekday:'short',hour:'numeric',minute:'2-digit'}).format(new Date(instant));
}
/** Matches the server: all-day reminders use 09:00 in the event's zone. */
export function calendarReminderInstant(day:string,time:string,allDay:boolean,zone:string,minutes:number|null,originalStart?:string|null){
 if(minutes===null)return null;
 if(!Number.isInteger(minutes)||minutes<0||minutes>40320)throw new Error('알림 시간을 확인해주세요.');
 const preserved=!allDay&&originalStart&&zonedDay(originalStart,zone)===day&&localTime(originalStart,zone)===time?originalStart:null;
 return new Date(Date.parse(preserved??wallTime(day,allDay?'09:00':time,zone))-minutes*60000).toISOString();
}
export function todoReminderInstant(day:string,time:string,zone:string,original?:string|null){
 if(original&&zonedDay(original,zone)===day&&localTime(original,zone)===time)return original;
 return calendarReminderInstant(day,time,false,zone,0)!;
}
