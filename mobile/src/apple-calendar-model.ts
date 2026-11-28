import {eventDraft,calendarWriteArgs} from './calendar-edit-model.ts';
import {deviceZone,validZone,zonedDay,shiftDay,wallTime} from './calendar-model.ts';
import type {CalendarEvent,CalendarSource} from './calendar-model.ts';
import type {CalendarDraft} from './calendar-edit-model.ts';
export const appleCalendarPrefix='@apple/';
export const isAppleCalendar=(id?:string|null)=>!!id?.startsWith(appleCalendarPrefix);
export type DeviceCalendar={id:string;title:string;color?:string|null;writable:boolean;account?:string;accountId?:string;isDefault?:boolean};
export type DeviceEvent={id:string;calendarId:string;externalUid?:string;allDayStart?:string;allDayEnd?:string;title:string;notes:string;location?:string|null;url?:string|null;startDate:string;endDate:string;allDay:boolean;timeZone?:string;modified?:string;alarms?:{relativeOffset?:number;absoluteDate?:string}[];recurrence?:unknown};
export type DeviceEventPatch={title?:string;notes?:string;location?:string;url?:string;startDate?:string;endDate?:string;allDay?:boolean;allDayStart?:string;allDayEnd?:string;timeZone?:string;alarms?:{relativeOffset:number}[];repeat?:string;expectedModified?:number};
export function appleEventVersion(e:DeviceEvent){return JSON.stringify([e.id,e.calendarId,e.modified,e.title,e.notes,e.location,e.url,e.startDate,e.endDate,e.allDay,e.timeZone,e.alarms,!!e.recurrence]);}
export function appleCalendarSource(c:DeviceCalendar):CalendarSource{return {id:appleCalendarPrefix+encodeURIComponent(c.id),name:c.title,accountLabel:c.account,accountId:c.accountId,canWrite:c.writable,provider:'apple-calendar',color:c.color,isDeviceDefault:c.isDefault};}
export function normalizeAppleEvent(e:DeviceEvent,calendar:DeviceCalendar):CalendarEvent{
 const zone=validZone(e.timeZone??'')?e.timeZone!:deviceZone(),first=e.allDayStart??zonedDay(e.startDate,zone),end=e.allDayEnd??zonedDay(e.endDate,zone),offset=e.alarms?.[0]?.relativeOffset;
 return {id:'apple:'+encodeURIComponent(e.calendarId)+':'+encodeURIComponent(e.id)+':'+e.startDate,eventId:e.id,updatedAt:e.modified,externalUid:e.externalUid,calendarId:appleCalendarPrefix+encodeURIComponent(e.calendarId),calendarName:calendar.title,color:calendar.color,title:e.title||'제목 없음',notes:e.notes.slice(0,4000),notesPartial:e.notes.length>4000,location:e.location??'',dueDate:first,endDate:e.allDay?(end>first?end:shiftDay(first,1)):null,allDay:e.allDay,startAt:e.allDay?null:e.startDate,endAt:e.allDay?null:e.endDate,timeZone:e.timeZone,canWrite:calendar.writable,etag:appleEventVersion(e),recurring:!!e.recurrence,provider:'apple-calendar',nativeStart:e.startDate,duckDetails:{revision:0,fields:{url:e.url??'',reminderMinutes:typeof offset==='number'&&offset<=0?-offset:null}}};
}
/** Partial updates preserve provider recurrence/attendees/location/alarms unless edited. */
export function appleEventPatch(draft:CalendarDraft,event?:CalendarEvent):DeviceEventPatch{
 calendarWriteArgs(draft,event);const old=event?eventDraft(event.dueDate??draft.startDay,draft.timeZone,draft.calendarId,event):null,patch:DeviceEventPatch={};
 if(!old||old.title!==draft.title)patch.title=draft.title.trim();if(!event?.notesPartial&&(!old||old.notes!==draft.notes))patch.notes=draft.notes;
 if(!old||['startDay','endDay','startTime','endTime','allDay'].some(key=>draft[key as keyof CalendarDraft]!==old[key as keyof CalendarDraft]))Object.assign(patch,{allDay:draft.allDay,startDate:draft.allDay?wallTime(draft.startDay,'00:00',draft.timeZone):wallTime(draft.startDay,draft.startTime,draft.timeZone),endDate:draft.allDay?wallTime(shiftDay(draft.endDay,1),'00:00',draft.timeZone):wallTime(draft.endDay,draft.endTime,draft.timeZone),timeZone:draft.timeZone,...(draft.allDay?{allDayStart:draft.startDay,allDayEnd:shiftDay(draft.endDay,1)}:{})});
 if(!old||old.duckUrl!==draft.duckUrl)patch.url=draft.duckUrl;
 if(!old||old.reminderMinutes!==draft.reminderMinutes)patch.alarms=draft.reminderMinutes===null?[]:[{relativeOffset:-draft.reminderMinutes}];
 if(!event&&draft.repeat&&draft.repeat!=='none')patch.repeat=draft.repeat;
 if(!event&&draft.guests?.trim())throw Error('아이폰 캘린더의 초대는 원본 캘린더에서 설정해주세요.');
 if(event&&draft.calendarId!==event.calendarId)throw Error('아이폰 일정의 캘린더 이동은 원본에서 진행해주세요.');
 return patch;
}
export type AppleCalendarDevice={available:boolean;snapshot?:(hidden:string[],start:string,end:string)=>Promise<{calendars:DeviceCalendar[];events:DeviceEvent[]}>;subscribe?:(listener:()=>void)=>()=>void;granted:()=>Promise<boolean>;authorize:()=>Promise<boolean>;calendars:()=>Promise<DeviceCalendar[]>;events:(ids:string[],start:string,end:string)=>Promise<DeviceEvent[]>;isLinkedEventMissing?:(id:string,externalUid:string,calendarId:string)=>Promise<boolean>;readLinked?:(externalUid:string,calendarId:string)=>Promise<DeviceEvent>;read:(id:string,start?:string,calendarId?:string)=>Promise<DeviceEvent>;create:(calendarId:string,patch:DeviceEventPatch)=>Promise<DeviceEvent>;update:(id:string,start:string|undefined,patch:DeviceEventPatch,calendarId?:string)=>Promise<DeviceEvent>;remove:(id:string,start?:string,calendarId?:string)=>Promise<void>};
export async function saveAppleCalendar(device:AppleCalendarDevice,draft:CalendarDraft,event:CalendarEvent|undefined,current:()=>boolean,
 receipt?:{beforeWrite:()=>Promise<void>}){
 if(!device.available||!await device.granted())throw Error('ME에서 아이폰 캘린더 접근을 허용해주세요.');if(!current())throw Error('계정이 바뀌었어요.');
 const rawId=decodeURIComponent(draft.calendarId.slice(appleCalendarPrefix.length)),calendars=await device.calendars(),calendar=calendars.find(c=>c.id===rawId);if(!isAppleCalendar(draft.calendarId)||!calendar?.writable)throw Error('쓰기 가능한 아이폰 캘린더를 선택해주세요.');
 const fresh=event?await device.read(event.eventId!,event.nativeStart,rawId):null;
 if(fresh&&appleEventVersion(fresh)!==event?.etag)throw Error('원본 일정이 바뀌었어요. 새로 확인한 뒤 저장해주세요.');
 const patch=appleEventPatch(draft,event);
 if(fresh?.modified)patch.expectedModified=Date.parse(fresh.modified);
 if(!current())throw Error('계정이 바뀌었어요.');
 // The caller persists a receipt under the captured account, even if the app resumes during the write.
 if(receipt)await receipt.beforeWrite();
 let saved:DeviceEvent;
 try{saved=event?await device.update(event.eventId!,event.nativeStart,patch,rawId):await device.create(rawId,patch);}catch{throw Object.assign(Error('아이폰 캘린더에서 저장 결과를 확인해주세요.'),{writeState:'unknown'});}
 if(!receipt&&!current())throw Object.assign(Error('계정이 바뀌어 저장 결과를 표시하지 않았어요.'),{writeState:'unknown'});
 const normalized=normalizeAppleEvent(saved,calendar);
 if(patch.allDay!==undefined&&(normalized.allDay!==patch.allDay||patch.allDay&&
   (normalized.dueDate!==patch.allDayStart||normalized.endDate!==patch.allDayEnd))){
  throw Object.assign(Error('아이폰 캘린더에서 저장된 날짜와 하루 종일 설정을 확인해주세요.'),{writeState:'unknown'});
 }
 return normalized;
}
