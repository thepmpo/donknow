import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';

/** Duck-only fields never enter a provider PATCH; identity survives normal token rotation. */
export function calendarDetailsStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS calendar_details (id TEXT UNIQUE NOT NULL,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,account_key TEXT NOT NULL,calendar_id TEXT NOT NULL,event_id TEXT NOT NULL,revision INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(user_id,account_key,calendar_id,event_id)); CREATE INDEX IF NOT EXISTS calendar_details_owner ON calendar_details(user_id,account_key);`);
 const read=row=>row?{id:row.id,revision:row.revision,...box.open(row.data)}:null;
 return {
  calendarDetails(user,account,calendar,event){return read(db.prepare('SELECT * FROM calendar_details WHERE user_id=? AND account_key=? AND calendar_id=? AND event_id=?').get(user,account,calendar,event));},
  saveCalendarDetails(user,account,calendar,event,patch,expectedRevision,snapshot){
   db.exec('BEGIN IMMEDIATE');
   try{
    const row=db.prepare('SELECT * FROM calendar_details WHERE user_id=? AND account_key=? AND calendar_id=? AND event_id=?').get(user,account,calendar,event),old=read(row);
    if((old?.revision??0)!==expectedRevision){if(old&&old.revision===expectedRevision+1&&Object.entries(patch).every(([k,v])=>JSON.stringify(old.fields[k])===JSON.stringify(v))){db.exec('COMMIT');return old;}throw fail(409,'덕에 저장된 정보가 바뀌었어요. 새로 확인한 뒤 저장해주세요.');}
    const id=old?.id??randomUUID(),revision=expectedRevision+1,data={fields:{...old?.fields,...patch},snapshot,checkedAt:Date.now()};
    db.prepare('INSERT INTO calendar_details VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,account_key,calendar_id,event_id) DO UPDATE SET revision=excluded.revision,data=excluded.data').run(id,user,account,calendar,event,revision,box.seal(data));db.exec('COMMIT');return {id,revision,...data};
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  refreshCalendarSnapshot(user,account,calendar,event,snapshot){const old=this.calendarDetails(user,account,calendar,event);if(old)db.prepare('UPDATE calendar_details SET data=? WHERE user_id=? AND account_key=? AND calendar_id=? AND event_id=?').run(box.seal({fields:old.fields,snapshot,checkedAt:Date.now()}),user,account,calendar,event);},
  exportCalendarDetails(user){return db.prepare('SELECT * FROM calendar_details WHERE user_id=? ORDER BY rowid').all(user).map(row=>({calendarId:row.calendar_id,eventId:row.event_id,revision:row.revision,fields:read(row).fields}));},
  calendarDetailRows(user,account){return db.prepare('SELECT * FROM calendar_details WHERE user_id=? AND account_key=? ORDER BY rowid DESC').all(user,account).map(row=>({...read(row),calendarId:row.calendar_id,eventId:row.event_id}));},
 };
}
