import {Platform} from 'react-native';
import {readIntegrationStatuses} from './integration-settings';
import {appleReminderDevice} from './apple-reminder-device';
import {copyReminders} from './apple-reminder-read';
import type {ListedReminder} from './apple-reminder-read';
import {parseTodos} from './domain';
import type {Todo} from './domain';

type Request=(path:string,method?:string,body?:unknown)=>Promise<unknown>;
type Page<T>={items:T[];nextCursor?:string|null};
async function pages(current:()=>boolean,read:(cursor?:string)=>Promise<string|null|undefined>){
 const seen=new Set<string>();
 let cursor:string|undefined;
 while(current()){
  const next=await read(cursor);
  if(!next)return;
  if(seen.has(next))throw Error('목록의 다음 페이지를 읽지 못했어요.');
  seen.add(next);cursor=next;
 }
}
export async function readAppleTodoLists(current:()=>boolean,onList:(id:string,rows:ListedReminder[])=>void){
 if(Platform.OS!=='ios')return;
 const Calendar=await import('expo-calendar');
 if(!(await Calendar.getRemindersPermissions()).granted||!current())return;
 const lists=await appleReminderDevice.lists();
 for(let i=0;current()&&i<lists.length;i+=3){
  await Promise.allSettled(lists.slice(i,i+3).map(async list=>{
   const rows=copyReminders(await list.listReminders(null,null,null)).map(row=>({...row,listId:list.id,listTitle:list.title,...(list.color?{color:list.color}:{})}));
   if(current())onList(list.id,rows);
  }));
 }
}
export async function refreshTodoSources(request:Request,current:()=>boolean,appleVersions:Map<string,string>,providers:{google?:boolean;apple?:boolean;appleRows?:ReadonlyMap<string,ListedReminder[]>;onChange?:(items?:Todo[])=>void;onSuppressed?:(ids:string[])=>void}={}){
 let changed=false;
 async function google(){
  const capabilities=await request('/api/capabilities') as {todoSourceRefresh?:number};
  if(!current()||capabilities.todoSourceRefresh!==1)return;
  const status=readIntegrationStatuses(await request('/api/integrations')).find(row=>row.provider==='google'&&row.connected);
  if(!status||!current())return;
  const accounts=status.accounts?.length?status.accounts:status.features.includes('tasks')?[{connectionId:undefined,features:status.features}]:[];
  await Promise.allSettled(accounts.filter(account=>account.features.includes('tasks')).map(async account=>{
   await pages(current,async cursor=>{
    const query=new URLSearchParams({feature:'tasks',...(account.connectionId?{connectionId:account.connectionId}:{}),...(cursor?{cursor}:{})});
    const page=await request('/api/integrations/google/resources?'+query) as Page<{id:string}>;
    if(!Array.isArray(page.items))throw Error('Ticket 목록 응답을 확인해주세요.');
    for(const list of page.items){
     if(!current())break;
     // A failed source list never clears the previously reconciled rows.
     await pages(current,async taskCursor=>{
      const result=await request('/api/integrations/google/task-refresh','POST',{connectionId:account.connectionId,list:list.id,cursor:taskCursor}) as {changed:number;nextCursor?:string|null};
      changed=changed||result.changed>0;
      if(result.changed&&current())providers.onChange?.();
      return result.nextCursor;
     }).catch(()=>{});
    }
    return page.nextCursor;
   });
  }));
 }
 async function apple(){
  const readLists=new Map<string,ListedReminder[]>();
  if(!providers.appleRows)await readAppleTodoLists(current,(id,rows)=>readLists.set(id,rows));
  const lists=providers.appleRows??readLists;
  for(const rows of lists.values()){
   if(!current())return;
   try{
    const pending=rows.map(item=>({item,version:JSON.stringify(item)})).filter(({item,version})=>appleVersions.get(item.id)!==version);
    for(let i=0;current()&&i<pending.length;i+=12){
     const batch=pending.slice(i,i+12),items=batch.map(({item})=>item);
     const result=await request('/api/integrations/apple-reminders/refresh','POST',{items}) as {changed:number;items?:unknown;deferred?:string[];suppressed?:string[]};
     if(!current())return;
     if(result.suppressed?.length)providers.onSuppressed?.(result.suppressed);
     for(const {item,version} of batch)if(!result.deferred?.includes(item.id))appleVersions.set(item.id,version);
     changed=changed||result.changed>0;
     if(result.changed&&current())providers.onChange?.(Array.isArray(result.items)?parseTodos(result.items):undefined);
    }
   }catch{}
  }
 }
 await Promise.allSettled([providers.google===false?undefined:google(),providers.apple===false?undefined:apple()]);
 return changed&&current();
}
