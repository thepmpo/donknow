import {createHash,randomUUID} from 'node:crypto';
/** Model calls remain proposals. Only opted-in account history/verified user facts persist. */
export function createConversationAssistant(store,assistant,memory=null){
 return {async chat(user,body){
  if(!store.memorySettings(user).enabled||!assistant.status(user).enabled||!store.account(user)?.emailVerified||body.consent!==true||typeof body.message!=='string'||!body.message.trim()||body.message.length>2000||body.pastedText!==undefined&&(typeof body.pastedText!=='string'||body.pastedText.length>10000))return assistant.chat(user,body);
  const actual=assistant.status(user).consentScopes;if(!Array.isArray(body.providers??[])||(body.providers??[]).some(p=>!['google','notion','slack','naver'].includes(p)||body.consentScopes&&body.consentScopes[p]!==actual[p])){const {fail}=await import('./secrets.js');throw fail(409,'자료 연결이 바뀌었어요. 다시 확인해주세요.');}
  const channel=body._channel??'app',input={channel,message:body.message,providers:body.providers??[],attachments:body.attachments??[],pastedDigest:body.pastedText?createHash('sha256').update(body.pastedText).digest('hex'):null},run=store.claimConversation(user,body.requestId??randomUUID(),input);if(run.response)return run.response;
  try{const history=store.conversation(user,{limit:12,channel}).turns.filter(t=>t.id!==run.userTurnId&&t.state!=='failed'&&t.state!=='sending').slice(-6).map(t=>({role:t.role,text:t.text.slice(0,2000)})),context=await assistant.context(user,body.providers??[],{lazy:!!assistant.status(user).agent?.persistentJobs});context.memoryUserTurnId=run.userTurnId;
   const relevant=memory?await memory.search(user,body.message.slice(0,120)):store.searchConversation(user,body.message.slice(0,120));for(const turn of relevant.turns)if(turn.id!==run.userTurnId)context.sources.push({ref:'conversation:'+turn.id,provider:'memory',kind:'conversation',title:'이전 대화',text:turn.text,completed:false});
   return store.completeConversation(run,await assistant.chat(user,{...body,history},undefined,context));
  }catch(error){store.failConversation(run);throw error;}
 }};
}
