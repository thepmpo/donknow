import {calendarAccountKey,calendarDetailsPatch,calendarSnapshot,notificationFromDetails,validEventId} from './calendar-details.js';
import {createHash} from 'node:crypto';
import {fail} from './secrets.js';
import {validDate} from './store.js';
import {calendarZone,calendarDay,calendarMidnight,calendarIdentifier} from './calendar-time.js';
const writable=role=>['owner','writer'].includes(role);
const label=(v,fallback)=>typeof v==='string'&&v.trim()?v.trim().slice(0,200):fallback;
const webLink=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}};
export function createCalendarWorkspace({store,token,request}){
 async function access(user){const r=await token(user,'google');if(!r.features.includes('calendar'))throw fail(403,'Google 캘린더 읽기 권한을 연결해주세요.');return r;}
 function unchanged(user,r){const latest=store.connection(user,'google');if(!latest||latest.connectionId!==r.connectionId||latest.accountId!==r.accountId||(!r.connectionId&&latest.accessToken!==r.accessToken)||!latest.features.includes('calendar'))throw fail(409,'캘린더 연결이 바뀌었어요. 다시 확인해주세요.');}
 const get=(r,url)=>request(url,{headers:{Authorization:'Bearer '+r.accessToken}});
 function normalize(user,r,id,e,zone,canWrite,name){
  const prefix=(r.connectionId??'legacy')+':'+(id==='primary'?'calendar:':'calendar2:'+createHash('sha256').update(id).digest('hex').slice(0,24)+':'),account=calendarAccountKey(r);
  if(account)store.refreshCalendarSnapshot?.(user,account,id,e.id,calendarSnapshot(e,zone));
  const saved=account?store.calendarDetails?.(user,account,id,e.id):null;
  return {id:prefix+e.id,eventId:e.id,calendarId:id,calendarName:label(name,'Google 캘린더'),title:label(e.summary,'제목 없음'),kind:'event',dueDate:e.start?.date??(e.start?.dateTime?calendarDay(e.start.dateTime,zone):null),endDate:e.end?.date??(e.end?.dateTime?calendarDay(e.end.dateTime,zone):null),startAt:e.start?.dateTime??null,endAt:e.end?.dateTime??null,allDay:!!e.start?.date,timeZone:e.start?.timeZone??zone,canWrite:canWrite&&!e.locked,etag:e.etag??null,location:typeof e.location==='string'?e.location.slice(0,1000):'',notes:typeof e.description==='string'?e.description.slice(0,4000):'',notesPartial:(e.description?.length??0)>4000,url:webLink(e.htmlLink),meetingUrl:webLink(e.hangoutLink??e.conferenceData?.entryPoints?.find(p=>p.entryPointType==='video')?.uri),recurring:!!e.recurringEventId,
   providerDetails:{recurrence:(e.recurrence??[]).slice(0,10),attendees:(e.attendees??[]).slice(0,100).map(a=>({email:a.email??'',name:a.displayName??'',response:a.responseStatus??''})),attendeesPartial:(e.attendees?.length??0)>100,attachments:(e.attachments??[]).slice(0,20).map(a=>({name:label(a.title,'첨부 파일'),url:webLink(a.fileUrl)})),reminders:e.reminders??null},
   connectionId:r.connectionId??null,duckDetails:{revision:saved?.revision??0,fields:saved?.fields??{}}};
 }
 async function readEvent(user,r,calendar,event){const result=await get(r,'https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendar)+'/events/'+encodeURIComponent(event));unchanged(user,r);return result;}
 return {
  async calendars(user,cursor){
   const r=await access(user);if(cursor&&(typeof cursor!=='string'||cursor.length>3000))throw fail(400,'페이지 정보를 확인해주세요.');
   const data=await get(r,'https://www.googleapis.com/calendar/v3/users/me/calendarList?'+new URLSearchParams({maxResults:'100',showDeleted:'false',...(cursor?{pageToken:cursor}:{})}));unchanged(user,r);
   return {items:(data.items??[]).filter(c=>!c.deleted).map(c=>({id:c.id,name:label(c.summaryOverride??c.summary,'캘린더'),primary:!!c.primary,timeZone:c.timeZone??'UTC',color:/^#[a-f\d]{6}$/i.test(c.backgroundColor)?c.backgroundColor:null,canWrite:r.features.includes('calendarWrite')&&writable(c.accessRole),connectionId:r.connectionId??null})),nextCursor:data.nextPageToken??null};
  },
  async saveDetails(user,input){
   if(!input||Object.keys(input).some(k=>!['connectionId','calendarId','eventId','expectedRevision','patch','timeZone'].includes(k))||!Number.isInteger(input.expectedRevision)||input.expectedRevision<0)throw fail(400,'덕 저장 정보를 확인해주세요.');
   const r=await access(user),account=calendarAccountKey(r);if(!account)throw fail(409,'Google 계정 정보를 확인할 수 없어요. 연결 상태를 확인해주세요.');
   if(!input.connectionId||input.connectionId!==r.connectionId)throw fail(409,'열어둔 뒤 Google 연결이 바뀌었어요. 다시 확인해주세요.');
   const calendar=calendarIdentifier(input.calendarId),event=validEventId(input.eventId),patch=calendarDetailsPatch(input.patch),zone=calendarZone(input.timeZone??'Asia/Seoul');
   const original=await readEvent(user,r,calendar,event);if(original.status==='cancelled')throw fail(409,'삭제된 일정에는 정보를 저장할 수 없어요.');
   const saved=store.saveCalendarDetails(user,account,calendar,event,patch,input.expectedRevision,calendarSnapshot(original,zone));
   return {revision:saved.revision,fields:saved.fields};
  },
  async reminders(user){
   const initial=store.connection(user,'google');if(!initial?.features.includes('calendar'))return {items:[],state:'unconnected'};
   const r=await access(user),account=calendarAccountKey(r);if(!account)return {items:[],state:'unconnected'};
   const rows=store.calendarDetailRows(user,account).filter(row=>row.fields.reminderMinutes!=null).sort((a,b)=>{const aa=notificationFromDetails(a),bb=notificationFromDetails(b);return aa&&bb?aa.at.localeCompare(bb.at):aa?-1:bb?1:(b.checkedAt??0)-(a.checkedAt??0);}).slice(0,60),results=[];let partial=false;
   // Bounded concurrency; no provider writes. Fresh event reads/save snapshots share this cache.
   for(let i=0;i<rows.length;i+=6){await Promise.all(rows.slice(i,i+6).map(async row=>{
    let snapshot=row.snapshot;
    if(Date.now()-(row.checkedAt??0)>60000){try{const original=await readEvent(user,r,row.calendarId,row.eventId);snapshot=calendarSnapshot(original,row.snapshot?.timeZone);store.refreshCalendarSnapshot(user,account,row.calendarId,row.eventId,snapshot);}catch(error){if(error.status===404||error.status===410){snapshot={...snapshot,cancelled:true};store.refreshCalendarSnapshot(user,account,row.calendarId,row.eventId,snapshot);}else {partial=true;return;}}}
    const value=notificationFromDetails({...row,snapshot});if(value)results.push(value);
   }));}
   unchanged(user,r);return {items:results.sort((a,b)=>a.at.localeCompare(b.at)),state:partial?'partial':'ready'};
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
   const items=(data.items??[]).filter(e=>e.status!=='cancelled').map(e=>normalize(user,r,id,e,zone,canWrite,data.summary));
   store.cacheResources(user,'google',items.map(({duckDetails,...item})=>item));
   return {items,nextCursor:data.nextPageToken??null,hasMore:!!data.nextPageToken,connectionState:'connected',calendarId:id,calendarName:label(data.summary,'Google 캘린더'),canWrite,connectionId:r.connectionId??null,timeZone:zone,readAt:new Date().toISOString()};
  },
 };
}
