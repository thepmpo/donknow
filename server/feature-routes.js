import {createPushSender} from './push.js';
import {createAutomations} from './automations.js';
import {createSchedulerAuth} from './scheduler-auth.js';
import {createWeather} from './weather.js';
import {createAssistant} from './assistant.js';
import { fail } from './secrets.js';
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const validCode = value => typeof value === 'string' && /^\d{6}$/.test(value);
export function featureRoutes(store, mailer, worker, integrations, limited, clientAddress = req => req.socket.remoteAddress) {
  const assistant=createAssistant(store,integrations);
  const weather=createWeather();
  const automations=createAutomations(store,assistant,weather),schedulerAuth=createSchedulerAuth(),pushSender=createPushSender(store);
  const scheduledWorker=process.env.NODE_ENV==='test'?null:setInterval(()=>{void automations.tick().then(()=>pushSender.tick()).catch(()=>undefined);},60000);scheduledWorker?.unref();
  return {
    close(){if(scheduledWorker)clearInterval(scheduledWorker);},
    async callback(req, res, path, url) {
      const match = /^\/api\/integrations\/(google|slack|notion)\/callback$/.exec(path);
      if (!match || req.method !== 'GET') return false;
      try {
        const result = await integrations.callback(match[1], url.searchParams);
        if (result.native) { res.writeHead(303, { Location: `duckduck://integrations/complete?provider=${match[1]}&status=connected`, 'Cache-Control': 'no-store' }); res.end(); }
        else { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" }); res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>duckduck 연결 완료</title><body style="font-family:sans-serif;padding:40px;color:#263346"><h1>연결했어요.</h1><p>앱으로 돌아가 새로고침하면 연결한 자료를 확인할 수 있어요.</p><a href="/">duckduck 열기</a></body></html>'); }
      } catch (error) { res.writeHead(error.status || 502, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'" }); res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>연결 다시 시도</title><body style="font-family:sans-serif;padding:40px"><h1>연결하지 못했어요.</h1><p>승인이 취소되었거나 요청이 만료됐어요. 앱에서 다시 시작해주세요.</p><a href="duckduck://integrations/complete?status=failed">앱으로 돌아가기</a></body></html>'); }
      return true;
    },
    async public(req, path, json, send) {
      if(path==='/api/automations/tick'&&req.method==='POST'){
        if(limited('scheduler:'+clientAddress(req)))throw fail(429,'잠시 후 다시 요청해주세요.');
        await schedulerAuth(req.headers.authorization);const body=await json(req);if(Object.keys(body).length)throw fail(400,'예약 실행에는 인자를 넣지 않아요.');
        const result=await automations.tick();await pushSender.tick();send(200,result);return true;
      }
      if (path === '/api/capabilities' && req.method === 'GET') { send(200, { mail: mailer.configured, todoNotes: true, calendarWorkspace:2, calendarDetails:1, googleMultiAccount:true,assistantChecklist:1,assistant:assistant.status(null).enabled, externalActions:true,scheduledMessages:true,schedulerProtocol:2,naverMail:{configured:integrations.naver.status(null).configured,readOnly:integrations.naver.status(null).readOnly,sendAvailable:integrations.naver.status(null).sendAvailable}, integrations: integrations.status(null).map(({ provider, configured }) => ({ provider, configured })) }); return true; }
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
      if (!validCode(body.code) || typeof body.password !== 'string' || body.password.length < 10 || body.password.length > 128) throw fail(400, '6자리 인증번호와 10~128자의 새 비밀번호를 입력해주세요.');
      if (!(await store.resetPassword(email, body.code, body.password))) throw fail(400, '인증번호가 올바르지 않거나 만료됐어요. 다시 요청해주세요.');
      send(200, { ok: true, message: '비밀번호를 변경했어요. 다시 로그인해주세요.' }); return true;
    },
    async private(req, path, url, user, json, send, sessionToken) {
      if(path==='/api/notifications/device'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
        if(req.method==='GET'){send(200,store.pushDeviceStatus(user.id,url.searchParams.get('deviceId')));return true;}
        if(['POST','DELETE'].includes(req.method)){if(limited('push:'+user.id))throw fail(429,'잠시 후 다시 연결해주세요.');const body=await json(req);send(200,req.method==='POST'?store.registerPushDevice(user.id,body.deviceId,body.token,sessionToken):store.removePushDevice(user.id,body.deviceId));return true;}
      }
      if(path==='/api/automations'&&req.method==='GET'){send(200,{schedules:store.automationSettings(user.id).map(item=>{const status=assistant.status(user.id),scope=status.consentScopes;return {...item,consentRequired:item.kind==='briefing'&&item.enabled&&(item.consentScopes?['todo',...item.providers].some(p=>item.consentScopes[p]!==scope[p]):item.providers.includes('google')&&status.googleAccountCount>1)};})});return true;}
      const schedule=/^\/api\/automations\/(briefing|weather)$/.exec(path);
      if(schedule&&req.method==='POST'){
        if(!user.emailVerified)throw fail(403,'이메일 인증을 먼저 완료해주세요.');
        if(limited('automations:'+user.id))throw fail(429,'예약 변경이 많아요. 잠시 후 다시 시도해주세요.');
        send(200,store.configureAutomation(user.id,schedule[1],await json(req),Date.now(),assistant.status(user.id).consentScopes));return true;
      }
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
      if(assistantAction){if(req.method==='POST'&&assistantAction[2]){if(limited('assistant-execute:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const body=await json(req);send(200,await assistant.confirm(user.id,assistantAction[1],body.confirmation));return true;}if(req.method==='DELETE'&&!assistantAction[2]){if(!store.cancelAssistantAction(user.id,assistantAction[1]))throw fail(409,'취소할 수 없는 작업이에요.');send(200,{cancelled:true});return true;}if(req.method==='GET'&&!assistantAction[2]){const value=store.assistantAction(user.id,assistantAction[1]);if(!value)throw fail(404,'내 작업을 찾지 못했어요.');send(200,value);return true;}}
      if(path==='/api/assistant/chat'&&req.method==='POST'){if(limited('assistant-chat:'+user.id))throw fail(429,'요청이 많아요. 잠시 후 다시 시도해주세요.');send(200,await assistant.chat(user.id,await json(req)));return true;}
      if(path==='/api/assistant/context'&&req.method==='POST'){if(limited('assistant-context:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const body=await json(req);send(200,await assistant.context(user.id,body.providers??[]));return true;}
      if(path==='/api/integrations/naver'&&req.method==='GET'){send(200,integrations.naver.status(user.id));return true;}
      if(path==='/api/integrations/naver'&&req.method==='POST'){if(limited('naver-connect:'+user.id))throw fail(429,'잠시 후 다시 시도해주세요.');const b=await json(req);send(200,await integrations.naver.connect(user.id,b.email,b.password,b.permissions));return true;}
      if(path==='/api/integrations/naver'&&req.method==='DELETE'){send(200,await integrations.naver.disconnect(user.id));return true;}
      if(path==='/api/integrations/naver/resources'&&req.method==='GET'){if(limited('naver-read:'+user.id))throw fail(429,'잠시 후 다시 조회해주세요.');send(200,await integrations.naver.resources(user.id));return true;}
      const detail=/^\/api\/integrations\/(google|notion)\/detail$/.exec(path);if(detail&&req.method==='GET'){if(limited('detail:'+user.id))throw fail(429,'잠시 후 다시 조회해주세요.');const id=url.searchParams.get('id');if(typeof id!=='string'||id.length>1200)throw fail(400,'자료를 확인해주세요.');send(200,await integrations.readSource(user.id,detail[1],id));return true;}

      if (path === '/api/integrations/apple-reminders/import' && req.method === 'POST') {
        const body = await json(req);
        if (!body || !Array.isArray(body.items) || !body.items.length || body.items.length > 20) throw fail(400, '최대 20개를 선택해주세요.');
        const items = body.items.map(item => {
          if (!item || item.completed !== false || typeof item.id !== 'string' || !item.id || item.id.length > 200 || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120 || (item.dueDate != null && (typeof item.dueDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(item.dueDate) || !Number.isFinite(Date.parse(item.dueDate)) || new Date(item.dueDate).toISOString().slice(0,10) !== item.dueDate))) throw fail(400, '할 일과 날짜를 확인해주세요.');
          return { id: item.id, title: item.title.trim(), dueDate: item.dueDate ?? null, kind: 'task', completed: false };
        });
        store.cacheResources(user.id, 'apple-reminders', items);
        send(200, { results: store.importResources(user.id, 'apple-reminders', [...new Set(items.map(item => item.id))]) }); return true;
      }
      if(path==='/api/account/export'&&req.method==='GET'){send(200,{format:'duckduck-personal-v1',exportedAt:new Date().toISOString(),account:store.account(user.id),todos:store.list(user.id),calendarDetails:store.exportCalendarDetails(user.id),comments:store.exportProjectComments(user.id),assistantActions:store.exportAssistantActions(user.id),assistantMessages:store.exportAssistantMessages(user.id),automationSchedules:store.automationSettings(user.id)});return true;}
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
