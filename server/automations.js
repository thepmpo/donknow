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
   try{const result=await assistant.chat(item.userId,{message:`${today} ${item.timezone}의 오늘 브리핑을 먼저 보내줘. 인사 한 줄, 오늘까지 할 일, 확인할 일정·소식, 우선할 일 세 가지 순서로 쉽게 요약해줘. 할 일을 새로 만들거나 외부로 보내지 말고 제안은 본문에만 적어. 실제 읽은 자료와 부분 조회 한계를 알려줘.`,providers:item.providers,consent:item.aiConsent,history:[]},{today,timezone:item.timezone});text=result.answer;warnings.push(...result.warnings.slice(0,6));}
   catch{text=`좋은 하루예요. 오늘까지 예정된 할 일은 ${due.length}개예요.\n`+(due.length?due.slice(0,12).map(t=>'• '+t.title).join('\n'):'오늘까지 예정된 미완료 할 일이 없어요.')+`\n그 밖의 미완료 할 일은 ${todos.length-due.length}개예요.`;warnings.push('AI 요약을 만들지 못해 내 Todo 목록으로 안내했어요. 연결 자료는 확인하지 못했어요.');}
  }
  if(forecast)text+=(text?'\n\n':'')+`${forecast.city} 날씨\n현재 ${forecast.temperature}°C · 최저 ${forecast.low}° / 최고 ${forecast.high}°\n강수 확률 ${forecast.rain}%\n출처: Open-Meteo · 관측 ${forecast.observedAt}`;
  if(item.kind==='weather'&&!forecast)text=`${weatherCities[item.city].name} 날씨를 지금 확인하지 못했어요.`;
  return {kind:item.kind,title:item.kind==='briefing'?'오늘의 브리핑':'도시 날씨',text:text.slice(0,14000),warnings:[...new Set(warnings)].slice(0,8),scheduledFor:item.time,timezone:item.timezone,localDate:today,city:item.city};
 }
 return {async tick(user=null){if(active)return {processed:0};active=true;let processed=0;try{for(const candidate of store.dueAutomations(now(),user)){const item=store.claimAutomation(candidate,now());if(!item)continue;try{store.completeAutomation(item,await build(item),now());processed++;}catch{store.failAutomation(item.id);}}return {processed};}finally{active=false;}}};
}
