import * as SecureStore from 'expo-secure-store';
import {offlineUser} from './auth';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createDeviceCreateQueue} from './device-create-queue';
import {parseTodos,validateDraft} from './domain';
import type {Patch} from './repository';
import type {Draft,Todo} from './domain';

export type QueuedTodoCreate={id:string;draft:Draft;createdAt:string;blocked?:boolean};
export type QueuedTodoEdit={id:string;before:Todo;patch:Patch;editedAt:string;blocked?:boolean;failure?:string};
export type QueuedTodoDelete={id:string;sourceId:string|null;appleId?:string;appleDeleted?:boolean;resolvedId?:string};
const editableFields=new Set(['title','notes','done','dueDate','dueTime','reminderAt']);
const prefix='device-todo:';
export const isDeviceTodo=(id:string)=>id.startsWith(prefix);
export function queuedTodo(job:QueuedTodoCreate):Todo{
 const {deliveryTarget,...draft}=job.draft;
 return {...draft,...(deliveryTarget?{delivery:{...deliveryTarget,state:'queued' as const}}:{}),id:prefix+job.id,done:false,createdAt:job.createdAt,saveState:job.blocked?'checking':'saving'};
}

export function createDeviceTodos(storage:Parameters<typeof createCalendarDeviceStore>[0],readOfflineUser:typeof offlineUser){
 const queue=createDeviceCreateQueue(createCalendarDeviceStore(storage,'docen.todo.outbox.'),(entry):entry is QueuedTodoCreate=>{
  const job=entry as Partial<QueuedTodoCreate>|null;
  if(typeof job?.id!=='string'||!job.id||typeof job.createdAt!=='string'||!job.draft)return false;
  try{validateDraft(job.draft);return true;}catch{return false;}
 });
 const edits=createDeviceCreateQueue(createCalendarDeviceStore(storage,'docen.todo.edits.'),(entry):entry is QueuedTodoEdit=>{
  const job=entry as Partial<QueuedTodoEdit>|null;
  return typeof job?.id==='string'&&typeof job.before?.id==='string'&&typeof job.editedAt==='string'&&
   !!job.patch&&Object.keys(job.patch).length>0&&Object.keys(job.patch).every(key=>editableFields.has(key));
 });
 const deletes=createDeviceCreateQueue(createCalendarDeviceStore(storage,'docen.todo.deletes.'),(entry):entry is QueuedTodoDelete=>{
  const job=entry as Partial<QueuedTodoDelete>|null;
  return typeof job?.id==='string'&&(job.sourceId===null||typeof job.sourceId==='string')&&
   (job.appleId===undefined||typeof job.appleId==='string');
 });
 const snapshots=createCalendarDeviceStore(storage,'docen.todo.snapshot.');
 const cache={
  async read(owner:string){
   const data=await snapshots.read(owner);
   return data?parseTodos(JSON.parse(data)):[];
  },
  write(owner:string,items:Todo[]){
   const confirmed=items.filter(todo=>!todo.saveState&&!isDeviceTodo(todo.id));
   const bounded:Todo[]=[];
   let size=2;
   // Keep the latest rows if the device's confirmed snapshot reaches its limit.
   for(const todo of confirmed.reverse()){
    const length=JSON.stringify(todo).length+1;
    if(size+length>250000)break;
    size+=length;
    bounded.push(todo);
   }
   return snapshots.write(owner,JSON.stringify(bounded.reverse()));
  },
  clear:snapshots.clear,
 };
 return {queue,edits,deletes,readOfflineUser,cache};
}

const secureStorage={
 get:(key:string)=>SecureStore.getItemAsync(key),
 set:(key:string,value:string)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY}),
 remove:(key:string)=>SecureStore.deleteItemAsync(key),
};
export const todoEditSending=new Set<string>();
export const deviceTodos=createDeviceTodos(secureStorage,offlineUser);
