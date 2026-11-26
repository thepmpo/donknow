import * as SecureStore from 'expo-secure-store';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createCalendarCreateQueue} from './calendar-create-queue';
import {createDeviceCreateQueue} from './device-create-queue';

export const deviceCalendarQueue=createCalendarCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.calendar.outbox.'));

type AppleCalendarReceipt={id:string;claimId:string;started?:boolean;externalEventId?:string;externalUid?:string};
export const appleCalendarReceipts=createDeviceCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.calendar.apple-receipts.'),(entry):entry is AppleCalendarReceipt=>{
 const value=entry as Partial<AppleCalendarReceipt>|null;
 return typeof value?.id==='string'&&typeof value.claimId==='string';
});
