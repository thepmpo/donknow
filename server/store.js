import {adminStore} from './admin-store.js';
import { featureStore } from './features-store.js';
import {accountPolicySchema,accountActive,memberAccess} from './account-policy.js';
import {fail} from './secrets.js';
import { openDatabase } from './database.js';
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdir } from 'node:fs/promises';
const scrypt = promisify(scryptCallback);
function writeId(user,key){
 if(typeof key!=='string'||!/^[A-Za-z0-9_-]{20,120}$/.test(key))throw fail(400,'저장 요청 번호를 확인해주세요.');
 const value=createHash('sha256').update('duck-todo-write-v1:'+user+':'+key).digest('hex');
 return value.slice(0,8)+'-'+value.slice(8,12)+'-5'+value.slice(13,16)+'-a'+value.slice(17,20)+'-'+value.slice(20,32);
}
export async function openStore(directory, { env = process.env, remoteFactory } = {}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const { db } = await openDatabase(directory, env, remoteFactory);
  try {
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS todos (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS todos_user ON todos(user_id);
    CREATE TABLE IF NOT EXISTS migrations (name TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id));`);
  accountPolicySchema(db);
  const features = await featureStore(db, directory, env);
  const digest = token => createHash('sha256').update(token).digest('hex');
  const publicUser = user => {const access=memberAccess(db,user.id);return {id:user.id,email:user.email,emailVerified:!!user.email_verified_at,plan:access.plan,planAccess:access.mode};};
  const findUser = email => db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  function newSession(user) {
    if(!accountActive(db,user.id))throw fail(403,'이 계정은 이용이 정지되어 있어요. 고객 지원에 문의해주세요.');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(digest(token), user.id, expiresAt);
    return { user: publicUser(user), token, expiresAt };
  }
  function list(userId) { return db.prepare('SELECT data FROM todos WHERE user_id = ? ORDER BY rowid').all(userId).map(row => JSON.parse(row.data)); }
  function get(userId, id) { const row = db.prepare('SELECT data FROM todos WHERE user_id = ? AND id = ?').get(userId, id); return row ? JSON.parse(row.data) : null; }
  return {
    ...features,
    ...adminStore(db),
    memberAccess:user=>memberAccess(db,user),
    accountActive:user=>accountActive(db,user),
    close: () => db.close(),
    async register(email, password) {
      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: randomUUID(), email };
      try { db.prepare('INSERT INTO users (id,email,password_hash,salt,created_at) VALUES (?, ?, ?, ?, ?)').run(user.id, email, passwordHash, salt, new Date().toISOString()); }
      catch (error) { if (error.code === 'ERR_SQLITE_ERROR' && error.errcode === 2067) return null; if (findUser(email)) return null; throw error; }
      return newSession(user);
    },
    async login(email, password) {
      const user = findUser(email);
      const supplied = await scrypt(password, user?.salt ?? 'duckduck-nonexistent-user', 64);
      const expected = user ? Buffer.from(user.password_hash, 'hex') : Buffer.alloc(64);
      return timingSafeEqual(supplied, expected) && user ? newSession(user) : null;
    },
    session(token) {
      if (!token || token.length > 256) return null;
      const row = db.prepare('SELECT users.id, users.email, users.email_verified_at, sessions.expires_at FROM sessions JOIN active_users users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?').get(digest(token), Date.now());
      return row ? { user: publicUser(row), expiresAt: row.expires_at } : null;
    },
    logout(token) { if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(digest(token)); },
    list, get,
    reorder(userId,ids){
      if(!Array.isArray(ids)||!ids.length||ids.length>2000||ids.some(id=>typeof id!=='string'||id.length>128)||new Set(ids).size!==ids.length)throw fail(400,'옮길 할 일을 다시 선택해주세요.');
      db.exec('BEGIN IMMEDIATE');try{
        const current=list(userId),byId=new Map(current.map(t=>[t.id,t]));
        if(ids.some(id=>!byId.has(id)||byId.get(id).done))throw fail(409,'목록이 바뀌었어요. 다시 확인하고 옮겨주세요.');
        const ordered=[...ids,...current.filter(t=>!t.done&&!ids.includes(t.id)).map(t=>t.id)];
        const changed=ordered.flatMap((id,order)=>{const todo=byId.get(id);return todo.order===order?[]:[{...todo,order}];});
        for(let i=0;i<changed.length;i+=100){const page=changed.slice(i,i+100);db.prepare('INSERT INTO todos(id,user_id,data) VALUES '+page.map(()=>'(?,?,?)').join(',')+' ON CONFLICT(id) DO UPDATE SET data=excluded.data WHERE todos.user_id=excluded.user_id').run(...page.flatMap(todo=>[todo.id,userId,JSON.stringify(todo)]));}
        db.exec('COMMIT');return list(userId);
      }catch(error){db.exec('ROLLBACK');throw error;}
    },
    todoWriteReceipt(userId,key){return get(userId,writeId(userId,key));},
    create(userId, draft, { done = false, requestKey } = {}) {
      const id=requestKey!==undefined?writeId(userId,requestKey):randomUUID(),existing=requestKey!==undefined?get(userId,id):null;
      if(existing)return existing;
      const now=new Date().toISOString(),todo={...draft,id,done:done===true,createdAt:now,...(done===true?{completedAt:now}:{})};
      db.prepare('INSERT INTO todos VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING').run(id,userId,JSON.stringify(todo));
      return requestKey!==undefined?get(userId,id):todo;
    },
    update(userId, id, patch, { remote = false, skipTaskSync = false } = {}) {
      const todo = get(userId, id); if (!todo) return null;
      const previousDone=todo.done;
      if ('done' in patch) todo.completedAt = patch.done ? (todo.done && todo.completedAt ? todo.completedAt : new Date().toISOString()) : null;
      Object.assign(todo, patch);
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE todos SET data = ? WHERE id = ? AND user_id = ?').run(JSON.stringify(todo), id, userId);
        if (!remote && !skipTaskSync && 'done' in patch && todo.source?.provider==='google' && todo.source.externalId.includes(':tasks:') && features.connections(userId,'google').some(r=>r.taskSyncEnabled&&todo.source.externalId.startsWith((r.connectionId??'legacy')+':tasks:'))) features.queueTaskSync(userId,id,todo.done,previousDone);
        db.exec('COMMIT');return todo;
      } catch(error){db.exec('ROLLBACK');throw error;}
    },
    remove(userId, id) { return db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(id, userId).changes > 0; },
    importLegacy(email, items) {
      const user = findUser(email); if (!user) throw new Error('가져올 계정을 먼저 만들어주세요.');
      if (db.prepare('SELECT name FROM migrations WHERE name = ?').get('legacy-todos-v1')) return { imported: 0, alreadyImported: true };
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const item of items) { const todo = { ...item, id: randomUUID() }; db.prepare('INSERT INTO todos VALUES (?, ?, ?)').run(todo.id, user.id, JSON.stringify(todo)); }
        db.prepare('INSERT INTO migrations VALUES (?, ?)').run('legacy-todos-v1', user.id); db.exec('COMMIT'); return { imported: items.length, alreadyImported: false };
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
  };
  } catch (error) { db.close(); throw error; }
}
export function validDate(value) {
  if (value === null) return true;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function validTitle(value) { return typeof value === 'string' && !!value.trim() && value.trim().length <= 120; }

export function validNotes(value) { return typeof value === 'string' && value.length <= 4000; }
