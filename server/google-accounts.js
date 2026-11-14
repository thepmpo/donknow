import {fail} from './secrets.js';
import {calendarIdentifier} from './calendar-time.js';

// The original provider row remains the default for older apps. Additional
// Google accounts use the same encrypted storage, never a client-owned token.
export function connectionStore(db,box,transaction){
 const open=row=>row?{...box.open(row.payload),label:row.label,updatedAt:row.updated_at}:null;
 const rows=(user,provider)=>db.prepare("SELECT * FROM integrations WHERE user_id=? AND (provider=? OR (?='google' AND substr(provider,1,7)='google:')) ORDER BY CASE WHEN provider=? THEN 0 ELSE 1 END,updated_at,provider").all(user,provider,provider,provider);
 const write=(user,key,payload,label)=>db.prepare('INSERT INTO integrations VALUES (?,?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET payload=excluded.payload,label=excluded.label,updated_at=excluded.updated_at').run(user,key,box.seal(payload),label.slice(0,200),new Date().toISOString());
 return {
  connections(user,provider){return rows(user,provider).map(open);},
  connection(user,provider,id){return id==null?open(db.prepare('SELECT * FROM integrations WHERE user_id=? AND provider=?').get(user,provider)):rows(user,provider).map(open).find(r=>r.connectionId===id)??null;},
  saveConnection(user,provider,payload,label){const matching=provider==='google'&&rows(user,provider).find(row=>open(row).connectionId===payload.connectionId);write(user,matching?.provider??provider,payload,label);},
  saveGoogleAccount(user,payload,label){return transaction(()=>{const all=rows(user,'google'),match=all.find(row=>open(row).accountId===payload.accountId);if(!match&&all.length>=10)throw fail(400,'Google 계정은 최대10개까지 연결할 수 있어요.');write(user,match?.provider??(all.length?'google:'+payload.connectionId:'google'),payload,label);});},
  invalidateOAuthStates(user,provider,id){const isDefault=this.connection(user,provider)?.connectionId===id;for(const row of db.prepare('SELECT hash,payload FROM oauth_states WHERE user_id=? AND provider=?').all(user,provider)){const state=box.open(row.payload);if(id==null||state.expectedConnectionId===id||isDefault&&!state.mode)db.prepare('DELETE FROM oauth_states WHERE hash=? AND user_id=?').run(row.hash,user);}},
  removeConnection(user,provider,id){return transaction(()=>{
   const selected=rows(user,provider).filter(row=>id==null||open(row).connectionId===id);
   for(const row of selected){const r=open(row);db.prepare('DELETE FROM integrations WHERE user_id=? AND provider=?').run(user,row.provider);if(r.connectionId){const prefix=r.connectionId+':';db.prepare('DELETE FROM integration_resources WHERE user_id=? AND provider=? AND substr(resource_key,1,?)=?').run(user,provider,prefix.length,prefix);if(provider==='google')db.prepare('DELETE FROM task_sync WHERE user_id=? AND todo_id IN (SELECT id FROM todos WHERE user_id=? AND substr(json_extract(data,\'$.source.externalId\'),1,?)=?)').run(user,user,prefix.length,prefix);}}
   if(provider==='google'&&!db.prepare('SELECT 1 FROM integrations WHERE user_id=? AND provider=?').get(user,'google')){const next=rows(user,provider)[0];if(next){db.prepare('DELETE FROM integrations WHERE user_id=? AND provider=?').run(user,next.provider);db.prepare('INSERT INTO integrations VALUES(?,?,?,?,?)').run(user,'google',next.payload,next.label,next.updated_at);}}
   if(id==null){if(provider==='google')db.prepare('DELETE FROM task_sync WHERE user_id=?').run(user);db.prepare('DELETE FROM integration_resources WHERE user_id=? AND provider=?').run(user,provider);db.prepare('DELETE FROM oauth_states WHERE user_id=? AND provider=?').run(user,provider);}
  });},
 };
}
export function googleAccounts(store,user){return store.connections?store.connections(user,'google'):[store.connection(user,'google')].filter(Boolean);}
export function googleConnection(store,user,id){const record=store.connection(user,'google',id);if(id&&record?.connectionId!==id)throw fail(409,'선택한 Google 계정의 연결을 다시 확인해주세요.');return record;}
export function calendarAccount(store,user,id='primary',connectionId){
 id=calendarIdentifier(id);let calendarId=id;
 if(id.startsWith('@g/')){const end=id.indexOf('/',3);if(end<4)throw fail(400,'캘린더를 다시 선택해주세요.');const selected=id.slice(3,end);if(connectionId&&selected!==connectionId)throw fail(409,'일정과 연결 계정이 다르게 선택됐어요.');connectionId=selected;calendarId=calendarIdentifier(id.slice(end+1));}
 const record=googleConnection(store,user,connectionId);return {calendarId,connectionId:record?.connectionId,record};
}
export function calendarKey(store,user,record,id){return record.connectionId===store.connection(user,'google')?.connectionId?id:'@g/'+record.connectionId+'/'+id;}
