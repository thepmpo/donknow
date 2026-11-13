import {useCallback,useEffect,useRef,useState} from 'react';
import {validCalendarPage} from './http-response';
import type {TodoStore} from './useTodos';
import type {CalendarEvent,CalendarSource} from './calendar-model';
type Page={items:CalendarEvent[];nextCursor?:string|null;connectionState?:string;canWrite?:boolean;readAt?:string;calendarName?:string};
export function useCalendarData(store:TodoStore,{start,end,month,timeZone,selected,active}:{start:string;end:string;month:string;timeZone:string;selected:string[];active:boolean}){
 const [events,setEvents]=useState<CalendarEvent[]>([]),[sources,setSources]=useState<CalendarSource[]>([{id:'primary',name:'기본 캘린더',primary:true,canWrite:false}]);
 const [phase,setPhase]=useState<'unconnected'|'loading'|'ready'|'partial'|'error'>('unconnected'),[error,setError]=useState(''),[readAt,setReadAt]=useState<string|null>(null),[cursors,setCursors]=useState<Record<string,string>>({}),[version,setVersion]=useState<2|1|0>(0),[sourceError,setSourceError]=useState(''),[sourceCursor,setSourceCursor]=useState<string|null>(null);
 const generation=useRef(0),sourceGeneration=useRef(0),lastKey=useRef(''),snapshot=useRef<CalendarEvent[]>([]),cursorRef=useRef(cursors);cursorRef.current=cursors;
 const owner=store.connection?.mode==='cloud'?store.connection.baseUrl+':'+store.user?.id:'demo';
 const key=JSON.stringify([owner,start,end,timeZone,selected]),latest=useRef({key,owner,active});latest.current={key,owner,active};
 const request=store.featureRequest;
 const load=useCallback(async(more=false)=>{
  const run=++generation.current,requestKey=key;
  if(!store.user){snapshot.current=[];setEvents([]);setPhase('unconnected');return;}
  const fresh=()=>run===generation.current&&latest.current.key===requestKey&&latest.current.active;
  if(lastKey.current!==key){snapshot.current=[];setEvents([]);setReadAt(null);cursorRef.current={};setCursors({});lastKey.current=key;}
  setPhase('loading');setError('');
  try{
   const caps=await request('/api/capabilities') as {calendarWorkspace?:number};if(!fresh())return;const v=caps.calendarWorkspace===2?2:1;setVersion(v);
   const ids=v===2?selected:['primary'];if(!ids.length){snapshot.current=[];setEvents([]);setPhase('ready');setCursors({});return;}
   const pages=await Promise.allSettled(ids.filter(id=>!more||cursorRef.current[id]).map(async id=>{
    const query=new URLSearchParams({month,...(v===2?{v:'2',calendarId:id,timeZone,start,end}:{}),...(more&&cursorRef.current[id]?{cursor:cursorRef.current[id]}:{})});
    const result=await request('/api/calendar/events?'+query) as Page;if(!validCalendarPage(result))throw Error('일정 응답 형식을 확인하지 못했어요. 다시 확인해주세요.');return {id,result};
   }));if(!fresh())return;
   const ok=pages.filter((p):p is PromiseFulfilledResult<{id:string;result:Page}>=>p.status==='fulfilled'),failed=pages.filter(p=>p.status==='rejected');
   if(!ok.length&&failed.length)throw (failed[0] as PromiseRejectedResult).reason;
   const next:Record<string,string>={...(more?cursorRef.current:{})};
   const incoming=ok.flatMap(({value:{id,result}})=>{if(result.nextCursor)next[id]=result.nextCursor;else delete next[id];return result.items??[];});
   snapshot.current=[...new Map([...(more?snapshot.current:snapshot.current.filter(e=>!ok.some(p=>p.value.id===(e.calendarId??'primary')))),...incoming].map(e=>[e.id,e])).values()];setEvents(snapshot.current);setCursors(next);
   setSources(old=>old.map(s=>{const p=ok.find(p=>p.value.id===s.id)?.value.result;return p?{...s,name:p.calendarName??s.name,canWrite:p.canWrite===true}:s;}));
   setReadAt(ok.map(p=>p.value.result.readAt).filter((v):v is string=>!!v).sort().at(-1)??null);
   const unconnected=ok.every(p=>p.value.result.connectionState==='unconnected');
   setPhase(unconnected?'unconnected':failed.length||Object.keys(next).length?'partial':'ready');
   if(failed.length)setError('일부 캘린더를 확인하지 못했어요. 표시되지 않은 일정이 있을 수 있어요.');
  }catch(e){if(fresh()){setError(e instanceof Error?e.message:'일정을 불러오지 못했어요.');setPhase('error');}}
 },[key,store.user?.id,request]);
 useEffect(()=>{if(active)void load();else generation.current++;return()=>{generation.current++;};},[load,active]);
 useEffect(()=>{sourceGeneration.current++;setSources([{id:'primary',name:'기본 캘린더',primary:true,canWrite:false}]);setSourceCursor(null);setSourceError('');},[owner]);
 useEffect(()=>()=>{sourceGeneration.current++;},[]);
 async function loadSources(more=false){const run=++sourceGeneration.current,own=owner;setSourceError('');try{const result=await request('/api/calendar/calendars'+(more&&sourceCursor?'?cursor='+encodeURIComponent(sourceCursor):'')) as {items:CalendarSource[];nextCursor:string|null};if(run!==sourceGeneration.current||latest.current.owner!==own)return;setSources(previous=>[...new Map([...(more?previous:[]),...result.items.map(c=>({...c,id:c.primary?'primary':c.id}))].map(s=>[s.id,s])).values()]);setSourceCursor(result.nextCursor??null);}catch(e){if(run===sourceGeneration.current&&latest.current.owner===own)setSourceError(e instanceof Error?e.message:'캘린더 목록을 읽지 못했어요.');}}
 return {events,sources,phase,error,readAt,version,cursors,sourceError,sourceCursor,load,loadSources};
}
