import {randomUUID} from 'node:crypto';
import {fail} from './secrets.js';
import {weatherCities} from './weather.js';
const formatters=new Map();
export function localClock(now,timezone){let f=formatters.get(timezone);if(!f){if(formatters.size>100)formatters.clear();f=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formatters.set(timezone,f);}const p=Object.fromEntries(f.formatToParts(new Date(now)).map(x=>[x.type,x.value]));return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};}
export function nextDelivery(time,timezone,after){for(let at=(Math.floor(after/60000)+1)*60000,end=at+72*3600000;at<end;at+=60000)if(localClock(at,timezone).time===time)return at;throw fail(400,'다음 예약 시간을 계산하지 못했어요.');}
export function validateSchedule(kind,input){
 if(!['briefing','weather'].includes(kind)||!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['enabled','time','timezone','city','providers','aiConsent'].includes(k))||typeof input.enabled!=='boolean'||typeof input.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time))throw fail(400,'예약 종류와 시간을 확인해주세요.');
 if(typeof input.timezone!=='string'||input.timezone.length>80)throw fail(400,'시간대를 확인해주세요.');try{localClock(Date.now(),input.timezone);}catch{throw fail(400,'지원하는 시간대를 선택해주세요.');}
 const city=input.city??null,providers=input.providers??[];
 if(city!==null&&!Object.hasOwn(weatherCities,city))throw fail(400,'지원하는 도시를 선택해주세요.');
 if(kind==='weather'&&!city)throw fail(400,'날씨를 받을 도시를 선택해주세요.');
 if(!Array.isArray(providers)||providers.length>4||providers.some(p=>!['google','notion','slack','naver'].includes(p))||(kind==='weather'&&providers.length))throw fail(400,'브리핑에 쓸 자료를 선택해주세요.');
 if(input.aiConsent!==undefined&&typeof input.aiConsent!=='boolean')throw fail(400,'AI 자료 사용 동의를 확인해주세요.');
 if(kind==='briefing'&&input.enabled&&input.aiConsent!==true)throw fail(400,'예약한 자료를 AI에 보내는 데 동의해주세요.');
 return {enabled:input.enabled,time:input.time,timezone:input.timezone,city,providers:[...new Set(providers)],aiConsent:kind==='briefing'&&input.aiConsent===true};
}
export function automationStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS automation_schedules(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,enabled INTEGER NOT NULL,payload TEXT NOT NULL,revision INTEGER NOT NULL,next_at INTEGER NOT NULL,PRIMARY KEY(user_id,kind));
 CREATE INDEX IF NOT EXISTS automation_due ON automation_schedules(enabled,next_at);
 CREATE TABLE IF NOT EXISTS automation_deliveries(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,local_date TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER NOT NULL,created_at INTEGER NOT NULL,UNIQUE(user_id,kind,local_date));
 CREATE TABLE IF NOT EXISTS assistant_messages(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,payload TEXT NOT NULL,created_at INTEGER NOT NULL,read_at INTEGER);
 CREATE INDEX IF NOT EXISTS assistant_messages_owner ON assistant_messages(user_id,created_at);`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 const schedule=row=>row?{kind:row.kind,...box.open(row.payload),enabled:!!row.enabled,revision:row.revision,nextAt:row.enabled?row.next_at:null}:null;
 return {
  automationSettings(user){return ['briefing','weather'].map(kind=>schedule(db.prepare('SELECT * FROM automation_schedules WHERE user_id=? AND kind=?').get(user,kind))??{kind,enabled:false,time:kind==='briefing'?'08:00':'07:30',timezone:'Asia/Seoul',city:kind==='weather'?'seoul':null,providers:[],aiConsent:false,revision:0,nextAt:null});},
  configureAutomation(user,kind,input,now=Date.now()){
   const value=validateSchedule(kind,input),next=value.enabled?nextDelivery(value.time,value.timezone,now):0;
   return tx(()=>{db.prepare('INSERT INTO automation_schedules VALUES (?,?,?,?,1,?) ON CONFLICT(user_id,kind) DO UPDATE SET enabled=excluded.enabled,payload=excluded.payload,revision=automation_schedules.revision+1,next_at=excluded.next_at').run(user,kind,value.enabled?1:0,box.seal(value),next);return schedule(db.prepare('SELECT * FROM automation_schedules WHERE user_id=? AND kind=?').get(user,kind));});
  },
  dueAutomations(now,user=null){return db.prepare('SELECT s.* FROM automation_schedules s JOIN users u ON u.id=s.user_id WHERE s.enabled=1 AND s.next_at<=? AND u.email_verified_at IS NOT NULL AND NOT EXISTS (SELECT 1 FROM automation_deliveries d WHERE d.user_id=s.user_id AND d.kind=s.kind AND d.status=\'running\' AND d.created_at>?)'+(user?' AND s.user_id=?':'')+' ORDER BY s.next_at LIMIT 10').all(...(user?[now,now-600000,user]:[now,now-600000])).map(row=>({...schedule(row),userId:row.user_id}));},
  claimAutomation(item,now){return tx(()=>{
   const row=db.prepare('SELECT * FROM automation_schedules WHERE user_id=? AND kind=? AND enabled=1 AND revision=? AND next_at<=?').get(item.userId,item.kind,item.revision,now);if(!row)return null;
   const clock=localClock(now,item.timezone),key=clock.date,id=randomUUID();
   if(localClock(row.next_at,item.timezone).date<key&&clock.time<item.time){
    db.prepare('UPDATE automation_schedules SET next_at=? WHERE user_id=? AND kind=? AND revision=?').run(nextDelivery(item.time,item.timezone,now),item.userId,item.kind,item.revision);
    db.prepare("UPDATE automation_deliveries SET status='cancelled' WHERE user_id=? AND kind=? AND status='running'").run(item.userId,item.kind);return null;
   }
   const existing=db.prepare('SELECT * FROM automation_deliveries WHERE user_id=? AND kind=? AND local_date=?').get(item.userId,item.kind,key);
   if(existing){
    if(existing.status==='running'&&existing.created_at<=now-600000&&existing.revision===item.revision){db.prepare('UPDATE automation_deliveries SET created_at=? WHERE id=?').run(now,existing.id);return {...item,id:existing.id,date:key};}
    if(existing.status!=='running')db.prepare('UPDATE automation_schedules SET next_at=? WHERE user_id=? AND kind=? AND revision=?').run(nextDelivery(item.time,item.timezone,now),item.userId,item.kind,item.revision);
    return null;
   }
   db.prepare("INSERT INTO automation_deliveries VALUES (?,?,?,?,'running',?,?)").run(id,item.userId,item.kind,key,item.revision,now);
   return {...item,id,date:key};
  });},
  completeAutomation(item,message,now=Date.now()){return tx(()=>{
   const current=db.prepare('SELECT enabled,revision FROM automation_schedules WHERE user_id=? AND kind=?').get(item.userId,item.kind);
   if(!current?.enabled||current.revision!==item.revision){db.prepare("UPDATE automation_deliveries SET status='cancelled' WHERE id=? AND status='running'").run(item.id);return null;}
   if(db.prepare("UPDATE automation_deliveries SET status='delivered' WHERE id=? AND user_id=? AND status='running'").run(item.id,item.userId).changes!==1)return null;
   db.prepare('UPDATE automation_schedules SET next_at=? WHERE user_id=? AND kind=? AND revision=?').run(nextDelivery(item.time,item.timezone,now),item.userId,item.kind,item.revision);
   db.prepare('INSERT INTO assistant_messages VALUES (?,?,?,?,NULL)').run(item.id,item.userId,box.seal(message),now);
   for(const device of db.prepare('SELECT token_hash FROM push_devices WHERE user_id=?').all(item.userId))db.prepare("INSERT OR IGNORE INTO push_outbox VALUES (?,?,?,?, 'pending')").run(randomUUID(),item.userId,item.id,device.token_hash);
   return {id:item.id,...message,createdAt:now,readAt:null};
  });},
  failAutomation(id){db.prepare("UPDATE automation_deliveries SET status='failed' WHERE id=? AND status='running'").run(id);},
  assistantMessages(user,after=''){
   let rows;if(after){const anchor=db.prepare('SELECT created_at FROM assistant_messages WHERE user_id=? AND id=?').get(user,after);if(!anchor)throw fail(404,'내 메시지를 찾을 수 없어요.');rows=db.prepare('SELECT * FROM assistant_messages WHERE user_id=? AND (created_at>? OR (created_at=? AND id>?)) ORDER BY created_at,id LIMIT 100').all(user,anchor.created_at,anchor.created_at,after);}
   else rows=db.prepare('SELECT * FROM (SELECT * FROM assistant_messages WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 100) ORDER BY created_at,id').all(user);
   return rows.map(r=>({id:r.id,...box.open(r.payload),createdAt:r.created_at,readAt:r.read_at}));
  },
  exportAssistantMessages(user){return db.prepare('SELECT * FROM assistant_messages WHERE user_id=? ORDER BY created_at,id').all(user).map(r=>({id:r.id,...box.open(r.payload),createdAt:r.created_at,readAt:r.read_at}));},
  readAssistantMessages(user,through){if(typeof through!=='string'||through.length>100)throw fail(400,'메시지를 선택해주세요.');const row=db.prepare('SELECT created_at FROM assistant_messages WHERE id=? AND user_id=?').get(through,user);if(!row)throw fail(404,'내 메시지를 찾을 수 없어요.');db.prepare('UPDATE assistant_messages SET read_at=? WHERE user_id=? AND read_at IS NULL AND created_at<=?').run(Date.now(),user,row.created_at);return {ok:true};},
 };
}
