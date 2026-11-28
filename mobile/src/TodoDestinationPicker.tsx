import React,{useEffect,useRef,useState} from 'react';
import {Platform,Pressable,Text,View} from 'react-native';
import {writableReminderLists} from './useAppleTodoDelivery';
import {appleMembership} from './todo-membership';
import {colors,typography} from './theme';
import type {Todo,TodoDestination} from './domain';
import type {TodoStore} from './useTodos';

type List={id:string;title:string;color?:string};
type Pick={target:TodoDestination;title:string};
export function TodoDestinationPicker({store,value,onChange,disabled,embedded=false,allowLocal=true,editing}:{store:TodoStore;value:Pick|null;onChange:(pick:Pick|null)=>void;disabled:boolean;embedded?:boolean;allowLocal?:boolean;editing?:Todo}){
 const [open,setOpen]=useState(embedded),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [accounts,setAccounts]=useState<List[]>([]),[scope,setScope]=useState<string|null>(null);
 const [lists,setLists]=useState<List[]>([]),[next,setNext]=useState<string|null>(null);
 const run=useRef(0);
 useEffect(()=>{if(embedded)void root();return()=>{run.current++;};},[embedded]);
 if(!store.user?.emailVerified||store.connection?.mode!=='cloud')return null;
 function start(){setError('');setBusy(true);return ++run.current;}
 function close(){run.current++;setOpen(false);setBusy(false);setError('');}
 async function root(){
  setScope(null);setLists([]);setNext(null);
  const id=start();
  try{
   const result=await store.featureRequest('/api/todo-destinations') as {accounts:List[]};
   if(id===run.current)setAccounts(Array.isArray(result.accounts)?result.accounts:[]);
  }catch(e){if(id===run.current)setError(e instanceof Error?e.message:'목록을 불러오지 못했어요.');}
  finally{if(id===run.current)setBusy(false);}
 }
 async function load(key:string,cursor?:string){
  setScope(key);
  if(!cursor){setLists([]);setNext(null);}
  const id=start();
  try{
   const result=key==='@apple'?(editing?.source?.provider==='apple-reminders'?await appleMembership([editing]):{items:await writableReminderLists(),nextCursor:null}):await store.featureRequest(
    '/api/todo-destinations?'+new URLSearchParams({connectionId:key,...(cursor?{cursor}:{})}),
   ) as {items:List[];nextCursor?:string|null};
   if(id!==run.current)return;
   setLists(old=>[...new Map([...(cursor?old:[]),...result.items].map(item=>[item.id,item])).values()]);
   setNext(result.nextCursor??null);
  }catch(e){if(id===run.current)setError(e instanceof Error?e.message:'목록을 불러오지 못했어요.');}
  finally{if(id===run.current)setBusy(false);}
 }
 function choose(item:List){
  if(!scope)return;
  const target:TodoDestination=scope==='@apple'?{provider:'apple-reminders',listId:item.id}:{provider:'google',connectionId:scope,listId:item.id};
  onChange({target,title:item.title});if(!embedded)close();
 }
 function row(title:string,action:()=>void,key=title,color?:string){
  return <Pressable key={key} accessibilityRole="button" disabled={disabled} onPress={action} style={{minHeight:44,alignItems:'center',flexDirection:'row',gap:8,paddingHorizontal:12}}>
   {!!color&&<View style={{width:9,height:9,borderRadius:5,backgroundColor:color}}/>}
   <Text style={{...typography.detail,color:colors.text}}>{title}</Text>
  </Pressable>;
 }
 return <View>
  {!embedded&&<Pressable accessibilityRole="button" accessibilityLabel="Ticket 저장 목록 선택" accessibilityState={{expanded:open}} disabled={disabled}
   onPress={()=>{if(open)close();else{setOpen(true);void root();}}}
   style={{minHeight:44,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingHorizontal:12,borderRadius:12,backgroundColor:colors.grouped}}>
   <Text style={{...typography.detail,color:colors.text}}>저장 목록</Text>
   <Text numberOfLines={1} style={{...typography.detail,color:colors.secondary,flexShrink:1}}>{value?.title??'도슨'}</Text>
  </Pressable>}
  {open&&<View style={{marginTop:4,paddingVertical:4,borderRadius:12,backgroundColor:colors.grouped}}>
   {scope?row('저장 목록으로 돌아가기',()=>void root()):allowLocal?row('도슨',()=>{onChange(null);if(!embedded)close();}):null}
   {!scope&&Platform.OS==='ios'&&row('아이폰 미리알림',()=>void load('@apple'))}
   {!scope&&accounts.map(account=>row('Google Tasks · '+account.title,()=>void load(account.id),account.id))}
   {scope&&lists.map(item=>row(item.title,()=>choose(item),item.id,item.color))}
   {scope&&next&&row('목록 더 보기',()=>void load(scope,next))}
   {!!error&&<Text accessibilityRole="alert" style={{...typography.detail,color:colors.danger,padding:12}}>{error}</Text>}
   {busy&&<Text accessibilityLiveRegion="polite" style={{...typography.detail,color:colors.secondary,padding:12}}>목록을 불러오고 있어요.</Text>}
  </View>}
 </View>;
}
