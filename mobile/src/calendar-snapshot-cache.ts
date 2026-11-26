import {clearCalendarWrites} from './calendar-write-overlay';
import {Platform} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createCalendarSnapshotStore} from './calendar-snapshot-store';
import type {CalendarEvent} from './calendar-model';
import type {CalendarSnapshot} from './calendar-snapshot-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
const disk=createCalendarSnapshotStore({get:async key=>Platform.OS==='web'?sessionStorage.getItem(key):SecureStore.getItemAsync(key),set:async(key,value)=>{if(Platform.OS==='web')sessionStorage.setItem(key,value);else await SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY});},remove:async key=>{if(Platform.OS==='web')sessionStorage.removeItem(key);else await SecureStore.deleteItemAsync(key);}});
type Signal='update'|'refresh'|'clear';
const revisions=new Map<string,number>();
export const calendarSnapshotRevision=(owner:string)=>revisions.get(owner)??0;
export function invalidateCalendarSnapshotReads(owner:string){const value=calendarSnapshotRevision(owner)+1;revisions.set(owner,value);return value;}
const owners=new Map<string,Map<string,CalendarSnapshot>>(),restores=new Map<string,Promise<CalendarSnapshot[]>>(),listeners=new Map<string,Set<(signal:Signal,items?:CalendarEvent[])=>void>>(),timers=new Map<string,ReturnType<typeof setTimeout>>();
const reads=new Map<string,Promise<unknown>>(),capabilities=new Map<string,{at:number;value:unknown}>();
/** Both Duo panes can mount the same range. Share only an in-flight owner/revision-scoped GET. */
export function readCalendarOnce(owner:string,path:string,request:(path:string)=>Promise<unknown>){const cached=path==='/api/capabilities'?capabilities.get(owner):undefined;if(cached&&Date.now()-cached.at<300000)return Promise.resolve(cached.value);const key=JSON.stringify([owner,calendarSnapshotRevision(owner),path]);let pending=reads.get(key);if(!pending){pending=request(path).then(value=>{if(path==='/api/capabilities'){capabilities.set(owner,{at:Date.now(),value});if(capabilities.size>64)capabilities.delete(capabilities.keys().next().value!);}return value;}).finally(()=>{if(reads.get(key)===pending)reads.delete(key);});reads.set(key,pending);}return pending;}
export function calendarSnapshots(owner:string){let value=owners.get(owner);if(!value){value=new Map();owners.set(owner,value);}return value;}
const restored=new Set<string>();
export function restoreCalendarSnapshots(owner:string){if(restored.has(owner))return Promise.resolve([] as CalendarSnapshot[]);let task=restores.get(owner);if(!task){const target=calendarSnapshots(owner),revision=calendarSnapshotRevision(owner);task=disk.read(owner).then(rows=>{if(owners.get(owner)!==target||revision!==calendarSnapshotRevision(owner))return [];for(const row of rows)if(!target.has(row.key))target.set(row.key,row);restored.add(owner);return rows;});restores.set(owner,task);}return task;}
export function persistCalendarSnapshots(owner:string){clearTimeout(timers.get(owner));timers.set(owner,setTimeout(()=>{timers.delete(owner);void disk.write(owner,[...calendarSnapshots(owner).values()]).catch(()=>{});},250));}
export function forgetCalendarSnapshots(owner:string){clearCalendarWrites(owner);capabilities.delete(owner);invalidateCalendarSnapshotReads(owner);clearTimeout(timers.get(owner));timers.delete(owner);owners.get(owner)?.clear();restores.delete(owner);restored.delete(owner);listeners.get(owner)?.forEach(fn=>fn('clear'));void AsyncStorage.removeItem('duck.calendar.selection.'+owner).catch(()=>{});void disk.clear(owner).catch(()=>{});}
export function watchCalendarSnapshots(owner:string,fn:(signal:Signal,items?:CalendarEvent[])=>void){const set=listeners.get(owner)??new Set();listeners.set(owner,set);set.add(fn);return()=>{set.delete(fn);};}
export function broadcastCalendarSnapshots(owner:string,items?:CalendarEvent[]){listeners.get(owner)?.forEach(fn=>fn('update',items));}

export function refreshCalendarSnapshots(owner:string){listeners.get(owner)?.forEach(fn=>fn('refresh'));}
