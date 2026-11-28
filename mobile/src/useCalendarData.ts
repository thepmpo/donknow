import {captureConfirmedCalendarWrites,overlayCalendarWrites,watchCalendarWrites} from './calendar-write-overlay';
import {calendarSnapshotRevision,invalidateCalendarSnapshotReads,calendarSnapshots,restoreCalendarSnapshots,persistCalendarSnapshots,forgetCalendarSnapshots,watchCalendarSnapshots,broadcastCalendarSnapshots} from './calendar-snapshot-cache';
import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {validCalendarPage} from './http-response';
import {docenCalendarId,zonedDay} from './calendar-model';
import type {TodoStore} from './useTodos';
import type {CalendarEvent,CalendarMirror,CalendarSource} from './calendar-model';
import type {CalendarSnapshot as CachedPeriod} from './calendar-snapshot-store';
import {savedCalendarRange} from './calendar-snapshot-range';
import {readCalendarOnce} from './calendar-snapshot-cache';
const noHiddenMirrors:NonNullable<Page['hiddenMirrors']>=[];
const noAppleCreates:CalendarEvent[]=[];
type Page={appleCreates?:CalendarEvent[];hiddenMirrors?:(Omit<CalendarMirror,'state'>&{id:string;state:string})[];calendarId?:string;items:CalendarEvent[];nextCursor?:string|null;connectionState?:string;canWrite?:boolean;readAt?:string;calendarName?:string;connectionId?:string};
export function useCalendarData(store:TodoStore,{start,end,month,timeZone,selected,active,refreshWhileHidden=false,refreshKey,selectionReady=true}:{start:string;end:string;month:string;timeZone:string;selected:string[];active:boolean;refreshWhileHidden?:boolean;refreshKey?:number;selectionReady?:boolean}){
 const [sourceLoading,setSourceLoading]=useState(false),[sourceLoaded,setSourceLoaded]=useState(false);
 const [docenSupported,setDocenSupported]=useState(false),[localFirst,setLocalFirst]=useState(false);
 const [detailsSupported,setDetailsSupported]=useState(false),[createOptionsSupported,setCreateOptionsSupported]=useState(false);
 const [writeRevision,writeChanged]=useState(0);
 const [docenRead,setDocenRead]=useState<{key:string;ids:Set<string>}|null>(null);
 const [hidden,setHidden]=useState<{owner:string;mirrors:NonNullable<Page['hiddenMirrors']>;appleCreates:CalendarEvent[]}|null>(null);
 const [events,setEvents]=useState<CalendarEvent[]>([]),[sources,setSources]=useState<CalendarSource[]>([]);
 const [phase,setPhase]=useState<'unconnected'|'loading'|'ready'|'partial'|'error'>(store.user?'loading':'unconnected'),[error,setError]=useState(''),[readAt,setReadAt]=useState<string|null>(null),[cursors,setCursors]=useState<Record<string,string>>({}),[version,setVersion]=useState<2|1|0>(0),[sourceError,setSourceError]=useState(''),[sourceCursor,setSourceCursor]=useState<string|null>(null);
 const readRevision=useRef(0);
 const generation=useRef(0),sourceGeneration=useRef(0),lastKey=useRef(''),snapshot=useRef<CalendarEvent[]>([]),cursorRef=useRef(cursors);cursorRef.current=cursors;
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 const readSelected=[...new Set([...selected,docenCalendarId])];
 const family=JSON.stringify([owner,timeZone]),key=JSON.stringify([family,[...selected].sort(),start,end]),latest=useRef({key,owner,active});latest.current={key,owner,active};
 const periods=useRef(calendarSnapshots(owner)),cacheOwner=useRef(owner),capabilities=useRef<{version:1|2;at:number;details:boolean;createOptions:boolean;docen:boolean;localFirst:boolean;reconcile:boolean}|null>(null),pageChains=useRef(new Map<string,{key:string;items:CalendarEvent[]}>());
 const display=useMemo(()=>cacheOwner.current!==owner?[]:lastKey.current===key?events:savedCalendarRange(periods.current.values(),key,family,readSelected,start,end,timeZone).items,[owner,key,events]);
 const eventKey=(e:CalendarEvent)=>JSON.stringify([e.connectionId??'',e.calendarId??'primary',e.eventId??e.id]);
 function inPeriod(e:CalendarEvent,rangeStart=start,rangeEnd=end,rangeZone=timeZone){const first=e.allDay?e.dueDate:e.startAt?zonedDay(e.startAt,rangeZone):e.dueDate,last=e.allDay?e.endDate:e.endAt?zonedDay(Math.max(Date.parse(e.startAt??e.endAt),Date.parse(e.endAt)-1),rangeZone):first;return !!first&&first<rangeEnd&&(e.allDay&&e.endDate?e.endDate>rangeStart:(last??first)>=rangeStart);}
 function periodZone(entry:CachedPeriod){try{return JSON.parse(entry.family)[1]??timeZone;}catch{return timeZone;}}
 function remember(){periods.current.delete(key);periods.current.set(key,{key,family,start,end,items:[...snapshot.current],readAt:readAtRef.current,cursors:{...cursorRef.current}});while(periods.current.size>12)periods.current.delete(periods.current.keys().next().value!);persistCalendarSnapshots(owner);broadcastCalendarSnapshots(owner,snapshot.current);}
 const readAtRef=useRef(readAt);readAtRef.current=readAt;
 const featureRequest=store.featureRequest;
 const request=useCallback((path:string)=>readCalendarOnce(owner,path,featureRequest),[owner,featureRequest]);
 const load=useCallback(async(more=false,freshRequest=false)=>{
  if(!selectionReady)return;
  const run=++generation.current,requestKey=key;let revision=calendarSnapshotRevision(owner);readRevision.current=revision;
  if(cacheOwner.current!==owner){if(cacheOwner.current!=='demo')forgetCalendarSnapshots(cacheOwner.current);periods.current=calendarSnapshots(owner);pageChains.current.clear();capabilities.current=null;snapshot.current=[];lastKey.current='';cacheOwner.current=owner;}
  if(!store.user){forgetCalendarSnapshots(owner);periods.current.clear();snapshot.current=[];setEvents([]);setPhase('unconnected');return;}
  const fresh=()=>run===generation.current&&latest.current.key===requestKey&&latest.current.owner===owner&&revision===calendarSnapshotRevision(owner);
  if(lastKey.current!==key){
   const cached=savedCalendarRange(periods.current.values(),key,family,readSelected,start,end,timeZone);
   snapshot.current=cached.items;
   setEvents(snapshot.current);readAtRef.current=cached?.readAt??null;setReadAt(readAtRef.current);cursorRef.current={...(cached?.cursors??{})};setCursors(cursorRef.current);lastKey.current=key;
  }
  const arrivedIds=new Set<string>();
  void restoreCalendarSnapshots(owner).then(rows=>{if(!fresh()||!rows.length)return;const cached=savedCalendarRange(rows,key,family,readSelected,start,end,timeZone);snapshot.current=[...new Map([...cached.items.filter(e=>!arrivedIds.has(e.calendarId??'primary')),...snapshot.current].map(e=>[eventKey(e),e])).values()];setEvents(snapshot.current);if(!arrivedIds.size){readAtRef.current=cached.readAt;setReadAt(cached.readAt);cursorRef.current=cached.cursors;setCursors(cached.cursors);}remember();});
  setPhase('loading');setError('');
  try{
   let v=capabilities.current?.version;
   if(!v||Date.now()-capabilities.current!.at>300000){const caps=await request('/api/capabilities') as {calendarWorkspace?:number;calendarDetails?:number;calendarCreateOptions?:number;docenCalendar?:number;docenCalendarFirst?:number;docenCalendarReconcile?:number};if(!fresh())return;if(!latest.current.active&&caps.calendarWorkspace!==2){setPhase('ready');return;}v=caps.calendarWorkspace===2?2:1;capabilities.current={version:v,at:Date.now(),details:caps.calendarDetails===1,createOptions:caps.calendarCreateOptions===1,docen:caps.docenCalendar===1,localFirst:caps.docenCalendarFirst===1,reconcile:caps.docenCalendarReconcile===1};}
   setVersion(v);setDocenSupported(capabilities.current?.docen===true);setLocalFirst(capabilities.current?.localFirst===true);setDetailsSupported(capabilities.current?.details===true);setCreateOptionsSupported(capabilities.current?.createOptions===true);
   const ids=v===2?(capabilities.current?.docen?[...new Set([...selected,docenCalendarId])]:selected.filter(id=>id!==docenCalendarId)):['primary'];if(!ids.length){snapshot.current=[];setEvents([]);setPhase('ready');cursorRef.current={};setCursors({});remember();return;}
   const next:Record<string,string>={...(more?cursorRef.current:{})},readTimes:string[]=[],ok:Page[]=[];
   const pages=await Promise.allSettled(ids.filter(id=>!more||cursorRef.current[id]).map(async id=>{
    let cursor=more?cursorRef.current[id]:undefined;
    for(let page=0;page<(v===2&&id!==docenCalendarId&&!more?4:1);page++){
     const confirmedWrites=id===docenCalendarId?captureConfirmedCalendarWrites(owner,'docen'):null;
     const query=new URLSearchParams({month,...(v===2?{v:'2',calendarId:id,timeZone,start,end}:{}),...(cursor?{cursor}:{})});
     const result=await (freshRequest||confirmedWrites?.hasWrites?featureRequest:request)('/api/calendar/events?'+query) as Page;if(!validCalendarPage(result))throw Error('Event 응답 형식을 확인하지 못했어요. 다시 확인해주세요.');if(!fresh())return;
     if(id===docenCalendarId){
      const mirrors=Array.isArray(result.hiddenMirrors)&&result.hiddenMirrors.length?result.hiddenMirrors:noHiddenMirrors;
      const appleCreates=Array.isArray(result.appleCreates)&&result.appleCreates.length?result.appleCreates:noAppleCreates;
      if(result.calendarId===docenCalendarId&&result.connectionState==='connected'&&!result.nextCursor){
       setDocenRead({key:requestKey,ids:new Set(result.items.map(item=>item.id))});
      }
      setHidden(old=>old?.owner===owner&&JSON.stringify(old.mirrors)===JSON.stringify(mirrors)&&JSON.stringify(old.appleCreates)===JSON.stringify(appleCreates)?old:{owner,mirrors,appleCreates});
     }
     arrivedIds.add(id);
     // A replaced account is not a slow page of the former account. Token rotation keeps connectionId.
     const replaced=new Set(snapshot.current.filter(e=>(e.calendarId??'primary')===id&&e.connectionId&&result.connectionId&&e.connectionId!==result.connectionId).map(e=>e.connectionId!));
     if(replaced.size){revision=invalidateCalendarSnapshotReads(owner);readRevision.current=revision;snapshot.current=snapshot.current.filter(e=>!replaced.has(e.connectionId??''));for(const cached of periods.current.values())cached.items=cached.items.filter(e=>!replaced.has(e.connectionId??''));}
     // Publish each source when it arrives, while slower sources keep their cached items.
     if(result.nextCursor)next[id]=result.nextCursor;else delete next[id];
     if(result.connectionState==='unconnected'){snapshot.current=snapshot.current.filter(e=>(e.calendarId??'primary')!==id);for(const cached of periods.current.values())cached.items=cached.items.filter(e=>(e.calendarId??'primary')!==id);}
     const chainKey=key+'|'+id,prior=cursor?pageChains.current.get(chainKey):undefined,chain={key,items:[...new Map([...(prior?.key===key?prior.items:[]),...result.items].map(e=>[eventKey(e),e])).values()]};pageChains.current.set(chainKey,chain);while(pageChains.current.size>120)pageChains.current.delete(pageChains.current.keys().next().value!);
     const complete=!result.nextCursor;
     const updated=[...new Map([...(complete?snapshot.current.filter(e=>(e.calendarId??'primary')!==id):snapshot.current),...chain.items].map(e=>[eventKey(e),e])).values()];
     if(JSON.stringify(snapshot.current)!==JSON.stringify(updated))snapshot.current=updated;
     // Update overlapping cached periods too, including deletions after the final page.
     // A 2-week refresh must not resurrect old titles when returning to month view.
     for(const cached of periods.current.values())if(cached.family===family){
      cached.items=[...new Map([...cached.items.filter(e=>!complete||(e.calendarId??'primary')!==id||!inPeriod(e)),...chain.items.filter(e=>inPeriod(e,cached.start,cached.end))].map(e=>[eventKey(e),e])).values()];
     }
     setEvents(snapshot.current);
     if(id===docenCalendarId&&result.calendarId===id&&result.connectionState==='connected'&&complete)confirmedWrites?.apply(new Set([id]),start,end,timeZone);
     cursorRef.current={...next};setCursors(cursorRef.current);
     if(result.readAt)readTimes.push(result.readAt);if(readTimes.length){readAtRef.current=readTimes.sort().at(-1)!;setReadAt(readAtRef.current);}
     setSources(old=>{
      const source=old.find(value=>value.id===id),canWrite=result.canWrite===true,connectionId=result.connectionId??source?.connectionId;
      return !source||source.canWrite===canWrite&&source.connectionId===connectionId?old:old.map(value=>value===source?{...value,canWrite,connectionId}:value);
     });ok.push(result);remember();
     if(!result.nextCursor||result.nextCursor===cursor)break;
     cursor=result.nextCursor;
    }
   }));if(!fresh())return;
   const failed=pages.filter(p=>p.status==='rejected');
   if(!ok.length&&failed.length)throw (failed[0] as PromiseRejectedResult).reason;
   const connectedSources=ok.filter(p=>p.calendarId!==docenCalendarId);
   const unconnected=connectedSources.length>0&&connectedSources.every(p=>p.connectionState==='unconnected');
   setPhase(unconnected?'unconnected':failed.length||Object.keys(next).length?'partial':'ready');
   if(failed.length)setError('일부 캘린더를 확인하지 못했어요. 표시되지 않은 Event가 있을 수 있어요.');
  }catch(e){if(fresh()){setError(e instanceof Error?e.message:'Event를 불러오지 못했어요.');setPhase('error');}}
 },[key,store.user?.id,request,featureRequest,selectionReady]);
 const phaseRef=useRef(phase);phaseRef.current=phase;
 // Keep the cached period on screen and start a new read for each calendar entry.
 useEffect(()=>{void load(false,active);return()=>{generation.current++;};},[load,active,refreshKey]);
 useEffect(()=>watchCalendarSnapshots(owner,(signal,published)=>{if(latest.current.owner!==owner||latest.current.key!==key)return;if(signal==='clear'){generation.current++;snapshot.current=[];setEvents([]);setDocenRead(null);cursorRef.current={};setCursors({});setPhase('unconnected');return;}if(signal==='refresh'){void load();void loadSources();return;}if(published===snapshot.current)return;const cached=savedCalendarRange(calendarSnapshots(owner).values(),key,family,readSelected,start,end,timeZone);snapshot.current=cached.items;setEvents(snapshot.current);if(readRevision.current!==calendarSnapshotRevision(owner))void load();}),[owner,key,load]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state==='active'&&(latest.current.active||refreshWhileHidden))void load(false,true);});return()=>subscription.remove();},[load,refreshWhileHidden]);
 useEffect(()=>{if(!(active||refreshWhileHidden)||!store.user||!selectionReady)return;const timer=setInterval(()=>{if(AppState.currentState==='active'&&phaseRef.current!=='loading')void load();},30000);return()=>clearInterval(timer);},[active,refreshWhileHidden,store.user?.id,selectionReady,load]);
 useEffect(()=>{sourceGeneration.current++;setSources([]);setSourceLoading(false);setSourceLoaded(false);setSourceCursor(null);setSourceError('');},[owner]);
 useEffect(()=>()=>{sourceGeneration.current++;},[]);
 async function loadSources(more=false){const run=++sourceGeneration.current,own=owner;setSourceLoading(true);setSourceError('');try{const result=await request('/api/calendar/calendars'+(more&&sourceCursor?'?cursor='+encodeURIComponent(sourceCursor):'')) as {items:CalendarSource[];nextCursor:string|null;failedConnectionIds?:string[]};if(run!==sourceGeneration.current||latest.current.owner!==own)return;setSources(previous=>[...new Map([...(more?previous:previous.filter(p=>!!p.connectionId&&result.failedConnectionIds?.includes(p.connectionId))),...result.items.map(c=>{const id=c.primary?'primary':c.id,prior=previous.find(p=>p.connectionId===c.connectionId&&p.id==='@g/'+c.connectionId+'/'+id);return {...c,id:prior?.id??id,...(prior?{primary:false}: {})};})].map(s=>[s.id,s])).values()]);setSourceCursor(result.nextCursor??null);if(result.failedConnectionIds?.length)setSourceError('일부 계정의 목록을 확인하지 못했어요. 이전 목록은 유지돼요.');}catch(e){if(run===sourceGeneration.current&&latest.current.owner===own)setSourceError(e instanceof Error?e.message:'캘린더 목록을 읽지 못했어요.');}finally{if(run===sourceGeneration.current&&latest.current.owner===own){setSourceLoading(false);setSourceLoaded(true);}}}
 function removeEvent(id:string){generation.current++;readRevision.current=invalidateCalendarSnapshotReads(owner);snapshot.current=snapshot.current.filter(e=>e.id!==id);for(const entry of periods.current.values())entry.items=entry.items.filter(e=>e.id!==id);pageChains.current.clear();setEvents(snapshot.current);persistCalendarSnapshots(owner);broadcastCalendarSnapshots(owner,snapshot.current);}
 function applyEvent(id:string,patch:Partial<CalendarEvent>){generation.current++;readRevision.current=invalidateCalendarSnapshotReads(owner);const old=snapshot.current.find(e=>e.id===id)??[...periods.current.values()].flatMap(p=>p.items).find(e=>e.id===id);if(!old){broadcastCalendarSnapshots(owner);return;}const updated={...old,...patch};snapshot.current=[...snapshot.current.filter(e=>e.id!==id),...(inPeriod(updated)?[updated]:[])];for(const entry of periods.current.values()){entry.items=entry.items.filter(e=>e.id!==id);if(inPeriod(updated,entry.start,entry.end,periodZone(entry)))entry.items.push(updated);}setEvents(snapshot.current);persistCalendarSnapshots(owner);broadcastCalendarSnapshots(owner,snapshot.current);}
 function upsertEvent(event:CalendarEvent){
  generation.current++;readRevision.current=invalidateCalendarSnapshotReads(owner);
  for(const entry of periods.current.values()){
   entry.items=entry.items.filter(e=>e.id!==event.id);
   if(inPeriod(event,entry.start,entry.end,periodZone(entry)))entry.items.push(event);
  }
  snapshot.current=snapshot.current.filter(e=>e.id!==event.id);
  if(inPeriod(event))snapshot.current.push(event);
  setEvents(snapshot.current);remember();
 }
 function cachedEvents(){return [...new Map([...periods.current.values()].filter(p=>p.family===family).flatMap(p=>p.items).concat(snapshot.current).map(e=>[eventKey(e),e])).values()];}
 useEffect(()=>watchCalendarWrites(owner,()=>writeChanged(v=>v+1)),[owner]);
 function confirmedAbsent(event:CalendarEvent){return event.provider==='docen'&&docenRead?.key===key&&inPeriod(event)&&!docenRead.ids.has(event.id);}
 return {confirmedAbsent,reconcileSupported:capabilities.current?.reconcile===true,appleCreates:hidden?.owner===owner?hidden.appleCreates:noAppleCreates,writeRevision,hiddenMirrors:hidden?.owner===owner?hidden.mirrors:noHiddenMirrors,cachedEvents,upsertEvent,removeEvent,applyEvent,detailsSupported,createOptionsSupported,docenSupported,localFirst,baseEvents:display,events:overlayCalendarWrites(owner,display,start,end,timeZone,readSelected),sources,phase,error,readAt,version,cursors,sourceLoading,sourceLoaded,sourceError,sourceCursor,load,loadSources};
}
