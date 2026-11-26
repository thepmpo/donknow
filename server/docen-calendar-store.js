import {calendarDetailsPatch,notificationFromDetails} from './calendar-details.js';
import {calendarDay,calendarZone} from './calendar-time.js';
import {validateAction} from './provider-actions.js';
import {fail} from './secrets.js';
import {validDate} from './store.js';

export const docenCalendarId='@docen';
export const docenCalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
const validId=id=>typeof id==='string'&&/^event-[a-z0-9]{1,14}-[a-z0-9]{1,14}-[a-z0-9]{1,14}$/.test(id);

export function docenCalendarStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS docen_calendar_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY(user_id,id)
 );`);
 const rows=user=>db.prepare('SELECT id,revision,data FROM docen_calendar_events WHERE user_id=?').all(user);
 const get=(user,id)=>db.prepare('SELECT id,revision,data FROM docen_calendar_events WHERE user_id=? AND id=?').get(user,id);
 const decode=row=>({...box.open(row.data),id:row.id,revision:row.revision});
 function event(row,zone){
  const {args,fields,id,revision}=row;
  return {id:'docen:'+id,eventId:id,calendarId:docenCalendarId,calendarName:docenCalendarSource.name,provider:'docen',color:docenCalendarSource.color,canWrite:true,etag:String(revision),title:args.title,notes:args.notes??'',allDay:args.allDay===true,timeZone:args.timeZone,
   dueDate:args.allDay?args.startDate:calendarDay(args.start,zone),endDate:args.allDay?args.endDate:calendarDay(args.end,zone),startAt:args.start??null,endAt:args.end??null,duckDetails:{revision,fields}};
 }
 return {
  readDocenCalendar(user,start,end,zone){
   if(!start||!end||!validDate(start)||!validDate(end)||end<=start||Date.parse(end)-Date.parse(start)>370*86400000)throw fail(400,'조회할 날짜 범위를 확인해주세요.');
   zone=calendarZone(zone);
   const items=rows(user).map(row=>event(decode(row),zone)).filter(e=>e.dueDate<end&&(e.allDay?e.endDate>start:calendarDay(Date.parse(e.endAt)-1,zone)>=start));
   return {items,nextCursor:null,connectionState:'connected',readAt:new Date().toISOString(),calendarId:docenCalendarId,canWrite:true};
  },
  saveDocenCalendarEvent(user,id,body){
   if(!validId(id)||!body||!Number.isInteger(body.revision)||body.revision<0||!body.args||Object.keys(body.args).some(k=>!['title','notes','allDay','startDate','endDate','start','end','timeZone'].includes(k)))throw fail(400,'저장할 일정을 확인해주세요.');
   const args=validateAction('calendar.create',body.args),fields=body.fields&&Object.keys(body.fields).length?calendarDetailsPatch(body.fields):{};
   const current=get(user,id),value={args,fields};
   const revision=body.revision+1;
   if(body.revision===0){
    db.prepare('INSERT INTO docen_calendar_events (user_id,id,revision,data) VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING').run(user,id,revision,box.seal(value));
    const committed=decode(get(user,id));
    if(committed.revision!==1||JSON.stringify(committed.args)!==JSON.stringify(args)||JSON.stringify(committed.fields)!==JSON.stringify(fields))throw fail(409,'일정이 이미 저장됐어요. 새로 확인해주세요.');
    return event(committed,args.timeZone);
   }
   if(current?.revision!==body.revision||!db.prepare('UPDATE docen_calendar_events SET revision=?,data=? WHERE user_id=? AND id=? AND revision=?').run(revision,box.seal(value),user,id,body.revision).changes)throw fail(409,'일정이 바뀌었어요. 새로 확인한 뒤 저장해주세요.');
   return event({...value,id,revision},args.timeZone);
  },
  deleteDocenCalendarEvent(user,id,revision){
   if(!validId(id)||!Number.isInteger(revision)||revision<1)throw fail(400,'삭제할 일정을 확인해주세요.');
   if(!db.prepare('DELETE FROM docen_calendar_events WHERE user_id=? AND id=? AND revision=?').run(user,id,revision).changes)throw fail(409,'일정이 바뀌었어요. 새로 확인해주세요.');
  },
  docenCalendarReminders(user){
   return rows(user).map(decode).map(({id,args,fields})=>notificationFromDetails({id,eventId:id,calendarId:docenCalendarId,fields,snapshot:{title:args.title,startAt:args.start,day:args.startDate,timeZone:args.timeZone}})).filter(Boolean);
  },
  exportDocenCalendar(user){return rows(user).map(decode).map(row=>event(row,row.args.timeZone));},
 };
}
