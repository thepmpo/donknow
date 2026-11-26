import {dateKey} from './domain.ts';
type NativeReminder={id?:string|null;title?:string|null;notes?:string|null;completed?:boolean;dueDate?:Date|string|null;allDay?:boolean;lastModifiedDate?:Date|string|null};
export type ReminderItem={id:string;title:string;notes:string;completed:boolean;dueDate:string|null;dueTime:string|null;modifiedAt?:string;color?:string};
/** Copy shared objects before another permission/read can invalidate their native store. */
export function copyReminders(items:NativeReminder[]):ReminderItem[]{return items.filter(item=>!!item.id).map(item=>{
 const due=item.dueDate?new Date(item.dueDate):null,modified=item.lastModifiedDate?new Date(item.lastModifiedDate):null;
 return {id:item.id!,title:(item.title||'제목 없는 할 일').slice(0,120),notes:(item.notes??'').slice(0,4000),completed:!!item.completed,dueDate:due&&Number.isFinite(due.getTime())?dateKey(due):null,dueTime:due&&Number.isFinite(due.getTime())&&!item.allDay?`${String(due.getHours()).padStart(2,'0')}:${String(due.getMinutes()).padStart(2,'0')}`:null,...(modified&&Number.isFinite(modified.getTime())?{modifiedAt:modified.toISOString()}: {})};
 });}
export async function readReminderItems(id:string,readLists:()=>Promise<{id:string;color?:string|null;listReminders:(start:null,end:null,status:null|'incomplete'|'completed')=>Promise<NativeReminder[]>}[]>,current:()=>boolean,wait:()=>Promise<void>=()=>new Promise(r=>setTimeout(r,250)),status:'incomplete'|'completed'|null=null){
 let items:ReminderItem[]=[];
 for(let attempt=0;attempt<2;attempt++){
  if(!current())return null;
  const lists=await readLists();if(!current())return null;
  const list=lists.find(l=>l.id===id);if(!list)throw Error('이 미리 알림 목록을 찾지 못했어요. 목록을 다시 확인해주세요.');
  // Read the unbounded list and filter locally so an undated reminder remains eligible.
  const raw=await list.listReminders(null,null,null);if(!current())return null;
  const color=list.color;items=copyReminders(raw).filter(item=>status===null||item.completed===(status==='completed'));if(items.length)return color&&/^#[a-f\d]{6}$/i.test(color)?items.map(item=>({...item,color})):items;
  if(!attempt)await wait();
 }
 return items;
}

/** Read every accessible list; a failed list must not erase successful lists. */
export async function readAllReminderItems(lists:{id:string;title:string}[],readLists:Parameters<typeof readReminderItems>[1],current:()=>boolean,progress:(completed:number,total:number)=>void=()=>{}){
 const items=new Map<string,ReminderItem&{listTitle:string}>(),failedLists:{id:string;title:string}[]=[];
 for(const [index,list] of [...new Map(lists.map(l=>[l.id,l])).values()].entries()){
  if(!current())return null;
  try{const rows=await readReminderItems(list.id,readLists,current,undefined,'incomplete');if(!rows||!current())return null;for(const row of rows)if(!row.completed)items.set(row.id,{...row,listTitle:list.title});}catch{if(current())failedLists.push(list);}
  if(!current())return null;progress(index+1,lists.length);
 }
 return {items:[...items.values()],failedLists};
}
