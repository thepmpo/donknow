import {Platform} from 'react-native';
import type {Todo} from './domain';
import {appleSourcePlan} from './apple-source-plan';
export async function updateAppleSource(todo:Todo,request:(path:string,method?:string,body?:unknown)=>Promise<unknown>,current:()=>boolean):Promise<Todo>{
 if(todo.source?.provider!=='apple-reminders'||!todo.sourceSync?.patch)return todo;
 let state:'succeeded'|'failed'|'unknown'|'device-required'=Platform.OS==='ios'?'failed':'device-required',modifiedAt:string|undefined,attempted=false;
 try{if(Platform.OS==='ios'){
  const Calendar=await import('expo-calendar');let permission=await Calendar.getRemindersPermissions();if(!permission.granted)permission=await Calendar.requestRemindersPermissions();if(!current())return todo;if(!permission.granted)throw Error('permission');
  const source=await Calendar.ExpoCalendarReminder.get(todo.source.externalId);if(!current())return todo;
  const {fields,same}=appleSourcePlan(todo,source);
  if(!same){if(!current())return todo;attempted=true;await source.update(fields as Parameters<typeof source.update>[0]);}
  if(!current())return todo;const latest=await Calendar.ExpoCalendarReminder.get(todo.source.externalId);if(!current())return todo;modifiedAt=latest.lastModifiedDate?new Date(latest.lastModifiedDate).toISOString():undefined;state='succeeded';
 }}catch{state=attempted?'unknown':'failed';}
 if(!current())return todo;
 try{return await request('/api/todos/'+todo.id+'/source-result','POST',{revision:todo.sourceSync.revision,state,modifiedAt}) as Todo;}catch{return {...todo,sourceSync:{...todo.sourceSync,state:attempted?'unknown':state}};}
}
