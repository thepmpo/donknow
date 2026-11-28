import {Platform} from 'react-native';
import type {Todo} from './domain';
import {applyAppleSource} from './apple-source-apply';
export async function updateAppleSource(todo:Todo,request:(path:string,method?:string,body?:unknown)=>Promise<unknown>,current:()=>boolean,ask=true):Promise<Todo>{
 if(todo.source?.provider!=='apple-reminders'||!todo.sourceSync?.patch)return todo;
 let result:{state:'succeeded'|'failed'|'unknown'|'device-required';modifiedAt?:string;completed?:boolean}={state:'device-required'};
 try{if(Platform.OS==='ios'){
  const Calendar=await import('expo-calendar');if(!ask&&!(await Calendar.getRemindersPermissions()).granted)return todo;const value=await applyAppleSource(todo,{authorize:async()=>{let permission=await Calendar.getRemindersPermissions();if(ask&&!permission.granted)permission=await Calendar.requestRemindersPermissions();return permission.granted;},read:async id=>{const source=await Calendar.ExpoCalendarReminder.get(id);return {title:source.title,notes:source.notes,dueDate:source.dueDate,startDate:source.startDate,allDay:source.allDay,completed:source.completed,lastModifiedDate:source.lastModifiedDate,update:fields=>source.update(fields as Parameters<typeof source.update>[0])};}},current);if(!value)return todo;result=value;
 }}catch{result={state:'failed'};}
 if(!current())return todo;
 if(result.state===todo.sourceSync.state&&result.state==='failed')return todo;
 try{return await request('/api/todos/'+todo.id+'/source-result','POST',{revision:todo.sourceSync.revision,...result}) as Todo;}catch{return {...todo,sourceSync:{...todo.sourceSync,state:result.state==='succeeded'?'unknown':result.state}};}
}
