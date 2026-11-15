import {verifySlackWebhook,verifyNotionWebhook,createGooglePushAuth} from './provider-webhook-auth.js';
import {createUrgentMonitor,sourceDigest} from './urgent-monitor.js';
import {briefingKey} from './briefing-store.js';
import {localClock} from './automations-store.js';
import {fail} from './secrets.js';
const uuid=value=>typeof value==='string'&&/^[a-f\d-]{32,36}$/i.test(value);
async function body(req){let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>262144)throw fail(413,'수신 내용이 너무 커요.');chunks.push(chunk);}const raw=Buffer.concat(chunks);try{const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return {raw,data};}catch{throw fail(400,'수신 형식을 확인해주세요.');}}
export function createAssistantEvents(store,assistant,integrations,{env=process.env,now=Date.now,fetcher=fetch}={}){
 let active=false;const monitor=createUrgentMonitor(store,assistant,{now});const googleAuth=createGooglePushAuth({audience:env.GOOGLE_PUSH_AUDIENCE??(env.PUBLIC_ORIGIN?.replace(/\/$/,'')+'/api/webhooks/gmail'),email:env.GOOGLE_PUSH_SERVICE_ACCOUNT,fetcher,now});
 const candidates=provider=>store.realtimeConnections(provider).filter(c=>{const schedule=store.automationSettings(c.userId).find(s=>s.kind==='briefing'),actual=assistant.status(c.userId).consentScopes;return schedule?.aiConsent&&schedule.consentScopes&&['todo',...schedule.providers].every(p=>schedule.consentScopes[p]===actual[p]);});
 function valid(item){const s=store.automationSettings(item.userId).find(s=>s.kind==='briefing'),c=store.connection(item.userId,item.provider,item.connectionId);return store.account(item.userId)?.emailVerified&&s?.enabled&&s.urgentAlerts&&s.aiConsent&&s.revision===item.payload.scheduleRevision&&s.providers.includes(item.provider)&&c?.connectionId===item.connectionId&&s.consentScopes&&['todo',...s.providers].every(p=>s.consentScopes[p]===assistant.status(item.userId).consentScopes[p]);}
 return {
  async receive(req,path,send){const route=/^\/api\/webhooks\/(slack|notion|calendar|gmail)(?:\/([a-f0-9-]{36})\/([A-Za-z0-9_-]{43}))?$/.exec(path),provider=route?.[1];if(!provider)return false;if(route[2]&&provider!=='notion')throw fail(404,'수신 주소를 확인해주세요.');if(req.method!=='POST')throw fail(405,'변경 알림은 POST로 수신해요.');const {raw,data}=provider==='calendar'?{raw:null,data:null}:await body(req);
   if(provider==='slack'){
    verifySlackWebhook(raw,req.headers,env.SLACK_SIGNING_SECRET,now());if(env.SLACK_APP_ID&&data.type==='event_callback'&&data.api_app_id!==env.SLACK_APP_ID)throw fail(403,'Slack 앱이 일치하지 않아요.');
    if(data.type==='url_verification'){if(typeof data.challenge!=='string'||data.challenge.length>1000)throw fail(400,'확인 요청이 올바르지 않아요.');send(200,{challenge:data.challenge});return true;}
    const event=data.event;if(data.type==='event_callback'&&typeof data.event_id==='string'&&data.event_id.length<=150&&event?.type==='message'&&(!event.subtype||event.subtype==='message_changed')&&!event.bot_id){
     const message=event.subtype==='message_changed'?event.message:event;if(typeof message?.text==='string'&&message.text.trim()&&/^[CGD][A-Z0-9]{8,30}$/.test(event.channel??'')&&/^\d{10}\.\d{6}$/.test(message.ts??'')&&Number(event.event_ts??message.edited?.ts??message.ts)*1000>now()-86400000){
      for(const {userId,connection:c} of candidates('slack')){
       // Match the installation's user perspective. A team match alone never grants private messages.
       const authorized=data.authorizations?.some(a=>a.team_id===c.accountId&&a.user_id===c.slackUserId&&a.is_bot===false);
       if(c.tokenType!=='user'||!c.slackUserId||c.accountId!==data.team_id||!authorized||!c.features.includes('messages')||message.user===c.slackUserId)continue;
       store.enqueueAssistantEvent(userId,'slack',data.event_id,c.connectionId,{kind:'message',channel:event.channel,ts:message.ts,text:message.text.slice(0,8000),directToMe:event.channel_type==='im'||message.text.includes('<@'+c.slackUserId+'>'),receivedAt:now()});
      }
     }
    }send(200,{ok:true});return true;
   }
   if(provider==='notion'){
    let subscription=null;if(route[2]){subscription=store.authenticateAssistantWatch(route[2],route[3],'notion',now());const c=store.connection(subscription.userId,'notion');if(c?.connectionId!==subscription.connectionId||c.accountId!==subscription.workspaceId)throw fail(403,'문서 연결이 바뀌었어요.');if(typeof data.verification_token==='string'){if(data.verification_token.length<20||data.verification_token.length>300)throw fail(400,'인증 코드를 확인해주세요.');if(subscription.verificationToken&&subscription.verificationToken!==data.verification_token)throw fail(409,'이미 확인한 수신 연결이에요.');store.updateAssistantWatch(subscription.userId,subscription.id,{verificationToken:data.verification_token,status:'ready',expiresAt:now()+365*86400000});send(200,{ok:true});return true;}}
    verifyNotionWebhook(raw,req.headers,subscription?.verificationToken??env.NOTION_WEBHOOK_VERIFICATION_TOKEN);const page=data.entity?.id;
    if(typeof data.id==='string'&&data.id.length<=150&&uuid(page)&&data.entity?.type==='page'&&typeof data.type==='string'&&/^page\.(content_updated|properties_updated|created)$/.test(data.type)&&Number.isFinite(Date.parse(data.timestamp))&&Math.abs(now()-Date.parse(data.timestamp))<86400000)for(const {userId,connection:c} of candidates('notion'))if((!subscription||subscription.userId===userId&&subscription.connectionId===c.connectionId)&&c.accountId===data.workspace_id&&c.features.includes('pages'))store.enqueueAssistantEvent(userId,'notion',data.id,c.connectionId,{kind:'page',page,receivedAt:now()});
    send(200,{ok:true});return true;
   }
   if(provider==='calendar'){
    const w=store.acceptCalendarNotification({id:req.headers['x-goog-channel-id'],token:req.headers['x-goog-channel-token'],resourceId:req.headers['x-goog-resource-id'],number:req.headers['x-goog-message-number'],state:req.headers['x-goog-resource-state']},now());
    if(w&&req.headers['x-goog-resource-state']!=='sync'&&candidates('google').some(c=>c.userId===w.userId&&c.connection.connectionId===w.connectionId))store.enqueueAssistantEvent(w.userId,'google','calendar:'+w.id+':'+req.headers['x-goog-message-number'],w.connectionId,{kind:'refresh',receivedAt:now()});send(200,{ok:true});return true;
   }
   await googleAuth(req.headers.authorization);if(!env.GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION||data.subscription!==env.GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION)throw fail(403,'허용된 Gmail 구독이 아니에요.');let payload;try{if(typeof data.message?.data!=='string'||data.message.data.length>10000)throw Error();payload=JSON.parse(Buffer.from(data.message.data,'base64'));}catch{throw fail(400,'Gmail 알림을 확인해주세요.');}
   if(typeof payload.emailAddress!=='string'||!/^\d{1,30}$/.test(payload.historyId??'')||typeof data.message?.messageId!=='string'||data.message.messageId.length>150)throw fail(400,'Gmail 알림 정보를 확인해주세요.');
   for(const {userId,connection:c} of candidates('google'))if(c.features.includes('gmail')&&c.label.toLowerCase()===payload.emailAddress.toLowerCase()&&store.assistantWatches(userId,'gmail').some(w=>w.connectionId===c.connectionId&&w.status==='ready'&&w.expiresAt>now()))store.enqueueAssistantEvent(userId,'google','gmail:'+data.message.messageId,c.connectionId,{kind:'refresh',receivedAt:now()});send(200,{ok:true});return true;
  },
  async tick(){if(active)return {events:0,sent:0};active=true;let processed=0,sent=0;try{for(let i=0;i<20;i++){
   const item=store.claimAssistantEvent(now());if(!item)break;
   try{if(!valid(item)||now()-item.payload.receivedAt>86400000){store.finishAssistantEvent(item,[],now(),'cancelled');continue;}
    if(item.payload.kind==='refresh'){
     if(!store.wakeAssistantMonitor(item.userId,now()))throw Error('monitor_busy');const result=await monitor.tick(item.userId);if(store.assistantMonitorStatus(item.userId)?.error)throw Error('refresh_failed');if(valid(item))sent+=result.sent;store.finishAssistantEvent(item,[],now());processed++;continue;
    }
    let source,warnings=[];
    if(item.provider==='slack'){const p=item.payload;source={ref:'slack:'+item.connectionId+':message:'+p.channel+':'+p.ts,provider:'slack',kind:'message',title:p.text.trim().slice(0,120),text:p.text.slice(0,2000),dueDate:null,completed:false,locator:{channel:p.channel,ts:p.ts},directToMe:p.directToMe};}
    else{const detail=await (integrations.readChangedNotionPage?integrations.readChangedNotionPage(item.userId,item.connectionId,item.payload.page):integrations.readSource(item.userId,'notion',item.connectionId+':page:'+item.payload.page));source={ref:'notion:'+item.connectionId+':page:'+item.payload.page,provider:'notion',kind:'page',title:detail.title??'변경된 Notion 문서',text:detail.text.slice(0,2000),dueDate:null,completed:false,locator:{id:item.payload.page}};if(detail.partial)warnings.push('변경된 Notion 문서의 일부만 확인했어요.');}
    if(!valid(item)){store.finishAssistantEvent(item,[],now(),'cancelled');continue;}
    const alerts=await assistant.urgentRequests(item.userId,[source],item.payload.consentScopes,[item.provider]);if(!valid(item)){store.finishAssistantEvent(item,[],now(),'cancelled');continue;}
    const key=briefingKey(source.ref+':'+source.title.normalize('NFKC').trim()),state=store.briefingItemState(item.userId,key),s=store.automationSettings(item.userId).find(s=>s.kind==='briefing');
    const messages=state?.state==='excluded'||state?.todoId&&store.get(item.userId,state.todoId)?.done?[]:alerts.filter(a=>a.ref===source.ref).slice(0,1).map(a=>({kind:'urgent',eventKey:briefingKey(source.ref+':request:'+sourceDigest(source)),title:'지금 확인할 내용',text:a.reason,items:[{key,title:source.title,notes:source.text,dueDate:null,sourceRefs:[source.ref],group:'urgent'}],warnings,sources:[{ref:source.ref,title:source.title,provider:source.provider}],checkedAt:now(),timezone:s.timezone,localDate:localClock(now(),s.timezone).date}));
    sent+=store.finishAssistantEvent(item,messages,now());processed++;
   }catch(error){if(error.status===409||error.status===403||error.status===404)store.finishAssistantEvent(item,[],now(),'cancelled');else store.failAssistantEvent(item,now());}
  }return {events:processed,sent};}finally{active=false;}}
 };
}
