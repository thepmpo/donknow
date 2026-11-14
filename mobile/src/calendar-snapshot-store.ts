import type {CalendarEvent} from './calendar-model.ts';
export type CalendarSnapshot={key:string;family:string;start:string;end:string;items:CalendarEvent[];readAt:string|null;cursors:Record<string,string>};
export type SnapshotStorage={get:(key:string)=>Promise<string|null>;set:(key:string,value:string)=>Promise<void>;remove:(key:string)=>Promise<void>};
let generationSequence=0;
const prefix=(owner:string)=>'duck.calendar.'+Array.from({length:owner.length},(_,i)=>owner.charCodeAt(i).toString(16).padStart(4,'0')).join('');
/** Private native storage: immutable bounded chunks, then one atomic manifest switch. */
export function createCalendarSnapshotStore(storage:SnapshotStorage){
 const queues=new Map<string,Promise<unknown>>(),epochs=new Map<string,number>();
 const enqueue=(owner:string,fn:()=>Promise<void>)=>{const task=(queues.get(owner)??Promise.resolve()).catch(()=>{}).then(fn);queues.set(owner,task);return task;};
 async function manifest(owner:string){try{const raw=await storage.get(prefix(owner));if(!raw)return null;const m=JSON.parse(raw);return m.owner===owner&&typeof m.g==='string'&&Number.isInteger(m.parts)&&m.parts>0&&m.parts<=600&&Number.isFinite(m.at)?m:null;}catch{return null;}}
 const drop=async(owner:string,m:{g:string;parts:number}|null)=>{if(m)await Promise.all(Array.from({length:m.parts},(_,i)=>storage.remove(prefix(owner)+'.'+m.g+'.'+i).catch(()=>{})));};
 async function read(owner:string):Promise<CalendarSnapshot[]>{try{const epoch=epochs.get(owner)??0,m=await manifest(owner);if(!m)return [];const chunks=await Promise.all(Array.from({length:m.parts},(_,i)=>storage.get(prefix(owner)+'.'+m.g+'.'+i)));if(chunks.some(x=>x===null)||epoch!==(epochs.get(owner)??0))return [];const value=JSON.parse(chunks.join(''));return Array.isArray(value)?value.filter(p=>p&&typeof p.key==='string'&&typeof p.family==='string'&&typeof p.start==='string'&&typeof p.end==='string'&&Array.isArray(p.items)&&p.items.every((e:CalendarEvent)=>typeof e?.id==='string'&&typeof e?.title==='string')).slice(-12):[];}catch{return [];}}
 function write(owner:string,periods:CalendarSnapshot[]){
  const epoch=epochs.get(owner)??0;
  // Store only the display snapshot. Notes, links, access rights and ETags are not cached on disk.
  const safe=periods.slice(-12).map(p=>({...p,items:p.items.slice(0,250).map(e=>({id:e.id,eventId:e.eventId,connectionId:e.connectionId,calendarId:e.calendarId,calendarName:e.calendarName,title:e.title,dueDate:e.dueDate,startAt:e.startAt,endAt:e.endAt,endDate:e.endDate,allDay:e.allDay,timeZone:e.timeZone,canWrite:false}))}));
  while(safe.length&&JSON.stringify(safe).length>250000)safe.shift();const text=JSON.stringify(safe);
  return enqueue(owner,async()=>{if(epoch!==(epochs.get(owner)??0))return;const old=await manifest(owner),candidate=Date.now().toString(36)+'-'+(++generationSequence).toString(36),g=candidate===old?.g?candidate+'-next':candidate,parts=[] as string[];
   // <= 1800 UTF-8 bytes even for Korean/emoji; historical iOS item limits stay respected.
   let chunk='';for(const char of text){if(chunk.length+char.length>440){parts.push(chunk);chunk='';}chunk+=char;}if(chunk)parts.push(chunk);
   const next={owner,g,parts:parts.length,at:Date.now()};
   try{await Promise.all(parts.map((v,i)=>storage.set(prefix(owner)+'.'+g+'.'+i,v)));if(epoch!==(epochs.get(owner)??0)){await drop(owner,next);return;}await storage.set(prefix(owner),JSON.stringify(next));await drop(owner,old);}catch(error){await drop(owner,next);throw error;}
  });
 }
 function clear(owner:string){epochs.set(owner,(epochs.get(owner)??0)+1);return enqueue(owner,async()=>{const old=await manifest(owner);await storage.remove(prefix(owner));await drop(owner,old);});}
 return {read,write,clear};
}
