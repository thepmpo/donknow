import {forgetCalendarSnapshots} from './calendar-snapshot-cache';
import {updateAppleSource} from './apple-source-edit';
import {originalContentConfirmed,importedCalendarPatch} from './calendar-source-edit';
import {calendarSnapshots,invalidateCalendarSnapshotReads,persistCalendarSnapshots,broadcastCalendarSnapshots,refreshCalendarSnapshots} from './calendar-snapshot-cache';
import { useReminders } from './useReminders';
import * as auth from './auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {HttpResponseError} from './http-response';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMPLETION_DELAY, COMPLETION_FADE_DURATION, serverUrl, visibleTodos, completedTodos } from './domain';
import type { Connection, Draft, Todo } from './domain';
import { CONNECTION_KEY, createRepository } from './repository';
import type { Patch, Repository } from './repository';
const message = (error: unknown) => error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해주세요.';
export function useTodos() {
  const [user, setUser] = useState<auth.User | null>(null);
  const [sessionStatus,setSessionStatus]=useState<'restoring'|'ready'|'unavailable'>('restoring');
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
  const calendarOwner=useRef<string|null>(null);calendarOwner.current=reminderOwner==='demo'?null:reminderOwner;
  const [notice, setNotice] = useState('');
  const [writeReports,setWriteReports]=useState<{id:string;text:string;canCheck?:boolean}[]>([]);
  const writeChecks=useRef(new Map<string,()=>Promise<void>>()),reminderBaselines=useRef(new Map<string,Todo>());
  useEffect(()=>{writeChecks.current.clear();reminderBaselines.current.clear();setWriteReports([]);},[reminderOwner]);
  function reportWrite(id:string,text:string,check?:()=>Promise<void>){if(check)writeChecks.current.set(id,check);else writeChecks.current.delete(id);setWriteReports(old=>[...old.filter(r=>r.id!==id),{id,text,canCheck:!!check}].slice(-20));}
  async function checkWrite(id:string){await writeChecks.current.get(id)?.();}
  function writeResolved(id:string){writeChecks.current.delete(id);setWriteReports(old=>old.filter(r=>r.id!==id));}
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [completionIds, setCompletionIds] = useState<string[]>([]);
  const writes = useRef(0),snapshotReady=useRef(false),refreshing=useRef(false);
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
  const sessionRead=useRef<number|null>(null);
  async function restoreSession(saved:Connection,current:()=>boolean){
    const version=generation.current;if(sessionRead.current===version)return;
    sessionRead.current=version;setSessionStatus('restoring');setLoading(true);setError('');
    let authenticated=saved.mode==='demo';
    try{
      if(saved.mode==='cloud'){
        const account=await auth.session(saved.baseUrl);if(!current())return;
        setUser(account);authenticated=true;
      }
      if(!current())return;
      const next=createRepository(saved);repo.current=next;
      // Mount the authenticated shell immediately; list loading is separate.
      setSessionStatus('ready');
      const data=await next.list();if(current()){snapshotReady.current=true;setTodos(data);}
    }catch(e){if(current()){
      if(e instanceof auth.AuthRequiredError){expireSession();}
      else {setSessionStatus(authenticated?'ready':'unavailable');setError(message(e));}
    }}finally{if(sessionRead.current===version)sessionRead.current=null;if(current())setLoading(false);}
  }
  async function retrySession(){
    if(!connection||sessionStatus!=='unavailable'||sessionRead.current===generation.current)return;
    const version=generation.current;await restoreSession(connection,()=>version===generation.current);
  }
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
          await restoreSession(saved,current);
        }else setSessionStatus('ready');
      } catch (e) { if (current()){setSessionStatus('ready');setError(message(e));} }
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
  useEffect(()=>{if(!todos.some(t=>t.sourceSync?.state==='queued'))return;const timer=setInterval(()=>void refresh(),2500);return()=>clearInterval(timer);},[todos.some(t=>t.sourceSync?.state==='queued')]);
  async function connect(next: Connection) {
    if (busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; refreshing.current=false;generation.current++; setConnecting(true); setError('');
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
      const nextOwner=checked.mode==='cloud'&&account?checked.baseUrl+':'+account.id:null;if(calendarOwner.current&&calendarOwner.current!==nextOwner)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=nextOwner;
      snapshotReady.current=checked.mode==='demo'||!!account;refreshing.current=false;generation.current++; repo.current = checked.mode === 'cloud' && !account ? null : repository; clearTimers(); setPending({}); setTodos(data); setUser(account); setConnection(checked); setSessionStatus('ready');setLoading(false); return true;
    } catch (e) { setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
  }
  async function refresh() {
    if (!repo.current || connectingRef.current || busy.current.size || refreshing.current) return;
    refreshing.current=true;const version = generation.current, readRevision = writes.current; setLoading(true);
    try { const data = await repo.current.list(); if (version === generation.current && readRevision === writes.current && !busy.current.size) { snapshotReady.current=true;for(const todo of data){const previous=todosRef.current.find(t=>t.id===todo.id);if(previous?.sourceSync?.state==='queued'&&todo.sourceSync?.revision===previous.sourceSync.revision&&todo.sourceSync.state!=='queued')reflectOriginal(todo,previous.sourceSync.patch??{});}const pending=todosRef.current.filter(t=>t.saveState==='checking'&&writeChecks.current.has(t.id));setTodos([...data.filter(t=>!pending.some(p=>p.id===t.id)),...pending]);setError(''); } }
    catch (e) { if (version === generation.current) { if (e instanceof auth.AuthRequiredError) {expireSession();setError(message(e));}else if(readRevision===writes.current)setError(message(e)); } }
    finally { if (version === generation.current) {refreshing.current=false;setLoading(false);} }
  }
  async function mutate<T>(key: string, operation: (repository: Repository) => Promise<T>): Promise<T | null> {
    if (!repo.current || busy.current.has(key) || connectingRef.current || loading&&!snapshotReady.current) return null;
    const version = generation.current; writes.current++; busy.current.add(key); setBusyIds([...busy.current]);
    try { const result = await operation(repo.current); if (version !== generation.current) return null; setError(''); return result; }
    catch (e) { if (version === generation.current) { if (e instanceof auth.AuthRequiredError) expireSession(); setError(message(e)); } return null; }
    finally { if (version === generation.current) { busy.current.delete(key); setBusyIds([...busy.current]); } }
  }
  async function add(draft: Draft): Promise<Todo | null> {
    const repository=repo.current,version=generation.current;
    if(!repository||busy.current.has('create')||connectingRef.current||loading&&!snapshotReady.current)return null;
    const key='todo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2),id='pending:'+key;
    const optimistic:Todo={...draft,id,done:false,createdAt:new Date().toISOString(),saveState:'saving'};
    setTodos(old=>[...old,optimistic]);busy.current.add(id);
    let failure:unknown;
    let saved=await mutate('create',async()=>{try{return await repository.create(draft,key);}catch(e){failure=e;throw e;}});
    if(version!==generation.current)return null;
    const commit=(todo:Todo)=>{if(version!==generation.current)return;setTodos(old=>[...old.filter(t=>t.id!==id&&t.id!==todo.id),todo]);writeResolved(id);busy.current.delete(id);setBusyIds([...busy.current]);setError('');};
    let recovered:Todo|null=null;const check=async()=>{if(version!==generation.current||!repository.receipt)return;try{const found=await repository.receipt(key);if(found){recovered=found;commit(found);}}catch{}};
    if(saved){commit(saved);return saved;}
    if(failure instanceof HttpResponseError&&failure.status>=400&&failure.status<500){setTodos(old=>old.filter(t=>t.id!==id));busy.current.delete(id);setBusyIds([...busy.current]);reportWrite(id,`‘${draft.title}’을 저장하지 못해 목록에서 되돌렸어요. ${message(failure)} 작성한 내용을 확인하고 다시 추가해주세요.`);}
    else {busy.current.delete(id);setBusyIds([...busy.current]);setTodos(old=>old.map(t=>t.id===id?{...t,saveState:'checking'}:t));reportWrite(id,`‘${draft.title}’의 저장 결과를 확인하고 있어요. 같은 항목을 다시 추가하지 말고 저장 결과를 확인해주세요.`,check);await check();saved=recovered;}
    return saved;
  }
  /** The editor closes after accepting the local change; the store, rather than
   * the unmounted form, owns reconciliation and failure messages. */
  async function prepareSave(draft:Draft){const repository=repo.current,version=generation.current;if(!repository)throw Error('연결을 먼저 확인해주세요.');await repository.prepare?.(draft);if(version!==generation.current)throw Error('계정이나 연결이 바뀌었어요. 다시 확인해주세요.');}
  function beginSave(draft:Draft,id?:string){
    if(!repo.current||connectingRef.current||loading&&!snapshotReady.current||busy.current.has(id??'create')||id&&todosRef.current.find(t=>t.id===id)?.saveState==='checking')return false;
    if(id&&!todosRef.current.some(t=>t.id===id))return false;
    if(id)void update(id,{title:draft.title,dueDate:draft.dueDate,reminderAt:draft.reminderAt,notes:draft.notes,...(draft.dueTime!==undefined?{dueTime:draft.dueTime}:{})});
    else void add(draft);
    return true;
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
    if (!repository || !before || before.saveState==='checking'||connectingRef.current || (busy.current.has(id) && !entry)) return false;
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
          let saved = await repository.update(id, { done: target });
          if (version !== generation.current || completions.current.get(id) !== job) return false;
          job.confirmed = saved; job.confirmedUntil = until;
          if (revision !== job.revision) continue;
          if(saved.source?.provider==='apple-reminders'&&saved.sourceSync?.state==='device-required')saved=await updateAppleSource(saved,featureRequest,()=>version===generation.current);
          if(version!==generation.current||completions.current.get(id)!==job)return false;job.confirmed=saved;
          if(revision!==job.revision)continue;
          if(saved.sourceSync&&saved.sourceSync.state!=='succeeded'&&saved.sourceSync.state!=='queued')setNotice('덕의 완료 상태는 저장했지만 원본 반영은 확인이 필요해요. 항목에서 원본 저장을 다시 시도할 수 있어요.');
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
    const version=generation.current,before=todosRef.current.find(t=>t.id===id),fields={...before?.sourceSync?.patch,...Object.fromEntries(Object.entries(patch).filter(([k,v])=>JSON.stringify(v??null)!==JSON.stringify(before?.[k as keyof Todo]??null)))};
    if(!before||before.saveState==='checking'||!repo.current||busy.current.has(id)||connectingRef.current||loading&&!snapshotReady.current)return false;
    const repository=repo.current;
    reminderBaselines.current.set(id,before);setTodos(old=>old.map(t=>t.id===id?{...t,...patch,saveState:'saving'}:t));
    let failure:unknown;
    const saved=await mutate(id,async repository=>{
      try{const local=await repository.update(id,patch);
      return local.source?.provider==='apple-reminders'&&local.sourceSync?.state==='device-required'?updateAppleSource(local,featureRequest,()=>generation.current===version):local;}catch(e){failure=e;throw e;}
    });
    if(version!==generation.current)return false;
    if(!saved){
      if(failure instanceof HttpResponseError&&failure.status>=400&&failure.status<500){reminderBaselines.current.delete(id);setTodos(old=>old.map(t=>t.id===id?before:t));reportWrite(id,`‘${before.title}’ 변경을 저장하지 못해 이전 내용으로 되돌렸어요. ${message(failure)} 원본과 연결을 확인하고 다시 수정해주세요.`);}
      else {setTodos(old=>old.map(t=>t.id===id?{...t,saveState:'checking'}:t));const check=async()=>{if(version!==generation.current||!repository.get)return;try{const found=await repository.get(id);if(version!==generation.current)return;if(Object.entries(patch).every(([key,value])=>JSON.stringify(found[key as keyof Todo]??null)===JSON.stringify(value??null))){reminderBaselines.current.delete(id);setTodos(old=>old.map(t=>t.id===id?found:t));busy.current.delete(id);setBusyIds([...busy.current]);writeResolved(id);setError('');}}catch{}};reportWrite(id,`‘${before.title}’의 저장 결과가 아직 확인되지 않았어요. 중복 저장을 막고 있으니 저장 결과 확인을 눌러주세요.`,check);await check();}
      return false;
    }
    writeResolved(id);reminderBaselines.current.delete(id);
    reflectOriginal(saved,fields);
    if(saved.sourceSync&&saved.sourceSync.state!=='succeeded'&&saved.sourceSync.state!=='queued')setNotice('덕에 저장했지만 원본 반영은 확인이 필요해요. 항목을 열어 다시 시도하거나 원본 앱에서 확인해주세요.');
    setTodos(current=>current.map(todo=>todo.id===id?saved:todo));
    if(patch.done!==undefined)completionDeadline(id,null);
    return true;
  }
  async function retrySource(id:string){
    const version=generation.current,fields=todosRef.current.find(t=>t.id===id)?.sourceSync?.patch??{};
    const saved=await mutate(id,async()=>{
      const local=await featureRequest('/api/todos/'+id+'/source-retry','POST',{}) as Todo;
      return local.source?.provider==='apple-reminders'?updateAppleSource(local,featureRequest,()=>version===generation.current):local;
    });
    if(!saved||version!==generation.current)return false;
    reflectOriginal(saved,fields);
    setTodos(old=>old.map(t=>t.id===id?saved:t));
    return saved.sourceSync?.state==='succeeded'||saved.sourceSync?.state==='queued';
  }
  function reflectOriginal(saved:Todo,fields:Record<string,unknown>){
    const owner=calendarOwner.current;if(!owner||saved.source?.provider!=='google'||!saved.source.externalId.includes(':calendar')||!originalContentConfirmed(saved))return;
    invalidateCalendarSnapshotReads(owner);
    for(const entry of calendarSnapshots(owner).values())try{const zone=JSON.parse(entry.family)[1];entry.items=entry.items.map(event=>importedCalendarPatch(saved,event,zone,fields));}catch{}
    persistCalendarSnapshots(owner);broadcastCalendarSnapshots(owner);refreshCalendarSnapshots(owner);
  }
  async function reorder(ids:string[]):Promise<boolean>{
    if(!repo.current||busy.current.size||connectingRef.current)return false;
    const version=generation.current,previous=new Map(todosRef.current.map(t=>[t.id,t.order])),ranks=new Map(ids.map((id,i)=>[id,i]));
    setTodos(old=>old.map(t=>ranks.has(t.id)?{...t,order:ranks.get(t.id)}:t));
    const result=await mutate('order',repository=>repository.reorder(ids));
    if(version!==generation.current)return false;
    if(!result){setTodos(old=>old.map(t=>previous.has(t.id)?{...t,order:previous.get(t.id)}:t));return false;}
    const saved=new Map(result.map(t=>[t.id,t.order]));setTodos(old=>old.map(t=>saved.has(t.id)?{...t,order:saved.get(t.id)}:t));return true;
  }
  async function remove(id: string): Promise<boolean> {
    if(todosRef.current.find(t=>t.id===id)?.saveState)return false;
    const removed = await mutate(id, async repository => { await repository.remove(id); return true; });
    if (removed) { delete originsRef.current[id];delete pendingOrder.current[id];setCompletionOrigins({...originsRef.current});setTodos(current => current.filter(todo => todo.id !== id)); const timer = timers.current.get(id); if (timer) clearTimeout(timer); timers.current.delete(id); setPending(current => { const next = { ...current }; delete next[id]; return next; }); }
    return !!removed;
  }
  function expireSession() {
    writeChecks.current.clear();reminderBaselines.current.clear();setWriteReports([]);
    setSessionStatus('ready');
    if(calendarOwner.current)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=null;
    snapshotReady.current=false;refreshing.current=false;generation.current++; repo.current = null; completions.current.clear(); setCompletionIds([]); busy.current.clear(); setBusyIds([]); clearTimers(); setPending({}); setTodos([]); setUser(null); setLoading(false);
  }
  async function authenticate(email: string, password: string, register: boolean,agreements?:auth.SignupAgreements): Promise<boolean> {
    if (connection?.mode !== 'cloud' || connectingRef.current || busy.current.size) return false;
    connectingRef.current = true; refreshing.current=false;generation.current++; setConnecting(true); setError(''); setNotice('');
    try {
      const account = await auth.authenticate(connection.baseUrl, email, password, register,agreements);
      const nextOwner=connection.baseUrl+':'+account.id;if(calendarOwner.current&&calendarOwner.current!==nextOwner)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=nextOwner;
      const repository = createRepository(connection);
      snapshotReady.current=false;refreshing.current=false;generation.current++; repo.current = repository; clearTimers(); setPending({}); setTodos([]); setUser(account);setSessionStatus('ready');
      try{const data = await repository.list();snapshotReady.current=true;setTodos(data);}catch(e){if(e instanceof auth.AuthRequiredError)throw e;setError('로그인은 완료했지만 할 일을 불러오지 못했어요. 다시 시도를 눌러주세요.');}setLoading(false);return true;
    } catch (e) { if (e instanceof auth.AuthRequiredError) expireSession(); setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
  }
  async function logout(): Promise<boolean> {
    if (connection?.mode !== 'cloud' || busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; refreshing.current=false;generation.current++; setConnecting(true);
    try { await auth.logout(connection.baseUrl); const cleared=await reminders.clear(); expireSession();if(!cleared)setNotice('로그아웃했어요. 일부 알림은 아이폰 설정에서도 확인해주세요.'); setError(''); return true; }
    catch (e) { if (e instanceof auth.AuthRequiredError) { expireSession(); setError(''); return true; } setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
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
      if(method==='DELETE'&&/^\/api\/integrations\/google(?:\?|$)/.test(path))forgetCalendarSnapshots(connection.baseUrl+':'+user?.id);
      return result;
    } catch (e) {
      if (version !== generation.current) throw sessionChanged();
      if (e instanceof auth.AuthRequiredError) expireSession();
      throw e;
    }
  }, [connection, renderGeneration,user?.id]);
  const reminderTodos=useMemo(()=>todos.flatMap(todo=>todo.saveState?(reminderBaselines.current.has(todo.id)?[reminderBaselines.current.get(todo.id)!]:[]):[todo]),[todos]);
  const reminders = useReminders(reminderTodos, reminderOwner,connection?.mode==='cloud'&&user?featureRequest:undefined);
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
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
  }
  async function passwordResetComplete() { if (connection?.mode === 'cloud') { await auth.forgetSession(connection.baseUrl); expireSession(); setNotice('비밀번호를 바꿨어요. 다시 로그인해주세요.'); } }
  const isCurrentSession = () => renderGeneration === generation.current;
  return { prepareSave,reportWrite,writeResolved,beginSave,writeReports,checkWrite,sessionStatus,retrySession,reorder,retrySource,findTodo:(id:string)=>todosRef.current.find(todo=>todo.id===id), connection, user, reminders, notice, setNotice, isCurrentSession, featureRequest, refreshAccount, deleteAccount, passwordResetComplete, authenticate, logout, todos, visible: visibleTodos(todos, pending,Date.now(),completionOrigins), logged:completedTodos(todos,pending,Date.now(),completionOrigins).map(todo=>Object.hasOwn(pendingOrder.current,todo.id)?{...todo,completedAt:pendingOrder.current[todo.id]||null}:todo).sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??'')), pending, loading, connecting, busyIds, completionIds, error, setError, connect, refresh, add, update, remove };
}
export type TodoStore = ReturnType<typeof useTodos>;
