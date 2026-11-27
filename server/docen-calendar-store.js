import {calendarSyncFields,calendarSyncTime,resolveCalendarCopies} from './docen-calendar-reconcile.js';
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
  const {syncBaseline,claimId,...identity}=payload;
  return {state,...identity,...(syncBaseline?{syncVersion:syncBaseline.version,syncRevision:syncBaseline.revision}:{})};
 }
 function event(row,zone,sync){
  const {args,fields,id,revision,updatedAt}=row;
  return {id:'docen:'+id,eventId:id,calendarId:docenCalendarId,calendarName:docenCalendarSource.name,provider:'docen',color:sync?.color??docenCalendarSource.color,canWrite:true,etag:String(revision),updatedAt,title:args.title,notes:args.notes??'',allDay:args.allDay===true,timeZone:args.timeZone,
   dueDate:args.allDay?args.startDate:calendarDay(args.start,zone),endDate:args.allDay?args.endDate:calendarDay(args.end,zone),startAt:args.start??null,endAt:args.end??null,duckDetails:{revision,fields},...(args.recurrence?{providerDetails:{recurrence:args.recurrence}}:{}),...(sync?{mirror:sync}:{})};
 }
 return {
  readDocenCalendar(user,start,end,zone){
   if(!start||!end||!validDate(start)||!validDate(end)||end<=start||Date.parse(end)-Date.parse(start)>370*86400000)throw fail(400,'조회할 날짜 범위를 확인해주세요.');
   zone=calendarZone(zone);
   const events=rows(user).map(row=>event(decode(row),zone,mirror(row.delivery_state?{state:row.delivery_state,data:row.delivery_data,available_at:row.delivery_due}:null)));
   const items=events.filter(e=>e.dueDate<end&&(e.allDay?e.endDate>start:calendarDay(Date.parse(e.endAt)-1,zone)>=start));
   return {items,nextCursor:null,connectionState:'connected',readAt:new Date().toISOString(),calendarId:docenCalendarId,canWrite:true,hiddenMirrors:pendingDeletes(user),appleCreates:events.filter(e=>e.mirror?.provider==='apple-calendar'&&['queued','sending','checking'].includes(e.mirror.state)).slice(0,100)};
  },
  docenCalendarReceipt(user,id){
   const row=get(user,id);
   if(!row||deleted(user,id))throw fail(404,'저장한 일정을 찾지 못했어요.');
   const saved=decode(row);
   return event(saved,saved.args.timeZone,mirror(delivery(user,id)));
  },
  appleCalendarBackgroundWork(user,after){
   if(after&&!validId(after))throw fail(400,'동기화 위치를 확인해주세요.');
   const linked=db.prepare(`SELECT e.id,e.revision,e.data,d.available_at,d.state,d.data AS delivery_data
    FROM docen_calendar_delivery d JOIN docen_calendar_events e ON e.user_id=d.user_id AND e.id=d.event_id
    WHERE d.user_id=? AND d.provider='apple-calendar' AND d.state='synced' AND d.event_id>?
    AND NOT EXISTS (SELECT 1 FROM docen_calendar_deleted x WHERE x.user_id=d.user_id AND x.event_id=d.event_id)
    ORDER BY d.event_id LIMIT 13`).all(user,after??'');
   const creates=db.prepare(`SELECT e.id,e.revision,e.data,d.available_at,d.state,d.data AS delivery_data
    FROM docen_calendar_delivery d JOIN docen_calendar_events e ON e.user_id=d.user_id AND e.id=d.event_id
    WHERE d.user_id=? AND d.provider='apple-calendar' AND d.state IN ('queued','sending','checking')
    AND NOT EXISTS (SELECT 1 FROM docen_calendar_deleted x WHERE x.user_id=d.user_id AND x.event_id=d.event_id)
    ORDER BY d.event_id LIMIT 100`).all(user);
   const decodeEvent=row=>{
    const saved=decode(row);
    return event(saved,saved.args.timeZone,mirror({...row,data:row.delivery_data}));
   };
   return {items:linked.slice(0,12).map(decodeEvent),nextCursor:linked.length>12?linked[11].id:null,
    creates:creates.map(decodeEvent),deletes:pendingDeletes(user).filter(target=>target.provider==='apple-calendar')};
  },
  saveDocenCalendarEvent(user,id,body){
   let target;
   if(body?.target){
    const {provider,calendarId,connectionId,name,color}=body.target;
    if(!['google','apple-calendar'].includes(provider)||typeof calendarId!=='string'||!calendarId||calendarId.length>1500||provider==='apple-calendar'&&!calendarId.startsWith('@apple/')||provider==='google'&&(calendarId.startsWith('@apple/')||calendarId===docenCalendarId||typeof connectionId!=='string'||!connectionId))throw fail(400,'연결할 캘린더를 확인해주세요.');
    target={provider,calendarId,...(connectionId?{connectionId}:{}),name:typeof name==='string'?name.slice(0,200):'',color:typeof color==='string'&&/^#[a-f\d]{6}$/i.test(color)?color:null};
   }
   if(!validId(id)||!body||!Number.isInteger(body.revision)||body.revision<0||!body.args||Object.keys(body.args).some(k=>!['title','notes','allDay','startDate','endDate','start','end','timeZone','recurrence','attendees'].includes(k)))throw fail(400,'저장할 일정을 확인해주세요.');
   if(deleted(user,id))throw Object.assign(fail(409,'이미 삭제된 일정이에요.'),{code:'calendar-event-deleted'});
   const current=get(user,id),before=current&&body.revision>0?decode(current).args:null;
   const args=validateAction('calendar.create',body.args),fields=body.fields&&Object.keys(body.fields).length?calendarDetailsPatch(body.fields):{};
   const value={args:{...(before?.recurrence?{recurrence:before.recurrence}: {}),...(before?.attendees?{attendees:before.attendees}: {}),...args},fields,updatedAt:new Date().toISOString()};
   if(before&&JSON.stringify(calendarSyncFields(before))===JSON.stringify(calendarSyncFields(value.args)))value.updatedAt=decode(current).updatedAt;
   const revision=body.revision+1;
   if(body.revision===0){
    db.exec('BEGIN IMMEDIATE');
    try {
     if(deleted(user,id))throw Object.assign(fail(409,'이미 삭제된 일정이에요.'),{code:'calendar-event-deleted'});
     const inserted=db.prepare('INSERT INTO docen_calendar_events (user_id,id,revision,data) VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO NOTHING').run(user,id,revision,box.seal(value));
     if(inserted.changes&&target)db.prepare('INSERT INTO docen_calendar_delivery VALUES (?,?,?,?,?,?,?)').run(user,id,target.provider,'queued',0,Date.now(),box.seal({...target,...(target.provider==='google'?{externalEventId:createHash('sha256').update(user+':'+id).digest('hex')}: {})}));
     const committed=decode(get(user,id)),state=mirror(delivery(user,id));
     if(committed.revision!==1||JSON.stringify(committed.args)!==JSON.stringify(args)||JSON.stringify(committed.fields)!==JSON.stringify(fields)||JSON.stringify(state&&Object.fromEntries(Object.keys(target??{}).map(key=>[key,state[key]])))!==JSON.stringify(target))throw fail(409,'일정이 이미 저장됐어요. 새로 확인해주세요.');
     db.exec('COMMIT');return event(committed,args.timeZone,state);
    }catch(error){db.exec('ROLLBACK');throw error;}
   }
   if(body.deviceReplay===true&&current?.revision===revision){
    const committed=decode(current);
    if(JSON.stringify(committed.args)===JSON.stringify(value.args)&&JSON.stringify(committed.fields)===JSON.stringify(value.fields)){
     return event(committed,args.timeZone,mirror(delivery(user,id)));
    }
   }
   if(current?.revision!==body.revision||!db.prepare('UPDATE docen_calendar_events SET revision=?,data=? WHERE user_id=? AND id=? AND revision=?').run(revision,box.seal(value),user,id,body.revision).changes)throw fail(409,'일정이 바뀌었어요. 새로 확인한 뒤 저장해주세요.');
   return event({...value,id,revision},args.timeZone,mirror(delivery(user,id)));
  },
  deleteDocenCalendarEvent(user,id,revision){
   if(!validId(id)||!Number.isInteger(revision)||revision<0)throw fail(400,'삭제할 일정을 확인해주세요.');
   db.exec('BEGIN IMMEDIATE');
   try {
    if(deleted(user,id)){db.exec('COMMIT');return;}
    const current=get(user,id);
    const valid=revision===0?(!current||current.revision===1):current?.revision===revision;
    if(!valid)throw fail(409,'일정이 바뀌었어요. 다시 확인해주세요.');
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
   return db.prepare("SELECT MIN(available_at) AS due FROM docen_calendar_delivery WHERE provider='google' AND state IN ('queued','sending','delete-queued','deleting','blocked')").get()?.due??null;
  },
  claimDocenGoogleDelivery(now=Date.now()){
   const row=db.prepare(`SELECT * FROM docen_calendar_delivery WHERE provider='google' AND state IN ('queued','sending','delete-queued','deleting','blocked') AND available_at<=? ORDER BY available_at LIMIT 1`).get(now);
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
    .run(next,Date.now()+(removed&&!job.removing?0:delay),box.seal({...job.target,...(externalEventId?{externalEventId}:{}),...(state==='synced'?{syncBaseline:{fields:calendarSyncFields(job.args),version:null}}:{})}),job.user,job.id,job.attempt);
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
    const claimId=typeof input.claimId==='string'&&/^[a-f0-9-]{36}$/.test(input.claimId)?input.claimId:null;
    if(claimId&&row.state==='sending'&&target.claimId===claimId)return mirror(row);
    if(!db.prepare("UPDATE docen_calendar_delivery SET state='sending',available_at=?,data=? WHERE user_id=? AND event_id=? AND state='queued'").run(Date.now()+120000,box.seal({...target,claimId}),user,id).changes)throw fail(409,'이 일정은 이미 처리 중이에요.');
   }else if(['synced','checking','blocked'].includes(input?.state)&&row.state==='sending'){
    if(target.claimId&&target.claimId!==input.claimId)throw fail(409,'다른 기기에서 처리 중이에요.');
    const externalEventId=input.externalEventId;
    const externalUid=typeof input.externalUid==='string'&&input.externalUid.length<=1500?input.externalUid:undefined;
    if(input.state==='synced'&&(typeof externalEventId!=='string'||!externalEventId||externalEventId.length>1500))throw fail(400,'원본 일정 번호를 확인해주세요.');
    db.prepare("UPDATE docen_calendar_delivery SET state=?,data=? WHERE user_id=? AND event_id=? AND state='sending'").run(input.state==='synced'&&deleted(user,id)?'delete-queued':input.state,box.seal({...target,...(input.state==='synced'?{externalEventId,...(externalUid?{externalUid}:{}),syncBaseline:{fields:input.fields?calendarSyncFields(input.fields):calendarSyncFields(decode(get(user,id)).args),version:null}}:{})}),user,id);
   }else throw fail(409,'동기화 상태가 바뀌었어요.');
   return mirror(delivery(user,id));
  },
  linkedGoogleSyncPage(after,limit){
   return db.prepare(`SELECT d.user_id user,d.event_id id,e.revision
    FROM docen_calendar_delivery d JOIN docen_calendar_events e ON e.user_id=d.user_id AND e.id=d.event_id
    JOIN active_users u ON u.id=d.user_id
    WHERE d.provider='google' AND d.state='synced' AND u.email_verified_at IS NOT NULL
    AND (d.user_id,d.event_id)>(?,?)
    AND NOT EXISTS (SELECT 1 FROM docen_calendar_deleted x WHERE x.user_id=d.user_id AND x.event_id=d.event_id)
    ORDER BY d.user_id,d.event_id LIMIT ?`).all(after.user,after.id,limit);
  },
  linkedDocenCalendar(user,id,revision){
   const saved=get(user,id),row=delivery(user,id);
   if(!saved||deleted(user,id)||row?.state!=='synced'||saved.revision!==revision)throw fail(409,'일정이 바뀌었어요. 다시 불러와주세요.');
   return {local:decode(saved),target:box.open(row.data)};
  },
  reconcileMissingAppleOriginal(user,id,revision,original){
   if(!Number.isInteger(revision)||revision<1||
    ![original?.id,original?.calendarId,original?.externalUid].every(value=>typeof value==='string'&&value.length>0&&value.length<=1500)){
    throw fail(400,'삭제된 원본 일정을 확인해주세요.');
   }
   return this.reconcileMissingCalendarOriginal(user,id,revision,'apple-calendar',original);
  },
  reconcileMissingCalendarOriginal(user,id,revision,provider,original){
   db.exec('BEGIN IMMEDIATE');
   try{
    if(deleted(user,id)){db.exec('COMMIT');return {action:'deleted'};}
    const {local,target}=this.linkedDocenCalendar(user,id,revision);
    const baseline=target.syncBaseline;
    if(target.provider!==provider||target.calendarId!==original.calendarId||target.externalEventId!==original.id||
      (provider==='apple-calendar'&&(!target.externalUid||target.externalUid!==original.externalUid))||
      (provider==='google'&&target.connectionId!==original.connectionId)||
      local.args.recurrence?.length||!baseline||
      JSON.stringify(calendarSyncFields(local.args))!==JSON.stringify(baseline.fields)){
     throw fail(409,'연결 또는 일정 내용이 바뀌었어요. 다시 확인해주세요.');
    }
    db.prepare('INSERT INTO docen_calendar_deleted VALUES (?,?)').run(user,id);
    purge(user,id);
    db.exec('COMMIT');
    return {action:'deleted'};
   }catch(error){db.exec('ROLLBACK');throw error;}
  },
  reconcileDocenCalendar(user,id,revision,original,provider,ack=false){
   if(typeof original?.version!=='string'||!original.version||original.version.length>16000)throw fail(422,'원본 일정 버전을 확인해주세요.');
   const shared=calendarSyncFields(original.fields);
   db.exec('BEGIN IMMEDIATE');
   try{
    const {local,target}=this.linkedDocenCalendar(user,id,revision);
    const rebound=provider==='apple-calendar'&&target.externalEventId===original.linkedId&&!!target.externalUid
      &&target.externalUid===original.externalUid&&typeof original.id==='string'&&original.id.length>0&&original.id.length<=1500;
    if(target.provider!==provider||target.externalEventId!==original.id&&!rebound)throw fail(409,'연결된 원본 일정이 바뀌었어요.');
    const copyResult=resolveCalendarCopies({fields:local.args,updatedAt:local.updatedAt},{fields:shared,updatedAt:original.updatedAt},target.syncBaseline?.fields);
    const result=copyResult!=='equal'&&provider==='google'&&Number.isInteger(original.echoRevision)&&original.echoRevision<revision?'docen':copyResult;
    let next=local;
    if(ack&&result!=='equal')throw fail(409,'원본이 다시 바뀌었어요. 일정을 새로 확인해주세요.');
    if(result==='original'){
     const {startDate,endDate,start,end,...unchanged}=local.args;
     next={...local,args:{...unchanged,...shared},revision:revision+1,updatedAt:calendarSyncTime(original.updatedAt)};
     db.prepare('UPDATE docen_calendar_events SET revision=?,data=? WHERE user_id=? AND id=?').run(next.revision,box.seal({args:next.args,fields:next.fields,updatedAt:next.updatedAt}),user,id);
    }
    if(result!=='docen'){
     const externalUid=provider==='apple-calendar'&&!target.externalUid&&typeof original.externalUid==='string'&&
      original.externalUid.length>0&&original.externalUid.length<=1500?original.externalUid:target.externalUid;
     db.prepare('UPDATE docen_calendar_delivery SET data=? WHERE user_id=? AND event_id=?').run(box.seal({...target,externalEventId:original.id,...(externalUid?{externalUid}:{}),syncBaseline:{fields:shared,version:original.version,revision:next.revision}}),user,id);
    }
    db.exec('COMMIT');
    return {action:result==='docen'?'push':'done',event:event(next,local.args.timeZone,mirror(delivery(user,id)))};
   }catch(error){db.exec('ROLLBACK');throw error;}
  },
  docenCalendarReminders(user){
   return rows(user).map(decode).map(({id,args,fields})=>notificationFromDetails({id,eventId:id,calendarId:docenCalendarId,fields,snapshot:{title:args.title,startAt:args.start,day:args.startDate,timeZone:args.timeZone}})).filter(Boolean);
  },
  exportDocenCalendar(user){return rows(user).map(decode).map(row=>event(row,row.args.timeZone));},
 };
}
