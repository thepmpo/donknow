import {appleCalendarReceipts} from './calendar-device-queue';
import {eventDraft} from './calendar-edit-model';
import {saveAppleCalendar} from './apple-calendar-model';
import type {AppleCalendarDevice} from './apple-calendar-model';
import type {CalendarEvent,CalendarMirror} from './calendar-model';
import {HttpResponseError} from './http-response';
import type {TodoStore} from './useTodos';

type Request=TodoStore['featureRequest'];
export type PendingAppleDelete=Omit<CalendarMirror,'state'>&{id:string;state:string};
const appleCreatesInFlight=new Set<string>();
const appleDeletesInFlight=new Set<string>();

export async function syncAppleCalendarCreate(scope:string,candidatesForCreate:()=>CalendarEvent[],device:AppleCalendarDevice,request:Request,
 current:()=>boolean,start:string,timeZone:string,onSaved:()=>void){
   if(!current()||appleCreatesInFlight.has(scope))return;
   appleCreatesInFlight.add(scope);
   let refresh=false;
   try{
    if(!await device.granted()||!current())return;
    const receipts=await appleCalendarReceipts.read(scope);
    const candidates=candidatesForCreate();
    const event=candidates.find(value=>receipts.some(receipt=>receipt.id===value.id&&!!receipt.externalEventId))
      ??candidates.find(value=>{
       const known=receipts.find(receipt=>receipt.id===value.id);
       return known?!known.started:value.mirror?.state==='queued';
      });
    if(!event?.eventId||!event.mirror||!current())return;
    const target=event.mirror,path='/api/calendar/docen/'+encodeURIComponent(event.eventId)+'/apple-delivery';
    let receipt=receipts.find(value=>value.id===event.id);
    if(!receipt){
     const claimId='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const digit=Math.floor(Math.random()*16);
      return (c==='x'?digit:(digit&3)|8).toString(16);
     });
     receipt={id:event.id,claimId};
     await appleCalendarReceipts.add(scope,receipt);
    }
    if(!current())return;
    if(!receipt.externalEventId){
     if(receipt.started)return;
     try{await request(path,'POST',{state:'sending',claimId:receipt.claimId});}
     catch(error){
      if(error instanceof HttpResponseError&&error.status===409){await appleCalendarReceipts.remove(scope,receipt.id);refresh=true;}
      throw error;
     }
     if(!current())return;
     const draft={...eventDraft(event.dueDate??start,event.timeZone??timeZone,target.calendarId,event),calendarId:target.calendarId,reminderMinutes:null};
     const recurrence=event.providerDetails?.recurrence?.[0]?.slice('RRULE:FREQ='.length).toLowerCase();
     if(recurrence==='daily'||recurrence==='weekly'||recurrence==='monthly'||recurrence==='yearly')draft.repeat=recurrence;
     const started={...receipt,started:true};
     let external:CalendarEvent;
     try{external=await saveAppleCalendar(device,draft,undefined,current,{
      beforeWrite:async()=>{
       await appleCalendarReceipts.put(scope,started);
       if(current())return;
       await appleCalendarReceipts.put(scope,{...started,started:false});
       throw Error('Apple calendar delivery paused');
      },
     });}
     catch(error){
      if(current()&&error&&typeof error==='object'&&'writeState' in error){
       await request(path,'POST',{state:'checking',claimId:receipt.claimId});
      }
      refresh=true;return;
     }
     if(!external.eventId)return;
     receipt={...receipt,started:true,externalEventId:external.eventId,externalUid:external.externalUid};
     await appleCalendarReceipts.put(scope,receipt);
    }
    if(!current())return;
    await request(path,'POST',{state:'synced',claimId:receipt.claimId,externalEventId:receipt.externalEventId,externalUid:receipt.externalUid});
    await appleCalendarReceipts.remove(scope,receipt.id);
    refresh=true;
   }catch{
    // A reserved claim or an acknowledged EventKit identifier can be replayed safely.
   }finally{
    appleCreatesInFlight.delete(scope);
    if(refresh&&current())onSaved();
   }
}

  const missing=(error:unknown)=>!!error&&typeof error==='object'&&'code' in error
   &&['ERR_EVENT_UNAVAILABLE','ERR_EVENT_NOT_FOUND','ERR_ITEM_NO_LONGER_EXISTS'].includes(String(error.code));
export async function syncAppleCalendarDeletes(owner:string,targets:PendingAppleDelete[],device:AppleCalendarDevice,request:Request,current:()=>boolean,canWrite:(id:string)=>boolean,onSaved:()=>void|Promise<void>){
   if(!current()||!await device.granted())return;
   for(const target of targets){
    if(!canWrite(target.calendarId))continue;
    const key=owner+'|'+target.id,externalEventId=target.externalEventId!;
    if(appleDeletesInFlight.has(key))continue;
    appleDeletesInFlight.add(key);
    try{
     const rawId=decodeURIComponent(target.calendarId.slice('@apple/'.length));
     let original;
     try{original=await device.read(externalEventId,undefined,rawId);}
     catch(error){
      if(!missing(error)||!target.externalUid||!device.readLinked)throw error;
      try{original=await device.readLinked(target.externalUid,rawId);}
      catch(lookup){
       if(!missing(lookup)||!await device.isLinkedEventMissing?.(externalEventId,target.externalUid,rawId))throw lookup;
      }
     }
     if(original){
      if(original.calendarId!==rawId||!current())continue;
      await device.remove(original.id,undefined,rawId);
     }
     if(!current())continue;
     await request('/api/calendar/docen/'+encodeURIComponent(target.id)+'/apple-delivery','POST',{state:'deleted',externalEventId});
     if(current())await onSaved();
    }catch{
     // A missing or changed identifier alone is insufficient to confirm an original deletion.
    }finally{appleDeletesInFlight.delete(key);}
   }
  }
