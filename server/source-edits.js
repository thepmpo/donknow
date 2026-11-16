import {assistantNotice} from './assistant-notices.js';
import {calendarWallClock} from './calendar-time.js';
import {fail} from './secrets.js';
export function createSourceEdits({store,assistant,integrations,deferred=false,onEnqueue=()=>{}}){
 const busy=new Set();
 const fields=['title','notes','dueDate','dueTime','done'];
 function notify(user,todo,code){try{assistantNotice(store,user,{code,provider:todo.source.provider,title:todo.title,todoId:todo.id});}catch{}}
 async function apply(user,todo,patch,guard,onPrepared=()=>{}){
  const source=todo.source,external=source.externalId,task=/^([^:]+):tasks:([^:]+):(.+)$/.exec(external),event=/^([^:]+):(calendar|calendar2):(.+)$/.exec(external);
  if(source.provider!=='google'||!task&&!event)throw fail(422,'이 자료는 원본 앱에서 수정해주세요.');
  let operation,args;
  if(task){operation='tasks.update';args={connectionId:task[1]==='legacy'?undefined:task[1],list:task[2],id:task[3],...Object.fromEntries(Object.entries(patch).filter(([k])=>['title','notes','dueDate','done'].includes(k)))};if('dueTime' in patch&&patch.dueTime!=null)throw fail(422,'Google Tasks는 예정 시간을 저장하지 않아요. 캘린더 일정이나 덕 알림 시간을 사용해주세요.');}
  else{
   if('done' in patch)throw fail(422,'캘린더 일정은 완료 상태를 제공하지 않아요.');
   const locator=store.importedSourceLocator(user,todo.id)??source,connectionId=event[1]==='legacy'?undefined:event[1];
   const calendarId=locator.calendarId??(event[2]==='calendar'?'primary':null),id=locator.eventId??(event[2]==='calendar'?event[3]:event[3].slice(event[3].indexOf(':')+1));
   if(!calendarId)throw fail(409,'이전 항목의 원본 캘린더를 다시 확인해주세요.');
   operation='calendar.update';args={id,calendarId,connectionId,...Object.fromEntries(Object.entries(patch).filter(([k])=>['title','notes'].includes(k)))};
   if('dueDate' in patch||'dueTime' in patch){
    const preview=await integrations.inspect(user,operation,{...args,title:patch.title??todo.title}),timing=preview.extra?.sourceTiming;
    if(!timing||!todo.dueDate)throw fail(422,'날짜 없는 할 일은 원본 캘린더에 그대로 저장할 수 없어요. 원본 앱에서 일정을 확인해주세요.');
    const zone=todo.source.timeZone??timing.start?.timeZone??preview.extra?.calendarTimeZone??'Asia/Seoul',allDay='dueTime' in patch?patch.dueTime===null:!!timing.start?.date;
    if(allDay){const count=timing.start?.date&&timing.end?.date?Math.max(1,Math.round((Date.parse(timing.end.date)-Date.parse(timing.start.date))/86400000)):1;args={...args,allDay:true,startDate:todo.dueDate,endDate:new Date(Date.parse(todo.dueDate+'T12:00:00Z')+count*86400000).toISOString().slice(0,10)};}
    else {const parts=timing.start?.dateTime?Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(timing.start.dateTime)).map(p=>[p.type,p.value])):{hour:'09',minute:'00'},time=todo.dueTime??parts.hour+':'+parts.minute,start=calendarWallClock(todo.dueDate,zone,...time.split(':').map(Number)),duration=timing.start?.dateTime&&timing.end?.dateTime?Math.max(60000,Date.parse(timing.end.dateTime)-Date.parse(timing.start.dateTime)):3600000;args={...args,allDay:false,start,end:new Date(Date.parse(start)+duration).toISOString()};}
    args.expectedETag=preview.version;args.timeZone=zone;
   }
  }
  if(task&&Object.keys(args).every(k=>['connectionId','list','id'].includes(k)))return;
  args=Object.fromEntries(Object.entries(args).filter(([,v])=>v!==undefined));
  if(!guard())throw fail(409,'작업이 중지됐어요.');const draft=await assistant.prepare(user,operation,args);onPrepared(draft.id);const result=await assistant.confirm(user,draft.id,true,guard);
  if(result.status!=='succeeded')throw fail(result.status==='unknown'?502:409,'원본 저장 결과를 확인해주세요.');
 }
 async function save(user,id,patch,{retry=false,forceDone=false,guard=()=>true}={}){
  const key=user+':'+id;if(busy.has(key))throw fail(409,'이 항목을 저장하고 있어요. 잠시 뒤 확인해주세요.');
  busy.add(key);try{if(!guard())throw fail(409,'작업이 중지됐어요.');const before=store.get(user,id);if(!before)throw fail(404,'내 할 일을 찾지 못했어요.');
   if(retry&&before.sourceSync?.state==='queued')return before;
   if(patch.dueDate===null)patch={...patch,dueTime:null};
   if(patch.dueTime!=null&&!(patch.dueDate??before.dueDate))throw fail(400,'예정 날짜를 먼저 선택해주세요.');
   const changed=Object.fromEntries(Object.entries(patch).filter(([k,v])=>fields.includes(k)&&(forceDone&&k==='done'||JSON.stringify(v??null)!==JSON.stringify(before[k]??null))));
   const pending=retry?before.sourceSync?.patch:Object.keys(changed).length?{...before.sourceSync?.patch,...changed}:changed;
   if(before.source&&'done' in changed)store.clearTaskSync(user,id);
   if(deferred&&before.source?.provider==='google'&&pending&&Object.keys(pending).length){const queued=store.queueSourceEdit(user,before,patch,pending);onEnqueue();if(queued.sourceSync.state==='unknown')notify(user,queued,'source-unknown');return queued;}
   let saved=retry?before:store.update(user,id,patch,{skipTaskSync:!!before.source});
   if(!before.source||!pending||!Object.keys(pending).length)return saved;
   const revision=(before.sourceSync?.revision??0)+1;
   if(before.source.provider==='apple-reminders')return store.update(user,id,{sourceSync:{state:'device-required',revision,at:Date.now(),patch:pending}});
   const limitedDone='done' in pending&&!(before.source.provider==='google'&&/^([^:]+):tasks:([^:]+):(.+)$/.test(before.source.externalId));
   const writable=limitedDone?Object.fromEntries(Object.entries(pending).filter(([key])=>key!=='done')):pending;
   if(limitedDone&&!Object.keys(writable).length){saved=store.update(user,id,{sourceSync:{state:'failed',revision,at:Date.now(),patch:{done:pending.done},reason:'completion-unsupported'}});notify(user,saved,'source-completion-limited');return saved;}
   saved=store.update(user,id,{sourceSync:{state:'unknown',revision,at:Date.now(),patch:pending}});
   try{await apply(user,saved,writable,guard);saved=store.update(user,id,{sourceSync:limitedDone?{state:'failed',revision,at:Date.now(),patch:{done:pending.done},reason:'completion-unsupported'}:{state:'succeeded',revision}});if(limitedDone)notify(user,saved,'source-completion-limited');}
   catch(error){const unknown=error.status===502||!error.status; saved=store.update(user,id,{sourceSync:{state:unknown?'unknown':'failed',revision,at:Date.now(),patch:pending}});notify(user,saved,unknown?'source-unknown':error.status===422?(before.source.provider==='google'?'source-limited':'source-unsupported'):'source-failed');}
   return saved;
  }finally{busy.delete(key);}
 }
 function deviceResult(user,id,input){const todo=store.get(user,id);if(!todo||todo.source?.provider!=='apple-reminders'||input.revision!==todo.sourceSync?.revision||!['succeeded','failed','device-required','unknown'].includes(input.state))throw fail(409,'다른 편집이 있어 원본 결과를 다시 확인해주세요.');if(todo.sourceSync.state==='succeeded')return todo;if(input.state==='succeeded'&&Object.hasOwn(todo.sourceSync.patch??{},'done')&&input.completed!==todo.done){notify(user,todo,'device-update-required');throw fail(409,'완료 상태를 확인하는 최신 아이폰 앱으로 업데이트한 뒤 원본 저장을 다시 시도해주세요.');}const saved=store.update(user,id,{sourceSync:{...todo.sourceSync,state:input.state,...(input.state==='succeeded'?{patch:undefined}: {})},...(input.state==='succeeded'&&typeof input.modifiedAt==='string'&&Number.isFinite(Date.parse(input.modifiedAt))?{source:{...todo.source,modifiedAt:input.modifiedAt}}:{})});if(input.state!=='succeeded')notify(user,saved,input.state==='device-required'?'device-required':input.state==='unknown'?'source-unknown':'source-failed');return saved;}
 let running=false;
 async function tick(){if(running)return;running=true;try{
  // Bounded batches leave chat/calendar reads time between provider jobs.
  for(let count=0;count<3;count++){
   const job=store.claimSourceEdit();if(!job)break;
   const todo=store.get(job.userId,job.todoId),limited='done' in job.payload.patch&&!/^([^:]+):tasks:([^:]+):(.+)$/.test(job.payload.todo.source.externalId),patch=limited?Object.fromEntries(Object.entries(job.payload.patch).filter(([key])=>key!=='done')):job.payload.patch;
   const guard=()=>store.sourceEditCurrent(job)&&!!store.get(job.userId,job.todoId)&&store.account(job.userId)?.emailVerified===true;
   try{
    if(!todo||todo.source?.externalId!==job.payload.todo.source.externalId||!guard())throw fail(403,'원본 연결과 계정 권한을 확인해주세요.');
    if(job.actionId){const receipt=store.assistantAction(job.userId,job.actionId);if(receipt?.status==='pending'){const result=await assistant.confirm(job.userId,job.actionId,true,guard);if(result.status!=='succeeded')throw fail(502,'원본 저장 결과를 확인해주세요.');}else if(receipt?.status!=='succeeded')throw fail(502,'원본 저장 결과를 확인해주세요.');}
    else if(Object.keys(patch).length)await apply(job.userId,job.payload.todo,patch,guard,id=>store.sourceEditAction(job,id));
    const saved=store.finishSourceEdit(job,'succeeded',limited);if(saved&&limited)notify(job.userId,saved,'source-completion-limited');
   }catch(error){const unknown=error.status===502||!error.status,saved=store.finishSourceEdit(job,unknown?'unknown':'failed');if(saved)notify(job.userId,saved,unknown?'source-unknown':error.status===422?'source-limited':'source-failed');}
  }
 }finally{running=false;}}
 return {save,deviceResult,tick};
}
