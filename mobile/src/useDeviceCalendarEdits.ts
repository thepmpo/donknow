import {useEffect,useRef,useSyncExternalStore} from 'react';
import {AppState,Platform} from 'react-native';
import {appleCalendarPrefix,appleEventPatch,appleEventVersion,normalizeAppleEvent} from './apple-calendar-model';
import type {AppleCalendarDevice,DeviceEvent} from './apple-calendar-model';
import {calendarDuckPatch,calendarWriteArgs,confirmedCalendarPatch,docenEventPayload} from './calendar-edit-model';
import type {CalendarDraft} from './calendar-edit-model';
import {deviceCalendarEdits} from './calendar-device-queue';
import type {CalendarEditQueue,QueuedCalendarEdit} from './calendar-device-queue';
import type {CalendarPending} from './CalendarEventEditor';
import {wallTime} from './calendar-model';
import type {CalendarEvent} from './calendar-model';
import {HttpResponseError} from './http-response';
import type {TodoStore} from './useTodos';

const empty:readonly QueuedCalendarEdit[]=[];
export const calendarEditSending=new Set<string>();
const conflict=(reason:string)=>new HttpResponseError(409,reason);
function appleMatches(original:CalendarEvent,draft:CalendarDraft,event:DeviceEvent){
 const patch=appleEventPatch(draft,original);
 return Object.entries(patch).every(([key,value])=>{
  if(key==='timeZone'||draft.allDay&&(key==='startDate'||key==='endDate'))return true;
  if(key==='startDate'||key==='endDate')return Date.parse(String(value))===Date.parse(event[key]);
  if(key==='alarms')return JSON.stringify(event.alarms??[])===JSON.stringify(value);
  return (event[key as keyof DeviceEvent]??'')===value;
 });
}
export async function sendCalendarEdit(job:QueuedCalendarEdit,context:{
 device:AppleCalendarDevice;request:TodoStore['featureRequest'];
 saveApple:(draft:CalendarDraft,event:CalendarEvent)=>Promise<CalendarEvent>;
 current:()=>boolean;saveAction:(id:string)=>Promise<void>;
}){
   const {request,current}=context;
   const {original,draft}=job;
   if(original.provider==='docen'){
    const path='/api/calendar/docen/'+encodeURIComponent(original.eventId!);
    return await request(path,'PUT',{...docenEventPayload(draft,original),deviceReplay:true}) as CalendarEvent;
   }
   if(original.provider==='apple-calendar'){
    if(!await context.device.granted())throw conflict('ME에서 아이폰 캘린더 전체 접근을 확인해주세요.');
    const rawId=decodeURIComponent(draft.calendarId.slice(appleCalendarPrefix.length));
    let raw;
    try{raw=await context.device.read(original.eventId!,original.nativeStart,rawId);}
    catch(error){
     if(!original.recurring){
      const code=(error as {code?:unknown})?.code;
      if(code==='ERR_EVENT_UNAVAILABLE'||code==='ERR_EVENT_NOT_FOUND')throw conflict('아이폰 원본에서 일정을 찾지 못했어요. 기기에 변경 내용을 보관했어요.');
      throw error;
     }
     const movedStart=wallTime(draft.startDay,draft.allDay?'00:00':draft.startTime,draft.timeZone);
     raw=await context.device.read(original.eventId!,movedStart,rawId);
    }
    if(!current())throw Error('계정이 바뀌었어요.');
    if(appleMatches(original,draft,raw)){
     const calendar=(await context.device.calendars()).find(item=>item.id===rawId);
     if(!calendar)throw conflict('아이폰 캘린더 목록을 확인해주세요.');
     return normalizeAppleEvent(raw,calendar);
    }
    if(appleEventVersion(raw)!==original.etag)throw conflict('아이폰 원본 일정이 바뀌었어요. 현재 내용을 확인해주세요.');
    return context.saveApple(draft,original);
   }
   const args=calendarWriteArgs(draft,original,!job.metadataAvailable);
   const fields=job.metadataAvailable?calendarDuckPatch(draft,original):{};
   let result:CalendarPending|undefined;
   if(args){
    const actionId=job.actionId??(await request('/api/assistant/actions','POST',{operation:'calendar.update',args:{...args,connectionId:original.connectionId??undefined}}) as CalendarPending).id;
    if(!job.actionId)await context.saveAction(actionId);
    if(!current())throw Error('계정이 바뀌었어요.');
    result=await request('/api/assistant/actions/'+actionId) as CalendarPending;
    if(result.status==='pending')result=await request('/api/assistant/actions/'+actionId+'/confirm','POST',{confirmation:true}) as CalendarPending;
    if(result.status==='unknown')throw conflict('Google 일정 저장 결과를 원본에서 확인해주세요.');
    if(result.status!=='succeeded')throw conflict('Google 일정 변경을 확인하지 못했어요.');
   }
   const id=result?.result?.id??original.eventId;
   let details=original.duckDetails;
   if(Object.keys(fields).length){
    details=await request('/api/calendar/event-details','PATCH',{connectionId:original.connectionId,calendarId:draft.calendarId,eventId:id,
     expectedRevision:draft.calendarId!==(original.calendarId??'primary')?0:original.duckDetails?.revision??0,patch:fields,timeZone:draft.timeZone}) as CalendarEvent['duckDetails'];
   }
   return {...original,...confirmedCalendarPatch(draft,original),eventId:id,duckDetails:details,etag:result?.result?.etag??original.etag};
  }
