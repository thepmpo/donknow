type Disk={read:(owner:string)=>Promise<string|null>;write:(owner:string,data:string)=>Promise<void>;clear:(owner:string)=>Promise<void>};

export function createDeviceCreateQueue<Job extends {id:string;blocked?:boolean}>(disk:Disk,isJob:(entry:unknown)=>entry is Job){
 const jobs=new Map<string,readonly Job[]>(),operations=new Map<string,Promise<unknown>>();
 const listeners=new Map<string,Set<()=>void>>();
 function publish(owner:string,value:readonly Job[]){
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
  if(!Array.isArray(stored)||!stored.every(isJob))throw Error('Invalid device create queue');
  publish(owner,stored);
  return stored as Job[];
 }
 const update=(owner:string,change:(previous:readonly Job[])=>readonly Job[])=>serial(owner,async()=>{
  const previous=await read(owner),next=change(previous);
  if(next!==previous){await disk.write(owner,JSON.stringify(next));publish(owner,next);}
 });
 return {
  read:(owner:string)=>serial(owner,()=>read(owner)),
  add:(owner:string,job:Job)=>update(owner,old=>old.some(entry=>entry.id===job.id)?old:[...old,job]),
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

