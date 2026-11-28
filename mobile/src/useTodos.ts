import {readAppleTodoLists,refreshTodoSources} from './todo-source-refresh';
import {appleReminderPreviewId,isAppleReminderPreview,showAppleReminders} from './apple-reminder-view';
import type {ReminderListGroup} from './todo-organization';
import type {ListedReminder} from './apple-reminder-read';
import {appleCalendarDevice} from './apple-calendar-device';
import {clearAppleTodoReceipts,useAppleTodoDelivery} from './useAppleTodoDelivery';
import {matchesTodoDeletion,missingAppleReminder,sendTodoDeletion} from './todo-device-deletion';
import type {QueuedTodoDelete,QueuedTodoEdit} from './todo-device-queue';
import {deviceTodos,isDeviceTodo,queuedTodo,todoEditSending} from './todo-device-queue';
import {appleCalendarReceipts,deviceCalendarEdits,deviceCalendarQueue,todoCreateSending} from './calendar-device-queue';
import {forgetCalendarSnapshots} from './calendar-snapshot-cache';
import {moveAppleReminder} from './todo-membership';
import type {AppleMoveReceipt,MembershipPage} from './todo-membership';
import type {Category} from './domain';
import {updateAppleSource} from './apple-source-edit';
import {interruptedTodoEdit,permanentTodoEditError,pendingAppleTodoEdit,queuedTodoEditBase,waitingForAppleTodoDelivery} from './apple-todo-edit-queue';
import {originalContentConfirmed,importedCalendarPatch} from './calendar-source-edit';
import {calendarSnapshots,invalidateCalendarSnapshotReads,persistCalendarSnapshots,broadcastCalendarSnapshots,refreshCalendarSnapshots} from './calendar-snapshot-cache';
import { useReminders } from './useReminders';
import * as auth from './auth';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import {HttpResponseError,retryableDocenCalendarCreate} from './http-response';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COMPLETION_DELAY, COMPLETION_FADE_DURATION, serverUrl, visibleTodos, completedTodos, validateDraft } from './domain';
import type { Connection, Draft, Todo, TodoDestination } from './domain';
import { CONNECTION_KEY, createRepository } from './repository';
import type { Patch, Repository } from './repository';
const message = (error: unknown) => error instanceof Error ? error.message : '저장하지 못했어요. 다시 시도해주세요.';
export function useTodos(device=Platform.OS==='ios'?deviceTodos:undefined) {
  const [user, setUser] = useState<auth.User | null>(null);
  const [sessionStatus,setSessionStatus]=useState<'restoring'|'ready'|'unavailable'>('restoring');
  const [connection, setConnection] = useState<Connection | null>(null);
  const [todos, commitTodos] = useState<Todo[]>([]);
  const todosRef = useRef<Todo[]>([]);
  const calendarOwner=useRef<string|null>(null);
  const localAppleRemovals=useRef<{generation:number;ids:Set<string>}>({generation:-1,ids:new Set()});
  const resolvedAppleIds=useRef<{generation:number;ids:Map<string,string>}>({generation:-1,ids:new Map()});
  const setTodos = useCallback((value: Todo[] | ((current: Todo[]) => Todo[])) => {
    const base = typeof value === 'function' ? value(todosRef.current) : value;
    const owner=calendarOwner.current;
    const jobs=device&&owner?device.queue.snapshot(owner):undefined;
    const edits=device&&owner?device.edits.snapshot(owner):undefined;
    const deletes=device&&owner?device.deletes.snapshot(owner)??[]:[];
    const byId=new Map(base.filter(todo=>!deletes.some(job=>matchesTodoDeletion(todo,job))).map(todo=>[todo.id,todo]));
    for(const edit of edits??[]){
      if(deletes.some(job=>matchesTodoDeletion(edit.before,job)))continue;
      const previous=byId.get(edit.before.id)??edit.before;
      byId.set(previous.id,{...previous,...edit.patch,
        ...(edit.patch.done===undefined?{}:{completedAt:edit.patch.done?previous.completedAt??edit.editedAt:null}),
        ...(edit.blocked?{saveState:'checking' as const}: {})});
    }
    const next=device?[...Array.from(byId.values()).filter(todo=>!isDeviceTodo(todo.id)),...(jobs??[]).map(queuedTodo)]:base;
    if(owner){
      if(localAppleRemovals.current.generation!==generation.current)localAppleRemovals.current={generation:generation.current,ids:new Set()};
      if(resolvedAppleIds.current.generation!==generation.current)resolvedAppleIds.current={generation:generation.current,ids:new Map()};
      for(const item of next)if(item.source?.provider==='apple-reminders')resolvedAppleIds.current.ids.set(appleReminderPreviewId(item.source.externalId),item.id);
      for(const previous of todosRef.current){
        const current=byId.get(previous.id);
        if(previous.source?.provider==='apple-reminders'&&current?.source&&
          (current.source.provider!==previous.source.provider||current.source.externalId!==previous.source.externalId)){
          localAppleRemovals.current.ids.add(previous.source.externalId);
        }
      }
    }
    todosRef.current=next;commitTodos(next);
  }, [device]);
  const [pending, setPending] = useState<Record<string, number>>({});
  const pendingOrder=useRef<Record<string,string>>({});
  const [completionOrigins,setCompletionOrigins]=useState<Record<string,boolean>>({});const originsRef=useRef<Record<string,boolean>>({});
  const reminderOwner = connection?.mode === 'demo' ? 'demo' : user && connection?.mode === 'cloud' ? connection.baseUrl + ':' + user.id : null;
  calendarOwner.current=reminderOwner==='demo'?null:reminderOwner;
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
        let account:auth.User;
        try{account=await auth.session(saved.baseUrl);}
        catch(error){
          const cached=auth.canRestoreOffline(error)&&device?await device.readOfflineUser(saved.baseUrl):null;
          if(!cached)throw error;
          account=cached;
        }
        if(!current())return;
        calendarOwner.current=saved.baseUrl+':'+account.id;setUser(account);authenticated=true;
        if(!account.emailVerified){repo.current=null;setTodos([]);setSessionStatus('ready');return;}
      }
      if(!current())return;
      const next=createRepository(saved);repo.current=next;
      if(device&&calendarOwner.current){
        const owner=calendarOwner.current;
        const [cached]=await Promise.all([device.cache.read(owner).catch(()=>[]),device.queue.read(owner).catch(()=>[]),device.edits.read(owner).catch(()=>[]),device.deletes.read(owner).catch(()=>[])]);
        if(!current())return;
        setTodos(cached);snapshotReady.current=true;
      }
      // Mount the authenticated shell immediately; list loading is separate.
      setSessionStatus('ready');
      const readRevision=writes.current;
      const data=await next.list();if(current()&&readRevision===writes.current){snapshotReady.current=true;setTodos(data);persistDeviceTodos(data);}
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
  const pendingServerWrites=todos.some(t=>t.sourceSync?.state==='queued'||!t.saveState&&(t.delivery?.state==='queued'||t.delivery?.state==='sending'));
  useEffect(()=>{
    if(!pendingServerWrites)return;
    const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},2500);
    return()=>clearInterval(timer);
  },[pendingServerWrites,renderGeneration]);
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
      const data = checked.mode === 'cloud' && !account?.emailVerified ? [] : await repository.list();
      await AsyncStorage.setItem(CONNECTION_KEY, JSON.stringify(checked));
      const nextOwner=checked.mode==='cloud'&&account?checked.baseUrl+':'+account.id:null;if(calendarOwner.current&&calendarOwner.current!==nextOwner)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=nextOwner;
      snapshotReady.current=checked.mode==='demo'||!!account;refreshing.current=false;generation.current++; repo.current = checked.mode === 'cloud' && !account?.emailVerified ? null : repository; clearTimers(); setPending({}); setTodos(data); setUser(account); setConnection(checked); setSessionStatus('ready');setLoading(false); return true;
    } catch (e) { setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
  }
  async function refresh() {
    if (!repo.current || connectingRef.current || busy.current.size || refreshing.current) return;
    refreshing.current=true;const version = generation.current, readRevision = writes.current; setLoading(true);
    try { const data = await repo.current.list(); if (version === generation.current && readRevision === writes.current && !busy.current.size) { snapshotReady.current=true;for(const todo of data){const previous=todosRef.current.find(t=>t.id===todo.id);if(previous?.sourceSync?.state==='queued'&&todo.sourceSync?.revision===previous.sourceSync.revision&&todo.sourceSync.state!=='queued')reflectOriginal(todo,previous.sourceSync.patch??{});}const pending=todosRef.current.filter(t=>t.saveState==='checking'&&writeChecks.current.has(t.id));setTodos([...data.filter(t=>!pending.some(p=>p.id===t.id)),...pending]);persistDeviceTodos(data);setError(''); } }
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
  function persistDeviceTodos(items:Todo[]){
    const owner=calendarOwner.current;
    if(device&&owner)void device.cache.write(owner,items).catch(()=>{});
  }
  const deviceCreateOwner=device&&user?.emailVerified&&connection?.mode==='cloud'?reminderOwner:null;
  const deviceSaving=useRef(false);
  useEffect(()=>{
    if(!deviceCreateOwner||!device)return;
    const owner=deviceCreateOwner,version=generation.current,{queue,cache}=device;
    const current=()=>generation.current===version&&calendarOwner.current===owner;
    let disposed=false;
    const retryAt=new Map<string,{attempt:number;at:number}>();
    function publish(){
      if(!current())return;
      setTodos(old=>old);
      for(const job of queue.snapshot(owner)??[]){
        const id=queuedTodo(job).id;
        if(job.blocked&&!writeChecks.current.has(id))reportWrite(id,'기기에 저장한 Ticket의 동기화를 확인해주세요.',()=>queue.block(owner,job.id,false));
      }
    }
    const unsubscribe=queue.watch(owner,publish);
    void queue.read(owner).then(publish).catch(()=>{});
    async function flush(){
      if(disposed||!current()||todoCreateSending.has(owner)||AppState.currentState!=='active'||!repo.current)return;
      const repository=repo.current;
      const job=queue.snapshot(owner)?.find(item=>!item.blocked&&(retryAt.get(item.id)?.at??0)<=Date.now());
      if(!job)return;
      todoCreateSending.add(owner);
      try{
        const saved=await repository.create(job.draft,job.id);
        if(!current())return;
        writes.current++;
        const next=[...todosRef.current.filter(todo=>todo.id!==saved.id),saved];
        await cache.write(owner,next);
        if(!current())return;
        await queue.remove(owner,job.id);
        if(!current())return;
        setTodos(old=>[...old.filter(todo=>todo.id!==saved.id),saved]);
        writeResolved(queuedTodo(job).id);
        retryAt.delete(job.id);
      }catch(error){
        if(!current())return;
        if(error instanceof auth.AuthRequiredError){expireSession();return;}
        if(error instanceof HttpResponseError&&!retryableDocenCalendarCreate(error)){
          try{await queue.block(owner,job.id,true);}catch{}
        }else{
          const attempt=(retryAt.get(job.id)?.attempt??0)+1;
          retryAt.set(job.id,{attempt,at:Date.now()+Math.min(60000,1000*2**Math.min(attempt-1,6))});
        }
      }finally{todoCreateSending.delete(owner);}
    }
    const timer=setInterval(()=>void flush(),1000);
    const app=AppState.addEventListener('change',state=>{if(state==='active')void flush();});
    return ()=>{disposed=true;unsubscribe();app.remove();clearInterval(timer);};
  },[deviceCreateOwner,renderGeneration,setTodos,device]);
  const localEditWrites=useRef(new Set<string>());
  useEffect(()=>{
    if(!deviceCreateOwner||!device)return;
    const localDevice=device,owner=deviceCreateOwner,version=generation.current,{edits,cache,deletes}=localDevice;
    const current=()=>version===generation.current&&calendarOwner.current===owner;
    let disposed=false;
    const retryJobs=new Map<string,number>();
    const same=(todo:Todo,patch:Patch)=>Object.entries(patch).every(([key,value])=>JSON.stringify(todo[key as keyof Todo]??null)===JSON.stringify(value??null));
    const replace=(todo:Todo)=>setTodos(rows=>[...rows.map(row=>row.id===todo.id?todo:row),...(!rows.some(row=>row.id===todo.id)?[todo]:[])]);
    async function flush(){
      if(disposed||!current()||todoEditSending.has(owner)||AppState.currentState!=='active'||!repo.current?.get)return;
      const removal=(deletes.snapshot(owner)??[]).find(job=>(retryJobs.get('delete:'+job.id)??0)<=Date.now());
      if(removal){
        todoEditSending.add(owner);
        try{
          await sendTodoDeletion(owner,removal,localDevice,featureRequest,current);
          if(current()){writes.current++;setTodos(rows=>rows.filter(todo=>!matchesTodoDeletion(todo,removal)));writeResolved(removal.id);}
        }catch(error){
          retryJobs.set('delete:'+removal.id,Date.now()+5000);
          if(current()&&error instanceof HttpResponseError){
            if(error.code==='todo-delete-source-changed'){
              await deletes.remove(owner,removal.id).catch(()=>{});
              setNotice(error.message);
              void refresh();
            }else if(error.status===403)setNotice(error.message);
          }
        }finally{todoEditSending.delete(owner);}
        return;
      }
      const jobs=(edits.snapshot(owner)??[]).filter(job=>!(deletes.snapshot(owner)??[]).some(removal=>matchesTodoDeletion(job.before,removal)));
      const job=jobs.find((candidate,index)=>(!candidate.blocked||interruptedTodoEdit(candidate.failure))&&(retryJobs.get(candidate.id)??0)<=Date.now()&&!jobs.slice(0,index).some(earlier=>earlier.before.id===candidate.before.id));
      if(!job){
        const pending=todosRef.current.find(todo=>pendingAppleTodoEdit(todo)&&!jobs.some(item=>item.before.id===todo.id)&&(retryJobs.get(todo.id)??0)<=Date.now());
        if(!pending)return;
        todoEditSending.add(owner);
        retryJobs.set(pending.id,Date.now()+10000);
        try{
          const fresh=await repo.current.get!(pending.id);
          if(!current())return;
          const saved=pendingAppleTodoEdit(fresh)?await updateAppleSource(fresh,featureRequest,current,false):fresh;
          if(!current()||pendingAppleTodoEdit(saved)||!todosRef.current.some(todo=>todo.id===saved.id))return;
          writes.current++;
          replace(saved);persistDeviceTodos(todosRef.current);
          retryJobs.delete(pending.id);
        }catch{}finally{todoEditSending.delete(owner);}
        return;
      }
      const repository=repo.current,id=job.before.id;
      let reading=true;
      todoEditSending.add(owner);
      try{
        let saved=await repository.get!(id);
        reading=false;
        if(!current())return;
        if(waitingForAppleTodoDelivery(saved)){retryJobs.set(job.id,Date.now()+3000);return;}
        if(!same(saved,job.patch)){
          saved=await repository.update(id,job.patch,queuedTodoEditBase(job,saved));
        }
        if(!current())return;
        if(pendingAppleTodoEdit(saved)){
          saved=await updateAppleSource(saved,featureRequest,current,false);
        }
        if(!current())return;
        if(pendingAppleTodoEdit(saved)){
          retryJobs.set(job.id,Date.now()+10000);return;
        }
        writes.current++;
        await cache.write(owner,[...todosRef.current.filter(todo=>todo.id!==id),saved]);
        if(!current())return;
        await edits.remove(owner,job.id);
        if(!current())return;
        retryJobs.delete(job.id);replace(saved);reflectOriginal(saved,job.patch);writeResolved(job.id);
      }catch(error){
        if(!current())return;
        if(error instanceof auth.AuthRequiredError){expireSession();return;}
        if(reading&&error instanceof HttpResponseError&&error.status===404){
          writes.current++;
          await edits.remove(owner,job.id);
          if(current()){
            setTodos(rows=>rows.filter(todo=>todo.id!==id));
            persistDeviceTodos(todosRef.current);
            writeResolved(job.id);
          }
        }else if(permanentTodoEditError(error)){
          await edits.change(owner,job.id,item=>({...item,blocked:true,failure:message(error)})).catch(()=>{});
          reportWrite(job.id,message(error),async()=>{await edits.block(owner,job.id,false);});
        }else retryJobs.set(job.id,Date.now()+3000);
      }finally{todoEditSending.delete(owner);}
    }
    function changed(){
      if(!current())return;
      setTodos(rows=>rows);
      for(const job of edits.snapshot(owner)??[]){
        if(job.blocked&&!interruptedTodoEdit(job.failure)&&!writeChecks.current.has(job.id))reportWrite(job.id,job.failure??'기기에 보관한 변경을 확인해주세요.',()=>edits.block(owner,job.id,false));
      }
      void flush();
    }
    const unsubscribe=edits.watch(owner,changed),unwatchDeletes=deletes.watch(owner,changed);
    void Promise.all([edits.read(owner),deletes.read(owner)]).then(changed).catch(()=>{});
    const timer=setInterval(()=>void flush(),1000);
    const listener=AppState.addEventListener('change',state=>{if(state==='active'){retryJobs.clear();void flush();}});
    return ()=>{disposed=true;unsubscribe();unwatchDeletes();clearInterval(timer);listener.remove();};
  },[deviceCreateOwner,renderGeneration,device,setTodos]);
  async function saveTodoEditOnDevice(owner:string,id:string,input:Patch,fromEditor=false){
    if(!device||calendarOwner.current!==owner||localEditWrites.current.has(id)||busy.current.has(id))return false;
    const before=todosRef.current.find(todo=>todo.id===id);
    if(!before||before.saveState&&!device.edits.snapshot(owner)?.some(job=>job.before.id===id&&interruptedTodoEdit(job.failure))||before.delivery?.state==='sending'&&before.delivery.provider!=='apple-reminders'||isDeviceTodo(id))return false;
    const patch={...input,...(input.dueDate===null?{dueTime:null}:{})};
    let validated:Draft;
    try{validated=validateDraft({...before,...patch});}catch(e){setError(message(e));return false;}
    if(patch.title!==undefined)patch.title=validated.title;
    const changed=Object.fromEntries(Object.entries(patch).filter(([key,value])=>JSON.stringify(before[key as keyof Todo]??null)!==JSON.stringify(value??null))) as Patch;
    if(!Object.keys(changed).length)return true;
    const job:QueuedTodoEdit={id:'edit-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2),before,patch:changed,editedAt:new Date().toISOString()};
    if(changed.done!==undefined&&originsRef.current[id]===undefined&&before.done)pendingOrder.current[id]=before.completedAt??'';
    localEditWrites.current.add(id);
    try{
      await device.edits.add(owner,job);
      if(calendarOwner.current!==owner)return false;
      if(changed.done!==undefined){
        const origin=originsRef.current[id]??before.done;
        completionDeadline(id,changed.done!==origin?Date.now()+COMPLETION_DELAY+COMPLETION_FADE_DURATION:null,origin);
      }
      setTodos(rows=>rows);
      return true;
    }catch(e){
      if(calendarOwner.current===owner){
        if(fromEditor)throw Error('이 아이폰에 변경 내용을 저장하지 못했어요. 잠시 뒤 다시 시도해주세요.');
        setError(message(e));
      }
      return false;
    }
    finally{localEditWrites.current.delete(id);}
  }
  async function createTodoOnDevice(owner:string,draft:Draft){
    if(!device||deviceSaving.current||connectingRef.current||calendarOwner.current!==owner||!repo.current)return null;
    const version=generation.current,id='todo-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2);
    const job={id,draft:validateDraft(draft),createdAt:new Date().toISOString()};
    deviceSaving.current=true;
    try{
      await device.queue.add(owner,job);
      if(version!==generation.current||calendarOwner.current!==owner)return null;
      setTodos(old=>old);
      return queuedTodo(job);
    }finally{deviceSaving.current=false;}
  }
  async function add(draft: Draft): Promise<Todo | null> {
    if(deviceCreateOwner){try{return await createTodoOnDevice(deviceCreateOwner,draft);}catch(e){setError(message(e));return null;}}
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
  async function prepareSave(draft:Draft){if(deviceCreateOwner){validateDraft(draft);return;}const repository=repo.current,version=generation.current;if(!repository)throw Error('연결을 먼저 확인해주세요.');await repository.prepare?.(draft);if(version!==generation.current)throw Error('계정이나 연결이 바뀌었어요. 다시 확인해주세요.');}
  async function beginSave(draft:Draft,id?:string){
    if(id)id=(await resolveTodo(id)).id;
    if(!id&&deviceCreateOwner)return !!await createTodoOnDevice(deviceCreateOwner,draft);
    if(id&&deviceCreateOwner){
      const blocked=device?.edits.snapshot(deviceCreateOwner)?.find(job=>job.before.id===id&&job.blocked);
      if(blocked)throw Error(blocked.failure??'기기에 저장한 이전 변경을 확인해주세요.');
      return saveTodoEditOnDevice(deviceCreateOwner,id,{title:draft.title,dueDate:draft.dueDate,reminderAt:draft.reminderAt,notes:draft.notes,...(draft.dueTime!==undefined?{dueTime:draft.dueTime}:{})},true);
    }
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
    if(isAppleReminderPreview(id)){
      try{id=(await resolveTodo(id)).id;}catch(e){setError(message(e));return false;}
    }
    if(deviceCreateOwner&&!('category' in patch))return saveTodoEditOnDevice(deviceCreateOwner,id,patch);
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
    const persistedIds=ids.filter(id=>!isAppleReminderPreview(id));
    const version=generation.current,previous=new Map(todosRef.current.map(t=>[t.id,t.order])),ranks=new Map(persistedIds.map((id,i)=>[id,i]));
    setTodos(old=>old.map(t=>ranks.has(t.id)?{...t,order:ranks.get(t.id)}:t));
    const result=await mutate('order',repository=>repository.reorder(persistedIds));
    if(version!==generation.current)return false;
    if(!result){setTodos(old=>old.map(t=>previous.has(t.id)?{...t,order:previous.get(t.id)}:t));return false;}
    const saved=new Map(result.map(t=>[t.id,t.order]));setTodos(old=>old.map(t=>saved.has(t.id)?{...t,order:saved.get(t.id)}:t));return true;
  }
  const appleMoveReceipts=useRef(new Map<string,AppleMoveReceipt>());
  async function moveMembership(id:string,destination:string,target:MembershipPage){
    if(isAppleReminderPreview(id))id=(await resolveTodo(id)).id;
    const todo=todosRef.current.find(item=>item.id===id),version=generation.current;
    if(!todo||todo.done||todo.saveState||todo.sourceSync?.state==='queued')return false;
    const current=()=>version===generation.current;
    const saved=await mutate(id,async repository=>{
      if(connection?.mode==='demo'){
        if(target.kind!=='local'||todo.source)throw Error('같은 출처의 목록을 골라주세요.');
        return repository.update(id,{category:destination as Category});
      }
      const body:{destination:string;connectionId?:string;apple?:AppleMoveReceipt}={destination,connectionId:target.connectionId};
      const receiptKey=JSON.stringify([version,id,destination]);
      if(target.kind==='apple'){
        body.apple=appleMoveReceipts.current.get(receiptKey)??await moveAppleReminder(todo,destination,current);
        if(!current())return null;
        if(appleMoveReceipts.current.size>=200)appleMoveReceipts.current.delete(appleMoveReceipts.current.keys().next().value!);
        appleMoveReceipts.current.set(receiptKey,body.apple);
      }
      const result=await featureRequest('/api/todos/'+encodeURIComponent(id)+'/membership','POST',body) as Todo;
      appleMoveReceipts.current.delete(receiptKey);
      return result;
    });
    if(!saved||!current())return false;
    setTodos(items=>items.map(item=>item.id===id?saved:item));persistDeviceTodos(todosRef.current);refreshSources();
    return true;
  }
  async function changeTodoDestination(id:string,target:TodoDestination){
    const todo=await resolveTodo(id);
    if(deviceCreateOwner&&device?.edits.snapshot(deviceCreateOwner)?.some(job=>job.before.id===todo.id)){
      throw Error('이 Ticket의 변경 내용을 원본에 반영 중이에요. 목록을 다시 선택해주세요.');
    }
    const source=todo.source;
    const googleAccount=source?.provider==='google'?source.connectionId??source.externalId.split(':')[0]:null;
    const sameProvider=source?.provider===target.provider&&(target.provider==='apple-reminders'||googleAccount===target.connectionId);
    if(sameProvider){
      if(source?.listId===target.listId)return todo;
      const moved=await moveMembership(todo.id,target.listId,target.provider==='apple-reminders'?{kind:'apple',items:[]}:{kind:'google',items:[],connectionId:target.connectionId});
      if(!moved)throw Error('이 목록으로 이동하지 못했어요. 원본 목록 권한과 연결을 확인해주세요.');
      return findTodo(todo.id)??todo;
    }
    const version=generation.current;
    const saved=await featureRequest('/api/todos/'+encodeURIComponent(todo.id)+'/destination','POST',target) as Todo;
    if(version!==generation.current)throw sessionChanged();
    writes.current++;
    setTodos(items=>items.map(item=>item.id===todo.id?saved:item));persistDeviceTodos(todosRef.current);
    return saved;
  }
  async function remove(id: string): Promise<boolean> {
    const item=findTodo(id);
    if(!item||isDeviceTodo(item.id))return false;
    id=item.id;
    const appleId=item.source?.provider==='apple-reminders'?item.source.externalId:undefined;
    const deletion:QueuedTodoDelete={id,sourceId:item.source?.externalId??null,appleId};
    const owner=calendarOwner.current,version=generation.current;
    let removed;
    if(device&&owner){
      await device.deletes.add(owner,deletion);
      if(version!==generation.current)return false;
      writes.current++;removed=true;
    }else{
      if(appleId){setNotice('이 Ticket은 아이폰에서 삭제할 수 있어요.');return false;}
      removed=await mutate(id,async repository=>{
        if(connection?.mode==='cloud')await featureRequest('/api/todo-deletions','POST',deletion);
        else await repository.remove(id);
        return true;
      });
    }
    if(removed&&item?.source?.provider==='apple-reminders'){
      if(localAppleRemovals.current.generation!==generation.current)localAppleRemovals.current={generation:generation.current,ids:new Set()};
      localAppleRemovals.current.ids.add(item.source.externalId);
    }
    if (removed) { delete originsRef.current[id];delete pendingOrder.current[id];setCompletionOrigins({...originsRef.current});setTodos(current => current.filter(todo => todo.id !== id)); const timer = timers.current.get(id); if (timer) clearTimeout(timer); timers.current.delete(id); setPending(current => { const next = { ...current }; delete next[id]; return next; }); }
    if(removed){
      const jobs=owner&&device?device.edits.snapshot(owner):undefined;
      for(const job of jobs??[])if(matchesTodoDeletion(job.before,deletion))writeResolved(job.id);
      persistDeviceTodos(todosRef.current);
    }
    return !!removed;
  }
  function expireSession() {
    writeChecks.current.clear();reminderBaselines.current.clear();setWriteReports([]);
    setSessionStatus('ready');
    if(calendarOwner.current)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=null;
    snapshotReady.current=false;refreshing.current=false;generation.current++; repo.current = null; completions.current.clear(); setCompletionIds([]); busy.current.clear(); setBusyIds([]); clearTimers(); setPending({}); setTodos([]); setUser(null); setLoading(false);
  }
  async function authenticate(email: string, password: string, register: boolean,agreements?:auth.SignupAgreements,passwordConfirmation?:string): Promise<boolean> {
    if (connection?.mode !== 'cloud' || connectingRef.current || busy.current.size) return false;
    connectingRef.current = true; refreshing.current=false;generation.current++; setConnecting(true); setError(''); setNotice('');
    try {
      const account = await auth.authenticate(connection.baseUrl, email, password, register,agreements,passwordConfirmation);
      const nextOwner=connection.baseUrl+':'+account.id;if(calendarOwner.current&&calendarOwner.current!==nextOwner)forgetCalendarSnapshots(calendarOwner.current);calendarOwner.current=nextOwner;
      const repository = createRepository(connection);
      snapshotReady.current=false;refreshing.current=false;generation.current++; repo.current = account.emailVerified?repository:null; clearTimers(); setPending({}); setTodos([]); setUser(account);setSessionStatus('ready');
      if(!account.emailVerified){setLoading(false);return true;}
      try{const data = await repository.list();snapshotReady.current=true;setTodos(data);}catch(e){if(e instanceof auth.AuthRequiredError)throw e;setError('로그인은 완료했지만 Ticket을 불러오지 못했어요. 다시 시도를 눌러주세요.');}setLoading(false);return true;
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
  const sourceRefreshCallback=useRef<()=>void>(()=>{});
  const refreshSources=useCallback(()=>sourceRefreshCallback.current(),[]);
  const [appleView,setAppleView]=useState<{generation:number;lists:ReadonlyMap<string,ListedReminder[]>;metadata:ReminderListGroup[];suppressed:ReadonlySet<string>}>();
  useEffect(()=>{
    if(!user?.emailVerified||connection?.mode!=='cloud'||sessionStatus!=='ready')return;
    let disposed=false;
    const running=new Set<'apple'|'google'>(),queued=new Set<'apple'|'google'>();
    let debounce:ReturnType<typeof setTimeout>|undefined;
    const appleVersions=new Map<string,string>();
    const appleLists=new Map<string,ListedReminder[]>(),suppressed=new Set<string>();
    let metadata:ReminderListGroup[]=[];
    const current=()=>!disposed&&generation.current===renderGeneration;
    const publishApple=()=>setAppleView({generation:renderGeneration,lists:new Map(appleLists),metadata,suppressed:new Set(suppressed)});
    let readingApple=false,readAgain=false;
    async function readApple(){
      if(!current()||AppState.currentState!=='active')return;
      if(readingApple){readAgain=true;return;}
      readingApple=true;
      try{
        const owner=calendarOwner.current,cached=todosRef.current;
        const absent:Todo[]=[];
        await readAppleTodoLists(current,(id,rows)=>{
          if(JSON.stringify(appleLists.get(id))!==JSON.stringify(rows)){appleLists.set(id,rows);publishApple();}
          const ids=new Set(rows.map(row=>row.id));
          for(const todo of cached){
            if(todo.source?.provider==='apple-reminders'&&todo.source.listId===id&&!ids.has(todo.source.externalId))absent.push(todo);
          }
        },lists=>{
          for(const id of appleLists.keys())if(!lists.some(list=>list.id===id))appleLists.delete(id);
          metadata=lists;publishApple();
        });
        if(device&&owner){
          for(const todo of absent){
            if(!current())break;
            const sourceId=todo.source!.externalId;
            if(!await missingAppleReminder(sourceId)||!current())continue;
            // An EventKit lookup confirms an actual absence. An unread list or a local edit is not a delete.
            if(device.edits.snapshot(owner)?.some(job=>job.before.id===todo.id)||
              !todosRef.current.some(row=>row.id===todo.id&&row.source?.externalId===sourceId&&!row.sourceSync?.patch))continue;
            await device.deletes.add(owner,{id:todo.id,sourceId,appleId:sourceId,appleDeleted:true});
            writes.current++;
          }
        }
      }catch{}finally{
        readingApple=false;
        if(current()){
          void pull('apple');
          if(readAgain){readAgain=false;void readApple();}
        }
      }
    }
    async function pull(provider:'apple'|'google'){
      if(!current()||AppState.currentState!=='active')return;
      if(running.has(provider)){queued.add(provider);return;}
      running.add(provider);
      let revision=writes.current;
      try{await refreshTodoSources(featureRequest,current,appleVersions,{apple:provider==='apple',google:provider==='google',appleRows:new Map(appleLists),onSuppressed:ids=>{
        if(!current())return;
        for(const id of ids)suppressed.add(id);
        publishApple();
      },onChange:items=>{
        if(!current())return;
        if(!items?.length||busy.current.size||writes.current!==revision){pendingSourceRefresh.current=true;return;}
        revision=++writes.current;
        const next=new Map(todosRef.current.map(todo=>[todo.id,todo]));
        for(const item of items)next.set(item.id,item);
        const rows=[...next.values()];
        setTodos(rows);persistDeviceTodos(rows);
      }});}catch{}finally{
        running.delete(provider);
        if(queued.delete(provider))void pull(provider);
      }
    }
    const pullAll=()=>{void readApple();void pull('google');};
    sourceRefreshCallback.current=pullAll;
    pullAll();
    const subscription=AppState.addEventListener('change',state=>{if(state==='active')pullAll();});
    const unsubscribe=appleCalendarDevice.subscribe?.(()=>{
      clearTimeout(debounce);
      debounce=setTimeout(()=>void readApple(),300);
    });
    const timer=setInterval(pullAll,60000);
    return ()=>{disposed=true;sourceRefreshCallback.current=()=>{};subscription.remove();unsubscribe?.();clearTimeout(debounce);clearInterval(timer);};
  },[device,featureRequest,sessionStatus,user?.id,user?.emailVerified]);
  const displayTodos=useMemo(()=>{
    if(appleView?.generation!==renderGeneration)return todos;
    const removals=localAppleRemovals.current;
    const queuedRemovals=deviceCreateOwner?device?.deletes.snapshot(deviceCreateOwner)??[]:[];
    const suppressed=new Set([...queuedRemovals.flatMap(job=>job.appleId?[job.appleId]:[]),...appleView.suppressed,...(removals.generation===renderGeneration?removals.ids:[])]);
    const jobs=deviceCreateOwner?device?.edits.snapshot(deviceCreateOwner)??[]:[];
    return showAppleReminders(todos,appleView.lists,suppressed,new Set(jobs.map(job=>job.before.id)));
  },[appleView,renderGeneration,todos,device,deviceCreateOwner]);
  function findTodo(id:string){
    if(!isAppleReminderPreview(id))return todosRef.current.find(todo=>todo.id===id);
    const resolved=resolvedAppleIds.current.generation===generation.current?resolvedAppleIds.current.ids.get(id):undefined;
    return todosRef.current.find(todo=>todo.id===resolved)
      ??displayTodos.find(todo=>todo.id===id);
  }
  async function resolveTodo(id:string):Promise<Todo>{
    const item=findTodo(id),version=generation.current;
    if(!item)throw Error('이 Ticket을 다시 불러와주세요.');
    if(!isAppleReminderPreview(item.id))return item;
    const source=item.source;
    const original=source?.listId&&appleView?.generation===version?appleView.lists.get(source.listId)?.find(row=>row.id===source.externalId):null;
    if(!original)throw Error('아이폰에서 원본 미리알림을 다시 확인해주세요.');
    const result=await featureRequest('/api/integrations/apple-reminders/refresh','POST',{items:[original],resolve:true}) as {items?:Todo[];suppressed?:string[];deferred?:string[]};
    if(version!==generation.current)throw sessionChanged();
    if(result.suppressed?.includes(original.id)){
      localAppleRemovals.current.ids.add(original.id);setTodos(rows=>rows);
      throw Error('이 미리알림의 도슨 연결이 이미 바뀌었어요.');
    }
    const matches=(todo:Todo)=>todo.source?.provider==='apple-reminders'&&todo.source.externalId===original.id;
    let saved=result.items?.find(matches)??todosRef.current.find(matches);
    if(!saved&&!result.deferred?.includes(original.id))saved=(await repo.current?.list())?.find(matches);
    if(version!==generation.current)throw sessionChanged();
    if(!saved)throw Error('원본 목록의 저장을 확인하고 있어요. 잠시 뒤 다시 시도해주세요.');
    const existing=todosRef.current.find(todo=>todo.id===saved.id);
    if(existing)return existing;
    writes.current++;setTodos(rows=>[...rows,saved]);persistDeviceTodos(todosRef.current);
    return saved;
  }
  const pendingSourceRefresh=useRef(false);
  useEffect(()=>{
    const timer=setInterval(()=>{
      if(pendingSourceRefresh.current&&!refreshing.current&&!busy.current.size&&AppState.currentState==='active'){
        pendingSourceRefresh.current=false;void refresh();
      }
    },1500);
    return ()=>clearInterval(timer);
  },[]);
  useAppleTodoDelivery(Platform.OS==='ios'&&user?.emailVerified?reminderOwner:null,todos,featureRequest,
   ()=>renderGeneration===generation.current,saved=>{
    writes.current++;
    const items=todosRef.current.map(todo=>todo.id===saved.id?saved:todo);
    setTodos(items);persistDeviceTodos(items);
   });
  async function retryDelivery(id:string){
    const saved=await featureRequest('/api/todos/'+encodeURIComponent(id)+'/delivery/retry','POST',{}) as Todo;
    setTodos(old=>old.map(todo=>todo.id===id?saved:todo));
  }
  const reminderTodos=useMemo(()=>todos.flatMap(todo=>todo.saveState?(reminderBaselines.current.has(todo.id)?[reminderBaselines.current.get(todo.id)!]:[]):[todo]),[todos]);
  const reminders = useReminders(reminderTodos, reminderOwner,connection?.mode==='cloud'&&user?.emailVerified?featureRequest:undefined);
  async function refreshAccount() {
    if (connection?.mode !== 'cloud') return;
    const version = renderGeneration;
    if (version !== generation.current) throw sessionChanged();
    try {
      const account = await auth.session(connection.baseUrl);
      if (version !== generation.current) throw sessionChanged();
      if (user && account.id !== user.id) { expireSession(); throw new auth.AuthRequiredError(); }
      setUser(account);
      if(account.emailVerified&&!repo.current){const repository=createRepository(connection);repo.current=repository;void repository.list().then(data=>{if(version===generation.current){snapshotReady.current=true;setTodos(data);}}).catch(()=>{if(version===generation.current)setError('Ticket을 불러오지 못했어요. 다시 시도해주세요.');});}
    } catch (e) {
      if (version !== generation.current) throw sessionChanged();
      if (e instanceof auth.AuthRequiredError) expireSession();
      throw e;
    }
  }
  async function deleteAccount(password: string) {
    if (connection?.mode !== 'cloud' || busy.current.size || connectingRef.current) return false;
    connectingRef.current = true; setConnecting(true);
    try { const result = await featureRequest('/api/account', 'DELETE', { password, confirmation: 'DELETE' }) as { remoteRevocationComplete: boolean }; let localCleared=true;try{await auth.forgetSession(connection.baseUrl);if(Platform.OS==='ios'&&reminderOwner)await Promise.all([deviceCalendarQueue.clear(reminderOwner),deviceCalendarEdits.clear(reminderOwner),appleCalendarReceipts.clear(reminderOwner),clearAppleTodoReceipts(reminderOwner)]);if(device&&reminderOwner)await Promise.all([device.queue.clear(reminderOwner),device.edits.clear(reminderOwner),device.deletes.clear(reminderOwner),device.cache.clear(reminderOwner)]);await AsyncStorage.multiRemove(['duckduck.mobile.name.'+(user?.id??''),'duckduck.reminders.'+reminderOwner,'duckduck.ai-consent.v1.'+connection.baseUrl+':'+(user?.id??'')]);}catch{localCleared=false;} const cleared=await reminders.clear(); expireSession(); setNotice(!cleared||!localCleared?'계정을 삭제했어요. 아이폰의 알림 설정도 확인해주세요.':result.remoteRevocationComplete ? '계정을 삭제했어요.' : '계정을 삭제했어요. 일부 외부 서비스의 접근 권한은 해당 서비스 설정에서도 확인해주세요.'); return true; }
    catch (e) { setError(message(e)); return false; }
    finally { connectingRef.current = false; setConnecting(false);setLoading(false); }
  }
  async function passwordResetComplete() { if (connection?.mode === 'cloud') { await auth.forgetSession(connection.baseUrl); expireSession(); setNotice('비밀번호를 바꿨어요. 다시 로그인해주세요.'); } }
  const isCurrentSession = () => renderGeneration === generation.current;
  return { appleReminderLists:appleView?.generation===renderGeneration?appleView.metadata:[],retryDelivery,deviceCreatesEnabled:!!deviceCreateOwner,prepareSave,reportWrite,writeResolved,beginSave,writeReports,checkWrite,sessionStatus,retrySession,reorder,moveMembership,retrySource,findTodo,changeTodoDestination, connection, user, reminders, notice, setNotice, isCurrentSession, featureRequest, refreshAccount, deleteAccount, passwordResetComplete, authenticate, logout, todos, calendarTodos:displayTodos, visible: visibleTodos(displayTodos, pending,Date.now(),completionOrigins), logged:completedTodos(displayTodos,pending,Date.now(),completionOrigins).map(todo=>Object.hasOwn(pendingOrder.current,todo.id)?{...todo,completedAt:pendingOrder.current[todo.id]||null}:todo).sort((a,b)=>(b.completedAt??'').localeCompare(a.completedAt??'')), pending, loading, connecting, busyIds, completionIds, error, setError, connect, refresh, refreshSources, add, update, remove };
}
export type TodoStore = ReturnType<typeof useTodos>;
