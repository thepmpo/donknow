import {requireNewPassword} from './password-policy.js';
import {safeTodoSourceLink} from './todo-source-link.js';
import {readComputerBody} from './agent-computer-routes.js';
import {assistantNotice} from './assistant-notices.js';
import {createSourceEdits} from './source-edits.js';
import {initializeAssistantDefaults} from './assistant-defaults.js';
import {createAgentChannels} from './agent-channels.js';
import {createAgentEvents} from './agent-events.js';
import {createAgentVoice} from './agent-voice.js';
import {createAgentMemory} from './agent-memory.js';
import {createAgentComputer} from './agent-computer.js';
import {createAgentEngine} from './agent-engine.js';
import {createAgentRoutes} from './agent-routes.js';
import {randomBytes} from 'node:crypto';
import {createAssistantEvents} from './assistant-events.js';
import {createPushSender} from './push.js';
import {createAutomations} from './automations.js';
import {createSchedulerAuth} from './scheduler-auth.js';
import {createWeather} from './weather.js';
import {createConversationAssistant} from './assistant-conversation.js';
import {createAssistant} from './assistant.js';
import { fail } from './secrets.js';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validCode = value => typeof value === 'string' && /^\d{6}$/.test(value);
export function featureRoutes(store, mailer, worker, integrations, limited, clientAddress = req => req.socket.remoteAddress,{background=true,deferredSources=process.env.NODE_ENV!=='test'||process.env.SOURCE_QUEUE==='1'}={}) {
  let sourceEdits;
  const assistant=createAssistant(store,integrations,process.env,fetch,{updateTodo:(...args)=>sourceEdits.save(...args)});
  let sourceTimer;const wakeSource=()=>{if(!background||!deferredSources||sourceTimer)return;sourceTimer=setTimeout(()=>{sourceTimer=null;void sourceEdits.tick().catch(()=>{});},20);sourceTimer.unref();};
  sourceEdits=createSourceEdits({store,assistant,integrations,deferred:deferredSources,onEnqueue:wakeSource});
  const sourceInterval=background&&deferredSources?setInterval(wakeSource,15000):null;sourceInterval?.unref();if(background&&deferredSources)wakeSource();
  const defaultedUsers=new Set();
  const memory=createAgentMemory(store),computer=createAgentComputer(store);
  const agent=createAgentEngine({store,assistant,integrations,memory,computer,autoWake:background&&process.env.NODE_ENV!=='test'});
  const channels=createAgentChannels({store,assistant,engine:agent,autoWake:background});agent.attachNotifications(()=>{setImmediate(()=>void channels.tick().then(()=>pushSender.tick()).catch(()=>undefined));});
  const voice=createAgentVoice({store,assistant,engine:agent});
  const computerScopeValid=job=>{const current=assistant.status(job.userId).consentScopes;return store.account(job.userId)?.emailVerified&&job.memoryRevision===store.memorySettings(job.userId).revision&&job.providers.every(p=>job.consentScopes?.[p]===current[p]);};
  const agentRoutes=createAgentRoutes({store,engine:agent,assistant,computer,voice,channels,limited});
  assistant.attachAgent?.(agent);
  const conversations=createConversationAssistant(store,assistant,memory);
  agent.attachChat((user,body)=>conversations.chat(user,body));
  const weather=createWeather();
  const automations=createAutomations(store,assistant,weather),schedulerAuth=createSchedulerAuth(),pushSender=createPushSender(store);
  const events=createAssistantEvents(store,assistant,integrations,{onSlack:data=>channels.slack(data)}),agentEvents=createAgentEvents(store,assistant,integrations);
  const drain=async()=>{store.expireAgentCalls();await agentEvents.poll();await agentEvents.dispatch();await channels.tick();await agent.tick();const result=await events.tick();await automations.tick();await integrations.renewAssistantWatches();await pushSender.tick();return result;};
  const scheduledWorker=!background||process.env.NODE_ENV==='test'?null:setInterval(()=>{void drain().catch(()=>undefined);},60000);scheduledWorker?.unref();
  async function checklistAction(user,id,key,body,collection=false){
    if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
    if(body.action==='source'){
      const {value,item}=store.briefingPayload(user.id,id,key,collection),source=value.sources?.find(s=>s.ref===body.sourceRef&&item.sourceRefs?.includes(s.ref));
      if(!source||!['google','slack','notion'].includes(source.provider))throw fail(404,'이 항목의 원본 링크가 없어요. 원본 앱에서 제목으로 찾아주세요.');
      const url=safeTodoSourceLink(await integrations.originalLink(user.id,{source:{provider:source.provider,externalId:source.ref.slice(source.provider.length+1),...(source.locator?.connectionId?{connectionId:source.locator.connectionId}:{})}}),source.provider);
      if(!url)throw fail(404,'원본 앱에서 제목으로 찾아주세요.');return {url};
    }
    if(body.action!=='calendar'){
      const {item}=store.briefingPayload(user.id,id,key,collection),linked=store.briefingItemState(user.id,key)?.todoId??item.todoId,previous=linked?store.get(user.id,linked):null;
      const result=store.applyBriefingItem(user.id,id,key,body.action,body.args,collection,{allowCreate:assistant.status(user.id).access.createFromSources});
      if(['complete','todo'].includes(body.action)&&result.todo?.source&&(previous?previous.done!==result.todo.done:body.action==='complete'))result.todo=await sourceEdits.save(user.id,result.todo.id,{done:result.todo.done},{forceDone:true});
      return result;
    }
    if(!assistant.status(user.id).access.createFromSources)throw fail(403,'프로 기능을 확인해주세요.');
    const claim=store.claimBriefingCalendar(user.id,id,key,collection);
    if(claim.blocked)throw fail(409,'이전 일정의 저장 기록을 확인할 수 없어요. Google 캘린더에서 제목으로 확인해주세요. Todo에 먼저 보관할 수도 있어요.');
    if(claim.existing)return claim.existing;
    try{const action=await assistant.prepare(user.id,'calendar.create',body.args);store.linkBriefingCalendar(user.id,key,claim.lease,action);return action;}
    catch(error){store.releaseBriefingCalendar(user.id,key,claim.lease);throw error;}
  }
  return {
    updateTodo:(user,id,patch)=>sourceEdits.save(user,id,patch),
    wakeSource,close(){channels.close();agent.close();clearTimeout(sourceTimer);if(sourceInterval)clearInterval(sourceInterval);if(scheduledWorker)clearInterval(scheduledWorker);},
    async webhook(req,path,send){if(await channels.webhook(req,path,send)){setImmediate(()=>void channels.tick().then(()=>agent.tick()).catch(()=>undefined));return true;}if(!/^\/api\/webhooks\/(slack|notion|calendar|gmail)(?:\/[a-f0-9-]{36}\/[A-Za-z0-9_-]{43})?$/.test(path))return false;if(limited('provider-event:'+clientAddress(req)))throw fail(429,'변경 알림 요청이 많아요.');const handled=await events.receive(req,path,send);if(handled)setImmediate(()=>{void agentEvents.dispatch().then(()=>channels.tick()).then(()=>agent.tick()).then(()=>events.tick()).then(()=>pushSender.tick()).catch(()=>undefined);});return handled;},
    async callback(req, res, path, url) {
      const match = /^\/api\/integrations\/(google|slack|notion)\/callback$/.exec(path);
      if (!match || req.method !== 'GET') return false;
      try {
        const result = await integrations.callback(match[1], url.searchParams);
        if (result.native) { res.writeHead(303, { Location: `duckduck://integrations/complete?provider=${match[1]}&status=connected`, 'Cache-Control': 'no-store' }); res.end(); }
        else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" }); res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>duckduck 연결 완료</title><body style="font-family:sans-serif;padding:40px;color:#263346"><h1>연결했어요.</h1><p>앱으로 돌아가 새로고침하면 연결한 자료를 확인할 수 있어요.</p><a href="/app">duckduck 열기</a></body></html>'); }
      } catch (error) { res.writeHead(error.status || 502, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'" }); res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>연결 다시 시도</title><body style="font-family:sans-serif;padding:40px"><h1>연결하지 못했어요.</h1><p>승인이 취소되었거나 요청이 만료됐어요. 앱에서 다시 시작해주세요.</p><a href="duckduck://integrations/complete?status=failed">앱으로 돌아가기</a></body></html>'); }
      return true;
    },
    async public(req, path, json, send) {
      if(path==='/api/agent/imessage/bridge'&&req.method==='POST')return channels.imessageBridge(req,json,send);
      if(await voice.handle(req,path,()=>readComputerBody(req,256*1024),send))return true;
      if(path==='/api/agent/computers/claim'&&req.method==='POST'){if(limited('computer-pair:'+clientAddress(req)))throw fail(429,'연결 요청이 많아요.');const b=await json(req);send(200,store.claimAgentComputer(b.id,b.pairToken));return true;}
      if(path==='/api/agent/computers/state'&&req.method==='POST'){const b=await json(req),c=store.authenticateAgentComputer(b.id,(req.headers.authorization??'').replace(/^Bearer /,'')),cmd=store.computerCommand(c.userId,b.commandId);if(cmd.computerId!==c.id)throw fail(403,'내 컴퓨터 작업이 아니에요.');const job=cmd.jobId?store.agentJob(c.userId,cmd.jobId):null;send(200,{cancel:cmd.status!=='running'||job&&(!['waiting_computer','running','queued'].includes(job.status)||store.agentProfile(c.userId).paused||!computerScopeValid(job))||!store.computerPolicyValid(c.userId,c.id,cmd)||cmd.privateControl&&c.status!=='user'||!cmd.privateControl&&c.status!=='agent'});return true;}
      if(path==='/api/agent/computers/poll'&&req.method==='POST'){const b=await json(req),c=store.authenticateAgentComputer(b.id,(req.headers.authorization??'').replace(/^Bearer /,''));send(200,{command:store.pollAgentComputer(c,computerScopeValid),control:c.status,workspaces:store.computerWorkspaces(c.userId,c.id)});return true;}
      if(path==='/api/agent/computers/result'&&req.method==='POST'){const c=store.authenticateAgentComputerSecret((req.headers.authorization??'').replace(/^Bearer /,'')),b=await readComputerBody(req);if(b.id!==c.id)throw fail(403,'내 컴퓨터를 확인해주세요.');send(200,store.finishComputer(c,b.commandId,b.lease,b.result));setImmediate(()=>void agent.tick().catch(()=>undefined));return true;}

      if(path==='/api/automations/tick'&&req.method==='POST'){
        if(limited('scheduler:'+clientAddress(req)))throw fail(429,'잠시 후 다시 요청해주세요.');
        await schedulerAuth(req.headers.authorization);const body=await json(req);if(Object.keys(body).length)throw fail(400,'예약 실행에는 인자를 넣지 않아요.');
        const result=await drain();send(200,result);return true;
      }
      if (path === '/api/capabilities' && req.method === 'GET') { send(200, { mail: mailer.configured, todoNotes: true,todoOrdering:1, calendarWorkspace:2, calendarDetails:1, googleMultiAccount:true,assistantChecklist:1,briefingChecklist:1,briefingHourly:true,assistantMemory:1,agentWork:1,importantChanges:{mode:'events-and-polling',receivers:integrations.realtimeReadiness(),intervalSeconds:60,guaranteedRealtime:false},assistant:assistant.status(null).enabled, externalActions:true,scheduledMessages:true,schedulerProtocol:2,naverMail:{configured:integrations.naver.status(null).configured,readOnly:integrations.naver.status(null).readOnly,sendAvailable:integrations.naver.status(null).sendAvailable}, integrations: integrations.status(null).map(({ provider, configured }) => ({ provider, configured })) }); return true; }
      if (!['/api/auth/password/request', '/api/auth/password/confirm'].includes(path) || req.method !== 'POST') return false;
      if (limited('password:' + clientAddress(req))) throw fail(429, '잠시 후 다시 시도해주세요.');
      const body = await json(req); if (!validEmail(body.email)) throw fail(400, '이메일을 확인해주세요.');
      const email = body.email.trim().toLowerCase();
      if (path.endsWith('/request')) {
        if (!mailer.configured) throw fail(503, '이메일 발송 서비스가 아직 설정되지 않았어요.');
        const id = store.findAccountId(email);
        if (id) { try { store.queueAccountMail(id, 'reset'); } catch (error) { if (error.status !== 429) throw error; } }
        void worker.tick().catch(() => undefined);
        send(202, { message: '계정이 있다면 인증번호 전송을 요청했어요. 메일을 확인해주세요.' }); return true;
      }
      if(!validCode(body.code))throw fail(400,'6자리 인증번호를 확인해주세요.');
      requireNewPassword(body.password,body.passwordConfirmation);
      if (!(await store.resetPassword(email, body.code, body.password))) throw fail(400, '인증번호가 올바르지 않거나 만료됐어요. 다시 요청해주세요.');
      send(200, { ok: true, message: '비밀번호를 변경했어요. 다시 로그인해주세요.' }); return true;
    },
    async private(req, path, url, user, json, send, sessionToken) {
      if(path==='/api/ai/usage'&&req.method==='GET'){send(200,store.aiBudget(user.id));return true;}
      if(!defaultedUsers.has(user.id)&&initializeAssistantDefaults(store,assistant,user)){defaultedUsers.add(user.id);if(defaultedUsers.size>1000)defaultedUsers.delete(defaultedUsers.values().next().value);}
      if(path==='/api/assistant/notices'&&req.method==='POST'){send(200,assistantNotice(store,user.id,await json(req)));return true;}
      const sourceResult=/^\/api\/todos\/([a-f0-9-]{36})\/source-result$/.exec(path),sourceRetry=/^\/api\/todos\/([a-f0-9-]{36})\/source-retry$/.exec(path);
      if(sourceResult&&req.method==='POST'){send(200,sourceEdits.deviceResult(user.id,sourceResult[1],await json(req)));return true;}
      if(sourceRetry&&req.method==='POST'){send(200,await sourceEdits.save(user.id,sourceRetry[1],{},{retry:true}));return true;}
      if(await agentRoutes(req,path,url,user,json,send))return true;
      if(path==='/api/notifications/device'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
        if(req.method==='GET'){send(200,store.pushDeviceStatus(user.id,url.searchParams.get('deviceId')));return true;}
        if(['POST','DELETE'].includes(req.method)){if(limited('push:'+user.id))throw fail(429,'잠시 후 다시 연결해주세요.');const body=await json(req);send(200,req.method==='POST'?store.registerPushDevice(user.id,body.deviceId,body.token,sessionToken):store.removePushDevice(user.id,body.deviceId));return true;}
      }
      if(path==='/api/automations'&&req.method==='GET'){send(200,{monitor:store.assistantMonitorStatus(user.id),schedules:store.automationSettings(user.id).map(item=>{const status=assistant.status(user.id),scope=status.consentScopes;return {...item,consentRequired:item.kind==='briefing'&&item.enabled&&(item.consentScopes?['todo',...item.providers].some(p=>item.consentScopes[p]!==scope[p]):item.providers.includes('google')&&status.googleAccountCount>1)};})});return true;}
      const schedule=/^\/api\/automations\/(briefing|weather)$/.exec(path);
      if(schedule&&req.method==='POST'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
        if(limited('automations:'+user.id))throw fail(429,'예약 변경이 많아요. 잠시 후 다시 시도해주세요.');
        send(200,store.configureAutomation(user.id,schedule[1],await json(req),Date.now(),assistant.status(user.id).consentScopes));setImmediate(()=>{void integrations.renewAssistantWatches().catch(()=>undefined);});return true;
      }
      const briefingItem=/^\/api\/assistant\/messages\/([^/]+)\/items\/([a-f0-9]{64})$/.exec(path);
      if(briefingItem&&req.method==='POST'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
        if(limited('briefing-item:'+user.id))throw fail(429,'잠시 뒤 다시 선택해주세요.');
        const body=await json(req);send(200,await checklistAction(user,briefingItem[1],briefingItem[2],body));return true;
      }
      if(path==='/api/assistant/checklist'&&req.method==='POST'){if(limited('briefing-item:'+user.id))throw fail(429,'잠시 뒤 다시 선택해주세요.');const body=await readComputerBody(req,64*1024);if(typeof body.token!=='string'||body.token.length>40000||typeof body.key!=='string'||!/^[a-f0-9]{64}$/.test(body.key))throw fail(400,'할 일 제안을 다시 확인해주세요.');send(200,await checklistAction(user,body.token,body.key,body,'token'));return true;}
      if(path.startsWith('/api/assistant/memory')&&['POST','PATCH','DELETE'].includes(req.method)&&limited('memory:'+user.id))throw fail(429,'잠시 후 다시 변경해주세요.');
      if(path==='/api/assistant/events/notion/setup'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');if(limited('notion-setup:'+user.id))throw fail(429,'잠시 뒤 다시 확인해주세요.');
        if(req.method==='POST'){const body=await json(req),c=store.connection(user.id,'notion');if(body.confirmation!==true||!c?.features.includes('pages'))throw fail(400,'연결한 Notion 자료 수신을 확인해주세요.');const origin=new URL(process.env.PUBLIC_ORIGIN);if(origin.protocol!=='https:')throw fail(503,'HTTPS 수신 주소를 설정해주세요.');if(store.assistantWatches(user.id,'notion').length>=5)throw fail(409,'Notion 수신 연결은 최대5개예요. 이전 연결을 먼저 해제해주세요.');const token=randomBytes(32).toString('base64url'),watch=store.prepareAssistantWatch(user.id,'notion',c.connectionId,'subscription',{workspaceId:c.accountId},token);store.updateAssistantWatch(user.id,watch.id,{expiresAt:Date.now()+86400000});send(201,{id:watch.id,requestUrl:origin.origin+'/api/webhooks/notion/'+watch.id+'/'+token});return true;}
        if(req.method==='DELETE'){const body=await json(req),watch=store.assistantWatch(user.id,body.id);if(body.confirmation!==true||!watch||watch.provider!=='notion')throw fail(400,'해제할 수신 연결을 확인해주세요.');store.updateAssistantWatch(user.id,watch.id,{status:'cancelled',expiresAt:0});send(200,{ok:true});return true;}
        if(req.method==='GET'){const watch=store.assistantWatch(user.id,url.searchParams.get('id'));if(!watch||watch.provider!=='notion')throw fail(404,'내 수신 연결을 찾을 수 없어요.');send(200,{id:watch.id,status:watch.status,verificationToken:watch.verificationToken??null});return true;}
      }
      if(path==='/api/assistant/memory/settings'){
        if(req.method==='GET'){send(200,store.memorySettings(user.id));return true;}
        if(req.method==='POST'){const body=await json(req);const result=store.configureMemory(user.id,body.enabled);voice.closeUser(user.id);send(200,result);return true;}
      }
      if(path==='/api/assistant/memory'){
        if(req.method==='GET'){send(200,{memories:store.memories(user.id)});return true;}
        if(req.method==='POST'){const body=await json(req);send(201,store.saveMemory(user.id,body.text));return true;}
        if(req.method==='DELETE'){const body=await json(req);if(body.confirmation!=='DELETE')throw fail(400,'지울 내용을 확인해주세요.');voice.closeUser(user.id);send(200,store.clearAssistantMemory(user.id,{conversations:body.conversations===true}));return true;}
      }
      const memory=/^\/api\/assistant\/memory\/([a-f0-9-]{36})$/.exec(path);
      if(memory&&['PATCH','DELETE'].includes(req.method)){send(200,req.method==='DELETE'?store.forgetMemory(user.id,memory[1]):store.saveMemory(user.id,(await json(req)).text,{id:memory[1]}));return true;}
      if(path==='/api/assistant/conversation'&&req.method==='GET'){send(200,store.conversation(user.id,{before:url.searchParams.get('before')}));return true;}
      const conversationItem=/^\/api\/assistant\/conversation\/([^/]+)\/items\/([a-f0-9]{64})$/.exec(path);
      if(conversationItem&&req.method==='POST'){if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');if(limited('conversation-item:'+user.id))throw fail(429,'잠시 후 다시 선택해주세요.');const body=await json(req);send(200,await checklistAction(user,conversationItem[1],conversationItem[2],body,true));return true;}
      if(path==='/api/assistant/messages'&&req.method==='GET'){
        const after=url.searchParams.get('after')||'';send(200,{messages:store.assistantMessages(user.id,after),incremental:!!after});
        if(process.env.NODE_ENV!=='test')void automations.tick(user.id).catch(()=>undefined);return true;
      }
      if(path==='/api/assistant/messages/read'&&req.method==='POST'){const body=await json(req);send(200,store.readAssistantMessages(user.id,body.through));return true;}

      if(path==='/api/weather'&&req.method==='GET'){if(limited('weather:'+user.id))throw fail(429,'잠시 후 다시 확인해주세요.');send(200,await weather(url.searchParams.get('city')));return true;}
      if(path==='/api/assistant/status'&&req.method==='GET'){send(200,{...assistant.status(user.id),scheduledMessages:true});return true;}
      if(path==='/api/assistant/actions'&&req.method==='GET'){send(200,{actions:store.assistantActions(user.id)});return true;}
      if(path==='/api/assistant/actions'&&req.method==='POST'){if(limited('assistant-prepare:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const body=await json(req);send(201,await assistant.prepare(user.id,body.operation,body.args));return true;}
      const assistantAction=/^\/api\/assistant\/actions\/([a-f0-9-]{36})(?:\/(confirm))?$/.exec(path);
      if(assistantAction){if(req.method==='POST'&&assistantAction[2]){if(limited('assistant-execute:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const body=await json(req);const result=await assistant.confirm(user.id,assistantAction[1],body.confirmation);store.resolveBriefingCalendar(user.id,assistantAction[1]);send(200,result);return true;}if(req.method==='DELETE'&&!assistantAction[2]){if(!store.cancelAssistantAction(user.id,assistantAction[1]))throw fail(409,'취소할 수 없는 작업이에요.');send(200,{cancelled:true});return true;}if(req.method==='GET'&&!assistantAction[2]){const value=store.resolveBriefingCalendar(user.id,assistantAction[1]);if(!value)throw fail(404,'내 작업을 찾지 못했어요.');send(200,value);return true;}}
      if(path==='/api/assistant/chat'&&req.method==='POST'){if(limited('assistant-chat:'+user.id))throw fail(429,'요청이 많아요. 잠시 후 다시 시도해주세요.');const body=await readComputerBody(req,64*1024);delete body._channel;delete body._contactId;if(body.background===true){if(!assistant.status(user.id).enabled)throw fail(503,'AI 연결 설정을 확인해주세요.');if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');for(const id of body.attachments??[])store.agentArtifact(user.id,id);const scopes=assistant.status(user.id).consentScopes;if((body.providers??[]).some(p=>!['google','slack','notion','naver'].includes(p)||body.consentScopes?.[p]!==scopes[p]))throw fail(409,'자료 연결이 바뀌었어요. 다시 확인해주세요.');send(202,{queued:true,...agent.queueChat(user.id,body)});return true;}send(200,await conversations.chat(user.id,body));return true;}
      if(path==='/api/assistant/context'&&req.method==='POST'){if(limited('assistant-context:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const body=await json(req);send(200,await assistant.context(user.id,body.providers??[]));return true;}
      if(path==='/api/integrations/naver'&&req.method==='GET'){send(200,integrations.naver.status(user.id));return true;}
      if(path==='/api/integrations/naver'&&req.method==='POST'){if(limited('naver-connect:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const b=await json(req);send(200,await integrations.naver.connect(user.id,b.email,b.password,b.permissions));return true;}
      if(path==='/api/integrations/naver'&&req.method==='DELETE'){send(200,await integrations.naver.disconnect(user.id));return true;}
      if(path==='/api/integrations/naver/resources'&&req.method==='GET'){if(limited('naver-read:'+user.id))throw fail(429,'잠시 후 다시 조회해주세요.');send(200,await integrations.naver.resources(user.id));return true;}
      const detail=/^\/api\/integrations\/(google|notion)\/detail$/.exec(path);if(detail&&req.method==='GET'){if(limited('detail:'+user.id))throw fail(429,'잠시 후 다시 조회해주세요.');const id=url.searchParams.get('id');if(typeof id!=='string'||id.length>1200)throw fail(400,'자료를 확인해주세요.');send(200,await integrations.readSource(user.id,detail[1],id));return true;}

      if (path === '/api/integrations/apple-reminders/import' && req.method === 'POST') {
        const body = await readComputerBody(req,256*1024);
        if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 20) throw fail(400, '최대 20개를 선택해주세요.');
        const items = body.items.map(item => {
          if (!item || item.completed !== false || typeof item.id !== 'string' || !item.id || item.id.length > 200 || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120 || (item.dueDate != null && (typeof item.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) || !Number.isFinite(Date.parse(item.dueDate)) || new Date(item.dueDate).toISOString().slice(0,10) !== item.dueDate))) throw fail(400, '할 일과 날짜를 확인해주세요.');
          if(item.notes!==undefined&&(typeof item.notes!=='string'||item.notes.length>4000)||item.dueTime!=null&&(!item.dueDate||typeof item.dueTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(item.dueTime))||item.modifiedAt!==undefined&&(typeof item.modifiedAt!=='string'||!Number.isFinite(Date.parse(item.modifiedAt))))throw fail(400,'원본 메모와 예정 시간을 확인해주세요.');
          return { id: item.id, title: item.title.trim(), dueDate: item.dueDate ?? null,notes:item.notes??'',dueTime:item.dueTime??null,...(item.modifiedAt?{modifiedAt:item.modifiedAt}:{}), kind: 'task', completed: false };
        });
        store.cacheResources(user.id, 'apple-reminders', items);
        send(200, { results: store.importResources(user.id, 'apple-reminders', [...new Set(items.map(item => item.id))]) }); return true;
      }
      if(path==='/api/account/export'&&req.method==='GET'){send(200,{format:'duckduck-personal-v1',exportedAt:new Date().toISOString(),account:store.account(user.id),signupAgreements:store.signupAgreements(user.id),todos:store.list(user.id),calendarDetails:store.exportCalendarDetails(user.id),comments:store.exportProjectComments(user.id),assistantActions:store.exportAssistantActions(user.id),agent:store.exportAgentData(user.id),assistantMemory:store.exportAssistantMemory(user.id),assistantMessages:store.exportAssistantMessages(user.id),checklistStates:store.exportChecklistStates(user.id),automationSchedules:store.automationSettings(user.id)});return true;}
      if (path === '/api/account' && req.method === 'GET') { send(200, { user: store.account(user.id), mailConfigured: mailer.configured, mailStatus: store.mailStatus(user.id) }); return true; }
      if (path === '/api/account/verification/send' && req.method === 'POST') {
        if (store.account(user.id)?.emailVerified) { send(200, { alreadyVerified: true }); return true; }
        if (!mailer.configured) throw fail(503, '이메일 발송 서비스가 아직 설정되지 않았어요.');
        if(limited('mail:'+clientAddress(req)))throw fail(429,'잠시 후 다시 시도해주세요.');
        const result = store.queueAccountMail(user.id, 'verify'); void worker.tick().catch(() => undefined); send(202, { queued: true, ...result }); return true;
      }
      if (path === '/api/account/verification/confirm' && req.method === 'POST') { const body = await json(req); if (!validCode(body.code) || !store.verifyEmail(user.id, body.code)) throw fail(400, '인증번호가 올바르지 않거나 만료됐어요.'); send(200, { user: store.account(user.id) }); return true; }
      if (path === '/api/account' && req.method === 'DELETE') {
        if (limited('delete:' + user.id)) throw fail(429, '잠시 후 다시 시도해주세요.');
        const body = await json(req); if (body.confirmation !== 'DELETE' || !(await store.passwordMatches(user.id, body.password))) throw fail(400, '삭제 확인과 현재 비밀번호를 확인해주세요.');
        const connections = integrations.status(user.id).filter(item => item.connected);
        const revocations = await Promise.allSettled(connections.map(item => integrations.disconnect(user.id, item.provider)));
        if (!(await store.deleteAccount(user.id, body.password))) throw fail(400, '현재 비밀번호를 다시 확인해주세요.');
        send(200, { deleted: true, remoteRevocationComplete: revocations.every(result => result.status === 'fulfilled' && result.value.revoked) }); return true;
      }
      const diagnostic=/^\/api\/integrations\/(google|slack|notion)\/diagnose$/.exec(path);if(diagnostic&&req.method==='POST'){send(200,await integrations.diagnose(user.id,diagnostic[1],(await json(req)).connectionId));return true;}
      if (path === '/api/integrations' && req.method === 'GET') { send(200, integrations.status(user.id)); return true; }
      if (path === '/api/integrations/google/search' && req.method === 'GET') {
        if (limited('record-search:' + user.id)) throw fail(429, '잠시 후 다시 찾아주세요.');
        send(200, await integrations.searchTasks(user.id, url.searchParams.get('q'),url.searchParams.get('connectionId')??undefined)); return true;
      }
      if(path==='/api/calendar/event-details'&&req.method==='PATCH'){if(limited('calendar-details:'+user.id))throw fail(429,'잠시 후 다시 저장해주세요.');send(200,await integrations.calendarDetails(user.id,await json(req)));return true;}
      if(path==='/api/calendar/reminders'&&req.method==='GET'){send(200,await integrations.calendarReminders(user.id));return true;}
      if(path==='/api/calendar/calendars'&&req.method==='GET'){send(200,await integrations.calendarList(user.id,url.searchParams.get('cursor')));return true;}
      if (path === '/api/calendar/events' && req.method === 'GET') { send(200, await integrations.calendar(user.id,url.searchParams.get('month'),url.searchParams.get('cursor'),url.searchParams.get('v')==='2'?{calendarId:url.searchParams.get('calendarId')??'primary',connectionId:url.searchParams.get('connectionId')??undefined,timeZone:url.searchParams.get('timeZone')??'Asia/Seoul',start:url.searchParams.get('start')??undefined,end:url.searchParams.get('end')??undefined}:undefined)); return true; }
      const match = /^\/api\/integrations\/(google|slack|notion)(?:\/(authorize|resources|import))?$/.exec(path); if (!match) return false;
      const [, provider, action] = match;
      if (action === 'authorize' && req.method === 'POST') { const body = await json(req); send(200, integrations.start(user.id, provider, body.features, req.headers['x-duckduck-client'] === 'native',{mode:body.mode,connectionId:body.connectionId})); return true; }
      if (action === 'resources' && req.method === 'GET') { send(200, await integrations.resources(user.id, provider, url.searchParams.get('feature'), url.searchParams.get('channel'), url.searchParams.get('cursor'), url.searchParams.get('status') ?? 'incomplete',undefined,url.searchParams.get('connectionId')??undefined)); return true; }
      if (action === 'import' && req.method === 'POST') { const body = await json(req); send(200, { results: integrations.import(user.id, provider, body.ids) }); return true; }
      if (!action && req.method === 'DELETE') { send(200, await integrations.disconnect(user.id, provider,url.searchParams.get('connectionId')??undefined)); return true; }
      return false;
    },
  };
}
