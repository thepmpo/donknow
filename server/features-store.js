import {adminAuthStore} from './admin-auth-store.js';
import {mailPublicError} from './mail-diagnostics.js';
import {memberAccess} from './account-policy.js';
import {sourceOutbox} from './source-outbox.js';
import {aiBudgetStore} from './ai-budget.js';
import {agentSyncStore} from './agent-sync.js';
import {agentChannelStore} from './agent-channels.js';
import {agentEventStore} from './agent-events.js';
import {agentVoiceStore} from './agent-voice.js';
import {agentMemoryStore} from './agent-memory.js';
import {agentComputerStore} from './agent-computer.js';
import {agentStore} from './agent-store.js';
import {briefingStore} from './briefing-store.js';
import {urgentStore} from './urgent-store.js';
import {assistantMemoryStore} from './assistant-memory-store.js';
import {assistantRealtimeStore} from './assistant-realtime-store.js';
import {docenCalendarStore} from './docen-calendar-store.js';
import {calendarDetailsStore} from './calendar-details-store.js';
import {connectionStore} from './google-accounts.js';
import {pushStore} from './push.js';
import {automationStore} from './automations-store.js';
import { actionStore } from './action-store.js';
import { commentsStore } from './comments-store.js';
import { taskSyncStore } from './sync-store.js';
import { randomInt, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { secretBox, fail } from './secrets.js';
const scrypt = promisify(scryptCallback);
export async function featureStore(db, directory, env = process.env) {
  const box = await secretBox(directory, env.INTEGRATION_TOKEN_KEY || '', env.INTEGRATION_KEY_SEED || '');
  db.exec('CREATE TABLE IF NOT EXISTS crypto_metadata (id INTEGER PRIMARY KEY CHECK(id=1), key_hash TEXT NOT NULL)');
  const existingKey = db.prepare('SELECT key_hash FROM crypto_metadata WHERE id=1').get();
  if (existingKey && existingKey.key_hash !== box.fingerprint) throw new Error('Original token encryption key is required for this database');
  if (!existingKey) db.prepare('INSERT INTO crypto_metadata VALUES (1,?)').run(box.fingerprint);
  if (!db.prepare('PRAGMA table_info(users)').all().some(column => column.name === 'email_verified_at')) db.exec('ALTER TABLE users ADD COLUMN email_verified_at TEXT');
  db.exec(`CREATE TABLE IF NOT EXISTS account_actions (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL, code_hash TEXT NOT NULL, expires_at INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,purpose));
    CREATE TABLE IF NOT EXISTS mail_outbox (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, purpose TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, next_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS mail_delivery_failures (mail_id TEXT PRIMARY KEY REFERENCES mail_outbox(id) ON DELETE CASCADE, kind TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS oauth_states (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, payload TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS integrations (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, payload TEXT NOT NULL, label TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(user_id,provider));
    CREATE TABLE IF NOT EXISTS integration_resources (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, resource_key TEXT NOT NULL, payload TEXT NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY(user_id,provider,resource_key));
    CREATE TABLE IF NOT EXISTS imported_resources (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, provider TEXT NOT NULL, resource_key TEXT NOT NULL, todo_id TEXT NOT NULL, PRIMARY KEY(user_id,provider,resource_key));`);
  const transaction = action => { db.exec('BEGIN IMMEDIATE'); try { const output = action(); db.exec('COMMIT'); return output; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  let mailMaintenanceAt=0;
  const account = id => { const row = db.prepare('SELECT id,email,email_verified_at FROM active_users WHERE id=?').get(id);if(!row)return null;const access=memberAccess(db,id);return {id:row.id,email:row.email,emailVerified:!!row.email_verified_at,plan:access.plan,planAccess:access.mode}; };
  const findId = email => db.prepare('SELECT id FROM users WHERE email=?').get(email)?.id;
  function codeValid(userId, purpose, code, count = true) {
    const row = db.prepare('SELECT * FROM account_actions WHERE user_id=? AND purpose=?').get(userId, purpose);
    if (!row || row.expires_at <= Date.now() || row.attempts >= (count ? 5 : 6)) return false;
    if (count) db.prepare('UPDATE account_actions SET attempts=attempts+1 WHERE user_id=? AND purpose=?').run(userId, purpose);
    const hash = box.hash(`${purpose}:${userId}:${code}`);
    return timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(row.code_hash, 'hex'));
  }
  async function passwordMatches(userId, password) {
    const row = db.prepare('SELECT password_hash,salt FROM users WHERE id=?').get(userId); if (!row || typeof password !== 'string' || password.length > 128) return false;
    const result = await scrypt(password, row.salt, 64); return timingSafeEqual(result, Buffer.from(row.password_hash, 'hex'));
  }
  return {
    ...(await adminAuthStore(db,box,env)),
    ...aiBudgetStore(db),
    ...calendarDetailsStore(db,box),
    ...docenCalendarStore(db,box),
    ...connectionStore(db,box,transaction),
    ...automationStore(db,box),
    ...briefingStore(db,box),
    ...urgentStore(db,box),
    ...assistantMemoryStore(db,box),
    ...agentStore(db,box),
    ...agentMemoryStore(db,box),
    ...agentComputerStore(db,box),
    ...agentVoiceStore(db,box),
    ...agentEventStore(db,box),
    ...agentChannelStore(db,box),
    ...agentSyncStore(db,box),
    ...assistantRealtimeStore(db,box),
    ...pushStore(db,box),
    ...taskSyncStore(db),
    ...actionStore(db,box),
    ...sourceOutbox(db,box),
    ...commentsStore(db),
    account, findAccountId: findId,
    queueAccountMail(userId, purpose) {
      const user = account(userId); if (!user) return null;
      if (!['verify', 'reset'].includes(purpose)) throw fail(400, '잘못된 인증 요청이에요.');
      const now = Date.now(), previous = db.prepare('SELECT created_at FROM mail_outbox WHERE user_id=? AND purpose=? ORDER BY created_at DESC LIMIT 1').get(userId, purpose);
      if (previous && previous.created_at > now - 60000) throw fail(429, '인증번호는 1분 후 다시 요청해주세요.');
      if (db.prepare('SELECT COUNT(*) AS total FROM mail_outbox WHERE user_id=? AND created_at>?').get(userId, now - 3600000).total >= 5) throw fail(429, '인증 요청이 많아요. 잠시 후 다시 시도해주세요.');
      const code = String(randomInt(100000, 1000000)), id = randomUUID(), expiresAt = now + 15 * 60000;
      const payload = { to: user.email, subject: purpose === 'verify' ? 'docen 이메일 인증번호' : 'docen 비밀번호 재설정', text: `인증번호: ${code}\n\n15분 안에 앱에 입력해주세요. 본인이 요청하지 않았다면 이 메일을 무시해주세요.` };
      transaction(() => {
        db.prepare("UPDATE mail_outbox SET status='superseded',payload='' WHERE user_id=? AND purpose=? AND status IN ('pending','processing')").run(userId, purpose);
        db.prepare('INSERT INTO account_actions VALUES (?,?,?,?,0,?) ON CONFLICT(user_id,purpose) DO UPDATE SET code_hash=excluded.code_hash,expires_at=excluded.expires_at,attempts=0,created_at=excluded.created_at').run(userId, purpose, box.hash(`${purpose}:${userId}:${code}`), expiresAt, now);
        db.prepare("INSERT INTO mail_outbox VALUES (?,?,?,?, 'pending',0,?,?)").run(id, userId, purpose, box.seal(payload), now, now);
      });
      return { expiresAt };
    },
    verifyEmail(userId, code) {
      return transaction(() => { if (!codeValid(userId, 'verify', code)) return false; db.prepare('UPDATE users SET email_verified_at=? WHERE id=?').run(new Date().toISOString(), userId); db.prepare('DELETE FROM account_actions WHERE user_id=? AND purpose=?').run(userId, 'verify'); return true; });
    },
    async resetPassword(email, code, password) {
      const id = findId(email); if (!id || !codeValid(id, 'reset', code)) return false;
      const salt = randomBytes(16).toString('hex'), hash = (await scrypt(password, salt, 64)).toString('hex');
      return transaction(() => { if (!codeValid(id, 'reset', code, false)) return false; db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').run(hash, salt, id); db.prepare('DELETE FROM sessions WHERE user_id=?').run(id); db.prepare('DELETE FROM account_actions WHERE user_id=?').run(id); db.prepare("UPDATE mail_outbox SET status='superseded',payload='' WHERE user_id=? AND status IN ('pending','processing')").run(id); return true; });
    },
    passwordMatches,
    async deleteAccount(userId, password) {
      if (!(await passwordMatches(userId, password))) return false;
      transaction(() => { db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId); db.prepare('DELETE FROM todos WHERE user_id=?').run(userId); db.prepare('DELETE FROM migrations WHERE user_id=?').run(userId); db.prepare('DELETE FROM users WHERE id=?').run(userId); }); return true;
    },
    mailStatus(userId) { const row=db.prepare('SELECT m.purpose,m.status,m.created_at AS createdAt,f.kind FROM mail_outbox m LEFT JOIN mail_delivery_failures f ON f.mail_id=m.id WHERE m.user_id=? ORDER BY m.created_at DESC LIMIT 1').get(userId);if(!row)return null;const {kind,...status}=row;return {...status,...(kind&&status.status!=='sent'?{error:mailPublicError({mailKind:kind})}:{})}; },
    claimMail() {
      const now = Date.now();
      if(!mailMaintenanceAt||now-mailMaintenanceAt>=60000){
        db.prepare("UPDATE mail_outbox SET status='pending' WHERE status='processing' AND next_at<?").run(now - 60000);
        db.prepare("UPDATE mail_outbox SET payload='',status='expired' WHERE created_at<? AND payload<>''").run(now - 15 * 60000);
        mailMaintenanceAt=now;
      }
      if(!db.prepare("SELECT id FROM mail_outbox WHERE status='pending' AND next_at<=? AND attempts<5 ORDER BY created_at LIMIT 1").get(now))return null;
      return transaction(() => { const row = db.prepare("SELECT * FROM mail_outbox WHERE status='pending' AND next_at<=? AND attempts<5 ORDER BY created_at LIMIT 1").get(now); if (!row) return null; db.prepare("UPDATE mail_outbox SET status='processing',next_at=? WHERE id=?").run(now, row.id); return { ...row, message: box.open(row.payload) }; });
    },
    mailSucceeded(id) { db.prepare("UPDATE mail_outbox SET status='sent',payload='' WHERE id=? AND status='processing'").run(id); },
    mailFailed(id, attempt, kind='network') { transaction(()=>{const permanent=['testing-recipient-restricted','sender-domain-unverified','invalid-api-key','restricted-api-key','permission-denied','invalid-mail-configuration'].includes(kind);const row=db.prepare("SELECT user_id,purpose FROM mail_outbox WHERE id=? AND status='processing'").get(id);if(!row)return;db.prepare("UPDATE mail_outbox SET status=?,attempts=?,next_at=?,payload=CASE WHEN ? THEN '' ELSE payload END WHERE id=? AND status='processing'").run(permanent||attempt>=5?'failed':'pending',attempt,Date.now()+Math.min(60000,2000*2**attempt),permanent?1:0,id);db.prepare('INSERT INTO mail_delivery_failures VALUES (?,?) ON CONFLICT(mail_id) DO UPDATE SET kind=excluded.kind').run(id,kind);if(permanent)db.prepare('DELETE FROM account_actions WHERE user_id=? AND purpose=? AND created_at=(SELECT created_at FROM mail_outbox WHERE id=?)').run(row.user_id,row.purpose,id);}); },
    createOAuthState(userId, provider, payload) { const state = randomBytes(32).toString('base64url'); db.prepare('DELETE FROM oauth_states WHERE expires_at<?').run(Date.now()); db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?,?)').run(box.hash(state), userId, provider, box.seal(payload), Date.now() + 10 * 60000); return state; },
    consumeOAuthState(provider, state) { return transaction(() => { if (typeof state !== 'string' || state.length > 200) return null; const row = db.prepare('SELECT * FROM oauth_states WHERE hash=? AND provider=?').get(box.hash(state), provider); if (!row) return null; db.prepare('DELETE FROM oauth_states WHERE hash=?').run(row.hash); return row.expires_at > Date.now() ? { userId: row.user_id, ...box.open(row.payload) } : null; }); },
    clearResourceCache(userId,provider,connectionId){const prefix=connectionId+':';db.prepare('DELETE FROM integration_resources WHERE user_id=? AND provider=?'+(connectionId?' AND substr(resource_key,1,?)=?':'')).run(...(connectionId?[userId,provider,prefix.length,prefix]:[userId,provider]));},
    cacheResources(userId, provider, items) {
      if (!items.length) return;
      const expires = Date.now() + 10 * 60000;
      // One remote statement per bounded page, rather than one synchronous trip per item.
      transaction(() => { for (let i=0;i<items.length;i+=100) {
        const page=items.slice(i,i+100);
        db.prepare('INSERT INTO integration_resources VALUES '+page.map(()=>'(?,?,?,?,?)').join(',')+' ON CONFLICT(user_id,provider,resource_key) DO UPDATE SET payload=excluded.payload,expires_at=excluded.expires_at').run(...page.flatMap(item=>[userId,provider,item.id,JSON.stringify(item),expires]));
      } });
    },
    importedSourceLocator(user,id){const row=db.prepare('SELECT r.payload FROM imported_resources i JOIN integration_resources r ON r.user_id=i.user_id AND r.provider=i.provider AND r.resource_key=i.resource_key WHERE i.user_id=? AND i.todo_id=?').get(user,id);if(!row)return null;const r=JSON.parse(row.payload);return {calendarId:r.calendarId,eventId:r.eventId,connectionId:r.connectionId};},
    syncTaskResources(userId,provider,items,{returnItems=false,resolve=false}={}){
      return transaction(()=>{
        let changed=0;
        const updates=[];
        const deferred=[];
        const suppressed=[];
        const lookup=db.prepare('SELECT i.todo_id,t.data FROM imported_resources i LEFT JOIN todos t ON t.id=i.todo_id AND t.user_id=i.user_id WHERE i.user_id=? AND i.provider=? AND i.resource_key=?');
        const update=db.prepare('UPDATE todos SET data=? WHERE id=? AND user_id=?');
        const insert=db.prepare('INSERT INTO todos VALUES (?,?,?)');
        const link=db.prepare('INSERT INTO imported_resources VALUES (?,?,?,?)');
        const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
        const sendingLists=provider==='apple-reminders'?new Set(db.prepare(`
          SELECT json_extract(target, '$.listId') AS listId FROM todo_delivery
          WHERE user_id=? AND provider='apple-reminders' AND state='sending' AND next_at>?
        `).all(userId,Date.now()).map(row=>row.listId)):null;
        for(const item of items){
          const row=lookup.get(userId,provider,item.id);
          // EventKit can report a newly created reminder before its delivery receipt arrives.
          if(!row&&sendingLists?.has(item.listId)){deferred.push(item.id);continue;}
          if(row&&!row.data){if(provider==='apple-reminders')suppressed.push(item.id);continue;}
          const before=row&&JSON.parse(row.data);
          if(before&&(before.source?.provider!==provider||before.source.externalId!==item.id)){
            if(provider==='apple-reminders')suppressed.push(item.id);
            continue;
          }
          if(before&&before.sourceSync?.patch&&before.sourceSync.state!=='succeeded'){
            if(resolve)updates.push(before);
            continue;
          }
          const modifiedAt=stamp(item.modifiedAt);
          if(before){
            const previous=stamp(before.source.modifiedAt);
            if(previous&&(!modifiedAt||modifiedAt<=previous)||
              before.sourceSync?.state==='succeeded'&&(!modifiedAt||Date.parse(modifiedAt)<(before.sourceSync.at??0))){
              if(resolve)updates.push(before);
              continue;
            }
          }
          if(!before&&item.completed)continue;
          const dueDate=typeof item.dueDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)&&stamp(item.dueDate)?.slice(0,10)===item.dueDate?item.dueDate:null;
          const title=typeof item.title==='string'&&item.title.trim()?item.title.trim().slice(0,120):'제목 없는 할 일';
          const source={...before?.source,provider,externalId:item.id,...(modifiedAt?{modifiedAt}: {})};
          for(const field of ['listId','listTitle','connectionId','color','url']){
            if(typeof item[field]==='string'&&item[field].length<=2048)source[field]=item[field];
          }
          const todo={...(before??{id:randomUUID(),category:'업무',createdAt:new Date().toISOString(),reminderAt:null}),source,title,dueDate,
            notes:typeof item.notes==='string'?item.notes.slice(0,4000):before?.notes??'',done:item.completed===true,
            ...(provider==='apple-reminders'?{dueTime:dueDate?item.dueTime??null:null}:!dueDate?{dueTime:null}: {}),
            completedAt:item.completed?(stamp(item.completedAt)??before?.completedAt??modifiedAt??new Date().toISOString()):null};
          if(before&&JSON.stringify(before)===JSON.stringify(todo)){
            if(resolve)updates.push(before);
            continue;
          }
          if(before)update.run(JSON.stringify(todo),todo.id,userId);
          else {insert.run(todo.id,userId,JSON.stringify(todo));link.run(userId,provider,item.id,todo.id);}
          changed++;
          if(returnItems)updates.push(todo);
        }
        return returnItems?{changed,items:updates,...(deferred.length?{deferred}:{}),...(suppressed.length?{suppressed}:{})}:changed;
      });
    },
    importResources(userId, provider, ids) {
      if(!ids.length)return [];
      return transaction(() => {
        const keys=[...new Set(ids)],resources=new Map(),previous=new Map();
        for(let i=0;i<keys.length;i+=100){const page=keys.slice(i,i+100),slots=page.map(()=>'?').join(',');
          for(const row of db.prepare('SELECT resource_key,payload FROM integration_resources WHERE user_id=? AND provider=? AND resource_key IN ('+slots+') AND expires_at>?').all(userId,provider,...page,Date.now()))resources.set(row.resource_key,JSON.parse(row.payload));
          for(const row of db.prepare('SELECT imported_resources.resource_key,todos.data FROM imported_resources JOIN todos ON todos.id=imported_resources.todo_id AND todos.user_id=imported_resources.user_id WHERE imported_resources.user_id=? AND provider=? AND resource_key IN ('+slots+')').all(userId,provider,...page))previous.set(row.resource_key,JSON.parse(row.data));
        }
        for(const id of keys){const item=resources.get(id);if(!item)throw fail(400,'자료를 새로고침한 뒤 다시 선택해주세요.');if(item.completed===true)throw fail(400,'완료된 기록은 참고만 할 수 있어요. 미완료 할 일만 가져와주세요.');}
        const created=[],result=ids.map(id=>{
          const item=resources.get(id),old=previous.get(id);
          const color=typeof item.color==='string'&&/^#[a-f\d]{6}$/i.test(item.color)?item.color:undefined;
          if(old){
            if(color&&old.source&&old.source.color!==color){
              old.source={...old.source,color};
              db.prepare('UPDATE todos SET data=? WHERE id=? AND user_id=?').run(JSON.stringify(old),old.id,userId);
            }
            return {todo:old,created:false};
          }
          const todo={id:randomUUID(),title:item.title.slice(0,120),category:'업무',done:false,dueDate:item.dueDate??null,reminderAt:null,createdAt:new Date().toISOString(),source:{provider,externalId:item.id,...(color?{color}:{}),...Object.fromEntries(['url','calendarId','eventId','connectionId','modifiedAt','timeZone'].filter(k=>typeof item[k]==='string').map(k=>[k,item[k]])),...(typeof item.dueTimeZone==='string'?{timeZone:item.dueTimeZone}: {})},...(typeof item.notes==='string'?{notes:item.notes.slice(0,4000)}:{}),...(item.dueTime!==undefined?{dueTime:item.dueTime}:{})};
          created.push({id,todo});previous.set(id,todo);return {todo,created:true};
        });
        for(let i=0;i<created.length;i+=100){const page=created.slice(i,i+100);
          db.prepare('INSERT INTO todos VALUES '+page.map(()=>'(?,?,?)').join(',')).run(...page.flatMap(({todo})=>[todo.id,userId,JSON.stringify(todo)]));
          db.prepare('INSERT INTO imported_resources VALUES '+page.map(()=>'(?,?,?,?)').join(',')+' ON CONFLICT(user_id,provider,resource_key) DO UPDATE SET todo_id=excluded.todo_id').run(...page.flatMap(({id,todo})=>[userId,provider,id,todo.id]));
        }
        return result;
      });
    },
  };
}
