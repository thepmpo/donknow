import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {docenCalendarId} from './calendar-model';
import {isAppleCalendar} from './apple-calendar-model';
import type {TodoStore} from './useTodos';
export const calendarSelectionKey=(owner:string)=>'duck.calendar.selection.'+owner;
type Selection={ids:string[];knownAppleIds?:string[];hideDocen?:boolean;hiddenIds?:string[]};
const selectionListeners=new Map<string,Set<(value:Selection)=>void>>();
const defaultSelection:Selection={ids:['primary']};
function parseSelection(raw:string|null):Selection {
 try{
  const value=JSON.parse(raw??'null');
  const ids=value?.ids??value;
  if(Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=1500)){
   const known=Array.isArray(value?.knownAppleIds)?value.knownAppleIds.filter((id:unknown)=>typeof id==='string'&&isAppleCalendar(id)):undefined;
   return {ids:[...new Set<string>(ids)],knownAppleIds:known,hideDocen:value?.hideDocen===true,hiddenIds:Array.isArray(value?.hiddenIds)?value.hiddenIds.filter((id:unknown)=>typeof id==='string'):undefined};
  }
 }catch{}
 return defaultSelection;
}
export function useCalendarSelection(store:TodoStore){
 const owner=store.connection?.mode==='cloud'&&store.user?store.connection.baseUrl+':'+store.user.id:'demo';
 const current=useRef(owner);current.current=owner;
 const [state,setState]=useState<{owner:string;value:Selection}|null>(null);
 const ready=state?.owner===owner,value=ready?state.value:defaultSelection;
 const latest=useRef(value);latest.current=value;
 useEffect(()=>{
  let alive=true,updated=false;
  const fn=(next:Selection)=>{if(current.current===owner){updated=true;latest.current=next;setState({owner,value:next});}};
  const set=selectionListeners.get(owner)??new Set();set.add(fn);selectionListeners.set(owner,set);
  void AsyncStorage.getItem(calendarSelectionKey(owner)).catch(()=>null).then(raw=>{if(alive&&!updated&&current.current===owner)setState({owner,value:parseSelection(raw)});});
  return()=>{alive=false;set.delete(fn);if(!set.size)selectionListeners.delete(owner);};
 },[owner]);
 function save(next:Selection){
  if(current.current!==owner)return;
  selectionListeners.get(owner)?.forEach(fn=>fn(next));
  void AsyncStorage.setItem(calendarSelectionKey(owner),JSON.stringify(next)).catch(()=>{});
 }
 function setIds(ids:string[]){
  const before=latest.current;
  const hiddenIds=[...new Set([...(before.hiddenIds??[]),...before.ids])].filter(id=>!ids.includes(id));
  save({...before,ids,hiddenIds});
 }
 function reveal(id:string){
  const before=latest.current;
  if(id===docenCalendarId||before.ids.includes(id)||before.hiddenIds?.includes(id))return;
  if(!isAppleCalendar(id)&&before.ids.filter(value=>!isAppleCalendar(value)).length>=10)return;
  setIds([...before.ids,id]);
 }
 function toggle(id:string){
  const before=latest.current;
  if(id===docenCalendarId){save({...before,hideDocen:!before.hideDocen});return true;}
  if(before.ids.includes(id)){setIds(before.ids.filter(value=>value!==id));return true;}
  if(!isAppleCalendar(id)&&before.ids.filter(value=>!isAppleCalendar(value)).length>=10)return false;
  setIds([...before.ids,id]);return true;
 }
 function reconcileApple(available:string[],includeAll=false){
  if(!ready||!available.length)return;
  const value=latest.current,known=value.knownAppleIds;
  const eligible=available.filter(id=>!value.hiddenIds?.includes(id));
  const additions=includeAll||!known&&(value.ids.length>=10||!value.ids.some(isAppleCalendar))?eligible:known?eligible.filter(id=>!known.includes(id)):[];
  if(known&&available.every(id=>known.includes(id))&&!additions.some(id=>!value.ids.includes(id)))return;
  save({...value,ids:[...new Set([...value.ids,...additions])],knownAppleIds:[...new Set([...(known??[]),...available])]});
 }
 return {ids:value.ids,showDocen:!value.hideDocen,ready,setIds,toggle,reveal,reconcileApple};
}
