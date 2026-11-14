import {localTime,shiftDay,wallTime,zonedDay} from './calendar-model.ts';
import type {CalendarDuckFields,CalendarEvent} from './calendar-model.ts';
export type CalendarDraft={title:string;startDay:string;endDay:string;startTime:string;endTime:string;allDay:boolean;notes:string;location:string;calendarId:string;timeZone:string;reminderMinutes:number|null;localNotes:string;duckUrl:string;attachments:{name:string;url:string}[]};
export function eventDraft(day:string,zone:string,calendarId:string,event?:CalendarEvent):CalendarDraft{
 const first=event?.dueDate??day,local=event?.duckDetails?.fields;
 return {title:event?.title??'',startDay:event?.allDay?first:event?.startAt?zonedDay(event.startAt,zone):day,endDay:event?.allDay?shiftDay(event.endDate??shiftDay(first,1),-1):event?.endAt?zonedDay(event.endAt,zone):day,startTime:event?.startAt?localTime(event.startAt,zone):'09:00',endTime:event?.endAt?localTime(event.endAt,zone):'10:00',allDay:event?.allDay??false,notes:event?.notes??'',location:event?.location??'',calendarId:event?.calendarId??calendarId,timeZone:zone,reminderMinutes:local?.reminderMinutes??null,localNotes:local?.localNotes??'',duckUrl:local?.url??'',attachments:local?.attachments??[]};
}
/** Omitted provider properties stay omitted: title-only edits never rewrite times/guests. */
export function calendarWriteArgs(draft:CalendarDraft,event?:CalendarEvent,legacy=false):Record<string,unknown>|null{
 const original=event?eventDraft(event.dueDate??draft.startDay,draft.timeZone,draft.calendarId,event):null;
 const patch:Record<string,unknown>={};
 if(!original||legacy||draft.title!==original.title){if(!draft.title.trim())throw Error('일정 제목을 적어주세요.');patch.title=draft.title.trim();}
 if(!original||legacy||draft.location!==original.location)patch.location=draft.location;
 if(!event?.notesPartial&&(!original||legacy||draft.notes!==original.notes))patch.notes=draft.notes;
 if(!original||legacy||(['startDay','endDay','startTime','endTime','allDay'] as const).some(k=>draft[k]!==original[k])){
  if(draft.endDay<draft.startDay)throw Error('종료일은 시작일 이후로 선택해주세요.');
  Object.assign(patch,draft.allDay?{allDay:true,startDate:draft.startDay,endDate:shiftDay(draft.endDay,1),timeZone:draft.timeZone}:{allDay:false,start:wallTime(draft.startDay,draft.startTime,draft.timeZone),end:wallTime(draft.endDay,draft.endTime,draft.timeZone),timeZone:draft.timeZone});
 }
 if(!Object.keys(patch).length)return null;
 return {...patch,calendarId:draft.calendarId,...(event?{id:event.eventId??'',expectedETag:event.etag}:{} )};
}
export function calendarDuckPatch(draft:CalendarDraft,event?:CalendarEvent):CalendarDuckFields{
 const old=event?.duckDetails?.fields??{},patch:CalendarDuckFields={};
 if(draft.reminderMinutes!==(old.reminderMinutes??null))patch.reminderMinutes=draft.reminderMinutes;
 if(draft.localNotes!==(old.localNotes??''))patch.localNotes=draft.localNotes;
 if(draft.duckUrl!==(old.url??''))patch.url=draft.duckUrl;
 if(JSON.stringify(draft.attachments)!==JSON.stringify(old.attachments??[]))patch.attachments=draft.attachments;
 return patch;
}
export function confirmedCalendarPatch(draft:CalendarDraft,event?:CalendarEvent):Partial<CalendarEvent>{
 const a=calendarWriteArgs(draft,event),patch:Partial<CalendarEvent>={};if(!a)return patch;
 if(a.title!==undefined)patch.title=String(a.title);if(a.notes!==undefined)patch.notes=String(a.notes);if(a.location!==undefined)patch.location=String(a.location);
 if(a.startDate||a.start){patch.allDay=draft.allDay;patch.dueDate=draft.startDay;patch.endDate=draft.allDay?String(a.endDate):draft.endDay;patch.startAt=draft.allDay?null:String(a.start);patch.endAt=draft.allDay?null:String(a.end);patch.timeZone=draft.timeZone;}
 return patch;
}
