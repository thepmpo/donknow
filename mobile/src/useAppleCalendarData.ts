import {useCallback,useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {appleCalendarDevice} from './apple-calendar-device';
import {appleCalendarSource,appleCalendarPrefix,isAppleCalendar,normalizeAppleEvent,saveAppleCalendar,appleEventVersion} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import type {CalendarEvent,CalendarSource} from './calendar-model';
import type {CalendarDraft} from './calendar-edit-model';
import {eventOccurs,shiftDay} from './calendar-model';
type Snapshot={sources:CalendarSource[];events:CalendarEvent[];readAt:string|null};
const cache=new Map<string,Snapshot>(),listeners=new Map<string,Set<()=>void>>();
export function refreshAppleCalendar(owner:string){listeners.get(owner)?.forEach(fn=>fn());}
export function useAppleCalendarData({owner,start,end,selected,active,enabled,device=appleCalendarDevice}:{owner:string;start:string;end:string;selected:string[];active:boolean;enabled:boolean;device?:AppleCalendarDevice}){
 const key='docen.apple-calendar.snapshot.'+owner,[state,setState]=useState<Snapshot>(()=>cache.get(owner)??{sources:[],events:[],readAt:null}),[error,setError]=useState(''),[loading,setLoading]=useState(false),generation=useRef(0),current=useRef({owner,start,end,selected,active,enabled});current.current={owner,start,end,selected,active,enabled};
 const selectedKey=selected.filter(isAppleCalendar).sort().join('|');
 const load=useCallback(async()=>{if(!device.available||!enabled)return;const run=++generation.current,captured=owner,fresh=()=>run===generation.current&&current.current.owner===captured&&current.current.enabled;setLoading(true);setError('');try{
  if(!await device.granted()){if(fresh()){const empty={sources:[],events:[],readAt:null};cache.delete(owner);setState(empty);await AsyncStorage.removeItem(key);}return;}
  const calendars=await device.calendars();if(!fresh())return;const ids=current.current.selected.filter(isAppleCalendar).map(id=>decodeURIComponent(id.slice(appleCalendarPrefix.length))).filter(id=>calendars.some(c=>c.id===id));
  const items=ids.length?await device.events(ids,start,end):[];if(!fresh())return;const next={sources:calendars.map(appleCalendarSource),events:items.flatMap(e=>{const c=calendars.find(c=>c.id===e.calendarId);return c?[normalizeAppleEvent(e,c)]:[]}),readAt:new Date().toISOString()};cache.set(owner,next);setState(next);void AsyncStorage.setItem(key,JSON.stringify(next)).catch(()=>{});
 }catch(e){if(fresh())setError(e instanceof Error?e.message:'아이폰 일정을 확인하지 못했어요.');}finally{if(fresh())setLoading(false);}},[owner,start,end,selectedKey,enabled,device]);
 useEffect(()=>{let alive=true;const runOwner=owner;if(device.available&&enabled)void AsyncStorage.getItem(key).then(raw=>{if(!alive||current.current.owner!==runOwner||cache.has(owner)||!raw)return;try{const saved=JSON.parse(raw);if(Array.isArray(saved.sources)&&Array.isArray(saved.events)){cache.set(owner,saved);setState(saved);}}catch{}});return()=>{alive=false;generation.current++;};},[owner,device,enabled]);
 useEffect(()=>{if(active)void load();},[active,load]);
 useEffect(()=>{const fn=()=>void load(),set=listeners.get(owner)??new Set();set.add(fn);listeners.set(owner,set);const subscription=AppState.addEventListener('change',s=>{if(s==='active'&&current.current.active)void load();});const timer=active&&enabled&&device.available?setInterval(()=>{if(AppState.currentState==='active')void load();},30000):null;return()=>{set.delete(fn);if(!set.size)listeners.delete(owner);subscription.remove();if(timer)clearInterval(timer);};},[owner,active,enabled,device,load]);
 function matches(e:CalendarEvent){if(!selected.includes(e.calendarId??''))return false;for(let day=start;day<end;day=shiftDay(day,1))if(eventOccurs(e,day,e.timeZone??'Asia/Seoul'))return true;return false;}
 async function save(draft:CalendarDraft,event?:CalendarEvent){const captured=owner,result=await saveAppleCalendar(device,draft,event,()=>current.current.owner===captured&&current.current.enabled);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');setState(old=>{const next={...old,events:[...old.events.filter(e=>e.id!==event?.id&&e.id!==result.id),result]};cache.set(owner,next);return next;});refreshAppleCalendar(owner);return result;}
 async function remove(event:CalendarEvent){const captured=owner;if(!await device.granted())throw Error('ME에서 아이폰 캘린더 접근을 확인해주세요.');const fresh=await device.read(event.eventId!,event.nativeStart);if(current.current.owner!==captured)throw Error('계정이 바뀌었어요.');if(appleEventVersion(fresh)!==event.etag)throw Error('원본이 바뀌었어요. 다시 확인해주세요.');await device.remove(event.eventId!,event.nativeStart);if(current.current.owner===captured){setState(old=>({...old,events:old.events.filter(e=>e.id!==event.id)}));refreshAppleCalendar(owner);}}
 return {available:device.available,sources:enabled?state.sources:[],events:enabled?state.events.filter(matches):[],readAt:state.readAt,error,loading,load,save,remove,cached:state.events};
}