export function useDeviceCalendarEdits(store:TodoStore,owner:string,device:AppleCalendarDevice,metadataAvailable:boolean,
 saveApple:(draft:CalendarDraft,event:CalendarEvent)=>Promise<CalendarEvent>,onSaved:(saved:CalendarEvent,old:CalendarEvent)=>Promise<void>,injectedQueue?:CalendarEditQueue){
 const enabled=(Platform.OS==='ios'||!!injectedQueue)&&!!store.user?.emailVerified&&store.connection?.mode==='cloud';
 const queue=injectedQueue??deviceCalendarEdits;
 const jobs=useSyncExternalStore(fn=>enabled?queue.watch(owner,fn):()=>{},()=>enabled?queue.snapshot(owner)??empty:empty);
 const latest=useRef({store,owner,device,saveApple,onSaved});latest.current={store,owner,device,saveApple,onSaved};
 useEffect(()=>{
  if(!enabled)return;
  let stopped=false,retryAt=0;
  const context=latest.current,current=()=>!stopped&&latest.current.owner===owner&&context.store.isCurrentSession();
  async function flush(){
   if(!current()||calendarEditSending.has(owner)||Date.now()<retryAt||AppState.currentState!=='active')return;
   const job=queue.snapshot(owner)?.find(entry=>!entry.blocked);
   if(!job)return;
   calendarEditSending.add(owner);
   try{
    const saved=await sendCalendarEdit(job,{device:context.device,request:context.store.featureRequest,current,
     saveApple:latest.current.saveApple,saveAction:actionId=>queue.change(owner,job.id,entry=>({...entry,actionId}))});
    if(!current())return;
    await latest.current.onSaved(saved,job.original);
    if(!current())return;
    await queue.remove(owner,job.id);
    context.store.writeResolved('calendar-edit:'+job.id);
   }catch(error){
    if(!current())return;
    if(error instanceof HttpResponseError&&[400,403,404,409,422].includes(error.status)){
     await queue.block(owner,job.id,true).catch(()=>{});
     context.store.reportWrite('calendar-edit:'+job.id,error.message,()=>queue.block(owner,job.id,false));
    }else retryAt=Date.now()+3000;
   }finally{calendarEditSending.delete(owner);}
  }
  const start=()=>{setTimeout(()=>void flush(),32);};
  const watch=queue.watch(owner,start);
  void queue.read(owner).then(start).catch(()=>{});
  const timer=setInterval(()=>void flush(),1000);
  const listener=AppState.addEventListener('change',state=>{if(state==='active'){retryAt=0;void flush();}});
  return ()=>{stopped=true;watch();clearInterval(timer);listener.remove();};
 },[enabled,owner,queue,store.featureRequest]);
 return {jobs,enqueue:enabled?async(draft:CalendarDraft,original:CalendarEvent)=>{
  if(original.saveState||!original.eventId||!store.isCurrentSession())throw conflict('일정을 다시 열어 확인해주세요.');
  if(queue.snapshot(owner)?.some(job=>job.id===original.id))throw conflict('기기에 저장된 변경을 먼저 동기화하고 있어요.');
  if(original.provider==='apple-calendar')appleEventPatch(draft,original);
  else if(original.provider==='docen')docenEventPayload(draft,original);
  else if(!calendarWriteArgs(draft,original,!metadataAvailable)&&!Object.keys(calendarDuckPatch(draft,original)).length)return false;
  const event={...original,...confirmedCalendarPatch(draft,original),duckDetails:original.duckDetails?{...original.duckDetails,
   fields:{...original.duckDetails.fields,...calendarDuckPatch(draft,original)}}:original.duckDetails};
  await queue.add(owner,{id:original.id,original,event,draft,metadataAvailable});
  return true;
 }:undefined};
}
