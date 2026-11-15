import {randomBytes} from 'node:crypto';
/** Renew only watches for accounts the user explicitly included in important alerts. */
export function createProviderWatches({store,env,token,request}){
 let running=false;const attempts=new Map();
 function readiness(){let origin=null;try{const u=new URL(env.PUBLIC_ORIGIN);if(u.protocol==='https:'&&!u.username&&!u.password&&u.pathname==='/')origin=u.origin;}catch{}
  return {origin,calendar:!!origin,slack:!!(origin&&env.SLACK_SIGNING_SECRET&&env.SLACK_CLIENT_ID&&env.SLACK_CLIENT_SECRET),notion:!!(origin&&env.NOTION_WEBHOOK_VERIFICATION_TOKEN),gmail:!!(origin&&/^projects\/[\w-]+\/topics\/[\w-]+$/.test(env.GOOGLE_GMAIL_PUBSUB_TOPIC??'')&&env.GOOGLE_PUSH_SERVICE_ACCOUNT&&env.GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION)};
 }
 return {realtimeReadiness(){const {origin,...status}=readiness();return status;},async renewAssistantWatches(now=Date.now()){
  if(running)return;running=true;try{const ready=readiness();if(!ready.origin)return;
   for(const {userId,connection} of store.realtimeConnections('google')){
    const connectionKey=userId+':'+connection.connectionId;if(attempts.get(connectionKey)>now)continue;attempts.set(connectionKey,now+15*60000);
    try{const record=await token(userId,'google',connection.connectionId),headers={Authorization:'Bearer '+record.accessToken,'Content-Type':'application/json'};
     if(ready.calendar&&connection.features.includes('calendar')){
      let cursor=store.agentSync?.(userId,connection.connectionId,'calendar-watch-list')?.cursor??null,pages=0,created=0,remaining=[];
      const saved=store.agentSync?.(userId,connection.connectionId,'calendar-watch-list');if(saved?.remaining)remaining=saved.remaining;
      do{let calendars;if(remaining.length){calendars=remaining;remaining=[];}else{const value=await request('https://www.googleapis.com/calendar/v3/users/me/calendarList?'+new URLSearchParams({maxResults:'100',showDeleted:'false',...(cursor?{pageToken:cursor}:{})}),{headers});calendars=(value.items??[]).filter(c=>!c.deleted).map(c=>c.primary?'primary':c.id);cursor=value.nextPageToken??null;pages++;}
       for(let n=0;n<calendars.length;n++){const calendar=calendars[n],previous=store.assistantWatches(userId,'calendar').find(w=>w.connectionId===connection.connectionId&&w.resourceKey===calendar);if(previous?.expiresAt>now+24*3600000)continue;if(created>=10){remaining=calendars.slice(n);break;}created++;const secret=randomBytes(32).toString('base64url'),watch=store.prepareAssistantWatch(userId,'calendar',connection.connectionId,calendar,{},secret,now);
        try{const value=await request('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendar)+'/events/watch',{method:'POST',headers,body:JSON.stringify({id:watch.id,type:'web_hook',address:ready.origin+'/api/webhooks/calendar',token:secret,expiration:String(now+6*86400000)})});if(store.connection(userId,'google',connection.connectionId)?.connectionId!==connection.connectionId)throw Error('connection_changed');if(value.id!==watch.id||typeof value.resourceId!=='string'||!Number.isFinite(Number(value.expiration))||Number(value.expiration)<=now)throw Error('invalid_watch');store.updateAssistantWatch(userId,watch.id,{resourceId:value.resourceId,expiresAt:Number(value.expiration),status:'ready'});store.enqueueAgentEvent?.(userId,'google','baseline:'+watch.id,connection.connectionId,{kind:'refresh',calendarId:calendar,receivedAt:now},now);}catch{store.updateAssistantWatch(userId,watch.id,{status:'failed'});}
       }
      }while(cursor&&pages<5&&!remaining.length);store.saveAgentSync?.(userId,connection.connectionId,'calendar-watch-list',{cursor,remaining});if(cursor||remaining.length)attempts.set(connectionKey,now+60000);
     }
     if(ready.gmail&&connection.features.includes('gmail')){const previous=store.assistantWatches(userId,'gmail').find(w=>w.connectionId===connection.connectionId);if(!previous||previous.expiresAt<now+24*3600000){const value=await request('https://gmail.googleapis.com/gmail/v1/users/me/watch',{method:'POST',headers,body:JSON.stringify({topicName:env.GOOGLE_GMAIL_PUBSUB_TOPIC})});if(typeof value.historyId!=='string'||!Number.isFinite(Number(value.expiration))||Number(value.expiration)<=now)throw Error('invalid_watch');if(store.connection(userId,'google',connection.connectionId)?.connectionId!==connection.connectionId)throw Error('connection_changed');const watch=previous??store.prepareAssistantWatch(userId,'gmail',connection.connectionId,'all-mail',{},randomBytes(32).toString('base64url'),now);store.updateAssistantWatch(userId,watch.id,{historyId:previous?.historyId??value.historyId,expiresAt:Number(value.expiration),status:'ready'});}}
    }catch{/* Read-only polling continues if a provider cannot register a receiver. */}
    if(attempts.size>1000)attempts.delete(attempts.keys().next().value);
   }
  }finally{running=false;}
 }};
}
