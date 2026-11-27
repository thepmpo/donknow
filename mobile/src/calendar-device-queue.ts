import * as SecureStore from 'expo-secure-store';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createCalendarCreateQueue} from './calendar-create-queue';
import {createDeviceCreateQueue} from './device-create-queue';

export const deviceCalendarQueue=createCalendarCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.calendar.outbox.'));

export const calendarCreateSending=new Set<string>();
export const todoCreateSending=new Set<string>();
type AppleCalendarReceipt={id:string;claimId:string;started?:boolean;externalEventId?:string;externalUid?:string};
export const appleCalendarReceipts=createDeviceCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.calendar.apple-receipts.'),(entry):entry is AppleCalendarReceipt=>{
 const value=entry as Partial<AppleCalendarReceipt>|null;
 return typeof value?.id==='string'&&typeof value.claimId==='string';
});

export type QueuedCalendarEdit={
 id:string;original:import('./calendar-model').CalendarEvent;event:import('./calendar-model').CalendarEvent;
 draft:import('./calendar-edit-model').CalendarDraft;metadataAvailable:boolean;actionId?:string;blocked?:boolean;
};
export function createCalendarEditQueue(storage:Parameters<typeof createCalendarDeviceStore>[0]){
 return createDeviceCreateQueue(createCalendarDeviceStore(storage,'docen.calendar.edits.'),(entry):entry is QueuedCalendarEdit=>{
  const value=entry as Partial<QueuedCalendarEdit>|null;
  return typeof value?.id==='string'&&value.id===value.original?.id&&value.id===value.event?.id&&typeof value.draft?.calendarId==='string';
 });
}
export type CalendarEditQueue=ReturnType<typeof createCalendarEditQueue>;
export const deviceCalendarEdits=createCalendarEditQueue({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
});
