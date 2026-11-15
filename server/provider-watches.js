import {randomBytes} from 'node:crypto';
/** Renew only watches for accounts the user explicitly included in important alerts. */
export function createProviderWatches({store,env,token,request}){
 let running=false;const attempts=new Map();
 function readiness(){let origin=null;try{const u=new URL(env.PUBLIC_ORIGIN);if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/')origin=u.origin;}catch{}
  return {origin,calendar:!!origin,slack:!!(origin&&env.SLACK_SIGNING_SECRET&&env.SLACK_CLIENT_ID&&env.SLACK_CLIENT_SECRET),notion:!!(origin&&env.NOTION_WEBHOOK_VERIFICATION_TOKEN),gmail:!!(origin&&/^projects\/[\w-]+\/topics\/[\w-]+$/.test(env.GOOGLE_GMAIL_PUBSUB_TOPIC??'')&&env.GOOGLE_PUSH_SERVICE_ACCOUNT&&env.GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION)};
 }
 return {realtimeReadiness(){const {origin,...status}=readiness();return status;},async renewAssistantWatches(now=Date.now()){
  if(running)return;running=true;try{const ready=readiness();if(!ready.origin)return;
   for(const {userId,connection} of store.realtimeConnections('google'))for(const [provider,feature] of [['calendar','calendar'],['gmail','gmail']]){
    if(!ready[provider]||!connection.features.includes(feature))continue;
    const key=userId+':'+connection.connectionId+':'+provider,previous=store.assistantWatches(userId,provider).find(w=>w.connectionId===connection.connectionId);
    if(previous?.expiresAt>now+24*3600000||attempts.get(key)>now)continue;attempts.set(key,now+15*60000);
    try{const record=await token(userId,'google',connection.connectionId),headers={Authorization:'Bearer '+record.accessToken,'Content-Type':'application/json'};
     if(provider==='calendar'){
      const secret=randomBytes(32).toString('base64url'),watch=store.prepareAssistantWatch(userId,provider,connection.connectionId,'primary',{},secret,now);
      try{const value=await request('https://www.googleapis.com/calendar/v3/calendars/primary/events/watch',{method:'POST',headers,body:JSON.stringify({id:watch.id,type:'web_hook',address:ready.origin+'/api/webhooks/calendar',token:secret,expiration:String(now+6*86400000)})});
       if(value.id!==watch.id||typeof value.resourceId!=='string'||!Number.isFinite(Number(value.expiration))||Number(value.expiration)<=now)throw Error('invalid_watch');
       store.updateAssistantWatch(userId,watch.id,{resourceId:value.resourceId,expiresAt:Number(value.expiration),status:'ready'});
      }catch(error){store.updateAssistantWatch(userId,watch.id,{status:'failed'});throw error;}
     }else{
      const value=await request('https://gmail.googleapis.com/gmail/v1/users/me/watch',{method:'POST',headers,body:JSON.stringify({topicName:env.GOOGLE_GMAIL_PUBSUB_TOPIC,labelIds:['INBOX'],labelFilterBehavior:'include'})});
      if(typeof value.historyId!=='string'||!Number.isFinite(Number(value.expiration))||Number(value.expiration)<=now)throw Error('invalid_watch');
      const watch=previous??store.prepareAssistantWatch(userId,provider,connection.connectionId,'inbox',{},randomBytes(32).toString('base64url'),now);store.updateAssistantWatch(userId,watch.id,{historyId:value.historyId,expiresAt:Number(value.expiration),status:'ready'});
     }
     if(attempts.size>1000)attempts.delete(attempts.keys().next().value);
    }catch{/* Preserve fallback polling; no credential, event body or provider error is logged. */}
   }
  }finally{running=false;}
 }};
}
