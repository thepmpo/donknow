import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createCalendarSnapshotStore} from './calendar-snapshot-store';
import type {CalendarSnapshot} from './calendar-snapshot-store';
const disk=createCalendarSnapshotStore({get:SecureStore.getItemAsync,set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),remove:SecureStore.deleteItemAsync});
type Signal='update'|'refresh'|'clear';
const revisions=new Map<string,number>();
export const calendarSnapshotRevision=(owner:string)=>revisions.get(owner)??0;
export function invalidateCalendarSnapshotReads(owner:string){const value=calendarSnapshotRevision(owner)+1;revisions.set(owner,value);return value;}
const owners=new Map<string,Map<string,CalendarSnapshot>>(),restores=new Map<string,Promise<void>>(),listeners=new Map<string,Set<(signal:Signal)=>void>>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
export function calendarSnapshots(owner:string){let value=owners.get(owner);if(!value){value=new Map();owners.set(owner,value);}return value;}
export function restoreCalendarSnapshots(owner:string){if(Platform.OS==='web')return Promise.resolve();let task=restores.get(owner);if(!task){const target=calendarSnapshots(owner),revision=calendarSnapshotRevision(owner);task=disk.read(owner).then(rows=>{if(owners.get(owner)!==target||revision!==calendarSnapshotRevision(owner))return;for(const row of rows)if(!target.has(row.key))target.set(row.key,row);});restores.set(owner,task);}return task;}
export function persistCalendarSnapshots(owner:string){if(Platform.OS!=='web'){clearTimeout(timers.get(owner));timers.set(owner,setTimeout(()=>{timers.delete(owner);void disk.write(owner,[...calendarSnapshots(owner).values()]).catch(()=>{});},250));}}
export function forgetCalendarSnapshots(owner:string){invalidateCalendarSnapshotReads(owner);clearTimeout(timers.get(owner));timers.delete(owner);owners.get(owner)?.clear();restores.delete(owner);listeners.get(owner)?.forEach(fn=>fn('clear'));if(Platform.OS!=='web')void disk.clear(owner).catch(()=>{});}
export function watchCalendarSnapshots(owner:string,fn:(signal:Signal)=>void){const set=listeners.get(owner)??new Set();listeners.set(owner,set);set.add(fn);return()=>{set.delete(fn);};}
export function broadcastCalendarSnapshots(owner:string){listeners.get(owner)?.forEach(fn=>fn('update'));}

export function refreshCalendarSnapshots(owner:string){listeners.get(owner)?.forEach(fn=>fn('refresh'));}
