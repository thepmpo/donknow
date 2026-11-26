import {useEffect,useRef} from 'react';
import {AppState} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import {createCalendarDeviceStore} from './calendar-snapshot-store';
import {createDeviceCreateQueue} from './device-create-queue';
import {deviceZone,wallTime} from './calendar-model';
import {HttpResponseError} from './http-response';
import {isDeviceTodo} from './todo-device-queue';
import type {Todo} from './domain';

type Receipt={id:string;attempt:string;externalId:string;listId:string;listTitle:string;blocked?:boolean};
const receipts=createDeviceCreateQueue(createCalendarDeviceStore({
 get:key=>SecureStore.getItemAsync(key),
 set:(key,value)=>SecureStore.setItemAsync(key,value,{keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY}),
 remove:key=>SecureStore.deleteItemAsync(key),
},'docen.todo.apple.receipts.'),(value):value is Receipt=>{
 const receipt=value as Partial<Receipt>|null;
 return !!receipt&&[receipt.id,receipt.attempt,receipt.externalId,receipt.listId,receipt.listTitle].every(field=>typeof field==='string');
});

export function clearAppleTodoReceipts(owner:string){return receipts.clear(owner);}

export async function writableReminderLists(){
 const Calendar=await import('expo-calendar');
 if(!(await Calendar.getRemindersPermissions()).granted)throw Error('ME에서 아이폰 미리알림 접근을 허용해주세요.');
 return (await Calendar.getCalendars(Calendar.EntityTypes.REMINDER)).filter(list=>list.allowsModifications);
}

type Request=(path:string,method?:string,body?:unknown)=>Promise<unknown>;
const inFlight=new Set<string>();
export function useAppleTodoDelivery(owner:string|null,todos:Todo[],request:Request,isCurrent:()=>boolean,onSaved:(todo:Todo)=>void){
 const latest=useRef({owner,todos,request,isCurrent,onSaved});latest.current={owner,todos,request,isCurrent,onSaved};
 useEffect(()=>{
  if(!owner)return;
  let cancelled=false;
  const deviceOwner=owner;
  const current=()=>!cancelled&&latest.current.owner===owner&&latest.current.isCurrent();
  async function flush(){
   if(!current()||AppState.currentState!=='active'||inFlight.has(deviceOwner))return;
   inFlight.add(deviceOwner);
   try{
    await receipts.read(deviceOwner);
    if(!current())return;
    const known=receipts.snapshot(deviceOwner)?.find(receipt=>!receipt.blocked);
    if(known){await acknowledge(known);return;}
    const jobs=latest.current.todos.filter(item=>!isDeviceTodo(item.id)&&item.delivery?.provider==='apple-reminders'&&item.delivery.state==='queued');
    if(!jobs.length)return;
    const lists=await writableReminderLists();
    const job=jobs.find(item=>lists.some(list=>list.id===item.delivery?.listId));
    const list=lists.find(item=>item.id===job?.delivery?.listId);
    if(!job||!list||!current())return;
    const path='/api/todos/'+encodeURIComponent(job.id)+'/delivery/';
    const {attempt,todo}=await latest.current.request(path+'claim','POST',{listId:list.id}) as {attempt:string;todo:Todo};
    if(!current())return;
    const dueDate=todo.dueDate?new Date(wallTime(todo.dueDate,todo.dueTime??'00:00',deviceZone())):undefined;
    const item=await list.createReminder({title:todo.title,notes:todo.notes,completed:todo.done,allDay:!todo.dueTime,...(dueDate?{dueDate}:{})});
    if(!item.id)throw Error('미리 알림 저장 결과를 확인해주세요.');
    const receipt={id:job.id,attempt,externalId:item.id,listId:list.id,listTitle:list.title};
    await receipts.add(deviceOwner,receipt).catch(()=>{});
    if(current())await acknowledge(receipt);
   }catch{
    // A claim is never repeated after an uncertain device write. A saved receipt can be replayed.
   }finally{inFlight.delete(deviceOwner);}
  }
  async function acknowledge(receipt:Receipt){
   const path='/api/todos/'+encodeURIComponent(receipt.id)+'/delivery/receipt';
   let saved:Todo;
   try{saved=await latest.current.request(path,'POST',receipt) as Todo;}
   catch(error){
    if(current()&&error instanceof HttpResponseError){
     if(error.status===404)await receipts.remove(deviceOwner,receipt.id);
     else if(error.status===409||error.status===422)await receipts.block(deviceOwner,receipt.id,true);
    }
    return;
   }
   if(!current())return;
   latest.current.onSaved(saved);
   await receipts.remove(deviceOwner,receipt.id);
  }
  const timer=setInterval(()=>void flush(),2000);
  const subscription=AppState.addEventListener('change',state=>{if(state==='active')void flush();});
  void flush();
  return ()=>{cancelled=true;clearInterval(timer);subscription.remove();};
 },[owner]);
}
