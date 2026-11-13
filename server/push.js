import {randomUUID,createHash} from 'node:crypto';
import {fail} from './secrets.js';
export function pushStore(db,box){
 db.exec(`CREATE TABLE IF NOT EXISTS push_devices(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,device_id TEXT NOT NULL,payload TEXT NOT NULL,session_hash TEXT NOT NULL,UNIQUE(user_id,device_id));
 CREATE TABLE IF NOT EXISTS push_outbox(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,message_id TEXT NOT NULL REFERENCES assistant_messages(id) ON DELETE CASCADE,device_hash TEXT NOT NULL REFERENCES push_devices(token_hash) ON DELETE CASCADE,status TEXT NOT NULL,UNIQUE(message_id,device_hash));`);
 const hash=value=>createHash('sha256').update(value).digest('hex');
 return {
  registerPushDevice(user,deviceId,token,session){
   deviceId=deviceId??randomUUID();
   if(typeof deviceId!=='string'||!/^[a-f0-9-]{36}$/.test(deviceId)||typeof token!=='string'||!/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{16,200}\]$/.test(token))throw fail(400,'이 기기의 알림 연결을 확인해주세요.');
   const sessionHash=hash(session||'');if(!db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND user_id=? AND expires_at>?').get(sessionHash,user,Date.now()))throw fail(401,'다시 로그인하고 알림을 연결해주세요.');
   db.exec('BEGIN IMMEDIATE');try{const old=db.prepare('SELECT token_hash,session_hash FROM push_devices WHERE user_id=? AND device_id=?').get(user,deviceId);if(old?.token_hash===hash(token)&&old.session_hash===sessionHash){db.exec('COMMIT');return {enabled:true,deviceId};}
    db.prepare('DELETE FROM push_devices WHERE token_hash=? OR (user_id=? AND device_id=?)').run(hash(token),user,deviceId);db.prepare('INSERT INTO push_devices VALUES (?,?,?,?,?)').run(hash(token),user,deviceId,box.seal({token}),sessionHash);db.exec('COMMIT');return {enabled:true,deviceId};
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  removePushDevice(user,deviceId){db.prepare('DELETE FROM push_devices WHERE user_id=? AND device_id=?').run(user,typeof deviceId==='string'?deviceId:'');return {enabled:false};},
  pushDeviceStatus(user,deviceId){return {enabled:!!db.prepare('SELECT 1 FROM push_devices d JOIN sessions s ON s.token_hash=d.session_hash WHERE d.user_id=? AND d.device_id=? AND s.expires_at>?').get(user,deviceId,Date.now())};},
  claimMessagePush(){
   db.prepare("UPDATE push_outbox SET status='cancelled' WHERE status='pending' AND NOT EXISTS (SELECT 1 FROM push_devices d JOIN sessions s ON s.token_hash=d.session_hash WHERE d.token_hash=push_outbox.device_hash AND d.user_id=push_outbox.user_id AND s.expires_at>?)").run(Date.now());
   const row=db.prepare("SELECT p.id,p.message_id,p.device_hash,d.payload FROM push_outbox p JOIN push_devices d ON d.token_hash=p.device_hash AND d.user_id=p.user_id WHERE p.status='pending' ORDER BY p.rowid LIMIT 1").get();if(!row)return null;
   if(db.prepare("UPDATE push_outbox SET status='sending' WHERE id=? AND status='pending'").run(row.id).changes!==1)return null;
   return {id:row.id,messageId:row.message_id,deviceHash:row.device_hash,token:box.open(row.payload).token};
  },
  finishMessagePush(id,status){db.prepare("UPDATE push_outbox SET status=? WHERE id=? AND status='sending'").run(status,id);},
  forgetPushToken(hash){db.prepare('DELETE FROM push_devices WHERE token_hash=?').run(hash);},
 };
}
export function createPushSender(store,{fetcher=fetch}={}){
 let busy=false;return {async tick(){if(busy)return;busy=true;try{for(let i=0;i<20;i++){const item=store.claimMessagePush();if(!item)break;try{
  const r=await fetcher('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:item.token,title:'덕',body:'새 예약 메시지가 도착했어요. 덕 채팅에서 확인해주세요.',data:{screen:'duck',messageId:item.messageId}}),signal:AbortSignal.timeout(8000),redirect:'error'});
  if(!r.ok){store.finishMessagePush(item.id,'failed');continue;}const reply=await r.json();if(reply.data?.status==='ok')store.finishMessagePush(item.id,'accepted');else{store.finishMessagePush(item.id,'failed');if(reply.data?.details?.error==='DeviceNotRegistered')store.forgetPushToken(item.deviceHash);}
 }catch{store.finishMessagePush(item.id,'unknown');}}}finally{busy=false;}}};
}
