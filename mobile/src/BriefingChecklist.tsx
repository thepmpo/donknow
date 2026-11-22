import {useDesktopPresentation} from './DesktopPresentation';
import {Linking,Text,View} from 'react-native';
import {colors} from './theme';
import React,{useEffect,useRef,useState} from 'react';
import {AssistantChecklist} from './AssistantChecklist';
import {updateAppleSource} from './apple-source-edit';
import {parseTodos} from './domain';
import type {Todo} from './domain';
import type {BriefingItem} from './useAutomations';
import type {TodoStore} from './useTodos';
import type {AssistantProposal} from './useAssistant';
import type {AssistantDraft} from './useAssistant';
import {ChecklistCalendar} from './ChecklistCalendar';
import {assistantUpdated} from './assistant-updates';
import {MotionPressable as Pressable} from './motion';
export function BriefingChecklist({store,messageId,item,number,onOpenTodos,onOpenLog,conversation=false,canTransfer=true,sources=[],onReveal}:{onReveal?:()=>void;sources?:{ref:string;title:string;provider:string}[];canTransfer?:boolean;store:TodoStore;messageId:string;item:BriefingItem;number:number;conversation?:boolean;onOpenTodos:()=>void;onOpenLog:()=>void}){
 const desktop=useDesktopPresentation();
 const [calendarOpen,setCalendarOpen]=useState(false);
 const [state,setState]=useState({todoId:item.todoId??undefined,excluded:item.excluded,todo:item.todo??undefined,calendarAdded:item.calendarAdded,calendarAction:item.calendarAction,busy:false,error:''});
 const mounted=useRef(true),working=useRef(false),owner=useRef('');
 const identity=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;owner.current=identity;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!working.current)setState(old=>({...old,todoId:item.todoId??undefined,todo:item.todo??undefined,excluded:item.excluded,calendarAdded:item.calendarAdded,calendarAction:item.calendarAction}));},[item.todoId,item.todo?.done,item.excluded,item.calendarAdded,item.calendarAction?.status]);
 useEffect(()=>{if(!working.current)setState(old=>{const todo=store.todos.find(t=>t.id===old.todoId);return todo?{...old,todo}:old;});},[store.todos]);
 async function request(action:string,args?:unknown,sourceRef?:string){return item.token&&!(conversation&&/^[a-f0-9-]{36}$/.test(messageId))?store.featureRequest('/api/assistant/checklist','POST',{token:item.token,key:item.key,action,args,sourceRef}):store.featureRequest(`/api/assistant/${conversation?'conversation':'messages'}/${encodeURIComponent(messageId)}/items/${item.key}`,'POST',{action,args,sourceRef});}
 async function prepare(args:Record<string,unknown>){const captured=identity,result=await request('calendar',args) as AssistantDraft;if(owner.current!==captured||!mounted.current)throw Error('계정이나 연결이 바뀌었어요.');setState(old=>({...old,calendarAction:result}));return result;}
 async function act(action:'complete'|'todo'|'exclude'|'restore',proposal?:AssistantProposal){
  if(working.current)return;working.current=true;const captured=identity;setState(old=>({...old,busy:true,error:''}));
  try{
   const result=await request(action,proposal?.args) as {todoId:string|null;excluded:boolean;todo:Todo|null};
   let todo=result.todo?parseTodos([result.todo])[0]:undefined;
   if(todo?.source?.provider==='apple-reminders'&&todo.sourceSync?.state==='device-required')todo=await updateAppleSource(todo,store.featureRequest,()=>mounted.current&&owner.current===captured&&store.isCurrentSession());
   if(!mounted.current||owner.current!==captured)return;
   setState(old=>({...old,todoId:result.todoId??undefined,excluded:result.excluded,todo,busy:false,error:''}));assistantUpdated({owner:identity});
   if(action==='complete'||action==='todo')void store.refresh();
  }catch(error){if(mounted.current&&owner.current===captured)setState(old=>({...old,busy:false,error:error instanceof Error?error.message:'저장하지 못했어요. 다시 확인해주세요.'}));}
  finally{working.current=false;}
 }
 const linked=state.todo??store.todos.find(t=>t.id===state.todoId);
 if(!canTransfer&&!linked)return <View style={{paddingVertical:8,gap:4}}><Text style={{fontSize:16,lineHeight:24,color:colors.text}}>{item.title}</Text>{item.dueDate&&<Text style={{fontSize:13,color:colors.muted}}>{item.dueDate}</Text>}</View>;
 const links=(sources.length?sources:item.sources??[]).filter(s=>item.sourceRefs?.includes(s.ref)).slice(0,3);
 return <View><AssistantChecklist compact sourceLabels={desktop?[...new Set(links.map(s=>({google:'Google',gmail:'Gmail',slack:'Slack',notion:'Notion','apple-reminders':'미리알림'}[s.provider]??s.provider)))]:[]} sourceLinks={links.length>0?<View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{links.map(s=><Pressable key={s.ref} accessibilityRole="link" accessibilityLabel={s.title+' 원본 열기'} disabled={state.busy} onPress={()=>{const captured=identity;void request('source',undefined,s.ref).then(async value=>{if(owner.current===captured&&mounted.current)await Linking.openURL((value as {url:string}).url);}).catch(e=>{if(owner.current===captured&&mounted.current)setState(old=>({...old,error:e.message}));});}} style={{minHeight:desktop?24:44,justifyContent:'center'}}><Text numberOfLines={1} style={{fontSize:desktop?10:13,color:colors.blueText,textDecorationLine:'underline',maxWidth:140}}>{desktop?({google:'Google',gmail:'Gmail',slack:'Slack',notion:'Notion','apple-reminders':'미리알림'}[s.provider]??s.title):s.title}</Text></Pressable>)}</View>:undefined} proposal={{operation:'todo.create',label:'할 일',args:{title:item.title,notes:item.notes??'',dueDate:item.dueDate??null},sourceRefs:item.sourceRefs??[]}} number={number} busy={false} entry={state} todo={linked} onCalendar={()=>{if(state.calendarAdded){setState(old=>({...old,error:'이미 캘린더에 추가한 일이에요. 원본 캘린더에서 확인해주세요.'}));return;}onReveal?.();setCalendarOpen(true);}} onAction={(proposal,done)=>act(done?'complete':'todo',proposal)} onExclude={excluded=>{void act(excluded?'exclude':'restore');}} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>{calendarOpen&&<ChecklistCalendar store={store} item={{...item,calendarAction:state.calendarAction}} prepare={prepare} onClose={()=>setCalendarOpen(false)} onSaved={()=>{setCalendarOpen(false);setState(old=>({...old,calendarAdded:true,error:''}));assistantUpdated({owner:identity});}}/>}</View>;
}
