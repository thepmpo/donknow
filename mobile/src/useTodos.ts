import { useReminders } from './useReminders';
import * as auth from './auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMPLETION_DELAY, COMPLETION_FADE_DURATION, serverUrl, visibleTodos, completedTodos } from './domain';
import type { Connection, Draft, Todo } from './domain';
import { CONNECTION_KEY, createRepository } from './repository';
import type { Patch, Repository } from './repository';
const message = (error: unknown) => error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해주세요.';
export function useTodos() {
  const [user, setUser] = useState<auth.User | null>(null);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [todos, commitTodos] = useState<Todo[]>([]);
  const todosRef = useRef<Todo[]>([]);
  const setTodos = useCallback((value: Todo[] | ((current: Todo[]) => Todo[])) => {
    const next = typeof value === 'function' ? value(todosRef.current) : value;
    todosRef.current = next; commitTodos(next);
  }, []);
  const [pending, setPending] = useState<Record<string, number>>({});
  const pendingOrder=useRef<Record<string,string>>({});
  const [completionOrigins,setCompletionOrigins]=useState<Record<string,boolean>>({});const originsRef=useRef<Record<string,boolean>>({});
  const reminderOwner = connection?.mode === 'demo' ? 'demo' : user && connection?.mode === 'cloud' ? connection.baseUrl + ':' + user.id : null;
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [completionIds, setCompletionIds] = useState<string[]>([]);
  const writes = useRef(0);
  type CompletionWrite = { confirmed: Todo; confirmedUntil: number | null; originDone:boolean; done: boolean; until: number | null; revision: number; promise?: Promise<boolean> };
  const completions = useRef(new Map<string, CompletionWrite>());
  const repo = useRef<Repository | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const busy = useRef(new Set<string>());
  const generation = useRef(0);
  const renderGeneration = generation.current;
  const sessionChanged = () => new Error('계정이나 서버 연결이 바뀌었어요. 현재 화면에서 다시 확인해주세요.');
  const connectingRef = useRef(false);
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current.clear();originsRef.current={};pendingOrder.current={};setCompletionOrigins({}); }, []);
  useEffect(() => {
    let active = true; const initialGeneration = generation.current;
    const current = () => active && initialGeneration === generation.current;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CONNECTION_KEY);
        const defaultUrl = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && process.env.EXPO_PUBLIC_AUTO_SERVER === '1' ? window.location.origin : undefined);
        let saved: Connection | null = stored ? JSON.parse(stored) : defaultUrl ? { mode: 'cloud', baseUrl: defaultUrl } : null;
        if (saved?.mode === 'cloud') saved = { mode: 'cloud', baseUrl: serverUrl(saved.baseUrl, __DEV__) };
        else if (saved && saved.mode !== 'demo') throw new Error('연결 설정을 다시 선택해주세요.');
        if (!current()) return;
        if (saved) {
          setConnection(saved);
          if (saved.mode === 'cloud') {
            try { const account = await auth.session(saved.baseUrl); if (!current()) return; setUser(account); }
            catch (e) { if (e instanceof auth.AuthRequiredError) return; throw e; }
          }
          if (!current()) return;
          const next = createRepository(saved); repo.current = next;
          const data = await next.list(); if (current()) setTodos(data);
        }
      } catch (e) { if (current()) setError(message(e)); }
      finally { if (current()) setLoading(false); }
    })();
    return () => { active = false; generation.current++; completions.current.clear(); clearTimers(); };
  }, [clearTimers]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {setPending(current => Object.fromEntries(Object.entries(current).filter(([, expires]) => expires > Date.now())));void refresh();}
    });
    return () => subscription.remove();
  }, []);
  async function connect(next: Connection) {
    if (busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; generation.current++; setConnecting(true); setError('');
    try {
      const checked: Connection = next.mode === 'cloud' ? { mode: 'cloud', baseUrl: serverUrl(next.baseUrl, __DEV__) } : next;
      let account: auth.User | null = null;
      if (checked.mode === 'cloud') {
        await auth.request(checked.baseUrl, '/api/health');
        try { account = await auth.session(checked.baseUrl); } catch (e) { if (!(e instanceof auth.AuthRequiredError)) throw e; }
      }
      const repository = createRepository(checked);
      const data = checked.mode === 'cloud' && !account ? [] : await repository.list();
      await AsyncStorage.setItem(CONNECTION_KEY, JSON.stringify(checked));
      generation.current++; repo.current = checked.mode === 'cloud' && !account ? null : repository; clearTimers(); setPending({}); setTodos(data); setUser(account); setConnection(checked); setLoading(false); return true;
    } catch (e) { setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false); }
  }
  async function refresh() {
    if (!repo.current || connectingRef.current || busy.current.size) return;
    const version = generation.current, readRevision = writes.current; setLoading(true);
    try { const data = await repo.current.list(); if (version === generation.current && readRevision === writes.current && !busy.current.size) { setTodos(data); setError(''); } }
    catch (e) { if (version === generation.current) { if (e instanceof auth.AuthRequiredError) expireSession(); setError(message(e)); } }
    finally { if (version === generation.current) setLoading(false); }
  }
  async function mutate<T>(key: string, operation: (repository: Repository) => Promise<T>): Promise<T | null> {
    if (!repo.current || busy.current.has(key) || connectingRef.current || loading) return null;
    const version = generation.current; writes.current++; busy.current.add(key); setBusyIds([...busy.current]);
    try { const result = await operation(repo.current); if (version !== generation.current) return null; setError(''); return result; }
    catch (e) { if (version === generation.current) { if (e instanceof auth.AuthRequiredError) expireSession(); setError(message(e)); } return null; }
    finally { if (version === generation.current) { busy.current.delete(key); setBusyIds([...busy.current]); } }
  }
  async function add(draft: Draft): Promise<Todo | null> {
    const saved = await mutate('create', repository => repository.create(draft));
    if (saved) setTodos(current => [...current, saved]); return saved;
  }
  function completionDeadline(id: string, until: number | null,originDone=false) {
    const timer = timers.current.get(id); if (timer) clearTimeout(timer); timers.current.delete(id);
    if (until && until > Date.now()) {
      originsRef.current={...originsRef.current,[id]:originDone};setCompletionOrigins(originsRef.current);
      setPending(current => ({ ...current, [id]: until }));
      timers.current.set(id, setTimeout(() => {
        setPending(current => { const next = { ...current }; delete next[id]; return next; });delete originsRef.current[id];delete pendingOrder.current[id];setCompletionOrigins({...originsRef.current}); timers.current.delete(id);
      }, until - Date.now()));
    } else {delete originsRef.current[id];delete pendingOrder.current[id];setCompletionOrigins({...originsRef.current});setPending(current => { const next = { ...current }; delete next[id]; return next; });}
  }
  async function updateCompletion(id: string, done: boolean): Promise<boolean> {
    const repository = repo.current;
    const before = todosRef.current.find(todo => todo.id === id);
    let entry = completions.current.get(id);
    if (!repository || !before || connectingRef.current || (busy.current.has(id) && !entry)) return false;
    const version = generation.current;
    writes.current++;
    if (!entry) {
      entry = { confirmed: before, confirmedUntil: pending[id] ?? null,originDone:originsRef.current[id]??before.done, done, until: null, revision: 0 };
      completions.current.set(id, entry); busy.current.add(id);
      setBusyIds([...busy.current]); setCompletionIds([...completions.current.keys()]);
    }
    if(entry.originDone&&!pendingOrder.current[id])pendingOrder.current[id]=entry.confirmed.completedAt??'';
    entry.done = done; entry.until = done!==entry.originDone ? Date.now() + COMPLETION_DELAY + COMPLETION_FADE_DURATION : null; entry.revision++;
    const optimistic: Todo = { ...before, done, completedAt: done ? (before.done && before.completedAt ? before.completedAt : new Date().toISOString()) : null };
    setTodos(current => current.map(todo => todo.id === id ? optimistic : todo));
    completionDeadline(id, entry.until,entry.originDone); setError('');
    if (entry.promise) return entry.promise;
    const job = entry;
    job.promise = (async () => {
      try {
        while (version === generation.current && completions.current.get(id) === job) {
          const revision = job.revision, target = job.done, until = job.until;
          const saved = await repository.update(id, { done: target });
          if (version !== generation.current || completions.current.get(id) !== job) return false;
          job.confirmed = saved; job.confirmedUntil = until;
          if (revision !== job.revision) continue; // An undo is newer than this response.
          setTodos(current => current.map(todo => todo.id === id ? saved : todo));
          setError(''); return true;
        }
        return false;
      } catch (e) {
        if (version === generation.current && completions.current.get(id) === job) {
          if (e instanceof auth.AuthRequiredError) expireSession();
          else {
            setTodos(current => current.map(todo => todo.id === id ? job.confirmed : todo));
            completionDeadline(id, job.confirmedUntil,job.originDone);
          }
          setError(message(e));
        }
        return false;
      } finally {
        if (version === generation.current && completions.current.get(id) === job) {
          completions.current.delete(id); busy.current.delete(id);
          setCompletionIds([...completions.current.keys()]); setBusyIds([...busy.current]);
        }
      }
    })();
    return job.promise;
  }
  async function update(id: string, patch: Patch): Promise<boolean> {
    if (typeof patch.done === 'boolean' && Object.keys(patch).length === 1) return updateCompletion(id, patch.done);
    const saved = await mutate(id, repository => repository.update(id, patch));
    if (!saved) return false;
    setTodos(current => current.map(todo => todo.id === id ? saved : todo));
    if (patch.done !== undefined) completionDeadline(id,null);
    return true;
  }
  async function remove(id: string): Promise<boolean> {
    const removed = await mutate(id, async repository => { await repository.remove(id); return true; });
    if (removed) { delete originsRef.current[id];delete pendingOrder.current[id];setCompletionOrigins({...originsRef.current});setTodos(current => current.filter(todo => todo.id !== id)); const timer = timers.current.get(id); if (timer) clearTimeout(timer); timers.current.delete(id); setPending(current => { const next = { ...current }; delete next[id]; return next; }); }
    return !!removed;
  }
  function expireSession() {
    generation.current++; repo.current = null; completions.current.clear(); setCompletionIds([]); busy.current.clear(); setBusyIds([]); clearTimers(); setPending({}); setTodos([]); setUser(null); setLoading(false);
  }
  async function authenticate(email: string, password: string, register: boolean): Promise<boolean> {
    if (connection?.mode !== 'cloud' || connectingRef.current || busy.current.size) return false;
    connectingRef.current = true; generation.current++; setConnecting(true); setError(''); setNotice('');
    try {
      const account = await auth.authenticate(connection.baseUrl, email, password, register);
      const repository = createRepository(connection);
      generation.current++; repo.current = repository; clearTimers(); setPending({}); setTodos([]); setUser(account);
      try{const data = await repository.list();setTodos(data);}catch(e){if(e instanceof auth.AuthRequiredError)throw e;setError('로그인은 완료했지만 할 일을 불러오지 못했어요. 다시 시도를 눌러주세요.');}setLoading(false);return true;
    } catch (e) { if (e instanceof auth.AuthRequiredError) expireSession(); setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false); }
  }
  async function logout(): Promise<boolean> {
    if (connection?.mode !== 'cloud' || busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; generation.current++; setConnecting(true);
    try { await auth.logout(connection.baseUrl); const cleared=await reminders.clear(); expireSession();if(!cleared)setNotice('로그아웃했어요. 일부 알림은 아이폰 설정에서도 확인해주세요.'); setError(''); return true; }
    catch (e) { if (e instanceof auth.AuthRequiredError) { expireSession(); setError(''); return true; } setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false); }
  }
  const featureRequest = useCallback(async (path: string, method = 'GET', body?: unknown): Promise<unknown> => {
    if (connection?.mode !== 'cloud') throw new Error('클라우드 계정으로 로그인하면 사용할 수 있어요.');
    // A screen may finish work after logout or a server/account switch. Its old
    // callback must neither expose the response nor expire the replacement login.
    const version = renderGeneration;
    if (version !== generation.current) throw sessionChanged();
    try {
      const result = await auth.request(connection.baseUrl, path, method, body);
      if (version !== generation.current) throw sessionChanged();
      return result;
    } catch (e) {
      if (version !== generation.current) throw sessionChanged();
      if (e instanceof auth.AuthRequiredError) expireSession();
      throw e;
    }
  }, [connection, renderGeneration]);
  const reminders = useReminders(todos, reminderOwner,connection?.mode==='cloud'&&user?featureRequest:undefined);
  async function refreshAccount() {
    if (connection?.mode !== 'cloud') return;
    const version = renderGeneration;
    if (version !== generation.current) throw sessionChanged();
    try {
      const account = await auth.session(connection.baseUrl);
      if (version !== generation.current) throw sessionChanged();
      if (user && account.id !== user.id) { expireSession(); throw new auth.AuthRequiredError(); }
      setUser(account);
    } catch (e) {
      if (version !== generation.current) throw sessionChanged();
      if (e instanceof auth.AuthRequiredError) expireSession();
      throw e;
    }
  }
  async function deleteAccount(password: string) {
    if (connection?.mode !== 'cloud' || busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; setConnecting(true);
    try { const result = await featureRequest('/api/account', 'DELETE', { password, confirmation: 'DELETE' }) as { remoteRevocationComplete: boolean }; let localCleared=true;try{await auth.forgetSession(connection.baseUrl);await AsyncStorage.multiRemove(['duckduck.mobile.name.'+(user?.id??''),'duckduck.reminders.'+reminderOwner,'duckduck.ai-consent.v1.'+connection.baseUrl+':'+(user?.id??'')]);}catch{localCleared=false;} const cleared=await reminders.clear(); expireSession(); setNotice(!cleared||!localCleared?'계정을 삭제했어요. 아이폰의 알림 설정도 확인해주세요.':result.remoteRevocationComplete ? '계정을 삭제했어요.' : '계정을 삭제했어요. 일부 외부 서비스의 접근 권한은 해당 서비스 설정에서도 확인해주세요.'); return true; }
    catch (e) { setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false); }
  }
  async function passwordResetComplete() { if (connection?.mode === 'cloud') { await auth.forgetSession(connection.baseUrl); expireSession(); setNotice('비밀번호를 바꿨어요. 다시 로그인해주세요.'); } }
  const isCurrentSession = () => renderGeneration === generation.current;
  return { connection, user, reminders, notice, setNotice, isCurrentSession, featureRequest, refreshAccount, deleteAccount, passwordResetComplete, authenticate, logout, todos, visible: visibleTodos(todos, pending,Date.now(),completionOrigins), logged:completedTodos(todos,pending,Date.now(),completionOrigins).map(todo=>Object.hasOwn(pendingOrder.current,todo.id)?{...todo,completedAt:pendingOrder.current[todo.id]||null}:todo).sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??'')), pending, loading, connecting, busyIds, completionIds, error, setError, connect, refresh, add, update, remove };
}
export type TodoStore = ReturnType<typeof useTodos>;
