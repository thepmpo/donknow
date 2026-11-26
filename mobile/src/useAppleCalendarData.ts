import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appleCalendarDevice} from './apple-calendar-device';
import {appleCalendarSource,appleCalendarPrefix,isAppleCalendar,normalizeAppleEvent,saveAppleCalendar,appleEventVersion} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {CalendarDraft} from './calendar-edit-model';
import {eventOverlaps,shiftDay} from './calendar-model';
type Snapshot={owner?:string;start?:string;end?:string;selection?:string;calendarIds?:string[];sources:CalendarSource[];events:CalendarEvent[];readAt:string|null};
function displayEvent({id,eventId,nativeStart,externalUid,calendarId,calendarName,provider,color,title,dueDate,endDate,startAt,endAt,allDay,timeZone,recurring}:CalendarEvent):CalendarEvent{
 return {id,eventId,nativeStart,externalUid,calendarId,calendarName,provider,color,title,dueDate,endDate,startAt,endAt,allDay,timeZone,recurring,canWrite:false};
}
const emptyEvents:CalendarEvent[]=[],emptySources:CalendarSource[]=[],emptyIds:string[]=[];
const cache=new Map<string,Snapshot>(),listeners=new Map<string,Set<()=>void>>();
export function refreshAppleCalendar(owner:string){listeners.get(owner)?.forEach(fn=>fn());}
export function useAppleCalendarData({owner,start,end,timeZone,selected,active,enabled,device=appleCalendarDevice}:{owner:string;start:string;end:string;timeZone:string;selected:string[];active:boolean;enabled:boolean;device?:AppleCalendarDevice}){
 const key='docen.apple-calendar.snapshot.'+owner,[state,setState]=useState<Snapshot>(()=>cache.get(owner)??{sources:[],events:[],readAt:null}),[error,setError]=useState(''),[loading,setLoading]=useState(false),generation=useRef(0),current=useRef({owner,start,end,selected,active,enabled});current.current={owner,start,end,selected,active,enabled};
 const selectedKey=JSON.stringify(selected.filter(isAppleCalendar).sort());
 const windowStart=shiftDay(start,-1),windowEnd=shiftDay(end,1);
 const covers=(snapshot:Snapshot|undefined)=>snapshot?.owner===owner&&snapshot.selection===selectedKey&&!!snapshot.start&&!!snapshot.end&&snapshot.start<=start&&snapshot.end>=end;
 const load=useCallback(async()=>{if(!device.available||!enabled)return;const run=++generation.current,captured=owner,fresh=()=>run===generation.current&&current.current.owner===captured&&current.current.enabled;setLoading(true);setError('');try{
  if(!await device.granted()){if(fresh()){const empty={owner,sources:[],events:[],readAt:null};cache.set(owner,empty);setState(empty);if(current.current.selected.some(isAppleCalendar))setError('아이폰 캘린더 접근이 해제됐어요. ME에서 접근 권한을 확인해주세요.');await AsyncStorage.removeItem(key);}return;}
  const calendars=await device.calendars();if(!fresh())return;const ids=current.current.selected.filter(isAppleCalendar).map(id=>decodeURIComponent(id.slice(appleCalendarPrefix.length))).filter(id=>calendars.some(c=>c.id===id));
  const first=shiftDay(windowStart,-14),last=shiftDay(windowEnd,14);
  const items=ids.length?await device.events(ids,first,last):[];if(!fresh())return;
  const byId=new Map(calendars.map(calendar=>[calendar.id,calendar]));
  const events=items.flatMap(item=>{
   const calendar=byId.get(item.calendarId);
   return calendar&&Number.isFinite(Date.parse(item.startDate))&&Number.isFinite(Date.parse(item.endDate))?[normalizeAppleEvent(item,calendar)]:[];
  });
  const sources=calendars.map(appleCalendarSource),previous=cache.get(owner);
  const calendarIds=ids.map(id=>appleCalendarPrefix+encodeURIComponent(id));
  const next={owner,start:first,end:last,selection:selectedKey,calendarIds:JSON.stringify(calendarIds)===JSON.stringify(previous?.calendarIds)?previous!.calendarIds:calendarIds,
   sources:JSON.stringify(previous?.sources)===JSON.stringify(sources)?previous!.sources:sources,
   events:JSON.stringify(previous?.events)===JSON.stringify(events)?previous!.events:events,readAt:new Date().toISOString()};
  cache.set(owner,next);setState(next);
  if(next.events!==previous?.events||next.sources!==previous?.sources||next.start!==previous?.start||next.end!==previous?.end){
   const visibleRange=next.events.filter(event=>eventOverlaps(event,start,end,timeZone));
   const visibleIds=new Set(visibleRange.map(event=>event.id));
   const display=[...visibleRange,...next.events.filter(event=>!visibleIds.has(event.id))].slice(0,1000).map(displayEvent);
   void AsyncStorage.setItem(key,JSON.stringify({...next,calendarIds:[],sources:next.sources.map(source=>({...source,canWrite:false})),events:display})).catch(()=>{});
  }
 }catch(e){if(fresh())setError(e instanceof Error?e.message:'아이폰 일정을 확인하지 못했어요.');}finally{if(fresh())setLoading(false);}},[owner,windowStart,windowEnd,selectedKey,enabled,device,start,end,timeZone]);
 useEffect(()=>{let alive=true;const runOwner=owner;if(device.available&&enabled)void AsyncStorage.getItem(key).then(raw=>{if(!alive||current.current.owner!==runOwner||cache.has(owner)||!raw)return;try{const saved=JSON.parse(raw);if(Array.isArray(saved.sources)&&Array.isArray(saved.events)){const display:Snapshot={...saved,owner,selection:undefined,calendarIds:[],events:saved.events.map(displayEvent),sources:saved.sources.map((source:CalendarSource)=>({...source,canWrite:false}))};cache.set(owner,display);setState(display);}}catch{}});return()=>{alive=false;generation.current++;};},[owner,device,enabled]);
 const activeBefore=useRef(false);
 useEffect(()=>{
  const wasActive=activeBefore.current;activeBefore.current=active;
  const cached=cache.get(owner);
  if(active&&(!wasActive||!covers(cached)||!cached?.readAt||Date.now()-Date.parse(cached.readAt)>15000))void load();
 },[active,load]);
 useEffect(()=>{
  const fn=()=>void load(),set=listeners.get(owner)??new Set();set.add(fn);listeners.set(owner,set);
  const foreground=()=>AppState.currentState==='active'&&current.current.active;
  const subscription=AppState.addEventListener('change',s=>{if(s==='active'&&current.current.active)fn();});
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const unsubscribe=active&&enabled?device.subscribe?.(()=>{if(foreground()&&!debounce)debounce=setTimeout(()=>{debounce=undefined;fn();},200);}):undefined;
  const timer=active&&enabled&&device.available?setInterval(()=>{if(foreground())fn();},15000):null;
  return()=>{set.delete(fn);if(!set.size)listeners.delete(owner);subscription.remove();unsubscribe?.();clearTimeout(debounce);if(timer)clearInterval(timer);};
 },[owner,active,enabled,device,load]);
 const visible=useMemo(()=>{
  if(!enabled||state.owner!==owner)return emptyEvents;
  const ids=new Set(JSON.parse(selectedKey) as string[]);
  return state.events.filter(event=>ids.has(event.calendarId??'')&&eventOverlaps(event,start,end,timeZone));
 },[enabled,state.owner,state.events,owner,start,end,selectedKey,timeZone]);
 async function save(draft:CalendarDraft,event?:CalendarEvent){const captured=owner,result=await saveAppleCalendar(device,draft,event,()=>current.current.owner===captured&&current.current.enabled);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');setState(old=>{const next={...old,events:[...old.events.filter(e=>e.id!==event?.id&&e.id!==result.id),result]};cache.set(owner,next);return next;});refreshAppleCalendar(owner);return result;}
 async function remove(event:CalendarEvent){const captured=owner;if(!await device.granted())throw Error('ME에서 아이폰 캘린더 접근을 확인해주세요.');const rawId=decodeURIComponent(event.calendarId!.slice(appleCalendarPrefix.length));const fresh=await device.read(event.eventId!,event.nativeStart,rawId);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');if(appleEventVersion(fresh)!==event.etag)throw Error('원본이 바뀌었어요. 다시 확인해주세요.');await device.remove(event.eventId!,event.nativeStart,rawId);if(current.current.owner===captured){setState(old=>({...old,events:old.events.filter(e=>e.id!==event.id)}));refreshAppleCalendar(owner);}}
 return {available:device.available,sources:enabled&&state.owner===owner?state.sources:emptySources,events:visible,readAt:state.readAt,error,loading,load,save,remove,cached:state.owner===owner?state.events:emptyEvents,covered:enabled&&covers(state)?state.calendarIds??emptyIds:emptyIds};
}
