import * as SecureStore from 'expo-secure-store';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createCalendarCreateQueue} from './calendar-create-queue';

export const deviceCalendarQueue=createCalendarCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.calendar.outbox.'));
