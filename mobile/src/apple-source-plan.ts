import type {Todo} from './domain.ts';
import {dateKey} from './domain.ts';
import {reminderDue} from './apple-reminder-read.ts';
type Source={completed?:boolean;title?:string|null;notes?:string|null;dueDate?:Date|string|null;startDate?:Date|string|null;allDay?:boolean;lastModifiedDate?:Date|string|null};
export function appleSourcePlan(todo:Todo,source:Source){
 const patch=todo.sourceSync?.patch??{},fields:{title?:string;notes?:string;dueDate?:Date|null;startDate?:null;allDay?:boolean;completed?:boolean}={};
 if('done' in patch)fields.completed=todo.done;
 if('title' in patch)fields.title=todo.title;if('notes' in patch)fields.notes=todo.notes??'';
 if('dueDate' in patch||'dueTime' in patch){fields.dueDate=todo.dueDate?new Date(todo.dueDate+'T'+(todo.dueTime??'12:00')+':00'):null;fields.allDay=todo.dueTime==null;if(source.startDate&&(!fields.dueDate||new Date(source.startDate)>fields.dueDate))fields.startDate=null;}
 const due=reminderDue(source);
 const same=Object.entries(fields).every(([key,value])=>{
  if(key==='dueDate')return due.dueDate===(value instanceof Date?dateKey(value):null);
  if(key==='allDay')return !fields.dueDate||due.dueTime===(todo.dueTime??null);
  if(key==='startDate')return !source.startDate;
  if(key==='title')return source.title===value;
  if(key==='notes')return (source.notes??'')===value;
  return source.completed===value;
 });
 const actual=source.lastModifiedDate?new Date(source.lastModifiedDate).toISOString():undefined;
 if(!same&&todo.source?.modifiedAt&&actual&&Date.parse(todo.source.modifiedAt)!==Date.parse(actual))throw Error('원본이 바뀌었어요. 미리 알림 앱에서 내용을 확인한 뒤 다시 가져와주세요.');
 return {fields,same};
}
