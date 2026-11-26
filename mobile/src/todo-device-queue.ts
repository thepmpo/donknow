import * as SecureStore from 'expo-secure-store';
import {offlineUser} from './auth';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createDeviceCreateQueue} from './device-create-queue';
import {parseTodos,validateDraft} from './domain';
import type {Draft,Todo} from './domain';

export type QueuedTodoCreate={id:string;draft:Draft;createdAt:string;blocked?:boolean};
const prefix='device-todo:';
export const isDeviceTodo=(id:string)=>id.startsWith(prefix);
export function queuedTodo(job:QueuedTodoCreate):Todo{
 return {...job.draft,id:prefix+job.id,done:false,createdAt:job.createdAt,saveState:job.blocked?'checking':'saving'};
}

export function createDeviceTodos(storage:Parameters<typeof createCalendarDeviceStore>[0],readOfflineUser:typeof offlineUser){
 const queue=createDeviceCreateQueue(createCalendarDeviceStore(storage,'docen.todo.outbox.'),(entry):entry is QueuedTodoCreate=>{
  const job=entry as Partial<QueuedTodoCreate>|null;
  if(typeof job?.id!=='string'||!job.id||typeof job.createdAt!=='string'||!job.draft)return false;
  try{validateDraft(job.draft);return true;}catch{return false;}
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
 return {queue,readOfflineUser,cache};
}

const secureStorage={
 get:(key:string)=>SecureStore.getItemAsync(key),
 set:(key:string,value:string)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 remove:(key:string)=>SecureStore.deleteItemAsync(key),
};
export const deviceTodos=createDeviceTodos(secureStorage,offlineUser);
