import {useEffect,useRef,useState} from 'react';
import {AppState} from 'react-native';
import type {TodoStore} from './useTodos';
export type ScheduledMessage={id:string;kind:string;title:string;text:string;warnings:string[];createdAt:number;readAt:number|null};
export function useAutomations(store:TodoStore,available:boolean,active:boolean){
 const [messages,setMessages]=useState<ScheduledMessage[]>([]),[error,setError]=useState('');
 const generation=useRef(0),reading=useRef(false),marking=useRef(false),cursor=useRef('');
 const owner=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;
 useEffect(()=>{const version=++generation.current;setMessages([]);setError('');reading.current=false;marking.current=false;cursor.current='';
  if(!available||!store.user||store.connection?.mode!=='cloud')return;
  async function refresh(){if(reading.current||version!==generation.current)return;reading.current=true;try{const value=await store.featureRequest('/api/assistant/messages'+(cursor.current?'?after='+encodeURIComponent(cursor.current):'')) as {messages:ScheduledMessage[];incremental?:boolean};if(version===generation.current){setMessages(old=>value.incremental?[...old,...value.messages.filter(next=>!old.some(m=>m.id===next.id))].slice(-100):value.messages);if(value.messages.length)cursor.current=value.messages.at(-1)!.id;setError('');}}catch(e){if(version===generation.current)setError(e instanceof Error?e.message:'예약 메시지를 불러오지 못했어요.');}finally{if(version===generation.current)reading.current=false;}}
  void refresh();const timer=setInterval(()=>{void refresh();},30000);const app=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});
  return()=>{generation.current++;clearInterval(timer);app.remove();};
 },[owner,available]);
 useEffect(()=>{const through=messages.at(-1)?.id;if(!active||!through||!messages.some(m=>!m.readAt)||marking.current)return;const version=generation.current;marking.current=true;
  void store.featureRequest('/api/assistant/messages/read','POST',{through}).then(()=>{if(version===generation.current)setMessages(old=>old.map(m=>messages.some(seen=>seen.id===m.id)?{...m,readAt:Date.now()}:m));}).catch(()=>undefined).finally(()=>{if(version===generation.current)marking.current=false;});
 },[active,messages]);
 return {messages,error,unread:messages.filter(m=>!m.readAt).length};
}
