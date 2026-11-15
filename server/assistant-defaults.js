/** New settings start on. Explicit saved settings and restored stops always win. */
export function initializeAssistantDefaults(store,assistant,user){
 if(!user.emailVerified)return false;
 const profile=store.agentProfile(user.id);if(profile.paused)return true;
 const settings=store.automationSettings(user.id),status=assistant.status(user.id),providers=(status.connections??[]).filter(c=>c.connected).map(c=>c.provider).filter(p=>['google','slack','notion','naver'].includes(p));
 for(const schedule of settings)if(schedule.revision===0)store.initializeAutomation(user.id,schedule.kind,{enabled:true,time:schedule.kind==='briefing'?'09:00':'07:30',timezone:'Asia/Seoul',city:schedule.kind==='weather'?'seoul':null,providers:schedule.kind==='briefing'?providers:[],aiConsent:schedule.kind==='briefing',...(schedule.kind==='briefing'?{repeat:'hourly',startHour:9,endHour:18,weekdaysOnly:true,urgentAlerts:true}: {})},Date.now(),status.consentScopes);
 if(profile.revision===0)store.configureAgent(user.id,{proactive:true,providers,quietStart:0,quietEnd:0},status.consentScopes);
 return true;
}
