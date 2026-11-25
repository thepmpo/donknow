import type {DeviceCalendar,DeviceEvent} from './apple-calendar-model.ts';
export function appleCalendarDocument(calendars:DeviceCalendar[],events:DeviceEvent[],start:string,end:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=start)throw Error('읽을 날짜 범위를 확인해주세요.');
 const ids=new Set(calendars.map(c=>c.id));const text=JSON.stringify({source:'아이폰 캘린더',start,end,readAt:new Date().toISOString(),calendars:calendars.map(c=>({id:c.id,title:c.title,account:c.account})),events:events.filter(e=>ids.has(e.calendarId)).map(e=>({id:e.id,calendarId:e.calendarId,title:e.title,notes:e.notes,start:e.startDate,end:e.endDate,allDay:e.allDay,timeZone:e.timeZone,location:e.location,url:e.url,modifiedAt:e.modified}))},null,2);
 if(new TextEncoder().encode(text).length>4*1024*1024)throw Error('날짜 범위를 줄여 다시 전달해주세요.');return text;
}
export function utf8Base64(text:string){const bytes=new TextEncoder().encode(text);let raw='';for(let i=0;i<bytes.length;i+=4096)raw+=String.fromCharCode(...bytes.slice(i,i+4096));return btoa(raw);}
