import {dateKey,monthDays} from './domain.ts';
export type CalendarEvent={id:string;eventId?:string;calendarId?:string;calendarName?:string;title:string;dueDate:string|null;endDate?:string|null;startAt?:string|null;endAt?:string|null;allDay?:boolean;timeZone?:string;canWrite?:boolean;etag?:string|null;location?:string;notes?:string;notesPartial?:boolean;url?:string|null;meetingUrl?:string|null;recurring?:boolean};
export type CalendarSource={id:string;name:string;primary?:boolean;canWrite:boolean;timeZone?:string;color?:string|null};
export type CalendarView='month'|'week'|'day'|'list';
export function deviceZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul';}catch{return 'Asia/Seoul';}}
export function validZone(zone:string){try{new Intl.DateTimeFormat('en',{timeZone:zone});return !!zone;}catch{return false;}}
export function zonedDay(value:string|number|Date,zone:string){return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
export function shiftDay(day:string,amount:number){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function weekDays(day:string,startDay=0){const d=new Date(day+'T12:00:00Z');const first=shiftDay(day,-((d.getUTCDay()-startDay+7)%7));return Array.from({length:7},(_,i)=>shiftDay(first,i));}
export function visibleDays(month:string,selected:string,view:CalendarView,startDay=0){
 if(view==='week')return weekDays(selected,startDay);if(view==='day')return [selected];
 const [y,m]=month.split('-').map(Number);if(startDay===0)return monthDays(new Date(y,m-1,1)).map(dateKey);
 const first=weekDays(month+'-01',startDay)[0];return Array.from({length:42},(_,i)=>shiftDay(first,i));
}
export function eventOccurs(event:CalendarEvent,day:string,zone:string){
 const start=event.allDay?event.dueDate:event.startAt?zonedDay(event.startAt,zone):event.dueDate;
 const last=event.allDay?(event.endDate?shiftDay(event.endDate,-1):start):event.endAt?zonedDay(Date.parse(event.endAt)-1,zone):event.endDate??start;
 return !!start&&day>=start&&day<=(last??start);
}
export function eventTime(event:CalendarEvent,zone:string){if(event.allDay)return '종일';if(!event.startAt)return '시간 미정';const f=new Intl.DateTimeFormat('ko-KR',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});return f.format(new Date(event.startAt))+(event.endAt?' – '+f.format(new Date(event.endAt)):'');}
export function minutesAt(instant:string,zone:string){const p=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));return +p.hour*60 + +p.minute;}
export function localTime(instant:string,zone:string){const minutes=minutesAt(instant,zone);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
export function wallTime(day:string,time:string,zone:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!validZone(zone))throw Error('날짜와 시간을 확인해주세요.');
 const [y,m,d]=day.split('-').map(Number),[h,min]=time.split(':').map(Number),target=Date.UTC(y,m-1,d,h,min);let guess=target;
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(let i=0;i<5;i++){const p=Object.fromEntries(f.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const delta=target-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);if(!delta)return new Date(guess).toISOString();guess+=delta;}
 throw Error('이 시간대에 존재하지 않는 시각이에요. 다른 시각을 선택해주세요.');
}
export function monthCellHeight(height:number,header:number,bottom:number,fontScale=1){return Math.max(44,Math.min(112,Math.floor((height-header-bottom-80)/6)),Math.ceil(30*fontScale+12));}
export function periodShift(month:string,selected:string,view:CalendarView,offset:number){
 if(view==='week'||view==='day'){const day=shiftDay(selected,offset*(view==='week'?7:1));return {month:day.slice(0,7),selected:day};}
 const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+offset,1)),day=d.toISOString().slice(0,10);return {month:day.slice(0,7),selected:day};
}
export function safeCalendarLink(value?:string|null){try{const u=new URL(value??'');if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/.test(u.hostname))return null;return u.href;}catch{return null;}}
export function timedLayout(events:CalendarEvent[],day:string,zone:string,minDuration=0){
 const list=events.filter(e=>!e.allDay&&e.startAt&&e.endAt&&eventOccurs(e,day,zone)).map(event=>({event,start:zonedDay(event.startAt!,zone)<day?0:minutesAt(event.startAt!,zone),end:zonedDay(Date.parse(event.endAt!)-1,zone)>day?1440:minutesAt(event.endAt!,zone)||1440,lane:0,lanes:1})).sort((a,b)=>a.start-b.start||b.end-a.end);
 const occupiedEnd=(x:typeof list[number])=>Math.max(x.end,x.start+minDuration);
 let group:typeof list=[],end=-1;const flush=()=>{const n=Math.max(1,...group.map(x=>x.lane+1));for(const x of group)x.lanes=n;group=[];};
 for(const item of list){if(item.start>=end){flush();end=-1;}const used=new Set(group.filter(x=>occupiedEnd(x)>item.start).map(x=>x.lane));while(used.has(item.lane))item.lane++;group.push(item);end=Math.max(end,occupiedEnd(item));}flush();return list;
}
