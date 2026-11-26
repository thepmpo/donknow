import type {CalendarEvent,CalendarMirrorTarget} from './calendar-model.ts';
export type CalendarCreatePayload={revision:0;args:Record<string,unknown>;fields:NonNullable<CalendarEvent['duckDetails']>['fields'];target?:CalendarMirrorTarget};
export type QueuedCalendarCreate={id:string;event:CalendarEvent;payload:CalendarCreatePayload;blocked?:boolean};
type Disk={read:(owner:string)=>Promise<string|null>;write:(owner:string,data:string)=>Promise<void>;clear:(owner:string)=>Promise<void>};

export function createCalendarCreateQueue(disk:Disk){
 const jobs=new Map<string,readonly QueuedCalendarCreate[]>(),operations=new Map<string,Promise<unknown>>();
 const listeners=new Map<string,Set<()=>void>>();
 function publish(owner:string,value:readonly QueuedCalendarCreate[]){
  jobs.set(owner,value);listeners.get(owner)?.forEach(listener=>listener());
 }
 async function serial<T>(owner:string,run:()=>Promise<T>){
  const task=(operations.get(owner)??Promise.resolve()).catch(()=>{}).then(run);
  operations.set(owner,task);
  try{return await task;}finally{if(operations.get(owner)===task)operations.delete(owner);}
 }
 async function read(owner:string){
  const existing=jobs.get(owner);if(existing)return existing;
  const stored=JSON.parse(await disk.read(owner)??'[]');
  if(!Array.isArray(stored)||stored.some(job=>!job?.id||job.event?.id!=='docen:'+job.id||job.payload?.revision!==0))throw Error('Invalid calendar create queue');
  publish(owner,stored);
  return stored as QueuedCalendarCreate[];
 }
 const update=(owner:string,change:(previous:readonly QueuedCalendarCreate[])=>readonly QueuedCalendarCreate[])=>serial(owner,async()=>{
  const previous=await read(owner),next=change(previous);
  if(next!==previous){await disk.write(owner,JSON.stringify(next));publish(owner,next);}
 });
 return {
  read:(owner:string)=>serial(owner,()=>read(owner)),
  add:(owner:string,job:QueuedCalendarCreate)=>update(owner,old=>old.some(entry=>entry.id===job.id)?old:[...old,job]),
  remove:(owner:string,id:string)=>update(owner,old=>old.some(job=>job.id===id)?old.filter(job=>job.id!==id):old),
  block:(owner:string,id:string,blocked:boolean)=>update(owner,old=>old.map(job=>job.id===id?{...job,blocked}:job)),
  clear:(owner:string)=>serial(owner,async()=>{await disk.clear(owner);publish(owner,[]);}),
  watch(owner:string,listener:()=>void){
   const set=listeners.get(owner)??new Set();set.add(listener);listeners.set(owner,set);
   return ()=>{set.delete(listener);if(!set.size)listeners.delete(owner);};
  },
  snapshot:(owner:string)=>jobs.get(owner),
 };
}

export type CalendarCreateQueue=ReturnType<typeof createCalendarCreateQueue>;
