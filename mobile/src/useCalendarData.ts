import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import {validCalendarPage} from './http-response';
import {zonedDay} from './calendar-model';
import type {TodoStore} from './useTodos';
import type {CalendarEvent,CalendarSource} from './calendar-model';
type CachedPeriod={family:string;start:string;end:string;items:CalendarEvent[];readAt:string|null;cursors:Record<string,string>};
type Page={items:CalendarEvent[];nextCursor?:string|null;connectionState?:string;canWrite?:boolean;readAt?:string;calendarName?:string;connectionId?:string};
export function useCalendarData(store:TodoStore,{start,end,month,timeZone,selected,active}:{start:string;end:string;month:string;timeZone:string;selected:string[];active:boolean}){
 const [detailsSupported,setDetailsSupported]=useState(false);
 const [events,setEvents]=useState<CalendarEvent[]>([]),[sources,setSources]=useState<CalendarSource[]>([{id:'primary',name:'기본 캘린더',primary:true,canWrite:false}]);
 const [phase,setPhase]=useState<'unconnected'|'loading'|'ready'|'partial'|'error'>(store.user?'loading':'unconnected'),[error,setError]=useState(''),[readAt,setReadAt]=useState<string|null>(null),[cursors,setCursors]=useState<Record<string,string>>({}),[version,setVersion]=useState<2|1|0>(0),[sourceError,setSourceError]=useState(''),[sourceCursor,setSourceCursor]=useState<string|null>(null);
 const generation=useRef(0),sourceGeneration=useRef(0),lastKey=useRef(''),snapshot=useRef<CalendarEvent[]>([]),cursorRef=useRef(cursors);cursorRef.current=cursors;
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 const family=JSON.stringify([owner,timeZone]),key=JSON.stringify([family,[...selected].sort(),start,end]),latest=useRef({key,owner,active});latest.current={key,owner,active};
 const periods=useRef(new Map<string,CachedPeriod>()),cacheOwner=useRef(owner),capabilities=useRef<{version:1|2;at:number;details:boolean}|null>(null),pageChains=useRef(new Map<string,{key:string;items:CalendarEvent[]}>());
 function inPeriod(e:CalendarEvent,rangeStart=start,rangeEnd=end){const first=e.allDay?e.dueDate:e.startAt?zonedDay(e.startAt,timeZone):e.dueDate,last=e.allDay?e.endDate:e.endAt?zonedDay(Math.max(Date.parse(e.startAt??e.endAt),Date.parse(e.endAt)-1),timeZone):first;return !!first&&first<rangeEnd&&(e.allDay&&e.endDate?e.endDate>rangeStart:(last??first)>=rangeStart);}
 function remember(){periods.current.delete(key);periods.current.set(key,{family,start,end,items:[...snapshot.current],readAt:readAtRef.current,cursors:{...cursorRef.current}});while(periods.current.size>12)periods.current.delete(periods.current.keys().next().value!);}
 const readAtRef=useRef(readAt);readAtRef.current=readAt;
 const request=store.featureRequest;
 const load=useCallback(async(more=false)=>{
  const run=++generation.current,requestKey=key;
  if(cacheOwner.current!==owner){periods.current.clear();pageChains.current.clear();capabilities.current=null;snapshot.current=[];lastKey.current='';cacheOwner.current=owner;}
  if(!store.user){periods.current.clear();snapshot.current=[];setEvents([]);setPhase('unconnected');return;}
  const fresh=()=>run===generation.current&&latest.current.key===requestKey&&latest.current.active;
  if(lastKey.current!==key){
   const cached=periods.current.get(key);
   snapshot.current=cached?.items??[...new Map([...periods.current.values()].filter(p=>p.family===family).flatMap(p=>p.items.filter(e=>selected.includes(e.calendarId??'primary')&&inPeriod(e))).map(e=>[e.id,e])).values()];
   setEvents(snapshot.current);readAtRef.current=cached?.readAt??null;setReadAt(readAtRef.current);cursorRef.current={...(cached?.cursors??{})};setCursors(cursorRef.current);lastKey.current=key;
  }
  setPhase('loading');setError('');
  try{
   let v=capabilities.current?.version;
   if(!v||Date.now()-capabilities.current!.at>300000){const caps=await request('/api/capabilities') as {calendarWorkspace?:number;calendarDetails?:number};if(!fresh())return;v=caps.calendarWorkspace===2?2:1;capabilities.current={version:v,at:Date.now(),details:caps.calendarDetails===1};}
   setVersion(v);setDetailsSupported(capabilities.current?.details===true);
   const ids=v===2?selected:['primary'];if(!ids.length){snapshot.current=[];setEvents([]);setPhase('ready');cursorRef.current={};setCursors({});remember();return;}
   const next:Record<string,string>={...(more?cursorRef.current:{})},readTimes:string[]=[],ok:Page[]=[];
   const pages=await Promise.allSettled(ids.filter(id=>!more||cursorRef.current[id]).map(async id=>{
    const query=new URLSearchParams({month,...(v===2?{v:'2',calendarId:id,timeZone,start,end}:{}),...(more&&cursorRef.current[id]?{cursor:cursorRef.current[id]}:{})});
    const result=await request('/api/calendar/events?'+query) as Page;if(!validCalendarPage(result))throw Error('일정 응답 형식을 확인하지 못했어요. 다시 확인해주세요.');if(!fresh())return;
    // Publish each source when it arrives, while slower sources keep their cached items.
    if(result.nextCursor)next[id]=result.nextCursor;else delete next[id];
    if(result.connectionState==='unconnected')periods.current.clear();
    const chainKey=key+'|'+id,prior=more?pageChains.current.get(chainKey):undefined,chain={key,items:[...new Map([...(prior?.key===key?prior.items:[]),...result.items].map(e=>[e.id,e])).values()]};pageChains.current.set(chainKey,chain);while(pageChains.current.size>120)pageChains.current.delete(pageChains.current.keys().next().value!);
    const complete=!result.nextCursor;
    snapshot.current=[...new Map([...(complete?snapshot.current.filter(e=>(e.calendarId??'primary')!==id):snapshot.current),...chain.items].map(e=>[e.id,e])).values()];
    // Update overlapping cached periods too, including deletions after the final page.
    // A 2-week refresh must not resurrect old titles when returning to month view.
    for(const cached of periods.current.values())if(cached.family===family){
     cached.items=[...new Map([...cached.items.filter(e=>!complete||(e.calendarId??'primary')!==id||!inPeriod(e)),...chain.items.filter(e=>inPeriod(e,cached.start,cached.end))].map(e=>[e.id,e])).values()];
    }
    setEvents(snapshot.current);cursorRef.current={...next};setCursors(cursorRef.current);
    if(result.readAt)readTimes.push(result.readAt);if(readTimes.length){readAtRef.current=readTimes.sort().at(-1)!;setReadAt(readAtRef.current);}
    setSources(old=>old.map(s=>s.id===id?{...s,name:result.calendarName??s.name,canWrite:result.canWrite===true,connectionId:result.connectionId??s.connectionId}:s));ok.push(result);remember();
   }));if(!fresh())return;
   const failed=pages.filter(p=>p.status==='rejected');
   if(!ok.length&&failed.length)throw (failed[0] as PromiseRejectedResult).reason;
   const unconnected=ok.length>0&&ok.every(p=>p.connectionState==='unconnected');
   setPhase(unconnected?'unconnected':failed.length||Object.keys(next).length?'partial':'ready');
   if(failed.length)setError('일부 캘린더를 확인하지 못했어요. 표시되지 않은 일정이 있을 수 있어요.');
  }catch(e){if(fresh()){setError(e instanceof Error?e.message:'일정을 불러오지 못했어요.');setPhase('error');}}
 },[key,store.user?.id,request]);
 useEffect(()=>{if(active)void load();else generation.current++;return()=>{generation.current++;};},[load,active]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state==='active'&&latest.current.active)void load();});return()=>subscription.remove();},[load]);
 useEffect(()=>{sourceGeneration.current++;setSources([{id:'primary',name:'기본 캘린더',primary:true,canWrite:false}]);setSourceCursor(null);setSourceError('');},[owner]);
 useEffect(()=>()=>{sourceGeneration.current++;},[]);
 async function loadSources(more=false){const run=++sourceGeneration.current,own=owner;setSourceError('');try{const result=await request('/api/calendar/calendars'+(more&&sourceCursor?'?cursor='+encodeURIComponent(sourceCursor):'')) as {items:CalendarSource[];nextCursor:string|null;failedConnectionIds?:string[]};if(run!==sourceGeneration.current||latest.current.owner!==own)return;setSources(previous=>[...new Map([...(more?previous:previous.filter(p=>!!p.connectionId&&result.failedConnectionIds?.includes(p.connectionId))),...result.items.map(c=>{const id=c.primary?'primary':c.id,prior=previous.find(p=>p.connectionId===c.connectionId&&p.id==='@g/'+c.connectionId+'/'+id);return {...c,id:prior?.id??id,...(prior?{primary:false}: {})};})].map(s=>[s.id,s])).values()]);setSourceCursor(result.nextCursor??null);if(result.failedConnectionIds?.length)setSourceError('일부 계정의 목록을 확인하지 못했어요. 이전 목록은 유지돼요.');}catch(e){if(run===sourceGeneration.current&&latest.current.owner===own)setSourceError(e instanceof Error?e.message:'캘린더 목록을 읽지 못했어요.');}}
 function removeEvent(id:string){generation.current++;snapshot.current=snapshot.current.filter(e=>e.id!==id);for(const entry of periods.current.values())entry.items=entry.items.filter(e=>e.id!==id);pageChains.current.clear();setEvents(snapshot.current);}
 function applyEvent(id:string,patch:Partial<CalendarEvent>){snapshot.current=snapshot.current.map(e=>e.id===id?{...e,...patch}:e);for(const entry of periods.current.values())entry.items=entry.items.map(e=>e.id===id?{...e,...patch}:e);setEvents(snapshot.current);}
 return {removeEvent,applyEvent,detailsSupported,events,sources,phase,error,readAt,version,cursors,sourceError,sourceCursor,load,loadSources};
}
