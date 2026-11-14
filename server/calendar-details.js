import {fail} from './secrets.js';
import {calendarIdentifier,calendarZone,calendarWallClock,calendarDay} from './calendar-time.js';
export function calendarAccountKey(record){return record.accountId?'google:'+record.accountId:record.connectionId?'connection:'+record.connectionId:null;}
export function calendarSnapshot(event,zone='Asia/Seoul'){
 return {title:typeof event.summary==='string'?event.summary.slice(0,200):'일정',startAt:event.start?.dateTime??null,day:event.start?.date??null,timeZone:calendarZone(event.start?.timeZone??zone),cancelled:event.status==='cancelled'};
}
const text=(v,max)=>typeof v==='string'&&v.length<=max;
export function calendarDetailsPatch(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Object.keys(value).length||Object.keys(value).some(k=>!['reminderMinutes','localNotes','url','attachments'].includes(k)))throw fail(400,'덕에 저장할 항목을 확인해주세요.');
 const safe=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!['localhost','[::1]','0.0.0.0'].includes(u.hostname)&&!/^127\.|^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname);}catch{return false;}};
 if('reminderMinutes' in value&&value.reminderMinutes!==null&&(!Number.isInteger(value.reminderMinutes)||value.reminderMinutes<0||value.reminderMinutes>40320))throw fail(400,'알림 시간을 확인해주세요.');
 if('localNotes' in value&&!text(value.localNotes,8000))throw fail(400,'덕 전용 메모는 8,000자까지 적어주세요.');
 if('url' in value&&(!text(value.url,2000)||(value.url&&!safe(value.url))))throw fail(400,'https로 시작하는 URL을 확인해주세요.');
 if('attachments' in value&&(!Array.isArray(value.attachments)||value.attachments.length>20||value.attachments.some(a=>!a||Object.keys(a).some(k=>!['name','url'].includes(k))||!text(a.name,200)||!a.name.trim()||!text(a.url,2000)||!safe(a.url))))throw fail(400,'첨부 링크의 이름과 https 주소를 확인해주세요.');
 return structuredClone(value);
}
export function notificationFromDetails(row,now=Date.now()){
 if(row.fields.reminderMinutes==null||row.snapshot?.cancelled)return null;
 const s=row.snapshot,at=Date.parse(s.startAt??(s.day?calendarWallClock(s.day,s.timeZone,9):''))-row.fields.reminderMinutes*60000;
 return Number.isFinite(at)&&at>now?{id:row.id,title:s.title,at:new Date(at).toISOString(),eventId:row.eventId,calendarId:row.calendarId,day:s.day??calendarDay(s.startAt,s.timeZone)}:null;
}
export const validEventId=value=>{if(typeof value!=='string'||!value)throw fail(400,'일정을 다시 확인해주세요.');return calendarIdentifier(value);};
