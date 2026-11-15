import {briefingKey} from './briefing-store.js';
import {localClock} from './automations-store.js';
import {fail} from './secrets.js';
export const sourceDigest=source=>briefingKey(JSON.stringify([source.title,source.text,source.dueDate,source.completed,source.startAt,source.endAt]));
/** Only changed, selected sources are classified. A failed/partial read never proves no changes. */
export function createUrgentMonitor(store,assistant,{now=Date.now}={}){
 return {async tick(user=null){let sent=0;
  for(const candidate of store.dueAssistantMonitors(now(),user)){
   const item=store.claimAssistantMonitor(candidate,now());if(!item)continue;
   let snapshot=item.previous.snapshot,messages=[],monitorError=null;
   try{
    const actual=assistant.status(item.userId).consentScopes;
    if(!item.consentScopes||['todo',...item.providers].some(p=>actual[p]!==item.consentScopes[p]))throw fail(409,'자료 연결이나 권한이 바뀌었어요. 브리핑 예약에서 다시 동의해주세요.');
    const context=await assistant.context(item.userId,item.providers),clock=localClock(now(),item.timezone),prior=new Map(snapshot.map(s=>[s.ref,s]));
    // Retain missing sources: bounded provider pages must not look like deletions.
    const merged=new Map(prior),changed=[];
    for(const source of context.sources){const digest=sourceDigest(source);if(prior.get(source.ref)?.digest!==digest)changed.push(source);merged.set(source.ref,{ref:source.ref,digest,seenAt:now()});}
    const add=(source,reason,trigger)=>{
     const key=source.provider==='todo'?briefingKey(source.ref):briefingKey(source.ref+':'+source.title.normalize('NFKC').trim());
     const state=store.briefingItemState(item.userId,key);if(source.completed||state?.state==='excluded'||state?.todoId&&store.get(item.userId,state.todoId)?.done)return;
     const eventKey=briefingKey(source.ref+':'+trigger);if(store.hasAssistantAlert(item.userId,eventKey)||messages.some(m=>m.eventKey===eventKey))return;
     messages.push({kind:'urgent',eventKey,title:'지금 확인할 내용',text:reason,items:[{key,title:source.title.slice(0,120),notes:source.text.slice(0,4000),dueDate:source.dueDate??null,todoId:source.provider==='todo'?source.locator.id:null,sourceRefs:[source.ref],group:'urgent'}],warnings:context.warnings.slice(0,6),sources:[{ref:source.ref,title:source.title,provider:source.provider}],checkedAt:now(),timezone:item.timezone,localDate:clock.date});
    };
    for(const source of context.sources){
     const todo=source.provider==='todo'?store.get(item.userId,source.locator.id):null;
     const at=Date.parse(source.startAt??todo?.reminderAt??'');
     if(Number.isFinite(at)&&at>=now()&&at-now()<=15*60000)add(source,'15분 안에 시작하거나 알림 시각이 되는 내용이에요. '+source.title,'imminent:'+at);
     else if(!source.completed&&source.dueDate===clock.date&&changed.includes(source)&&Number(clock.time.slice(0,2))>=9)add(source,'오늘까지 예정된 미완료 내용이에요. '+source.title,'due:'+clock.date);
    }
    // The first read establishes a baseline, so old inbox messages do not flood alerts.
    const fresh=changed.filter(s=>s.provider!=='todo'&&!s.completed);
    if(item.previous.initialized&&fresh.length){
     const selected=fresh.slice(0,12);let deferred=fresh.slice(12);
     try{const alerts=await assistant.urgentRequests(item.userId,selected,item.consentScopes,item.providers);for(const alert of alerts){const source=selected.find(s=>s.ref===alert.ref);if(source)add(source,alert.reason,'request:'+sourceDigest(source));}}
     catch(error){if(error.status===409)throw error;monitorError='AI가 새 요청의 중요도를 확인하지 못했어요. 일정·기한은 확인한 정보로 알려드려요.';context.warnings.push(monitorError);deferred=fresh;}
     for(const source of deferred){if(prior.has(source.ref))merged.set(source.ref,prior.get(source.ref));else merged.delete(source.ref);}
    }
    if(['todo',...item.providers].some(p=>assistant.status(item.userId).consentScopes[p]!==item.consentScopes[p]))throw fail(409,'연결이 바뀌어 알림을 보류했어요.');
    // Deferred alerts must remain changes on the next cycle, not disappear behind
    // a per-cycle delivery limit. Already delivered keys cannot consume that limit.
    for(const message of messages.slice(5))for(const source of message.sources){if(prior.has(source.ref))merged.set(source.ref,prior.get(source.ref));else merged.delete(source.ref);}
    snapshot=[...merged.values()].sort((a,b)=>b.seenAt-a.seenAt).slice(0,500);
    sent+=store.finishAssistantMonitor(item,snapshot,messages.slice(0,5),now(),monitorError,context.warnings);
   }catch(error){store.finishAssistantMonitor(item,item.previous.snapshot,[],now(),error.status===409?error.message:'중요 변화를 확인하지 못했어요. 연결과 AI 설정을 확인해주세요.');}
  }
  return {sent};
 }};
}
