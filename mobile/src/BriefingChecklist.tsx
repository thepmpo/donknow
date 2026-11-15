import React,{useEffect,useRef,useState} from 'react';
import {AssistantChecklist} from './AssistantChecklist';
import {parseTodos} from './domain';
import type {Todo} from './domain';
import type {BriefingItem} from './useAutomations';
import type {TodoStore} from './useTodos';
import type {AssistantProposal} from './useAssistant';
export function BriefingChecklist({store,messageId,item,number,onOpenTodos,onOpenLog,conversation=false}:{store:TodoStore;messageId:string;item:BriefingItem;number:number;conversation?:boolean;onOpenTodos:()=>void;onOpenLog:()=>void}){
 const [state,setState]=useState({todoId:item.todoId??undefined,excluded:item.excluded,todo:item.todo??undefined,busy:false,error:''});
 const mounted=useRef(true),working=useRef(false),owner=useRef('');
 const identity=`${store.connection?.mode==='cloud'?store.connection.baseUrl:'demo'}:${store.user?.id??''}`;owner.current=identity;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{if(!working.current)setState(old=>({...old,todoId:item.todoId??undefined,todo:item.todo??undefined,excluded:item.excluded}));},[item.todoId,item.todo?.done,item.excluded]);
 useEffect(()=>{if(!working.current)setState(old=>{const todo=store.todos.find(t=>t.id===old.todoId);return todo?{...old,todo}:old;});},[store.todos]);
 async function act(action:'complete'|'todo'|'exclude'|'restore',proposal?:AssistantProposal){
  if(working.current)return;working.current=true;const captured=identity;setState(old=>({...old,busy:true,error:''}));
  try{
   const result=await store.featureRequest(`/api/assistant/${conversation?'conversation':'messages'}/${encodeURIComponent(messageId)}/items/${item.key}`,'POST',{action,...(proposal?{args:proposal.args}:{})}) as {todoId:string|null;excluded:boolean;todo:Todo|null};
   const todo=result.todo?parseTodos([result.todo])[0]:undefined;
   if(!mounted.current||owner.current!==captured)return;
   setState({todoId:result.todoId??undefined,excluded:result.excluded,todo,busy:false,error:''});
   if(action==='complete'||action==='todo')void store.refresh();
  }catch(error){if(mounted.current&&owner.current===captured)setState(old=>({...old,busy:false,error:error instanceof Error?error.message:'저장하지 못했어요. 다시 확인해주세요.'}));}
  finally{working.current=false;}
 }
 const linked=state.todo??store.todos.find(t=>t.id===state.todoId);
 return <AssistantChecklist proposal={{operation:'todo.create',label:'할 일',args:{title:item.title,notes:item.notes??'',dueDate:item.dueDate??null},sourceRefs:item.sourceRefs??[]}} number={number} busy={false} entry={state} todo={linked} onAction={(proposal,done)=>act(done?'complete':'todo',proposal)} onExclude={excluded=>{void act(excluded?'exclude':'restore');}} onOpenTodos={onOpenTodos} onOpenLog={onOpenLog}/>;
}
