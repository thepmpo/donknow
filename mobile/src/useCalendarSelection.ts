import {useEffect,useRef,useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {TodoStore} from './useTodos';
export const calendarSelectionKey=(owner:string)=>'duck.calendar.selection.'+owner;
export function useCalendarSelection(store:TodoStore){
 const owner=store.connection?.mode==='cloud'&&store.user?store.connection.baseUrl+':'+store.user.id:'demo';
 const current=useRef(owner);current.current=owner;
 const [state,setState]=useState<{owner:string;ids:string[]}|null>(null);
 useEffect(()=>{let alive=true;void AsyncStorage.getItem(calendarSelectionKey(owner)).then(raw=>{let ids=['primary'];try{const value=JSON.parse(raw??'null');if(Array.isArray(value)&&value.length<=10&&value.every(id=>typeof id==='string'&&id.length>0&&id.length<=1500))ids=[...new Set(value)];}catch{}if(alive&&current.current===owner)setState({owner,ids});}).catch(()=>{if(alive&&current.current===owner)setState({owner,ids:['primary']});});return()=>{alive=false;};},[owner]);
 function setIds(ids:string[]){if(current.current!==owner)return;setState({owner,ids});void AsyncStorage.setItem(calendarSelectionKey(owner),JSON.stringify(ids)).catch(()=>{});}
 return {ids:state?.owner===owner?state.ids:['primary'],ready:state?.owner===owner,setIds};
}
