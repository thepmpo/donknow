import type {CalendarEvent} from './calendar-model.ts';
export type CalendarSnapshot={key:string;family:string;start:string;end:string;items:CalendarEvent[];readAt:string|null;cursors:Record<string,string>};
export type SnapshotStorage={get:(key:string)=>Promise<string|null>;set:(key:string,value:string)=>Promise<void>;remove:(key:string)=>Promise<void>};
let generationSequence=0;
const encodedOwner=(owner:string)=>Array.from({length:owner.length},(_,i)=>owner.charCodeAt(i).toString(16).padStart(4,'0')).join('');
/** Bounded private storage, with an atomic manifest switch after writing the chunks. */
export function createCalendarDeviceStore(storage:SnapshotStorage,namespace:string){
 const prefix=(owner:string)=>namespace+encodedOwner(owner);
 const queues=new Map<string,Promise<unknown>>(),epochs=new Map<string,number>(),saved=new Map<string,string>();
 async function enqueue(owner:string,fn:()=>Promise<void>){
  const task=(queues.get(owner)??Promise.resolve()).catch(()=>{}).then(fn);
  queues.set(owner,task);
  try{await task;}finally{if(queues.get(owner)===task)queues.delete(owner);}
 }
 async function manifest(owner:string){
  const raw=await storage.get(prefix(owner));
  if(!raw)return null;
  const m=JSON.parse(raw);
  if(m.owner!==owner||typeof m.g!=='string'||!Number.isInteger(m.parts)||m.parts<1||m.parts>600||!Number.isFinite(m.at))throw Error('Invalid calendar manifest');
  return m as {g:string;parts:number};
 }
 async function batch<T>(count:number,fn:(index:number)=>Promise<T>){
  const result:T[]=[];
  for(let i=0;i<count;i+=8)result.push(...await Promise.all(Array.from({length:Math.min(8,count-i)},(_,j)=>fn(i+j))));
  return result;
 }
 const drop=async(owner:string,m:{g:string;parts:number}|null)=>{if(m)await batch(m.parts,i=>storage.remove(prefix(owner)+'.'+m.g+'.'+i).catch(()=>{}));};
 async function read(owner:string){
  const epoch=epochs.get(owner)??0,m=await manifest(owner);if(!m)return null;
  const chunks=await batch(m.parts,i=>storage.get(prefix(owner)+'.'+m.g+'.'+i));
  if(epoch!==(epochs.get(owner)??0))return null;
  if(chunks.includes(null))throw Error('Incomplete calendar record');
  return chunks.join('');
 }
 function write(owner:string,text:string,fingerprint=text){
  if(text.length>250000)return Promise.reject(Error('Calendar device storage is full'));
  const epoch=epochs.get(owner)??0;
  return enqueue(owner,async()=>{if(epoch!==(epochs.get(owner)??0)||saved.get(owner)===fingerprint)return;const old=await manifest(owner).catch(()=>null),candidate=Date.now().toString(36)+'-'+(++generationSequence).toString(36),g=candidate===old?.g?candidate+'-next':candidate,parts=[] as string[];
   // <= 1800 UTF-8 bytes even for Korean/emoji; historical iOS item limits stay respected.
   let chunk='';for(const char of text){if(chunk.length+char.length>440){parts.push(chunk);chunk='';}chunk+=char;}if(chunk)parts.push(chunk);
   const next={owner,g,parts:parts.length,at:Date.now()};
   try{await batch(parts.length,async i=>{
    try{await storage.set(prefix(owner)+'.'+g+'.'+i,parts[i]);return null;}catch(error){return {error};}
   }).then(results=>{const failure=results.find(Boolean);if(failure)throw failure.error;});if(epoch!==(epochs.get(owner)??0)){await drop(owner,next);return;}await storage.set(prefix(owner),JSON.stringify(next));if(epoch===(epochs.get(owner)??0))saved.set(owner,fingerprint);await drop(owner,old);}catch(error){await drop(owner,next);throw error;}
  });
 }
 function clear(owner:string){saved.delete(owner);epochs.set(owner,(epochs.get(owner)??0)+1);return enqueue(owner,async()=>{saved.delete(owner);const old=await manifest(owner).catch(()=>null);await storage.remove(prefix(owner));await drop(owner,old);});}
 return {read,write,clear};
}

export function createCalendarSnapshotStore(storage:SnapshotStorage){
 const disk=createCalendarDeviceStore(storage,'duck.calendar.');
 async function read(owner:string):Promise<CalendarSnapshot[]>{
  try{
   const value=JSON.parse(await disk.read(owner)??'null');
   return Array.isArray(value)?value.filter(p=>p&&typeof p.key==='string'&&typeof p.family==='string'&&typeof p.start==='string'&&typeof p.end==='string'&&Array.isArray(p.items)&&p.items.every((e:CalendarEvent)=>typeof e?.id==='string'&&typeof e?.title==='string')).slice(-12):[];
  }catch{return [];}
 }
 function write(owner:string,periods:CalendarSnapshot[]){
  // Keep only display data. The device snapshot cannot grant provider write authority.
  const safe=periods.slice(-12).map(p=>({...p,items:p.items.slice(0,250).map(e=>({id:e.id,eventId:e.eventId,connectionId:e.connectionId,calendarId:e.calendarId,calendarName:e.calendarName,provider:e.provider,mirror:e.mirror,color:e.color,title:e.title,dueDate:e.dueDate,startAt:e.startAt,endAt:e.endAt,endDate:e.endDate,allDay:e.allDay,timeZone:e.timeZone,canWrite:false}))}));
  while(safe.length&&JSON.stringify(safe).length>250000)safe.shift();
  return disk.write(owner,JSON.stringify(safe),JSON.stringify(safe.map(({readAt,...period})=>period)));
 }
 return {read,write,clear:disk.clear};
}
