import {randomUUID} from 'node:crypto';
/** Durable leases and deduplication. Source snapshots remain encrypted. */
export function urgentStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS assistant_monitors(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,revision INTEGER NOT NULL,next_at INTEGER NOT NULL,lease TEXT,payload TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS assistant_alert_keys(user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,event_key TEXT NOT NULL,message_id TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(user_id,event_key));`);
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(error){db.exec('ROLLBACK');throw error;}};
 return {
  hasAssistantAlert(user,key){return !!db.prepare('SELECT 1 FROM assistant_alert_keys WHERE user_id=? AND event_key=?').get(user,key);},
  dueAssistantMonitors(now,user=null){
   return db.prepare("SELECT s.* FROM automation_schedules s JOIN users u ON u.id=s.user_id LEFT JOIN assistant_monitors m ON m.user_id=s.user_id WHERE s.kind='briefing' AND s.enabled=1 AND u.email_verified_at IS NOT NULL AND (m.next_at IS NULL OR m.next_at<=? OR m.revision<>s.revision)"+(user?' AND s.user_id=?':'')+' ORDER BY COALESCE(m.next_at,0)').all(...(user?[now,user]:[now])).map(row=>({...box.open(row.payload),userId:row.user_id,revision:row.revision})).filter(s=>s.urgentAlerts===true).slice(0,10);
  },
  claimAssistantMonitor(item,now){return tx(()=>{
   const schedule=db.prepare("SELECT * FROM automation_schedules WHERE user_id=? AND kind='briefing' AND enabled=1 AND revision=?").get(item.userId,item.revision);
   if(!schedule||!box.open(schedule.payload).urgentAlerts)return null;
   const row=db.prepare('SELECT * FROM assistant_monitors WHERE user_id=?').get(item.userId);
   if(row?.revision===item.revision&&row.next_at>now)return null;
   const lease=randomUUID(),payload=row&&row.revision===item.revision?box.open(row.payload):{snapshot:[],initialized:false};
   db.prepare('INSERT INTO assistant_monitors VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET revision=excluded.revision,next_at=excluded.next_at,lease=excluded.lease,payload=excluded.payload').run(item.userId,item.revision,now+600000,lease,box.seal(payload));
   return {...item,lease,previous:payload};
  });},
  finishAssistantMonitor(item,snapshot,messages,now,error=null,warnings=[]){return tx(()=>{
   const schedule=db.prepare("SELECT * FROM automation_schedules WHERE user_id=? AND kind='briefing' AND enabled=1 AND revision=?").get(item.userId,item.revision);
   const runtime=db.prepare('SELECT lease FROM assistant_monitors WHERE user_id=?').get(item.userId);
   if(runtime?.lease!==item.lease)return 0;
   if(!schedule||!box.open(schedule.payload).urgentAlerts){db.prepare('DELETE FROM assistant_monitors WHERE user_id=? AND lease=?').run(item.userId,item.lease);return 0;}
   let sent=0;
   for(const message of messages){
    const id=randomUUID();
    if(!db.prepare('INSERT OR IGNORE INTO assistant_alert_keys VALUES (?,?,?,?)').run(item.userId,message.eventKey,id,now).changes)continue;
    db.prepare('INSERT INTO assistant_messages VALUES (?,?,?,?,NULL)').run(id,item.userId,box.seal(message),now);
    for(const device of db.prepare('SELECT token_hash FROM push_devices WHERE user_id=?').all(item.userId))db.prepare("INSERT OR IGNORE INTO push_outbox VALUES (?,?,?,?, 'pending')").run(randomUUID(),item.userId,id,device.token_hash);
    sent++;
   }
   db.prepare('UPDATE assistant_monitors SET next_at=?,lease=NULL,payload=? WHERE user_id=? AND lease=?').run(now+(error?300000:60000),box.seal({snapshot,initialized:error?item.previous.initialized:true,checkedAt:now,error,warnings:warnings.slice(0,8)}),item.userId,item.lease);
   return sent;
  });},
  assistantMonitorStatus(user){const row=db.prepare('SELECT payload FROM assistant_monitors WHERE user_id=?').get(user);if(!row)return null;const value=box.open(row.payload);return {checkedAt:value.checkedAt??null,error:value.error??null,warnings:value.warnings??[],mode:'polling',intervalSeconds:60,guaranteedRealtime:false};},
 };
}
