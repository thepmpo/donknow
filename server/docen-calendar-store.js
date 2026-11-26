import {createHash} from 'node:crypto';
import {calendarDetailsPatch,notificationFromDetails} from './calendar-details.js';
import {calendarDay,calendarZone} from './calendar-time.js';
import {validateAction} from './provider-actions.js';
import {fail} from './secrets.js';
import {validDate} from './store.js';

export const docenCalendarId='@docen';
export const docenCalendarSource={id:docenCalendarId,name:'도슨 캘린더',provider:'docen',accountLabel:'도슨',canWrite:true,color:'#2366e8'};
const validId=id=>typeof id==='string'&&/^event-[a-z0-9]{1,14}-[a-z0-9]{1,14}-[a-z0-9]{1,14}$/.test(id);

export function docenCalendarStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS docen_calendar_delivery (
  user_id TEXT NOT NULL, event_id TEXT NOT NULL, provider TEXT NOT NULL,
  state TEXT NOT NULL, attempt INTEGER NOT NULL, available_at INTEGER NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY(user_id,event_id),
  FOREIGN KEY(user_id,event_id) REFERENCES docen_calendar_events(user_id,id) ON DELETE CASCADE
 ); CREATE INDEX IF NOT EXISTS docen_calendar_delivery_due ON docen_calendar_delivery(provider,state,available_at);`);
 db.exec(`CREATE TABLE IF NOT EXISTS docen_calendar_events (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL, revision INTEGER NOT NULL, data TEXT NOT NULL,
  PRIMARY KEY(user_id,id)
 ); CREATE TABLE IF NOT EXISTS docen_calendar_deleted (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, event_id TEXT NOT NULL,
  PRIMARY KEY(user_id,event_id)
 );`);
 const rows=user=>db.prepare(`SELECT e.id,e.revision,e.data,d.state AS delivery_state,d.available_at AS delivery_due,d.data AS delivery_data
   FROM docen_calendar_events e LEFT JOIN docen_calendar_delivery d ON d.user_id=e.user_id AND d.event_id=e.id
   WHERE e.user_id=? AND NOT EXISTS (SELECT 1 FROM docen_calendar_deleted x WHERE x.user_id=e.user_id AND x.event_id=e.id)`).all(user);
 const get=(user,id)=>db.prepare('SELECT id,revision,data FROM docen_calendar_events WHERE user_id=? AND id=?').get(user,id);
 const decode=row=>({...box.open(row.data),id:row.id,revision:row.revision});
 function delivery(user,id){return db.prepare('SELECT * FROM docen_calendar_delivery WHERE user_id=? AND event_id=?').get(user,id);}
 const deleted=(user,id)=>!!db.prepare('SELECT 1 FROM docen_calendar_deleted WHERE user_id=? AND event_id=?').get(user,id);
 const purge=(user,id)=>db.prepare('DELETE FROM docen_calendar_events WHERE user_id=? AND id=?').run(user,id);
 function pendingDeletes(user){
  return db.prepare(`SELECT d.event_id,d.state,d.data FROM docen_calendar_deleted x
    JOIN docen_calendar_delivery d ON d.user_id=x.user_id AND d.event_id=x.event_id WHERE x.user_id=?`).all(user)
   .map(row=>({id:row.event_id,state:row.state,...box.open(row.data)}));
 }
 function mirror(row){
  if(!row)return;
  const payload=box.open(row.data);
  const state=row.state==='sending'&&payload.provider==='apple-calendar'&&row.available_at<=Date.now()?'checking':row.state;
  return {state,...payload};
 }
 function event(row,zone,sync){
  const {args,fields,id,revision}=row;
  return {id:'docen:'+id,eventId:id,calendarId:docenCalendarId,calendarName:docenCalendarSource.name,provider:'docen',color:sync?.color??docenCalendarSource.color,canWrite:true,etag:String(revision),title:args.title,notes:args.notes??'',allDay:args.allDay===true,timeZone:args.timeZone,
   dueDate:args.allDay?args.startDate:calendarDay(args.start,zone),endDate:args.allDay?args.endDate:calendarDay(args.end,zone),startAt:args.start??null,endAt:args.end??null,duckDetails:{revision,fields},...(args.recurrence?{providerDetails:{recurrence:args.recurrence}}:{}),...(sync?{mirror:sync}:{})};
 }
 return {
  readDocenCalendar(user,start,end,zone){
   if(!start||!end||!validDate(start)||!validDate(end)||end<=start||Date.parse(end)-Date.parse(start)>370*86400000)throw fail(400,'조회할 날짜 범위를 확인해주세요.');
   zone=calendarZone(zone);
   const events=rows(user).map(row=>event(decode(row),zone,mirror(row.delivery_state?{state:row.delivery_state,data:row.delivery_data,available_at:row.delivery_due}:null)));
   const items=events.filter(e=>e.dueDate<end&&(e.allDay?e.endDate>start:calendarDay(Date.parse(e.endAt)-1,zone)>=start));
   return {items,nextCursor:null,connectionState:'connected',readAt:new Date().toISOString(),calendarId:docenCalendarId,canWrite:true,hiddenMirrors:pendingDeletes(user),appleCreates:events.filter(e=>e.mirror?.provider==='apple-calendar'&&e.mirror.state==='queued').slice(0,100)};
  },
  saveDocenCalendarEvent(user,id,body){
   let target;
   if(body?.target){
    const {provider,calendarId,connectionId,name,color}=body.target;
    if(!['google','apple-calendar'].includes(provider)||typeof calendarId!=='string'||!calendarId||calendarId.length>1500||provider==='apple-calendar'&&!calendarId.startsWith('@apple/')||provider==='google'&&(calendarId.startsWith('@apple/')||calendarId===docenCalendarId||typeof connectionId!=='string'||!connectionId))throw fail(400,'연결할 캘린더를 확인해주세요.');
    target={provider,calendarId,...(connectionId?{connectionId}:{}),name:typeof name==='string'?name.slice(0,200):'',color:typeof color==='string'&&/^#[a-f\d]{6}$/i.test(color)?color:null};
   }
   if(!validId(id)||!body||!Number.isInteger(body.revision)||body.revision<0||!body.args||Object.keys(body.args).some(k=>!['title','notes','allDay','startDate','endDate','start','end','timeZone','recurrence','attendees'].includes(k)))throw fail(400,'저장할 일정을 확인해주세요.');
   if(deleted(user,id))throw fail(409,'이미 삭제된 일정이에요.');
   const current=get(user,id),before=current&&body.revision>0?decode(current).args:null;
   const args=validateAction('calendar.create',body.args),fields=body.fields&&Object.keys(body.fields).length?calendarDetailsPatch(body.fields):{};
   const value={args:{...(before?.recurrence?{recurrence:before.recurrence}: {}),...(before?.attendees?{attendees:before.attendees}: {}),...args},fields};
   const revision=body.revision+1;
   if(body.revision===0){
    db.exec('BEGIN IMMEDIATE');
    try {
     const inserted=db.prepare('INSERT INTO docen_calendar_events (user_id,id,revision,data) VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING').run(user,id,revision,box.seal(value));
     if(inserted.changes&&target)db.prepare('INSERT INTO docen_calendar_delivery VALUES (?,?,?,?,?,?,?)').run(user,id,target.provider,'queued',0,Date.now(),box.seal({...target,...(target.provider==='google'?{externalEventId:createHash('sha256').update(user+':'+id).digest('hex')}: {})}));
     const committed=decode(get(user,id)),state=mirror(delivery(user,id));
     if(committed.revision!==1||JSON.stringify(committed.args)!==JSON.stringify(args)||JSON.stringify(committed.fields)!==JSON.stringify(fields)||JSON.stringify(state&&Object.fromEntries(Object.keys(target??{}).map(key=>[key,state[key]])))!==JSON.stringify(target))throw fail(409,'일정이 이미 저장됐어요. 새로 확인해주세요.');
     db.exec('COMMIT');return event(committed,args.timeZone,state);
    }catch(error){db.exec('ROLLBACK');throw error;}
   }
   if(current?.revision!==body.revision||!db.prepare('UPDATE docen_calendar_events SET revision=?,data=? WHERE user_id=? AND id=? AND revision=?').run(revision,box.seal(value),user,id,body.revision).changes)throw fail(409,'일정이 바뀌었어요. 새로 확인한 뒤 저장해주세요.');
   return event({...value,id,revision},args.timeZone,mirror(delivery(user,id)));
  },
  deleteDocenCalendarEvent(user,id,revision){
   if(!validId(id)||!Number.isInteger(revision)||revision<1)throw fail(400,'삭제할 일정을 확인해주세요.');
   if(deleted(user,id))return;
   const current=get(user,id);
   if(current?.revision!==revision)throw fail(409,'일정이 바뀌었어요. 다시 확인해주세요.');
   db.exec('BEGIN IMMEDIATE');
   try {
    db.prepare('INSERT INTO docen_calendar_deleted VALUES (?,?)').run(user,id);
    const row=delivery(user,id);
    if(!row||row.state==='queued'&&row.attempt===0||row.state==='failed')purge(user,id);
    else if(row.state!=='sending'){
     const target=box.open(row.data);
     if(row.provider==='google'||target.externalEventId)
      db.prepare("UPDATE docen_calendar_delivery SET state='delete-queued',available_at=? WHERE user_id=? AND event_id=?").run(Date.now(),user,id);
    }
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
  },
  nextDocenGoogleDeliveryAt(){
   return db.prepare("SELECT MIN(available_at) AS due FROM docen_calendar_delivery WHERE provider='google' AND state IN ('queued','sending','delete-queued','deleting')").get()?.due??null;
  },
  claimDocenGoogleDelivery(now=Date.now()){
   const row=db.prepare(`SELECT * FROM docen_calendar_delivery WHERE provider='google' AND state IN ('queued','sending','delete-queued','deleting') AND available_at<=? ORDER BY available_at LIMIT 1`).get(now);
   if(!row)return null;
   const attempt=row.attempt+1, removing=deleted(row.user_id,row.event_id);
   if(!db.prepare("UPDATE docen_calendar_delivery SET state=?,attempt=?,available_at=? WHERE user_id=? AND event_id=? AND attempt=?").run(removing?'deleting':'sending',attempt,now+120000,row.user_id,row.event_id,row.attempt).changes)return null;
   const saved=get(row.user_id,row.event_id);
   return saved?{user:row.user_id,id:row.event_id,attempt,removing,target:box.open(row.data),args:decode(saved).args}:null;
  },
  finishDocenGoogleDelivery(job,state,externalEventId,retryAfterMs){
   const delay=Math.max(Math.min(60000,500*2**Math.min(Math.max(0,job.attempt-1),7)),Number.isFinite(retryAfterMs)?retryAfterMs:0);
   const row=delivery(job.user,job.id);
   if(!row||row.attempt!==job.attempt||row.state!==(job.removing?'deleting':'sending'))return;
   if(job.removing&&state==='synced'){purge(job.user,job.id);return;}
   const removed=deleted(job.user,job.id);
   const next=removed&&(!job.removing||state==='queued')?'delete-queued':state;
   db.prepare("UPDATE docen_calendar_delivery SET state=?,available_at=?,data=? WHERE user_id=? AND event_id=? AND attempt=?")
    .run(next,Date.now()+(removed&&!job.removing?0:delay),box.seal({...job.target,...(externalEventId?{externalEventId}:{})}),job.user,job.id,job.attempt);
  },
  wakeDocenGoogleDelivery(user,connectionId){
   const pending=db.prepare("SELECT event_id,data FROM docen_calendar_delivery WHERE user_id=? AND provider='google' AND state='blocked'").all(user);
   for(const row of pending)if(box.open(row.data).connectionId===connectionId)db.prepare("UPDATE docen_calendar_delivery SET state=?,available_at=? WHERE user_id=? AND event_id=? AND state='blocked'").run(deleted(user,row.event_id)?'delete-queued':'queued',Date.now(),user,row.event_id);
  },
  finishDocenAppleDelete(user,id,externalEventId){
   const row=delivery(user,id);
   if(deleted(user,id)&&row?.provider==='apple-calendar'&&row.state==='delete-queued'&&box.open(row.data).externalEventId===externalEventId)purge(user,id);
  },
  recordDocenAppleDelivery(user,id,input){
   const row=delivery(user,id);
   if(row?.provider!=='apple-calendar')throw fail(404,'동기화할 일정을 찾지 못했어요.');
   const target=box.open(row.data);
   if(input?.state==='synced'&&['synced','delete-queued'].includes(row.state)&&target.externalEventId===input.externalEventId)return mirror(row);
   if(input?.state==='sending'){
    if(!db.prepare("UPDATE docen_calendar_delivery SET state='sending',available_at=? WHERE user_id=? AND event_id=? AND state='queued'").run(Date.now()+120000,user,id).changes)throw fail(409,'이 일정은 이미 처리 중이에요.');
   }else if(['synced','checking','blocked'].includes(input?.state)&&row.state==='sending'){
    const externalEventId=input.externalEventId;
    const externalUid=typeof input.externalUid==='string'&&input.externalUid.length<=1500?input.externalUid:undefined;
    if(input.state==='synced'&&(typeof externalEventId!=='string'||!externalEventId||externalEventId.length>1500))throw fail(400,'원본 일정 번호를 확인해주세요.');
    db.prepare("UPDATE docen_calendar_delivery SET state=?,data=? WHERE user_id=? AND event_id=? AND state='sending'").run(input.state==='synced'&&deleted(user,id)?'delete-queued':input.state,box.seal({...target,...(input.state==='synced'?{externalEventId,...(externalUid?{externalUid}:{})}:{})}),user,id);
   }else throw fail(409,'동기화 상태가 바뀌었어요.');
   return mirror(delivery(user,id));
  },
  docenCalendarReminders(user){
   return rows(user).map(decode).map(({id,args,fields})=>notificationFromDetails({id,eventId:id,calendarId:docenCalendarId,fields,snapshot:{title:args.title,startAt:args.start,day:args.startDate,timeZone:args.timeZone}})).filter(Boolean);
  },
  exportDocenCalendar(user){return rows(user).map(decode).map(row=>event(row,row.args.timeZone));},
 };
}
