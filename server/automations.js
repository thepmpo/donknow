import {fail} from './secrets.js';
import {briefingKey} from './briefing-store.js';
import {createUrgentMonitor} from './urgent-monitor.js';
import {localClock} from './automations-store.js';
import {weatherCities} from './weather.js';
export function createAutomations(store,assistant,weather,{now=Date.now}={}){
 let active=false;const monitor=createUrgentMonitor(store,assistant,{now});
 async function build(item){
  const warnings=[],clock=localClock(now(),item.timezone),today=clock.date;
  let result=null,previous=store.assistantMessages?.(item.userId).filter(m=>m.kind==='briefing').at(-1);
  const todos=store.list(item.userId).filter(t=>!t.done),due=todos.filter(t=>t.dueDate&&t.dueDate<=today);
  let forecast=null;if(item.city)try{forecast=await weather(item.city);}catch{warnings.push('날씨를 읽지 못했어요. 잠시 뒤 도시 날씨를 다시 확인해주세요.');}
  let text='';
  if(item.kind==='briefing'){
   try{if(!item.consentScopes&&item.providers.includes('google')&&(assistant.status?.(item.userId).googleAccountCount??0)>1)throw Error('consent_required');
    let checked=null,basic=false,unchanged=false;
    if(typeof assistant.context==='function'){
     const status=assistant.status(item.userId);if(item.consentScopes&&['todo',...item.providers].some(p=>item.consentScopes[p]!==status.consentScopes[p]))throw fail(409,'자료 사용 동의를 다시 확인해주세요.');
     checked=await assistant.context(item.userId,item.providers);
     if(item.consentScopes&&['todo',...item.providers].some(p=>item.consentScopes[p]!==assistant.status(item.userId).consentScopes[p]))throw fail(409,'자료 연결이 바뀌었어요.');
     const prior=new Map((previous?.snapshot??[]).map(s=>[s.ref,s.digest]));unchanged=!!previous?.snapshot?.length&&!checked.warnings.length&&prior.size===checked.sources.length&&checked.sources.every(s=>prior.get(s.ref)===briefingKey(JSON.stringify([s.title,s.text,s.dueDate,s.completed,s.startAt,s.endAt])));
     basic=status.usage?.remainingKrw===0||unchanged;
    }
    if(basic){const external=checked.sources.filter(s=>s.provider!=='todo'&&!s.completed).slice(0,6);result={answer:(unchanged?'확인한 범위에서 직전 브리핑 이후 새 변화가 없어요.':'연결한 자료의 제목과 날짜를 모았어요.')+'\n'+external.map(s=>'• '+s.title+(s.dueDate?' · '+s.dueDate:'')).join('\n')+'\n오늘까지 예정된 할 일 '+due.length+'개 · 전체 미완료 '+todos.length+'개',sources:checked.sources,warnings:[...checked.warnings,...(unchanged?[]:['본문의 의미 분석은 하지 않았어요. 원본 자료에서 자세한 내용을 확인할 수 있어요.'])],proposals:[],simpleSources:!unchanged};}
    else result=await assistant.chat(item.userId,{message:`${today} ${item.timezone}의 맞춤 브리핑을 먼저 보내줘. 내 자료에서 지금 도움이 되는 내용만 최대4~6개 골라 짧은 제목, 오늘 나와 관련된 이유, 할 수 있는 다음 행동 순서로 쉽게 써줘. 새로 추가되거나 변경된 일, 이전 미완료, 날짜/회신 대기로 나눠줘. 완료한 내용을 새 할 일로 만들지 마. 오늘 일정·기한 있는 할 일·선택한 자료의 중요한 변화부터 다뤄. 자료가 적으면 억지로 항목 수를 채우지 마. 새로 조사하지 않은 뉴스·웹 정보는 만들지 마. 이전 브리핑과 달라진 점이 없다면 같은 제안을 길게 반복하지 마. 할 일 생성·원본 변경·발송은 하지 말고 제안만 해. 실제 근거와 조회 한계를 간결하게 밝혀. 내 요청: ${item.instructions??'오늘 해야 할 일을 우선순위로 정리해줘.'}`,providers:item.providers,consent:item.aiConsent,...(item.consentScopes?{consentScopes:item.consentScopes}:{}),history:previous?[{role:'assistant',text:previous.text.slice(0,1800)}]:[]},{today,timezone:item.timezone},checked);text=result.answer;warnings.push(...result.warnings.slice(0,6));}
   catch{text=`좋은 하루예요. 오늘까지 예정된 할 일은 ${due.length}개예요.\n`+(due.length?due.slice(0,12).map(t=>'• '+t.title).join('\n'):'오늘까지 예정된 미완료 할 일이 없어요.')+`\n그 밖의 미완료 할 일은 ${todos.length-due.length}개예요.`;warnings.push('AI 요약을 만들지 못해 내 Todo 목록으로 안내했어요. 연결 자료는 확인하지 못했어요. 자료 연결을 바꿨다면 ME의 브리핑 예약에서 다시 동의해주세요.');}
  }
  if(forecast)text+=(text?'\n\n':'')+`${forecast.city} 날씨\n현재 ${forecast.temperature}°C · 최저 ${forecast.low}° / 최고 ${forecast.high}°\n강수 확률 ${forecast.rain}%\n출처: Open-Meteo · 관측 ${forecast.observedAt}`;
  if(item.kind==='weather'&&!forecast)text=`${weatherCities[item.city].name} 날씨를 지금 확인하지 못했어요.`;
  const items=[],seenTodos=new Set();
  const add=value=>{if(items.length>=40||items.some(i=>i.key===value.key)||value.todoId&&seenTodos.has(value.todoId))return;const state=store.briefingItemState?.(item.userId,value.key);if(state?.state==='excluded')return;const todoId=state?.todoId??value.todoId,todo=todoId?store.get(item.userId,todoId):null;if(todoId&&(!todo||todo.done||seenTodos.has(todoId)))return;if(todoId)seenTodos.add(todoId);items.push({...value,todoId:todoId??null});};
  if(item.kind==='briefing'){
   for(const todo of todos.slice(0,30))add({key:briefingKey('todo:'+todo.id),title:todo.title,notes:todo.notes??'',dueDate:todo.dueDate,todoId:todo.id,sourceRefs:['todo:'+todo.id],group:todo.dueDate&&todo.dueDate<=today?'due':'open'});
   for(const carried of store.outstandingBriefingItems?.(item.userId)??[])add({...carried,group:'open',carried:true});
   if(result?.simpleSources)for(const source of result.sources.filter(s=>s.provider!=='todo'&&!s.completed).slice(0,6))add({key:briefingKey(source.ref+':'+source.title.normalize('NFKC').trim()),title:source.title.slice(0,120),notes:(source.text??'').slice(0,4000),dueDate:source.dueDate??null,sourceRefs:[source.ref],group:'new'});
   for(const proposal of result?.proposals??[]){if(proposal.operation!=='todo.create'||!proposal.sourceRefs?.length)continue;const refs=[...proposal.sourceRefs].sort();if(refs.some(ref=>!result.sources?.some(source=>source.ref===ref&&!source.completed)))continue;add({key:briefingKey(refs.join('|')+':'+String(proposal.args.title).normalize('NFKC').trim()),title:proposal.args.title,notes:proposal.args.notes??'',dueDate:proposal.args.dueDate??null,sourceRefs:refs,group:'new'});}
   if(todos.length>30)warnings.push('미완료 할 일은 일부를 표시했어요. 전체 목록은 Todo에서 확인해주세요.');
  }
  const snapshot=(result?.sources??[]).map(source=>({ref:source.ref,digest:briefingKey(JSON.stringify([source.title,source.text,source.dueDate,source.completed,source.startAt,source.endAt]))}));
  const before=new Map((previous?.snapshot??[]).map(source=>[source.ref,source.digest]));
  const changes={added:snapshot.filter(s=>!before.has(s.ref)).length,updated:snapshot.filter(s=>before.has(s.ref)&&before.get(s.ref)!==s.digest).length,first:!previous?.snapshot,partial:true};
  return {kind:item.kind,title:item.kind==='briefing'?Number(clock.time.slice(0,2))+'시 브리핑':'도시 날씨',text:text.slice(0,14000),items,warnings:[...new Set(warnings)].slice(0,8),snapshot,changes,sources:(result?.sources??[]).map(({ref,title,provider,partial,locator})=>({ref,title,provider,partial:!!partial,...(locator?{locator}:{})})),checkedAt:now(),scheduledFor:item.repeat==='hourly'?clock.time.slice(0,2)+':'+item.time.slice(3):item.time,timezone:item.timezone,localDate:today,city:item.city};
 }
 return {async tick(user=null){if(active)return {processed:0};active=true;let processed=0;try{for(const candidate of store.dueAutomations(now(),user)){const item=store.claimAutomation(candidate,now());if(!item)continue;try{store.completeAutomation(item,await build(item),now());processed++;}catch{store.failAutomation(item.id);}}const urgent=await monitor.tick(user);return {processed,...urgent};}finally{active=false;}}};
}
