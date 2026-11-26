import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';
import type {AppleCalendarDevice,DeviceCalendar,DeviceEvent,DeviceEventPatch} from './apple-calendar-model';

type NativePatch=Omit<DeviceEventPatch,'repeat'>&{repeatFrequency?:string};
type NativeSnapshot=Omit<DeviceEvent,'startDate'|'endDate'|'modified'|'alarms'>&{
 startDate:number;endDate:number;modified?:number;alarms?:{absoluteDate?:number;relativeOffset?:number}[];
};
type CalendarModule={
 addListener:(name:string,listener:()=>void)=>{remove:()=>void};
 readCalendarSnapshot?:(hidden:string[],start:number,end:number)=>Promise<{calendars:DeviceCalendar[];events:NativeSnapshot[]}>;
 calendarList:()=>Promise<DeviceCalendar[]>;
 readEvents:(ids:string[],start:number,end:number)=>Promise<NativeSnapshot[]>;
 readEvent:(id:string,start:number|null,calendarId:string|null)=>Promise<NativeSnapshot>;
 createEvent:(calendarId:string,patch:NativePatch)=>Promise<NativeSnapshot>;
 updateEvent:(id:string,start:number|null,calendarId:string|null,patch:NativePatch)=>Promise<NativeSnapshot>;
 deleteEvent:(id:string,start:number|null,calendarId:string|null)=>Promise<void>;
};
const native=()=>Platform.OS==='ios'?requireOptionalNativeModule<CalendarModule>('DuckduckCalendarChanges'):null;
const iso=(value:number)=>new Date(value).toISOString();
function fromNative({startDate,endDate,modified,alarms,...event}:NativeSnapshot):DeviceEvent{
 return {...event,startDate:iso(startDate),endDate:iso(endDate),modified:modified==null?undefined:iso(modified),
  alarms:alarms?.map(({absoluteDate,relativeOffset})=>absoluteDate==null?{relativeOffset}:{absoluteDate:iso(absoluteDate)})};
}
function fields({repeat,...patch}:DeviceEventPatch):NativePatch{
 return {...patch,...(repeat?{repeatFrequency:repeat}:{})};
}
function requireBridge(){
 const module=native();
 if(!module?.readEvents)throw Error('아이폰 캘린더를 사용하려면 도슨을 업데이트해주세요.');
 return module;
}
const occurrenceStart=(start?:string)=>start?Date.parse(start):null;
export const appleCalendarDevice:AppleCalendarDevice={
 available:Platform.OS==='ios',
 subscribe(listener){
  const subscription=native()?.addListener('onStoreChange',listener);
  return ()=>subscription?.remove();
 },
 async granted(){const C=await import('expo-calendar');return (await C.getCalendarPermissions(false)).granted;},
 async authorize(){const C=await import('expo-calendar');return (await C.requestCalendarPermissions(false)).granted;},
 async calendars(){
  return requireBridge().calendarList();
 },
 async snapshot(hidden,start,end){
  const bridge=requireBridge(),from=Date.parse(start+'T00:00:00'),to=Date.parse(end+'T00:00:00');
  if(bridge.readCalendarSnapshot){
   const snapshot=await bridge.readCalendarSnapshot(hidden,from,to);
   return {...snapshot,events:snapshot.events.map(fromNative)};
  }
  const calendars=await bridge.calendarList(),ids=calendars.filter(calendar=>!hidden.includes(calendar.id)).map(calendar=>calendar.id);
  return {calendars,events:ids.length?(await bridge.readEvents(ids,from,to)).map(fromNative):[]};
 },
 async events(ids,start,end){
  const snapshots=await requireBridge().readEvents(ids,Date.parse(start+'T00:00:00'),Date.parse(end+'T00:00:00'));
  return snapshots.map(fromNative);
 },
 async read(id,start,calendarId){return fromNative(await requireBridge().readEvent(id,occurrenceStart(start),calendarId??null));},
 async create(calendarId,patch){return fromNative(await requireBridge().createEvent(calendarId,fields(patch)));},
 async update(id,start,patch,calendarId){
  return fromNative(await requireBridge().updateEvent(id,occurrenceStart(start),calendarId??null,fields(patch)));
 },
 async remove(id,start,calendarId){await requireBridge().deleteEvent(id,occurrenceStart(start),calendarId??null);},
};
