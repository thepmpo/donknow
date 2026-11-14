import {localClock} from './automations-store.js';
import {weatherCities} from './weather.js';
export function createAutomations(store,assistant,weather,{now=Date.now}={}){
 let active=false;
 async function build(item){
  const warnings=[],today=localClock(now(),item.timezone).date;
  const todos=store.list(item.userId).filter(t=>!t.done),due=todos.filter(t=>t.dueDate&&t.dueDate<=today);
  let forecast=null;if(item.city)try{forecast=await weather(item.city);}catch{warnings.push('날씨를 읽지 못했어요. 잠시 뒤 도시 날씨를 다시 확인해주세요.');}
  let text='';
  if(item.kind==='briefing'){
   try{if(!item.consentScopes&&item.providers.includes('google')&&(assistant.status?.(item.userId).googleAccountCount??0)>1)throw Error('consent_required');
    const previous=store.assistantMessages?.(item.userId).filter(m=>m.kind==='briefing').at(-1);
    const result=await assistant.chat(item.userId,{message:`${today} ${item.timezone}의 맞춤 브리핑을 먼저 보내줘. 내 자료에서 지금 도움이 되는 내용만 최대4~6개 골라 짧은 제목, 오늘 나와 관련된 이유, 할 수 있는 다음 행동 순서로 쉽게 써줘. 오늘 일정·기한 있는 할 일·선택한 자료의 중요한 변화부터 다뤄. 자료가 적으면 억지로 항목 수를 채우지 마. 새로 조사하지 않은 뉴스·웹 정보는 만들지 마. 이전 브리핑과 달라진 점이 없다면 같은 제안을 길게 반복하지 마. 할 일 생성·원본 변경·발송은 하지 말고 제안만 해. 실제 근거와 조회 한계를 간결하게 밝혀. 내 요청: ${item.instructions??'오늘 해야 할 일을 우선순위로 정리해줘.'}`,providers:item.providers,consent:item.aiConsent,...(item.consentScopes?{consentScopes:item.consentScopes}:{}),history:previous?[{role:'assistant',text:previous.text.slice(0,1800)}]:[]},{today,timezone:item.timezone});text=result.answer;warnings.push(...result.warnings.slice(0,6));}
   catch{text=`좋은 하루예요. 오늘까지 예정된 할 일은 ${due.length}개예요.\n`+(due.length?due.slice(0,12).map(t=>'• '+t.title).join('\n'):'오늘까지 예정된 미완료 할 일이 없어요.')+`\n그 밖의 미완료 할 일은 ${todos.length-due.length}개예요.`;warnings.push('AI 요약을 만들지 못해 내 Todo 목록으로 안내했어요. 연결 자료는 확인하지 못했어요. 자료 연결을 바꿨다면 ME의 브리핑 예약에서 다시 동의해주세요.');}
  }
  if(forecast)text+=(text?'\n\n':'')+`${forecast.city} 날씨\n현재 ${forecast.temperature}°C · 최저 ${forecast.low}° / 최고 ${forecast.high}°\n강수 확률 ${forecast.rain}%\n출처: Open-Meteo · 관측 ${forecast.observedAt}`;
  if(item.kind==='weather'&&!forecast)text=`${weatherCities[item.city].name} 날씨를 지금 확인하지 못했어요.`;
  return {kind:item.kind,title:item.kind==='briefing'?'오늘의 브리핑':'도시 날씨',text:text.slice(0,14000),warnings:[...new Set(warnings)].slice(0,8),scheduledFor:item.time,timezone:item.timezone,localDate:today,city:item.city};
 }
 return {async tick(user=null){if(active)return {processed:0};active=true;let processed=0;try{for(const candidate of store.dueAutomations(now(),user)){const item=store.claimAutomation(candidate,now());if(!item)continue;try{store.completeAutomation(item,await build(item),now());processed++;}catch{store.failAutomation(item.id);}}return {processed};}finally{active=false;}}};
}
