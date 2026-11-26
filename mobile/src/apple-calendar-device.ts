import {requireOptionalNativeModule} from 'expo';
import {Platform} from 'react-native';
import type {AppleCalendarDevice,DeviceEvent,DeviceEventPatch} from './apple-calendar-model';

type NativePatch=Omit<DeviceEventPatch,'repeat'>&{repeatFrequency?:string};
type NativeSnapshot=Omit<DeviceEvent,'startDate'|'endDate'|'modified'|'alarms'>&{
 startDate:number;endDate:number;modified?:number;alarms?:{absoluteDate?:number;relativeOffset?:number}[];
};
type CalendarModule={
 addListener:(name:string,listener:()=>void)=>{remove:()=>void};
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
  const C=await import('expo-calendar');
  return (await C.getCalendars(C.EntityTypes.EVENT)).map(c=>({id:c.id,title:c.title,writable:c.allowsModifications,
   color:c.color,account:c.source?.name,accountId:c.source?.id}));
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
