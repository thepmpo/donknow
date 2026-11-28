import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appleCalendarDevice} from './apple-calendar-device';
import {appleCalendarSource,appleCalendarPrefix,isAppleCalendar,normalizeAppleEvent,saveAppleCalendar,appleEventVersion} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {CalendarDraft} from './calendar-edit-model';
import {deviceZone,eventOverlaps,shiftDay} from './calendar-model';
import {captureConfirmedCalendarWrites} from './calendar-write-overlay';
type Snapshot={owner?:string;start?:string;end?:string;selection?:string;calendarIds?:string[];sources:CalendarSource[];events:CalendarEvent[];readAt:string|null};
function displayEvent({id,eventId,nativeStart,externalUid,calendarId,calendarName,provider,color,title,dueDate,endDate,startAt,endAt,allDay,timeZone,recurring}:CalendarEvent):CalendarEvent{
 return {id,eventId,nativeStart,externalUid,calendarId,calendarName,provider,color,title,dueDate,endDate,startAt,endAt,allDay,timeZone,recurring,canWrite:false};
}
const emptyEvents:CalendarEvent[]=[],emptySources:CalendarSource[]=[],emptyIds:string[]=[];
const cache=new Map<string,Snapshot>(),listeners=new Map<string,Set<()=>void>>();
export function refreshAppleCalendar(owner:string){listeners.get(owner)?.forEach(fn=>fn());}
export async function refreshStoredAppleCalendar(owner:string,device:AppleCalendarDevice,current:()=>boolean){
 const key='docen.apple-calendar.snapshot.'+owner;
 const raw=await AsyncStorage.getItem(key);
 if(!raw||!device.snapshot||!current())return;
 const previous=JSON.parse(raw) as Snapshot;
 if(previous.owner!==owner||!previous.start||!previous.end||!previous.selection)return;
 const hidden=new Set<string>(JSON.parse(previous.selection));
 const snapshot=await device.snapshot([],previous.start,previous.end);
 if(!current())return;
 const calendars=new Map(snapshot.calendars.map(calendar=>[calendar.id,calendar]));
 const events=snapshot.events.flatMap(item=>{
  const calendar=calendars.get(item.calendarId);
  if(!calendar||hidden.has(appleCalendarSource(calendar).id)||!Number.isFinite(Date.parse(item.startDate))||!Number.isFinite(Date.parse(item.endDate)))return [];
  return [displayEvent(normalizeAppleEvent(item,calendar))];
 }).slice(0,1000);
 const sources=snapshot.calendars.map(calendar=>({...appleCalendarSource(calendar),canWrite:false}));
 if(!current())return;
 const next={...previous,calendarIds:[],sources,events,readAt:new Date().toISOString()};
 await AsyncStorage.setItem(key,JSON.stringify(next));
 if(current())cache.set(owner,{...next,selection:undefined});
 return true;
}
export function useAppleCalendarData({owner,start,end,timeZone,selected,hidden=[],active,refreshWhileHidden=false,refreshKey,enabled,device=appleCalendarDevice}:{owner:string;start:string;end:string;timeZone:string;selected:string[];hidden?:string[];active:boolean;refreshWhileHidden?:boolean;refreshKey?:number;enabled:boolean;device?:AppleCalendarDevice}){
 const key='docen.apple-calendar.snapshot.'+owner,[state,setState]=useState<Snapshot>(()=>cache.get(owner)??{sources:[],events:[],readAt:null}),[error,setError]=useState(''),[loading,setLoading]=useState(false),generation=useRef(0),current=useRef({owner,start,end,selected,active,enabled});current.current={owner,start,end,selected,active,enabled};
 const hiddenKey=JSON.stringify(hidden.filter(isAppleCalendar).sort());
 const windowStart=shiftDay(start,-1),windowEnd=shiftDay(end,1);
 const covers=(snapshot:Snapshot|undefined)=>snapshot?.owner===owner&&snapshot.selection===hiddenKey&&!!snapshot.start&&!!snapshot.end&&snapshot.start<=start&&snapshot.end>=end;
 const load=useCallback(async()=>{if(!device.available||!enabled)return;const run=++generation.current,captured=owner,fresh=()=>run===generation.current&&current.current.owner===captured&&current.current.enabled;const applyConfirmedWrites=captureConfirmedCalendarWrites(owner,'apple-calendar');setLoading(true);setError('');try{
  // The native snapshot enforces EventKit access itself.
  if(!device.snapshot&&!await device.granted())throw Object.assign(Error(),{code:'ERR_ACCESS_REQUIRED'});
  const hiddenIds=new Set<string>(JSON.parse(hiddenKey));
  const first=shiftDay(windowStart,-14),last=shiftDay(windowEnd,14);

  const snapshot=device.snapshot?await device.snapshot(
   [],first,last
  ):null;
  if(!fresh())return;
  const calendars=snapshot?.calendars??await device.calendars(),ids=calendars.map(calendar=>calendar.id);
  if(!fresh())return;
  const items=snapshot?.events??(ids.length?await device.events(ids,first,last):[]);
  if(!fresh())return;
  const byId=new Map(calendars.map(calendar=>[calendar.id,calendar]));
  const events=items.flatMap(item=>{
   const calendar=byId.get(item.calendarId);
   return calendar&&Number.isFinite(Date.parse(item.startDate))&&Number.isFinite(Date.parse(item.endDate))?[normalizeAppleEvent(item,calendar)]:[];
  });
  const sources=calendars.map(appleCalendarSource),previous=cache.get(owner);
  const calendarIds=ids.map(id=>appleCalendarPrefix+encodeURIComponent(id)).filter(id=>!hiddenIds.has(id));
  const next={owner,start:first,end:last,selection:hiddenKey,calendarIds:JSON.stringify(calendarIds)===JSON.stringify(previous?.calendarIds)?previous!.calendarIds:calendarIds,
   sources:JSON.stringify(previous?.sources)===JSON.stringify(sources)?previous!.sources:sources,
   events:JSON.stringify(previous?.events)===JSON.stringify(events)?previous!.events:events,readAt:new Date().toISOString()};
  cache.set(owner,next);setState(next);
  applyConfirmedWrites.apply(new Set(sources.map(source=>source.id)),first,last,deviceZone());
  if(next.events!==previous?.events||next.sources!==previous?.sources||next.start!==previous?.start||next.end!==previous?.end){
   const displayEvents=next.events.filter(event=>!hiddenIds.has(event.calendarId??''));
   const visibleRange=displayEvents.filter(event=>eventOverlaps(event,start,end,timeZone));
   const visibleIds=new Set(visibleRange.map(event=>event.id));
   const display=[...visibleRange,...displayEvents.filter(event=>!visibleIds.has(event.id))].slice(0,1000).map(displayEvent);
   void AsyncStorage.setItem(key,JSON.stringify({...next,calendarIds:[],sources:next.sources.map(source=>({...source,canWrite:false})),events:display})).catch(()=>{});
  }
 }catch(e){
  if(!fresh())return;
  if(e&&typeof e==='object'&&'code' in e&&e.code==='ERR_ACCESS_REQUIRED'){
   const empty={owner,sources:[],events:[],readAt:null};
   cache.set(owner,empty);setState(empty);
   setError('iPhone 캘린더에 전체 접근을 허용해주세요.');
   await AsyncStorage.removeItem(key).catch(()=>{});
  }else setError(e instanceof Error?e.message:'아이폰 일정을 확인하지 못했어요.');
 }finally{if(fresh())setLoading(false);}},[owner,windowStart,windowEnd,hiddenKey,enabled,device,start,end,timeZone]);
 useEffect(()=>{let alive=true;const runOwner=owner;if(device.available&&enabled)void AsyncStorage.getItem(key).then(raw=>{if(!alive||current.current.owner!==runOwner||cache.has(owner)||!raw)return;try{const saved=JSON.parse(raw);if(Array.isArray(saved.sources)&&Array.isArray(saved.events)){const display:Snapshot={...saved,owner,selection:undefined,calendarIds:[],events:saved.events.map(displayEvent),sources:saved.sources.map((source:CalendarSource)=>({...source,canWrite:false}))};cache.set(owner,display);setState(display);}}catch{}});return()=>{alive=false;generation.current++;};},[owner,device,enabled]);
 useEffect(()=>{if(active||refreshWhileHidden)void load();},[active,refreshWhileHidden,refreshKey,load]);
 useEffect(()=>{
  const fn=()=>void load(),set=listeners.get(owner)??new Set();set.add(fn);listeners.set(owner,set);
  const keepReading=active||refreshWhileHidden;
  const foreground=()=>AppState.currentState==='active'&&(current.current.active||refreshWhileHidden);
  const subscription=AppState.addEventListener('change',s=>{if(s==='active'&&foreground())fn();});
  let debounce:ReturnType<typeof setTimeout>|undefined;
  const unsubscribe=keepReading&&enabled?device.subscribe?.(()=>{if(foreground()&&!debounce)debounce=setTimeout(()=>{debounce=undefined;fn();},200);}):undefined;
  const timer=keepReading&&enabled&&device.available?setInterval(()=>{if(foreground())fn();},15000):null;
  return()=>{set.delete(fn);if(!set.size)listeners.delete(owner);subscription.remove();unsubscribe?.();clearTimeout(debounce);if(timer)clearInterval(timer);};
 },[owner,active,refreshWhileHidden,enabled,device,load]);
 const visible=useMemo(()=>{
  if(!enabled||state.owner!==owner)return emptyEvents;
  const hiddenIds=new Set<string>(JSON.parse(hiddenKey));
  return state.events.filter(event=>!hiddenIds.has(event.calendarId??'')&&eventOverlaps(event,start,end,timeZone));
 },[enabled,state.owner,state.events,owner,start,end,hiddenKey,timeZone]);
 function confirmedAbsent(event:CalendarEvent){
  return enabled&&event.provider==='apple-calendar'&&covers(state)&&
   state.sources.some(source=>source.id===event.calendarId)&&eventOverlaps(event,state.start!,state.end!,deviceZone())&&
   !state.events.some(item=>item.id===event.id||(!event.recurring&&item.calendarId===event.calendarId&&item.eventId===event.eventId));
 }
 async function checkEvent(event:CalendarEvent){
  if(!event.eventId||!isAppleCalendar(event.calendarId)||!await device.granted())throw Error('아이폰 캘린더 접근을 확인해주세요.');
  const rawId=decodeURIComponent(event.calendarId!.slice(appleCalendarPrefix.length));
  const calendar=(await device.calendars()).find(item=>item.id===rawId);
  if(!calendar)throw Error('원본 캘린더를 확인할 수 없어요. 목록을 다시 확인해주세요.');
  let value;
  try{value=await device.read(event.eventId,event.nativeStart??event.startAt??undefined,rawId);}
  catch(error){
   if(event.recurring||!event.externalUid||!device.readLinked)throw error;
   try{value=await device.readLinked(event.externalUid,rawId);}
   catch{
    if(await device.isLinkedEventMissing?.(event.eventId,event.externalUid,rawId))return null;
    throw error;
   }
  }
  if(current.current.owner!==owner||!current.current.enabled)throw Error('계정이 바뀌었어요.');
  return normalizeAppleEvent(value,calendar);
 }
 async function save(draft:CalendarDraft,event?:CalendarEvent){const captured=owner,result=await saveAppleCalendar(device,draft,event,()=>current.current.owner===captured&&current.current.enabled);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');setState(old=>{const next={...old,events:[...old.events.filter(e=>e.id!==event?.id&&e.id!==result.id),result]};cache.set(owner,next);return next;});refreshAppleCalendar(owner);return result;}
 async function remove(event:CalendarEvent){const captured=owner;if(!await device.granted())throw Error('ME에서 아이폰 캘린더 접근을 확인해주세요.');const rawId=decodeURIComponent(event.calendarId!.slice(appleCalendarPrefix.length));const fresh=await device.read(event.eventId!,event.nativeStart,rawId);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');if(appleEventVersion(fresh)!==event.etag)throw Error('원본이 바뀌었어요. 다시 확인해주세요.');await device.remove(event.eventId!,event.nativeStart,rawId);if(current.current.owner===captured){setState(old=>({...old,events:old.events.filter(e=>e.id!==event.id)}));refreshAppleCalendar(owner);}}
 return {available:device.available,sources:enabled&&state.owner===owner?state.sources:emptySources,events:visible,observed:enabled&&covers(state)?state.events:emptyEvents,readAt:enabled&&covers(state)?state.readAt:null,error,loading,load,save,remove,checkEvent,confirmedAbsent,cached:state.owner===owner?state.events:emptyEvents,covered:enabled&&covers(state)?state.calendarIds??emptyIds:emptyIds};
}
