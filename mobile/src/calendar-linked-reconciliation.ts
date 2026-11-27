import type {CalendarEvent} from './calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import {appleCalendarPrefix,normalizeAppleEvent} from './apple-calendar-model';
import {eventDraft} from './calendar-edit-model';
import type {TodoStore} from './useTodos';

export const linkedCalendarSyncRunning=new Set<string>();
type Context={
 device:AppleCalendarDevice;request:TodoStore['featureRequest'];appleRead:boolean;
 saveApple:(draft:ReturnType<typeof eventDraft>,event:CalendarEvent)=>Promise<CalendarEvent>;
};
function originalSnapshot(event:CalendarEvent,linkedId:string){
 return {id:event.eventId,linkedId,externalUid:event.externalUid,version:event.etag,updatedAt:event.updatedAt,fields:{
  title:event.title,notes:event.notes??'',allDay:!!event.allDay,startDate:event.dueDate,endDate:event.endDate,start:event.startAt,end:event.endAt,
 }};
}
export async function reconcileLinkedCalendar(event:CalendarEvent,other:CalendarEvent|undefined,context:Context,current:()=>boolean):Promise<{event?:CalendarEvent;removed?:CalendarEvent}|undefined>{
 const target=event.mirror!,revision=event.duckDetails!.revision;
 const path='/api/calendar/docen/'+encodeURIComponent(event.eventId!)+'/reconcile';
 type Result={action:'done'|'push';event:CalendarEvent}|{action:'deleted'};
 let original=other;
 if(target.provider==='apple-calendar'){
  if(!context.device.available||!context.appleRead||!current())return;
  // Re-read the bound EventKit ID, including an original moved outside the rendered dates.
  const calendarId=decodeURIComponent(target.calendarId.slice(appleCalendarPrefix.length));
  const linkedId=target.externalEventId!;
  let raw;
  try{
   raw=await context.device.read(linkedId,undefined,calendarId).catch(error=>{
    if(!target.externalUid||!context.device.readLinked)throw error;
    return context.device.readLinked(target.externalUid,calendarId);
   });
  }catch(error){
   if(other||!context.appleRead||!target.externalUid||!context.device.isLinkedEventMissing||
    !await context.device.isLinkedEventMissing(linkedId,target.externalUid,calendarId)||!current())throw error;
   const result=await context.request(path,'POST',{revision,missingAppleOriginal:{id:linkedId,calendarId:target.calendarId,externalUid:target.externalUid}}) as {action:string};
   if(current()&&result.action==='deleted')return {removed:event};
   return;
  }
  if(raw.calendarId!==calendarId||raw.id!==linkedId&&(!target.externalUid||raw.externalUid!==target.externalUid)
   ||raw.recurrence||raw.notes.length>4000)return;
  original=normalizeAppleEvent(raw,{id:calendarId,title:target.name??'',writable:true});
 }
 if(!current()||target.provider==='apple-calendar'&&!original)return;
 let result=await context.request(path,'POST',{revision,...(original&&target.provider==='apple-calendar'?{original:originalSnapshot(original,target.externalEventId!)}:{})}) as Result;
 if(!current())return;
 if(result.action==='deleted')return {removed:event};
 if(result.action==='push'&&original?.provider==='apple-calendar'){
  const local=result.event,zone=local.timeZone??original.timeZone??'Asia/Seoul';
  const draft={...eventDraft(local.dueDate!,zone,target.calendarId,local),calendarId:target.calendarId,
   duckUrl:original.duckDetails?.fields.url??'',reminderMinutes:original.duckDetails?.fields.reminderMinutes??null};
  const synced=await context.saveApple(draft,original);
  if(!current())return;
  result=await context.request(path,'POST',{revision,original:originalSnapshot(synced,target.externalEventId!),ack:true}) as Result;
 }
 if(!current()||result.action!=='done'||result.event?.id!==event.id)return;
 return {event:result.event};
}
