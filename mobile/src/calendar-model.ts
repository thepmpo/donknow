export const docenCalendarId='@docen';
export type CalendarDuckFields={reminderMinutes?:number|null;localNotes?:string;url?:string;attachments?:{name:string;url:string}[]};
export type CalendarMirrorTarget={provider:'google'|'apple-calendar';calendarId:string;connectionId?:string|null;name?:string;color?:string|null};
export type CalendarMirror=CalendarMirrorTarget&{state:'queued'|'sending'|'synced'|'blocked'|'failed'|'checking';externalEventId?:string;externalUid?:string;syncVersion?:string|null;syncRevision?:number};
export type CalendarEvent={id:string;provider?:'google'|'apple-calendar'|'docen';nativeStart?:string;updatedAt?:string;externalUid?:string;mirror?:CalendarMirror;saveState?:'saving'|'checking';eventId?:string;calendarId?:string;calendarName?:string;color?:string|null;title:string;dueDate:string|null;endDate?:string|null;startAt?:string|null;endAt?:string|null;allDay?:boolean;timeZone?:string;canWrite?:boolean;etag?:string|null;location?:string;notes?:string;notesPartial?:boolean;url?:string|null;meetingUrl?:string|null;recurring?:boolean;seriesId?:string;connectionId?:string|null;duckDetails?:{revision:number;fields:CalendarDuckFields};providerDetails?:{recurrence?:string[];attendees?:{email:string;name:string;response:string}[];attendeesPartial?:boolean;attachments?:{name:string;url:string|null}[];reminders?:{useDefault?:boolean;overrides?:{method:string;minutes:number}[]}|null}};
export type CalendarSource={id:string;name:string;provider?:'google'|'apple-calendar'|'docen';primary?:boolean;canWrite:boolean;timeZone?:string;color?:string|null;connectionId?:string|null;accountId?:string;accountLabel?:string};
export function groupCalendarSources(sources:CalendarSource[]){
 const groups=new Map<string,{id:string;label:string;items:CalendarSource[]}>();
 for(const source of sources){
  const label=source.accountLabel??(source.provider==='apple-calendar'?'아이폰':'Google');
  const id=JSON.stringify([source.provider??'google',source.accountId??source.connectionId??label]);
  const group=groups.get(id)??{id,label,items:[]};
  group.items.push(source);
  groups.set(id,group);
 }
 return [...groups.values()];
}
export type CalendarView='month'|'fortnight'|'week'|'day'|'list';
export function deviceZone(){try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'Asia/Seoul';}catch{return 'Asia/Seoul';}}
export function validZone(zone:string){try{new Intl.DateTimeFormat('en',{timeZone:zone});return !!zone;}catch{return false;}}
const dateFormats=new Map<string,Intl.DateTimeFormat>(),timeFormats=new Map<string,Intl.DateTimeFormat>();
function zoneFormat(cache:Map<string,Intl.DateTimeFormat>,zone:string,locale:string,options:Intl.DateTimeFormatOptions){
 let format=cache.get(zone);
 if(!format){format=new Intl.DateTimeFormat(locale,{timeZone:zone,...options});if(cache.size>=16)cache.delete(cache.keys().next().value!);cache.set(zone,format);}
 return format;
}
export function zonedDay(value:string|number|Date,zone:string){return zoneFormat(dateFormats,zone,'sv-SE',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
const timeFormat=(zone:string)=>zoneFormat(timeFormats,zone,'ko-KR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export function shiftDay(day:string,amount:number){const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export function weekDays(day:string,startDay=0){const d=new Date(day+'T12:00:00Z');const first=shiftDay(day,-((d.getUTCDay()-startDay+7)%7));return Array.from({length:7},(_,i)=>shiftDay(first,i));}
export function visibleDays(month:string,selected:string,view:CalendarView,startDay=0){
 if(view==='week')return weekDays(selected,startDay);if(view==='day')return [selected];
 if(view==='fortnight'){const first=weekDays(selected,startDay)[0];return Array.from({length:14},(_,i)=>shiftDay(first,i));}
 const [y,m]=month.split('-').map(Number),last=new Date(Date.UTC(y,m,0)).toISOString().slice(0,10);
 const first=weekDays(month+'-01',startDay)[0],end=weekDays(last,startDay)[6];
 const count=Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(first+'T12:00:00Z'))/86400000)+1;
 return Array.from({length:count},(_,i)=>shiftDay(first,i));
}
function eventDateSpan(event:CalendarEvent,zone:string){
 const first=event.allDay?event.dueDate:event.startAt?zonedDay(event.startAt,zone):event.dueDate;
 const last=event.allDay?(event.endDate?shiftDay(event.endDate,-1):first):event.endAt?zonedDay(Date.parse(event.endAt)-1,zone):event.endDate??first;
 return {first,last:last??first};
}
export function eventOverlaps(event:CalendarEvent,start:string,end:string,zone:string){
 const {first,last}=eventDateSpan(event,zone);
 return !!first&&!!last&&first<end&&last>=start;
}
export function eventOccurs(event:CalendarEvent,day:string,zone:string){
 const {first,last}=eventDateSpan(event,zone);
 return !!first&&!!last&&day>=first&&day<=last;
}
export function calendarEventsByDay(events:CalendarEvent[],days:string[],zone:string){
 const byDay=new Map<string,CalendarEvent[]>(days.map(day=>[day,[]]));
 if(!days.length)return byDay;
 const start=days[0],end=days[days.length-1];
 for(const event of events){
  const {first,last}=eventDateSpan(event,zone);
  if(!first||!last||first>end||last<start)continue;
  for(let day=first<start?start:first;day<=last&&day<=end;day=shiftDay(day,1))byDay.get(day)?.push(event);
 }
 return byDay;
}
export function calendarTodosByDay<T extends {dueDate:string|null}>(todos:readonly T[]){
 const days=new Map<string,T[]>();
 for(const todo of todos){
  if(!todo.dueDate)continue;
  const entries=days.get(todo.dueDate);
  if(entries)entries.push(todo);else days.set(todo.dueDate,[todo]);
 }
 return days;
}
export function eventTime(event:CalendarEvent,zone:string){if(event.allDay)return '종일';if(!event.startAt)return '시간 미정';const f=timeFormat(zone);return f.format(new Date(event.startAt))+(event.endAt?' – '+f.format(new Date(event.endAt)):'');}
export function minutesAt(instant:string,zone:string){const p=Object.fromEntries(timeFormat(zone).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));return +p.hour*60 + +p.minute;}
export function localTime(instant:string,zone:string){const minutes=minutesAt(instant,zone);return String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');}
export function wallTime(day:string,time:string,zone:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||!validZone(zone))throw Error('날짜와 시간을 확인해주세요.');
 const [y,m,d]=day.split('-').map(Number),[h,min]=time.split(':').map(Number),target=Date.UTC(y,m-1,d,h,min);let guess=target;
 const f=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 for(let i=0;i<5;i++){const p=Object.fromEntries(f.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const delta=target-Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);if(!delta)return new Date(guess).toISOString();guess+=delta;}
 throw Error('이 시간대에 존재하지 않는 시각이에요. 다른 시각을 선택해주세요.');
}
// Fill the measured viewport exactly; density/text is handled inside each date cell.
// A minimum row height here would recreate month overflow on 6-week/short screens.
export function monthCellHeight(height:number,header:number,bottom:number,_fontScale=1,rows=6,weekdays=38){return Math.max(0,height-header-bottom-weekdays)/Math.max(1,rows);}
export function periodShift(month:string,selected:string,view:CalendarView,offset:number){
 if(view==='fortnight'||view==='week'||view==='day'){const day=shiftDay(selected,offset*(view==='fortnight'?14:view==='week'?7:1));return {month:day.slice(0,7),selected:day};}
 const [y,m]=month.split('-').map(Number),d=new Date(Date.UTC(y,m-1+offset,1)),day=d.toISOString().slice(0,10);return {month:day.slice(0,7),selected:day};
}
export function safeCalendarLink(value?:string|null){try{const u=new URL(value??'');if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/.test(u.hostname))return null;return u.href;}catch{return null;}}
export function timedLayout(events:CalendarEvent[],day:string,zone:string,minDuration=0){
 const list=events.filter(e=>!e.allDay&&e.startAt&&e.endAt&&eventOccurs(e,day,zone)).map(event=>({event,start:zonedDay(event.startAt!,zone)<day?0:minutesAt(event.startAt!,zone),end:zonedDay(Date.parse(event.endAt!)-1,zone)>day?1440:minutesAt(event.endAt!,zone)||1440,lane:0,lanes:1})).sort((a,b)=>a.start-b.start||b.end-a.end);
 const occupiedEnd=(x:typeof list[number])=>Math.max(x.end,x.start+minDuration);
 let group:typeof list=[],end=-1;const flush=()=>{const n=Math.max(1,...group.map(x=>x.lane+1));for(const x of group)x.lanes=n;group=[];};
 for(const item of list){if(item.start>=end){flush();end=-1;}const used=new Set(group.filter(x=>occupiedEnd(x)>item.start).map(x=>x.lane));while(used.has(item.lane))item.lane++;group.push(item);end=Math.max(end,occupiedEnd(item));}flush();return list;
}

/** Native non-Duo calendar long press alternates week and day after entering week. */
export function nextLongPressCalendarView(view:CalendarView):'week'|'day'{return view==='week'||view==='fortnight'?'day':'week';}
