import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {isAppleCalendar} from './apple-calendar-model';
import type {TodoStore} from './useTodos';
export const calendarSelectionKey=(owner:string)=>'duck.calendar.selection.'+owner;
type Selection={ids:string[];knownAppleIds?:string[]};
const selectionListeners=new Map<string,Set<(value:Selection)=>void>>();
const defaultSelection:Selection={ids:['primary']};
function parseSelection(raw:string|null):Selection {
 try{
  const value=JSON.parse(raw??'null');
  const ids=value?.ids??value;
  if(Array.isArray(ids)&&ids.every(id=>typeof id==='string'&&id.length>0&&id.length<=1500)){
   const known=Array.isArray(value?.knownAppleIds)?value.knownAppleIds.filter((id:unknown)=>typeof id==='string'&&isAppleCalendar(id)):undefined;
   return {ids:[...new Set<string>(ids)],knownAppleIds:known};
  }
 }catch{}
 return defaultSelection;
}
export function useCalendarSelection(store:TodoStore){
 const owner=store.connection?.mode==='cloud'&&store.user?store.connection.baseUrl+':'+store.user.id:'demo';
 const current=useRef(owner);current.current=owner;
 const [state,setState]=useState<{owner:string;value:Selection}|null>(null);
 const ready=state?.owner===owner,value=ready?state.value:defaultSelection;
 useEffect(()=>{
  let alive=true,updated=false;
  const fn=(next:Selection)=>{if(current.current===owner){updated=true;setState({owner,value:next});}};
  const set=selectionListeners.get(owner)??new Set();set.add(fn);selectionListeners.set(owner,set);
  void AsyncStorage.getItem(calendarSelectionKey(owner)).catch(()=>null).then(raw=>{if(alive&&!updated&&current.current===owner)setState({owner,value:parseSelection(raw)});});
  return()=>{alive=false;set.delete(fn);if(!set.size)selectionListeners.delete(owner);};
 },[owner]);
 function save(next:Selection){
  if(current.current!==owner)return;
  selectionListeners.get(owner)?.forEach(fn=>fn(next));
  void AsyncStorage.setItem(calendarSelectionKey(owner),JSON.stringify(next)).catch(()=>{});
 }
 function setIds(ids:string[]){save({...value,ids});}
 function reconcileApple(available:string[],includeAll=false){
  if(!ready||!available.length)return;
  const known=value.knownAppleIds;
  const additions=includeAll||!known&&(value.ids.length>=10||!value.ids.some(isAppleCalendar))?available:known?available.filter(id=>!known.includes(id)):[];
  if(known&&available.every(id=>known.includes(id))&&!additions.some(id=>!value.ids.includes(id)))return;
  save({ids:[...new Set([...value.ids,...additions])],knownAppleIds:[...new Set([...(known??[]),...available])]});
 }
 return {ids:value.ids,ready,setIds,reconcileApple};
}
