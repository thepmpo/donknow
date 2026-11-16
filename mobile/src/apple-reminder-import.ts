import type {ReminderItem} from './apple-reminder-read.ts';
export type ReminderImportProgress={processed:number;total:number;created:number;existing:number};
export async function importReminderItems(items:ReminderItem[],request:(items:ReminderItem[])=>Promise<unknown>,current:()=>boolean,progress:(value:ReminderImportProgress)=>void=()=>{}){
 const pending=[...new Map(items.filter(i=>!i.completed).map(i=>[i.id,i])).values()],total=pending.length,processedIds:string[]=[];let created=0,existing=0,error='';
 while(pending.length&&current()){
  const batch:ReminderItem[]=[];
  // At most 20 per request; UTF-16 length * 3 safely bounds UTF-8 JSON bytes.
  for(const item of pending.slice(0,20)){if(batch.length&&JSON.stringify({items:[...batch,item]}).length*3>200*1024)break;batch.push(item);}
  try{const value=await request(batch) as {results?:{created:boolean;todo?:{source?:{externalId?:string}}}[]};if(!current())break;
   if(!Array.isArray(value?.results)||value.results.length!==batch.length||value.results.some((r,i)=>!r||typeof r.created!=='boolean'||r.todo?.source?.externalId!==batch[i].id))throw Error('가져온 결과를 확인하지 못했어요. 같은 항목으로 다시 확인해도 중복 추가하지 않아요.');
   created+=value.results.filter(r=>r.created).length;existing+=value.results.filter(r=>!r.created).length;processedIds.push(...batch.map(i=>i.id));pending.splice(0,batch.length);progress({processed:processedIds.length,total,created,existing});
  }catch(e){if(current())error=e instanceof Error?e.message:'가져오지 못했어요.';break;}
 }
 return {processedIds,remaining:pending,created,existing,error,total};
}
