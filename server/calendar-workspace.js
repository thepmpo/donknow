import {createHash} from 'node:crypto';
import {fail} from './secrets.js';
import {validDate} from './store.js';
import {calendarZone,calendarDay,calendarMidnight,calendarIdentifier} from './calendar-time.js';
const writable=role=>['owner','writer'].includes(role);
const label=(v,fallback)=>typeof v==='string'&&v.trim()?v.trim().slice(0,200):fallback;
const webLink=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function createCalendarWorkspace({store,token,request}){
 async function access(user){const r=await token(user,'google');if(!r.features.includes('calendar'))throw fail(403,'Google 캘린더 읽기 권한을 연결해주세요.');return r;}
 function unchanged(user,r){const latest=store.connection(user,'google');if(!latest||latest.accessToken!==r.accessToken||latest.connectionId!==r.connectionId)throw fail(409,'캘린더 연결이 바뀌었어요. 다시 확인해주세요.');}
 const get=(r,url)=>request(url,{headers:{Authorization:'Bearer '+r.accessToken}});
 return {
  async calendars(user,cursor){
   const r=await access(user);if(cursor&&(typeof cursor!=='string'||cursor.length>3000))throw fail(400,'페이지 정보를 확인해주세요.');
   const data=await get(r,'https://www.googleapis.com/calendar/v3/users/me/calendarList?'+new URLSearchParams({maxResults:'100',showDeleted:'false',...(cursor?{pageToken:cursor}:{})}));unchanged(user,r);
   return {items:(data.items??[]).filter(c=>!c.deleted).map(c=>({id:c.id,name:label(c.summaryOverride??c.summary,'캘린더'),primary:!!c.primary,timeZone:c.timeZone??'UTC',color:/^#[a-f\d]{6}$/i.test(c.backgroundColor)?c.backgroundColor:null,canWrite:r.features.includes('calendarWrite')&&writable(c.accessRole)})),nextCursor:data.nextPageToken??null};
  },
  async events(user,month,cursor,options={}){
   const record=store.connection(user,'google');if(!record?.features.includes('calendar'))return {items:[],nextCursor:null,connectionState:'unconnected',timeZone:calendarZone(options.timeZone??'Asia/Seoul'),canWrite:false};
   const r=await access(user),zone=calendarZone(options.timeZone??'Asia/Seoul'),id=calendarIdentifier(options.calendarId);
   if(month!=null&&(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))throw fail(400,'조회할 달을 확인해주세요.');
   let start=options.start??(month?month+'-01':calendarDay(Date.now(),zone)),end=options.end??(month?new Date(Date.UTC(+month.slice(0,4),+month.slice(5),1)).toISOString().slice(0,10):new Date(Date.parse(start+'T12:00:00Z')+31*86400000).toISOString().slice(0,10));
   if(!start||!end||!validDate(start)||!validDate(end)||end<=start||Date.parse(end)-Date.parse(start)>370*86400000)throw fail(400,'조회할 날짜 범위를 확인해주세요.');
   if(cursor&&(typeof cursor!=='string'||cursor.length>3000))throw fail(400,'페이지 정보를 확인해주세요.');
   const query=new URLSearchParams({timeMin:calendarMidnight(start,zone),timeMax:calendarMidnight(end,zone),timeZone:zone,singleEvents:'true',orderBy:'startTime',maxResults:'50',...(cursor?{pageToken:cursor}:{})});
   const data=await get(r,'https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(id)+'/events?'+query);unchanged(user,r);
   const canWrite=r.features.includes('calendarWrite')&&writable(data.accessRole),prefix=(r.connectionId??'legacy')+':'+(id==='primary'?'calendar:':'calendar2:'+createHash('sha256').update(id).digest('hex').slice(0,24)+':');
   const items=(data.items??[]).filter(e=>e.status!=='cancelled').map(e=>({id:prefix+e.id,eventId:e.id,calendarId:id,calendarName:label(data.summary,'Google 캘린더'),title:label(e.summary,'제목 없음'),kind:'event',dueDate:e.start?.date??(e.start?.dateTime?calendarDay(e.start.dateTime,zone):null),endDate:e.end?.date??(e.end?.dateTime?calendarDay(e.end.dateTime,zone):null),startAt:e.start?.dateTime??null,endAt:e.end?.dateTime??null,allDay:!!e.start?.date,timeZone:e.start?.timeZone??zone,canWrite:canWrite&&!e.locked,etag:e.etag??null,location:typeof e.location==='string'?e.location.slice(0,1000):'',notes:typeof e.description==='string'?e.description.slice(0,4000):'',notesPartial:(e.description?.length??0)>4000,url:webLink(e.htmlLink),meetingUrl:webLink(e.hangoutLink??e.conferenceData?.entryPoints?.find(p=>p.entryPointType==='video')?.uri),recurring:!!e.recurringEventId}));
   store.cacheResources(user,'google',items);
   return {items,nextCursor:data.nextPageToken??null,hasMore:!!data.nextPageToken,connectionState:'connected',calendarId:id,calendarName:label(data.summary,'Google 캘린더'),canWrite,timeZone:zone,readAt:new Date().toISOString()};
  },
 };
}
