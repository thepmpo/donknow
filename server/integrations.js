import {calendarSyncFields} from './docen-calendar-reconcile.js';
import {assistantNotice} from './assistant-notices.js';
import {measureExternal} from './request-metrics.js';
import {createAgentSync} from './agent-sync.js';
import {createIntegrationAgentTools} from './integration-agent-tools.js';
import {createProviderWatches} from './provider-watches.js';
import {readNotionDocument} from './notion-document.js';
import {calendarAccount,googleAccounts,googleConnection} from './google-accounts.js';
import {calendarEventColor,createCalendarWorkspace} from './calendar-workspace.js';
import {createNaverMail} from './naver-mail.js';
import {createProviderActions,mailText} from './provider-actions.js';
import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { fail } from './secrets.js';
const definitions = {
  google: { name: 'Google', prefix: 'GOOGLE', auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', features: ['calendar', 'gmail', 'drive', 'tasks', 'tasksWrite', 'gmailModify', 'gmailSend', 'calendarWrite', 'driveContent', 'driveWrite'] },
  slack: { name: 'Slack', prefix: 'SLACK', auth: 'https://slack.com/oauth/v2/authorize', token: 'https://slack.com/api/oauth.v2.access', features: ['channels', 'messages', 'messagesWrite', 'assistantContact'] },
  notion: { name: 'Notion', prefix: 'NOTION', auth: 'https://api.notion.com/v1/oauth/authorize', token: 'https://api.notion.com/v1/oauth/token', features: ['pages', 'pagesWrite'] },
};
const readFeatures = ['calendar','gmail','drive','tasks','channels','messages','pages'];
const googleScopes = { gmailModify:'https://www.googleapis.com/auth/gmail.modify', gmailSend:'https://www.googleapis.com/auth/gmail.send', calendarWrite:'https://www.googleapis.com/auth/calendar.events', driveContent:'https://www.googleapis.com/auth/drive.readonly', driveWrite:'https://www.googleapis.com/auth/drive.file', tasksWrite: 'https://www.googleapis.com/auth/tasks', tasks: 'https://www.googleapis.com/auth/tasks.readonly', calendar: 'https://www.googleapis.com/auth/calendar.readonly', gmail: 'https://www.googleapis.com/auth/gmail.readonly', drive: 'https://www.googleapis.com/auth/drive.metadata.readonly' };
const expiresAt = seconds => { if(seconds==null)return null;const value=Number(seconds);if(!Number.isFinite(value)||value<=0||value>31536000)throw fail(502,'서비스 인증 유효시간을 확인하지 못했어요.');return Date.now()+value*1000; };
const title = (value, fallback = '제목 없음') => (typeof value === 'string' && value.trim() ? value.trim() : fallback).slice(0, 120);
export function createIntegrations(store, env = process.env, fetcher = fetch) {
  const locks = new Map(),refreshFailures=new Map();
  const credentialVersion=record=>createHash('sha256').update(JSON.stringify([record.connectionId,record.accountId,record.accessToken,record.refreshToken])).digest('hex');
  function reauthorizationRequired(){const error=fail(409,'서비스 연결을 다시 승인해주세요.');error.code='integration-reauthorization';return error;}
  const naver=createNaverMail(store,env);
  function settings(provider) {
    const definition = definitions[provider]; if (!definition) throw fail(404, '지원하지 않는 서비스예요.');
    const clientId = env[definition.prefix + '_CLIENT_ID'], clientSecret = env[definition.prefix + '_CLIENT_SECRET'];
    let origin; try { const url = new URL(env.PUBLIC_ORIGIN); const local = env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1'].includes(url.hostname); if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error(); origin = url.origin; } catch {}
    return { ...definition, clientId, clientSecret, origin, configured: !!(clientId && (clientSecret || (provider === 'notion' && env.NOTION_BASIC_AUTH)) && origin), basicAuth: provider === 'notion' ? env.NOTION_BASIC_AUTH : null, callback: origin ? `${origin}/api/integrations/${provider}/callback` : null };
  }
  function reportFailure(url,status,kind,method){if(env.NODE_ENV!=='production')return;const host=new URL(url).hostname,provider=host==='slack.com'?'slack':host==='api.notion.com'?'notion':host.endsWith('googleapis.com')?'google':'external';console.warn(JSON.stringify({event:'integration-request-failure',provider,status,kind,method}));}
  function providerRequest(url,options={},slack=false,retryRefresh=false){return measureExternal(()=>providerRequestBody(url,options,slack,retryRefresh));}
  async function providerRequestBody(url, options = {}, slack = false, retryRefresh = false) {
    let response;const retryable=(options.method??'GET')==='GET'||retryRefresh;
    for(let attempt=0;attempt<(retryable?2:1);attempt++){
      try{response=await fetcher(url,{...options,signal:AbortSignal.timeout(retryRefresh?5000:10000)});}catch{if(retryable&&attempt===0){await new Promise(resolve=>setTimeout(resolve,150));continue;}reportFailure(url,0,'network-or-timeout',options.method??'GET');throw fail(502,'외부 서비스 연결이 늦어요. 다시 시도해주세요.');}
      if(retryable&&attempt===0&&response.status>=500){await response.body?.cancel();await new Promise(resolve=>setTimeout(resolve,150));continue;}break;
    }
    if(response.ok&&response.status===204)return {};
    let value; try { value = await response.json(); } catch { reportFailure(url,response.status,'invalid-response',options.method??'GET');throw fail(502, '외부 서비스 응답을 읽을 수 없어요.'); }
    if (!response.ok || (slack && value.ok === false)) {
      const reasons=value?.error?.errors;
      const rateLimited=response.status===429||value.error==='ratelimited'||response.status===403&&Array.isArray(reasons)&&reasons.some(item=>['rateLimitExceeded','userRateLimitExceeded','quotaExceeded'].includes(item?.reason));
      reportFailure(url,response.status,response.status===401||['invalid_auth','token_revoked','invalid_grant'].includes(value.error)?'reauthorization':rateLimited?'rate-limit':response.status===403?'permission':response.status>=500?'upstream-unavailable':'provider-rejected',options.method??'GET');
      if(rateLimited){
       const retry=response.headers.get('retry-after'),delay=retry&&/^\d+$/.test(retry)?Number(retry)*1000:Date.parse(retry??'')-Date.now();
       const error=fail(429,'외부 서비스 요청이 많아요. 잠시 후 다시 시도해주세요.');
       if(Number.isFinite(delay)&&delay>=0)error.retryAfterMs=delay;
       throw error;
      }
      if (response.status === 401 || value.error === 'invalid_auth' || value.error === 'token_revoked' || value.error === 'invalid_grant') throw reauthorizationRequired();
      if(response.status===412)throw fail(409,'원본이 동시에 바뀌었어요. 새 초안에서 다시 확인해주세요.');
      if(response.status===403)throw fail(403,'이 작업의 외부 서비스 권한을 확인해주세요.');
      if(response.status===410)throw fail(410,'외부 서비스에서 삭제된 대상이에요.');
      if(response.status===404)throw fail(404,'외부 서비스에서 대상을 찾지 못했어요.');
      if(response.status===400)throw fail(400,'외부 서비스가 작업 내용을 거절했어요.');
      if (value.error === 'not_in_channel') throw fail(409, 'Slack 채널에 연결한 앱을 먼저 초대해주세요.');
      throw fail(502, '외부 서비스 요청을 완료하지 못했어요. 권한과 연결 설정을 확인해주세요.');
    }
    if(value&&typeof value==='object'&&response.headers.get('etag'))Object.defineProperty(value,'__etag',{value:response.headers.get('etag')});
    return value;
  }
  async function exchange(provider, parameters) {
    const config = settings(provider);
    if (!config.configured) throw fail(503, '이 서비스의 연결 설정이 아직 준비되지 않았어요.');
    const notion = provider === 'notion';
    return providerRequest(config.token, { method: 'POST', headers: { 'Content-Type': notion ? 'application/json' : 'application/x-www-form-urlencoded', ...(notion ? { Authorization: 'Basic ' + (config.basicAuth || Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64')) } : {}) }, body: notion ? JSON.stringify(parameters) : new URLSearchParams({ ...parameters, client_id: config.clientId, client_secret: config.clientSecret }).toString() }, provider === 'slack',provider==='google'&&parameters.grant_type==='refresh_token');
  }
  async function token(userId, provider, connectionId, rejectedAccessToken) {
    if(store.accountActive&&!store.accountActive(userId))throw fail(403,'이 계정은 이용이 정지되어 있어요.');
    let record = provider==='google'?googleConnection(store,userId,connectionId):store.connection(userId,provider); if (!record) throw fail(409, '서비스를 먼저 연결해주세요.');
    const key = `${userId}:${provider}:${record.connectionId??'legacy'}`,fingerprint=credentialVersion(record),failed=refreshFailures.get(key);
    if(failed?.fingerprint===fingerprint&&failed.until>Date.now())throw reauthorizationRequired();
    if(failed)refreshFailures.delete(key);
    if (record.accessToken!==rejectedAccessToken&&(!record.expiresAt || record.expiresAt > Date.now() + 60000)) return record;
    if (!record.refreshToken) throw reauthorizationRequired();
    if (!locks.has(key)) locks.set(key, (async () => {
      const current = store.connection(userId, provider,record.connectionId); if (!current) throw fail(409, '서비스 연결이 해제됐어요.');
      let value;try{value=await exchange(provider, { grant_type: 'refresh_token', refresh_token: current.refreshToken });}catch(error){if(error.code==='integration-reauthorization'){refreshFailures.set(key,{fingerprint:credentialVersion(current),until:Date.now()+15*60*1000});try{assistantNotice(store,userId,{code:'connection-reauthorization',provider,title:'서비스 연결'});}catch{}while(refreshFailures.size>1000)refreshFailures.delete(refreshFailures.keys().next().value);}throw error;}
      if (typeof value.access_token !== 'string') throw fail(502, '외부 서비스 인증 응답을 확인해주세요.');
      const updated = { ...current, accessToken: value.access_token, refreshToken: value.refresh_token ?? current.refreshToken, expiresAt: expiresAt(value.expires_in) };
      // A disconnect during refresh must not recreate a deleted connection.
      if (!store.connection(userId, provider,current.connectionId) || store.connection(userId, provider,current.connectionId).accessToken !== current.accessToken || store.connection(userId, provider,current.connectionId).connectionId !== current.connectionId || store.connection(userId, provider,current.connectionId).accountId !== current.accountId) throw fail(409, '서비스 연결이 해제됐어요.');
      store.saveConnection(userId, provider, updated, current.label); return updated;
    })().finally(() => locks.delete(key)));
    return locks.get(key);
  }
  async function googleRead(userId,record,url,options={}){
    const read=current=>providerRequest(url,{...options,headers:{...options.headers,Authorization:'Bearer '+current.accessToken}});
    try{return await read(record);}catch(error){
      if(error.code!=='integration-reauthorization')throw error;
      const current=store.connection(userId,'google',record.connectionId);
      if(!current||current.connectionId!==record.connectionId||current.accountId!==record.accountId||JSON.stringify(current.features)!==JSON.stringify(record.features))throw fail(409,'서비스 연결이 바뀌었어요. 다시 불러와주세요.');
      const renewed=await token(userId,'google',current.connectionId,record.accessToken);
      if(renewed.accountId!==record.accountId||JSON.stringify(renewed.features)!==JSON.stringify(record.features))throw fail(409,'서비스 연결이 바뀌었어요. 다시 불러와주세요.');
      return read(renewed);
    }
  }
  async function taskMoveAccess(userId,connectionId){
    const record=await token(userId,'google',connectionId);
    if(!record.features.includes('tasksWrite'))throw fail(403,'ME에서 Google 할 일 수정 권한을 승인해주세요.');
    return record;
  }
  return {
    ...createProviderWatches({store,env,token,request:providerRequest}),
    ...createAgentSync({store,token,request:providerRequest}),
    ...createIntegrationAgentTools({store,token,request:providerRequest,fetcher}),
    async taskMoveLists(userId,connectionId,cursor){
      if(cursor!=null&&(typeof cursor!=='string'||cursor.length>3000))throw fail(400,'Google 할 일 목록을 다시 열어주세요.');
      const record=await taskMoveAccess(userId,connectionId);
      const query=new URLSearchParams({maxResults:'100',...(cursor?{pageToken:cursor}:{})});
      const data=await googleRead(userId,record,'https://tasks.googleapis.com/tasks/v1/users/@me/lists?'+query);
      return {items:data.items?.map(list=>({id:list.id,title:title(list.title,'할 일 목록')}))??[],nextCursor:data.nextPageToken??null};
    },
    async createGoogleTask(userId,target,claim){
      const record=await taskMoveAccess(userId,target.connectionId);
      const origin='https://tasks.googleapis.com/tasks/v1';
      const list=await googleRead(userId,record,origin+'/users/@me/lists/'+encodeURIComponent(target.listId));
      if(list.id!==target.listId)throw fail(409,'선택한 Google 할 일 목록을 찾을 수 없어요.');
      const latest=await taskMoveAccess(userId,target.connectionId);
      if(latest.accountId!==record.accountId)throw fail(409,'Google 계정 연결이 바뀌었어요.');
      const todo=claim();if(!todo)return null;
      const body={title:todo.title,notes:todo.notes??'',status:todo.done?'completed':'needsAction',
        ...(todo.dueDate?{due:todo.dueDate+'T00:00:00.000Z'}:{})};
      const added=await providerRequest(origin+'/lists/'+encodeURIComponent(target.listId)+'/tasks',{
        method:'POST',headers:{Authorization:'Bearer '+latest.accessToken,'Content-Type':'application/json'},body:JSON.stringify(body),
      });
      if(typeof added.id!=='string'||!added.id||added.id.length>512||added.id.includes(':'))throw fail(502,'Google 할 일 저장 결과를 확인해주세요.');
      return {provider:'google',externalId:record.connectionId+':tasks:'+target.listId+':'+added.id,connectionId:record.connectionId,listId:target.listId,listTitle:title(list.title,'Google Tasks')};
    },
    async moveTaskBetweenLists(userId,{connectionId,listId,taskId},destination){
      const record=await taskMoveAccess(userId,connectionId);
      const origin='https://tasks.googleapis.com/tasks/v1';
      const taskPath=list=>origin+'/lists/'+encodeURIComponent(list)+'/tasks/'+encodeURIComponent(taskId);
      const target=await googleRead(userId,record,origin+'/users/@me/lists/'+encodeURIComponent(destination));
      if(target.id!==destination)throw fail(409,'이동할 Google 할 일 목록을 찾을 수 없어요.');
      const label=title(target.title,'할 일 목록');
      async function movedAlready(){
        const actual=await googleRead(userId,record,taskPath(destination));
        if(actual.id!==taskId||actual.deleted)throw fail(409,'이동한 할 일을 확인하지 못했어요.');
        return {id:actual.id,title:label};
      }
      try{const task=await googleRead(userId,record,taskPath(listId));if(task.id!==taskId||task.deleted||task.status==='completed')throw fail(409,'미완료 상태의 원본 할 일을 확인해주세요.');}
      catch(error){if(error.status!==404&&error.status!==410)throw error;return movedAlready();}
      const current=await taskMoveAccess(userId,connectionId);
      if(current.accountId!==record.accountId)throw fail(409,'Google 계정 연결이 바뀌었어요.');
      try{
        const result=await providerRequest(taskPath(listId)+'/move?'+new URLSearchParams({destinationTasklist:destination}),{method:'POST',headers:{Authorization:'Bearer '+current.accessToken}});
        return {id:result.id,title:label};
      }catch(error){
        if(error.status!==502)throw error;
        try{return await movedAlready();}
        catch{throw fail(502,'Google에서 이동했는지 확인 중이에요. 원본 목록을 확인해주세요.');}
      }
    },
    async originalLink(userId,todo){
      const source=todo.source;if(!source)return null;
      const external=source.externalId;
      if(source.provider==='slack'){
        const m=/^(?:[^:]+:)?message:([^:]+):(\d+\.\d+)$/.exec(external);if(!m)return null;
        const record=await token(userId,'slack');if(!record.features.includes('messages'))throw fail(403,'Slack 메시지 읽기 권한을 확인해주세요.');
        const value=await providerRequest('https://slack.com/api/chat.getPermalink?'+new URLSearchParams({channel:m[1],message_ts:m[2]}),{headers:{Authorization:'Bearer '+record.accessToken}});return value.permalink??null;
      }
      if(source.provider==='google'){
        const m=/^([^:]+):(tasks|calendar|calendar2|gmail|drive):(.+)$/.exec(external);if(!m)return null;
        const record=await token(userId,'google',m[1]==='legacy'?undefined:m[1]),headers={Authorization:'Bearer '+record.accessToken};
        if(m[2]==='tasks'&&record.features.some(f=>['tasks','tasksWrite'].includes(f))){const parts=m[3].split(':');if(parts.length!==2)return null;const item=await providerRequest('https://tasks.googleapis.com/tasks/v1/lists/'+encodeURIComponent(parts[0])+'/tasks/'+encodeURIComponent(parts[1]),{headers});return item.webViewLink??null;}
        if(['calendar','calendar2'].includes(m[2])&&record.features.some(f=>['calendar','calendarWrite'].includes(f))){const locator=store.importedSourceLocator(userId,todo.id)??source,calendarId=locator.calendarId??(m[2]==='calendar'?'primary':null),eventId=locator.eventId??(m[2]==='calendar'?m[3]:null);if(!calendarId||!eventId)return null;const item=await providerRequest('https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events/'+encodeURIComponent(eventId),{headers});return item.htmlLink??null;}
        if(m[2]==='gmail'&&record.features.includes('gmail'))return 'https://mail.google.com/mail/?'+new URLSearchParams({authuser:record.label??''})+'#all/'+encodeURIComponent(m[3]);
        if(m[2]==='drive'&&record.features.includes('drive')){const item=await providerRequest('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(m[3])+'?fields=webViewLink',{headers});return item.webViewLink??null;}
      }
      if(source.provider==='notion'&&/^(?:[^:]+:)?page:/.test(external)){const record=await token(userId,'notion');if(!record.features.includes('pages'))return null;const page=await providerRequest('https://api.notion.com/v1/pages/'+encodeURIComponent(external.slice(external.indexOf('page:')+5)),{headers:{Authorization:'Bearer '+record.accessToken,'Notion-Version':'2022-06-28'}});return page.url??null;}
      return null;
    },
    status(userId,snapshot) { return Object.entries(definitions).map(([provider, definition]) => { const config = settings(provider), connection = snapshot?snapshot[provider]?.[0]??null:store.connection(userId, provider); return { provider, name: definition.name, configured: config.configured, connected: !!connection, label: connection?.label ?? null, features: connection?.features ?? [], availableFeatures: definition.features, taskSyncEnabled: !!connection?.taskSyncEnabled, updatedAt: connection?.updatedAt ?? null,...(provider==='google'?{accounts:(snapshot?.google??googleAccounts(store,userId)).map(r=>({connectionId:r.connectionId,label:r.label,features:r.features,taskSyncEnabled:!!r.taskSyncEnabled,updatedAt:r.updatedAt}))}:{}) }; }); },
    start(userId, provider, features, native = false, options={}) {
      const config = settings(provider); if (!config.configured) throw fail(503, '관리자가 이 서비스의 OAuth 앱을 등록하면 연결할 수 있어요.');
      if (!store.account(userId)?.emailVerified) throw fail(403, '이메일 인증을 먼저 완료해주세요.');
      let selected = provider === 'google' || (Array.isArray(features) && features.length) ? features : config.features.filter(f=>readFeatures.includes(f));
      if (!Array.isArray(selected) || !selected.length || selected.some(feature => !config.features.includes(feature))) throw fail(400, '연결할 기능을 선택해주세요.');
      if(provider==='google'){const dependencies={tasksWrite:'tasks',gmailModify:'gmail',gmailSend:'gmail',calendarWrite:'calendar',driveContent:'drive',driveWrite:'drive'};selected=[...new Set([...selected,...selected.flatMap(f=>dependencies[f]?[dependencies[f]]:[])])];}
      if(provider==='slack'&&selected.includes('messagesWrite'))selected=[...new Set([...selected,'channels','messages'])];
      if(provider==='notion'&&selected.includes('pagesWrite'))selected=[...new Set([...selected,'pages'])];
      if(options.mode!==undefined&&!['add','reauthorize'].includes(options.mode))throw fail(400,'계정 연결 방법을 확인해주세요.');
      if(options.connectionId&&!googleConnection(store,userId,options.connectionId))throw fail(409,'Google 연결을 다시 확인해주세요.');
      const verifier = randomBytes(32).toString('base64url');
      const state = store.createOAuthState(userId, provider, { verifier, features: [...new Set(selected)], native,...(provider==='google'?{mode:options.mode,expectedConnectionId:options.connectionId}: {}) });
      const url = new URL(config.auth); url.searchParams.set('client_id', config.clientId); url.searchParams.set('redirect_uri', config.callback); url.searchParams.set('response_type', 'code'); url.searchParams.set('state', state);
      if (provider === 'google') { url.searchParams.set('scope', ['openid','email',...selected.map(feature => googleScopes[feature])].join(' ')); url.searchParams.set('access_type', 'offline'); url.searchParams.set('prompt', 'consent select_account'); url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url')); url.searchParams.set('code_challenge_method', 'S256'); }
      if(provider==='slack'&&selected.includes('assistantContact'))url.searchParams.set('scope','chat:write,im:write,im:history,app_mentions:read,files:read');
      if (provider === 'slack') url.searchParams.set('user_scope', 'channels:read,channels:history,groups:read,groups:history,im:read,im:history,mpim:read,mpim:history,search:read'+(selected.includes('messagesWrite')?',chat:write':''));
      if (provider === 'notion') url.searchParams.set('owner', 'user');
      return { url: url.toString() };
    },
    async callback(provider, query) {
      const state = store.consumeOAuthState(provider, query.get('state'));
      if (!state || !store.account(state.userId)) throw fail(400, '연결 요청이 만료됐어요. 앱에서 다시 시작해주세요.');
      if (query.get('error') || !query.get('code')) throw fail(400, '서비스 연결이 취소됐어요.');
      const config = settings(provider);
      let value = await exchange(provider, { code: query.get('code'), redirect_uri: config.callback, ...(provider === 'slack' ? {} : { grant_type: 'authorization_code' }), ...(provider === 'google' ? { code_verifier: state.verifier } : {}) });
      if(provider==='slack'&&value.authed_user?.access_token)value={...value,botAccessToken:value.access_token,botRefreshToken:value.refresh_token,botExpiresAt:expiresAt(value.expires_in),botScope:value.scope,access_token:value.authed_user.access_token,refresh_token:value.authed_user.refresh_token,expires_in:value.authed_user.expires_in,scope:value.authed_user.scope,slackUserId:value.authed_user.id,tokenType:'user'};
      if (typeof value.access_token !== 'string' || !value.access_token) throw fail(502, '외부 서비스 인증 응답을 확인해주세요.');
      let previous = store.connection(state.userId, provider);
      let accountId, label;
      if(provider==='google'){const profile=await providerRequest('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:'Bearer '+value.access_token}});if(typeof profile.sub!=='string')throw fail(502,'Google 계정을 확인하지 못했어요.');accountId=profile.sub;label=typeof profile.email==='string'?profile.email:'Google 계정';}
      else if(provider==='slack'){accountId=value.team?.id;label=title(value.team?.name,'Slack 워크스페이스');}
      else{accountId=value.workspace_id;label=title(value.workspace_name,'Notion 워크스페이스');}
      if(provider==='google'){if(state.expectedConnectionId){const expected=googleConnection(store,state.userId,state.expectedConnectionId);if(expected?.accountId!==accountId)throw fail(409,'선택한 계정으로 다시 승인해주세요. 다른 계정은 계정 추가에서 연결할 수 있어요.');}if(state.mode)previous=googleAccounts(store,state.userId).find(r=>r.accountId===accountId)??null;}
      const features = provider === 'google' && typeof value.scope === 'string' ? state.features.filter(feature => {const scopes=value.scope.split(' ');return scopes.includes(googleScopes[feature])||(feature==='tasks'&&scopes.includes(googleScopes.tasksWrite))||(feature==='gmail'&&scopes.includes(googleScopes.gmailModify))||(feature==='calendar'&&scopes.includes(googleScopes.calendarWrite))||(feature==='drive'&&scopes.includes(googleScopes.driveContent));}) : provider==='google'?state.features.filter(f=>readFeatures.includes(f)):state.features;
      if(provider==='slack'&&(typeof value.scope!=='string'||!value.scope.split(',').includes('chat:write'))){const i=features.indexOf('messagesWrite');if(i>=0)features.splice(i,1);}
      if(provider==='slack'&&value.tokenType==='user'){const scopes=new Set((value.scope??'').split(','));for(const feature of [...features])if(feature==='channels'&&!scopes.has('channels:read')||feature==='messages'&&!scopes.has('channels:history'))features.splice(features.indexOf(feature),1);}
      if(provider==='slack'&&features.includes('assistantContact')&&(!value.botAccessToken||!value.bot_user_id||!String(value.botScope??'').split(',').includes('chat:write')))features.splice(features.indexOf('assistantContact'),1);
      if (!features.length) throw fail(403, '선택한 정보에 대한 읽기 권한이 승인되지 않았어요.');
      const connectionId=accountId && previous?.accountId===accountId && (provider!=='slack'||previous.slackUserId===(value.slackUserId??value.authed_user?.id??null)) ? previous.connectionId : randomUUID();
      if(!state.mode||previous)store.clearResourceCache(state.userId,provider,state.mode?previous?.connectionId:undefined);
      if(store.accountActive&&!store.accountActive(state.userId))throw fail(403,'이 계정은 이용이 정지되어 있어요.');
      const save=provider==='google'&&state.mode&&store.saveGoogleAccount?(payload,label)=>store.saveGoogleAccount(state.userId,payload,label):(payload,label)=>store.saveConnection(state.userId,provider,payload,label);
      save({ accessToken: value.access_token, refreshToken: value.refresh_token ?? (accountId && previous?.accountId===accountId ? previous.refreshToken : null) ?? null, expiresAt: expiresAt(value.expires_in), features, taskSyncEnabled: !!(features.includes('tasksWrite') && previous?.accountId===accountId && previous?.taskSyncEnabled), accountId:accountId??null,connectionId,...(provider==='slack'?{slackUserId:value.slackUserId??value.authed_user?.id??null,tokenType:value.tokenType??'bot',botUserId:value.bot_user_id??null,botAccessToken:value.botAccessToken??null,botRefreshToken:value.botRefreshToken??null,botExpiresAt:value.botExpiresAt??null}:{}) }, label);
      if(provider==='google'&&features.includes('calendarWrite'))store.wakeDocenGoogleDelivery?.(state.userId,connectionId);
      if(provider==='google'&&features.includes('tasksWrite'))store.todoDelivery?.resumeGoogle(state.userId,connectionId);
      return { native: state.native };
    },
    async resources(userId, provider, feature, channel, cursor, taskStatus = 'incomplete', month, connectionId) {
      if (!['incomplete', 'completed','sync'].includes(taskStatus)) throw fail(400, '조회할 완료 상태를 확인해주세요.');
      if (cursor && (typeof cursor !== 'string' || cursor.length > 3000)) throw fail(400, '페이지 정보를 확인해주세요.');
      const config = settings(provider); if (!readFeatures.includes(feature) || !config.features.includes(feature)) throw fail(400, '지원하지 않는 자료 종류예요.');
      const record = await token(userId, provider,connectionId); if (!record.features.includes(feature)) throw fail(403, '이 기능의 읽기 권한을 추가로 승인해주세요.');
      const headers = { Authorization: 'Bearer ' + record.accessToken }; let items = [], nextCursor = null;
      if (provider === 'google' && feature === 'calendar') {
        const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        if(month!=null&&(typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)))throw fail(400,'조회할 달을 확인해주세요.');
        const start=month?month+'-01':today;const end=month?new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5)),1)).toISOString().slice(0,10):new Date(Date.parse(today+'T00:00:00Z')+30*86400000).toISOString().slice(0,10);
        const query = new URLSearchParams({ timeMin:start+'T00:00:00+09:00',timeMax:end+'T00:00:00+09:00',timeZone:'Asia/Seoul',singleEvents:'true',orderBy:'startTime',maxResults:'50',...(cursor?{pageToken:cursor}:{}) });
        const value = await googleRead(userId,record,'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + query);
        items = (value.items ?? []).filter(item => item.status !== 'cancelled').map(item => ({ id: 'calendar:' + item.id, color:calendarEventColor(item.colorId), title: title(item.summary), url:item.htmlLink, dueDate: item.start?.date ?? (item.start?.dateTime ? new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.start.dateTime)) : null), kind: 'event',startAt:item.start?.dateTime??null,endAt:item.end?.dateTime??null,allDay:!!item.start?.date,endDate:item.end?.date??(item.end?.dateTime?new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.end.dateTime)):null) })); nextCursor = value.nextPageToken ?? null;
      }
      if (provider === 'google' && feature === 'tasks') {
        if (channel && (typeof channel !== 'string' || channel.length > 1024)) throw fail(400, '목록을 다시 선택해주세요.');
        const path = channel ? `lists/${encodeURIComponent(channel)}/tasks` : 'users/@me/lists';
        const query = new URLSearchParams({ maxResults: '50', ...(channel ? { showCompleted: taskStatus !== 'incomplete' ? 'true' : 'false', showHidden: taskStatus !== 'incomplete' ? 'true' : 'false', showDeleted: 'false' } : {}), ...(cursor ? { pageToken: cursor } : {}) });
        const value = await googleRead(userId,record,'https://tasks.googleapis.com/tasks/v1/' + path + '?' + query);
        items = (value.items ?? []).filter(item => !item.deleted && (!channel || taskStatus==='sync' || (taskStatus === 'completed' ? item.status === 'completed' : item.status !== 'completed'))).map(item => channel ? { id: `tasks:${channel}:${item.id}`, title: title(item.title), url:item.webViewLink, dueDate: item.due?.slice(0, 10) || null, kind: 'task', completed: item.status === 'completed', completedAt: item.completed ?? null,...(taskStatus==='sync'?{notes:(item.notes??'').slice(0,4000),modifiedAt:item.updated,listId:channel,connectionId:record.connectionId}: {}) } : { id: item.id, title: title(item.title), kind: 'tasklist' });
        nextCursor = value.nextPageToken ?? null;
      }
      if (provider === 'google' && feature === 'drive') {
        const value = await googleRead(userId,record,'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({ q: 'trashed=false', pageSize: '50', fields: 'nextPageToken,files(id,name)', orderBy: 'modifiedTime desc', ...(cursor ? { pageToken: cursor } : {}) }));
        items = (value.files ?? []).map(item => ({ id: 'drive:' + item.id, title: title(item.name), dueDate: null, kind: 'file' })); nextCursor = value.nextPageToken ?? null;
      }
      if (provider === 'google' && feature === 'gmail') {
        const value = await googleRead(userId,record,'https://gmail.googleapis.com/gmail/v1/users/me/messages?' + new URLSearchParams({ q: 'in:inbox newer_than:30d', maxResults: '20', ...(cursor ? { pageToken: cursor } : {}) }));
        const messages = value.messages ?? []; nextCursor = value.nextPageToken ?? null;
        for (let index = 0; index < messages.length; index += 4) { const batch = await Promise.all(messages.slice(index, index + 4).map(async item => { if (!/^[a-f0-9]+$/i.test(item.id)) throw fail(502, '메일 식별자를 읽을 수 없어요.'); const detail = await googleRead(userId,record,`https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=metadata&metadataHeaders=Subject`); return { id: 'gmail:' + item.id, title: title(detail.payload?.headers?.find(header => header.name.toLowerCase() === 'subject')?.value, '제목 없는 메일'), dueDate: null, kind: 'mail' }; })); items.push(...batch); }
      }
      if (provider === 'slack' && feature === 'channels') {
        const value = await providerRequest('https://slack.com/api/conversations.list?' + new URLSearchParams({ types:record.tokenType==='user'?'public_channel,private_channel,im,mpim':'public_channel,private_channel',exclude_archived:'true',limit:'50',...(cursor?{cursor}:{}) }), { headers }, true);
        items = (value.channels ?? []).map(item => ({ id: item.id, title: title(item.name,item.is_im?'개인 메시지':'대화'), kind: 'channel' })); nextCursor = value.response_metadata?.next_cursor || null;
      }
      if (provider === 'slack' && feature === 'messages') {
        if (typeof channel !== 'string' || !/^[CGD][A-Z0-9]{8,30}$/.test(channel)) throw fail(400, 'Slack 채널을 선택해주세요.');
        const value = await providerRequest('https://slack.com/api/conversations.history?' + new URLSearchParams({ channel, limit: '50', ...(cursor ? { cursor } : {}) }), { headers }, true);
        items = (value.messages ?? []).filter(item => typeof item.text === 'string' && item.text.trim()).map(item => ({ id: `message:${channel}:${item.ts}`, title: title(item.text), text:item.text.slice(0,8000), dueDate: null, kind: 'message' })); nextCursor = value.response_metadata?.next_cursor || null;
      }
      if (provider === 'notion') {
        const value = await providerRequest('https://api.notion.com/v1/search', { method: 'POST', headers: { ...headers, 'Notion-Version': '2025-09-03', 'Content-Type': 'application/json' }, body: JSON.stringify({ page_size: 50, ...(cursor ? { start_cursor: cursor } : {}), filter: { property: 'object', value: 'page' }, sort: { direction: 'descending', timestamp: 'last_edited_time' } }) });
        items = (value.results ?? []).map(item => { const property = Object.values(item.properties ?? {}).find(property => property.type === 'title'); return { id: 'page:' + item.id, title: title(property?.title?.map(part => part.plain_text ?? part.text?.content ?? '').join(''), '제목 없는 페이지'), dueDate: null, kind: 'page' }; }); nextCursor = value.next_cursor || null;
      }
      const latest=store.connection(userId,provider,record.connectionId);if(!latest||(provider==='google'&&record.connectionId?latest.connectionId!==record.connectionId||latest.accountId!==record.accountId||!latest.features.includes(feature):latest.accessToken!==record.accessToken))throw fail(409,'서비스 연결이 바뀌었어요. 다시 불러와주세요.');
      if(feature!=='channels' && !(feature==='tasks'&&!channel))items=items.map(item=>({...item,id:(record.connectionId??'legacy')+':'+item.id}));
      if (feature !== 'channels' && !(feature === 'tasks' && !channel)) store.cacheResources(userId, provider, items);
      return { items, hasMore: !!nextCursor, nextCursor, limit: feature === 'gmail' ? 20 : 50 };
    },
    naver,
    async inspect(user,operation,args){return operation.startsWith('naver.')?naver.inspect(user,operation,args):createProviderActions({store,token,request:providerRequest,googleRead}).inspect(user,operation,args);},
    async execute(user,operation,args,preview,actionId,guard=()=>true){const active=()=>guard()&&(!store.accountActive||store.accountActive(user));return operation.startsWith('naver.')?naver.execute(user,operation,args,preview,actionId,active):createProviderActions({store,token,request:providerRequest,googleRead}).execute(user,operation,args,preview,actionId,active);},
    async searchDocuments(userId,provider,query,connectionId){
      if(!['google','notion'].includes(provider)||typeof query!=='string'||!query.trim()||query.length>120)throw fail(400,'문서 검색어를 확인해주세요.');
      const record=await token(userId,provider,connectionId),headers={Authorization:'Bearer '+record.accessToken};let value,items;
      if(provider==='notion'){
        if(!record.features.includes('pages'))throw fail(403,'Notion 읽기 권한이 필요해요.');
        value=await providerRequest('https://api.notion.com/v1/search',{method:'POST',headers:{...headers,'Notion-Version':'2025-09-03','Content-Type':'application/json'},body:JSON.stringify({query:query.trim(),page_size:10,filter:{value:'page',property:'object'}})});
        items=(value.results??[]).map(page=>({id:(record.connectionId??'legacy')+':page:'+page.id,title:Object.values(page.properties??{}).filter(p=>p.type==='title').flatMap(p=>p.title??[]).map(t=>t.plain_text??t.text?.content??'').join('')||'Notion 문서',url:page.url}));
      }else{
        if(!record.features.includes('drive'))throw fail(403,'Drive 목록 읽기 권한이 필요해요.');
        const escaped=query.trim().replace(/\\/g,'\\\\').replace(/'/g,"\\'");
        value=await providerRequest('https://www.googleapis.com/drive/v3/files?'+new URLSearchParams({q:"trashed=false and (name contains '"+escaped+"')",pageSize:'10',fields:'nextPageToken,files(id,name,webViewLink)',orderBy:'modifiedTime desc'}),{headers});
        items=(value.files??[]).map(file=>({id:(record.connectionId??'legacy')+':drive:'+file.id,title:file.name,url:file.webViewLink}));
      }
      if(store.connection(userId,provider,record.connectionId)?.connectionId!==record.connectionId)throw fail(409,'연결이 바뀌었어요.');
      return {items,partial:!!(value.has_more||value.nextPageToken),canReadBody:provider==='notion'||record.features.includes('driveContent')};
    },
    async readChangedNotionPage(userId,connectionId,id){const record=await token(userId,'notion');if(record.connectionId!==connectionId||!record.features.includes('pages'))throw fail(409,'문서 연결이 바뀌었어요.');const page=await providerRequest('https://api.notion.com/v1/pages/'+encodeURIComponent(id),{headers:{Authorization:'Bearer '+record.accessToken,'Notion-Version':'2025-09-03'}});if(page.archived||page.in_trash)throw fail(404,'삭제한 문서예요.');const result=await this.readSource(userId,'notion',connectionId+':page:'+id);return {...result,title:title(Object.values(page.properties??{}).find(p=>p.type==='title')?.title?.map(t=>t.plain_text??t.text?.content??'').join(''),'Notion 문서')};},
    async readSource(userId,provider,id) {
      const selected=provider==='google'?googleAccounts(store,userId).find(r=>id.startsWith((r.connectionId??'legacy')+':')):null;const record=await token(userId,provider,selected?.connectionId);const prefix=(record.connectionId??'legacy')+':';if(!id.startsWith(prefix))throw fail(409,'연결한 계정이 바뀌었어요.');const source=id.slice(prefix.length);const headers={Authorization:'Bearer '+record.accessToken};let result;
      if(provider==='google'&&source.startsWith('gmail:')&&record.features.includes('gmail')){const v=await providerRequest('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(source.slice(6))+'?format=full',{headers});const recipients=(v.payload?.headers??[]).filter(h=>['to','cc'].includes(h.name.toLowerCase())).map(h=>h.value).join(', ').slice(0,1000);result={text:mailText(v),recipients,title:v.payload?.headers?.find(h=>h.name.toLowerCase()==='subject')?.value??'메일',id:source.slice(6)};}
      else if(provider==='google'&&source.startsWith('drive:')&&record.features.includes('driveContent')){const file=await providerRequest('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(source.slice(6))+'?fields=id,name,description,mimeType',{headers});let text=file.description??'';if(['application/vnd.google-apps.document','application/vnd.google-apps.spreadsheet','application/vnd.google-apps.presentation'].includes(file.mimeType)){
        let document=await this.readAgentSource(userId,{provider:'google',id:(record.connectionId??'legacy')+':'+source});
        if(document.sheets){const parts=[];for(const sheet of document.sheets.slice(0,3)){const range="'"+sheet.name.replaceAll("'","''")+"'!A1:Z200",part=await this.readAgentSource(userId,{provider:'google',id:(record.connectionId??'legacy')+':'+source,range});parts.push(sheet.name+'\n'+part.text);}document={...document,text:parts.join('\n\n'),partial:true,notice:'시트 본문 일부를 읽었어요. 필요한 범위는 자료 읽기 도구로 이어 확인할 수 있어요.'};}
        return {...document,id:source.slice(6),title:file.name};
       }if(['text/plain','application/vnd.google-apps.document'].includes(file.mimeType)){const path=file.mimeType==='text/plain'?'/'+encodeURIComponent(source.slice(6))+'?alt=media':'/'+encodeURIComponent(source.slice(6))+'/export?mimeType=text%2Fplain';const response=await fetcher('https://www.googleapis.com/drive/v3/files'+path,{headers,signal:AbortSignal.timeout(10000)});if(!response.ok)throw fail(502,'파일 본문을 읽지 못했어요.');const reader=response.body.getReader();const chunks=[];let size=0;try{while(size<32000){const part=await reader.read();if(part.done)break;chunks.push(Buffer.from(part.value).subarray(0,32000-size));size+=part.value.length;}}finally{await reader.cancel();}text=Buffer.concat(chunks).toString('utf8');}result={id:source.slice(6),title:file.name,text:text.slice(0,8000),partial:true,notice:'일반 텍스트·Google 문서는 본문 일부, 다른 파일은 설명만 조회해요.'};}
      else if(provider==='notion'&&source.startsWith('page:')&&record.features.includes('pages')){result=await readNotionDocument((block,cursor)=>providerRequest('https://api.notion.com/v1/blocks/'+encodeURIComponent(block)+'/children?'+new URLSearchParams({page_size:'50',...(cursor?{start_cursor:cursor}:{})}),{headers:{...headers,'Notion-Version':'2025-09-03'}}),source.slice(5));}
      else throw fail(400,'이 자료의 상세 읽기는 지원되지 않거나 추가 권한이 필요해요.');
      if(store.connection(userId,provider,record.connectionId)?.connectionId!==record.connectionId)throw fail(409,'연결한 계정이 바뀌었어요.');return result;
    },
    async googleTask(userId,todo,desired,guard=()=>true) {
      const selected=googleAccounts(store,userId).find(r=>todo.source?.externalId?.startsWith((r.connectionId??'legacy')+':tasks:'));const record=await token(userId,'google',selected?.connectionId);
      if(!record.taskSyncEnabled||!record.features.includes('tasksWrite'))throw fail(403,'완료 동기화를 켜고 Google Tasks 수정 권한을 승인해주세요.');
      const prefix=(record.connectionId??'legacy')+':tasks:';
      if(todo.source?.provider!=='google'||!todo.source.externalId.startsWith(prefix))throw fail(409,'가져온 Google 계정이 달라요.');
      const parts=todo.source.externalId.slice(prefix.length).split(':');
      if(parts.length!==2||parts.some(value=>!value))throw fail(409,'원본 할 일 식별자를 확인할 수 없어요.');
      const url='https://www.googleapis.com/tasks/v1/lists/'+encodeURIComponent(parts[0])+'/tasks/'+encodeURIComponent(parts[1]);
      const current=await googleRead(userId,record,url);
      const renewed=await token(userId,'google',record.connectionId);
      if(renewed.accountId!==record.accountId)throw fail(409,'Google 계정 연결이 바뀌었어요.');
      const headers={Authorization:'Bearer '+renewed.accessToken};
      if(current.deleted)throw fail(409,'Google에서 삭제된 할 일이에요.');
      const stillConnected=()=>{if(store.accountActive&&!store.accountActive(userId))return false;const latest=store.connection(userId,'google',record.connectionId);return latest?.taskSyncEnabled&&latest.connectionId===record.connectionId&&latest.accessToken===renewed.accessToken;};
      if(!guard())throw fail(409,'더 최신 변경이 있어 이전 동기화를 멈췄어요.');
      if(!stillConnected())throw fail(409,'서비스 연결 또는 동기화 설정이 바뀌었어요.');
      if(desired===undefined||!!(current.status==='completed')===desired)return current;
      if(!current.etag)throw fail(409,'원본 버전을 확인할 수 없어 자동 수정을 멈췄어요.');
      let response;
      try{response=await fetcher(url,{method:'PATCH',headers:{...headers,'Content-Type':'application/json','If-Match':current.etag},body:JSON.stringify({status:desired?'completed':'needsAction',...(desired?{}:{completed:null})}),signal:AbortSignal.timeout(10000)});}catch{throw fail(502,'Google 응답이 늦어요. 다시 시도할게요.');}
      if(response.status===412)throw fail(409,'원본이 동시에 바뀌었어요. Google 상태를 다시 읽어주세요.');
      if(!response.ok)throw fail(response.status===401||response.status===403?409:502,'Google 완료 상태를 저장하지 못했어요. 권한과 연결을 확인해주세요.');
      return await response.json();
    },
    async diagnose(userId,provider,connectionId) {
      const record=await token(userId,provider,connectionId);
      const headers={Authorization:'Bearer '+record.accessToken};
      let checks;
      if(provider==='google'){
        const probes = [
          {key:'calendar', label:'Google Calendar', enabled:record.features.some(feature=>['calendar','calendarWrite'].includes(feature)),
            url:'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=1'},
          {key:'tasks', label:'Google Tasks', enabled:record.features.some(feature=>['tasks','tasksWrite'].includes(feature)),
            url:'https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=1'},
        ];
        if(!probes.some(probe=>probe.enabled)){
          await googleRead(userId,record,'https://openidconnect.googleapis.com/v1/userinfo');
        }
        checks=Object.fromEntries(await Promise.all(probes.map(async ({key,label,enabled,url})=>{
          if(!enabled)return [key,'not-authorized'];
          try{await googleRead(userId,record,url);return [key,'ready'];}
          catch(error){
            if(error.code==='integration-reauthorization')throw error;
            throw fail(error.status??502,label+' · '+error.message);
          }
        })));
      }
      if(provider==='slack')await providerRequest('https://slack.com/api/auth.test',{headers},true);
      if(provider==='notion')await providerRequest('https://api.notion.com/v1/users/me',{headers:{...headers,'Notion-Version':'2025-09-03'}});
      const latest=store.connection(userId,provider,record.connectionId);
      if(!latest||latest.accountId!==record.accountId||JSON.stringify(latest.features)!==JSON.stringify(record.features)
        ||provider!=='google'&&latest.accessToken!==record.accessToken)throw fail(409,'서비스 연결이 바뀌었어요. 다시 확인해주세요.');
      return {ok:true,checkedAt:new Date().toISOString(),...(checks?{checks}:{})};
    },
    async searchTasks(userId, query, connectionId) {
      if (typeof query !== 'string' || !query.trim() || query.length > 120) throw fail(400, '검색어를 120자 이내로 입력해주세요.');
      const normalize = value => value.normalize('NFKC').toLocaleLowerCase('ko-KR');
      const words = normalize(query).trim().split(/\s+/);
      const lists = await this.resources(userId, 'google', 'tasks',null,null,'incomplete',undefined,connectionId);
      const connection = googleConnection(store,userId,connectionId);
      const selected = lists.items.slice(0, 5);
      const pages = await Promise.all(selected.flatMap(list => ['incomplete', 'completed'].map(async status => ({ list, page: await this.resources(userId, 'google', 'tasks', list.id, undefined, status,undefined,connectionId) }))));
      const latest = store.connection(userId, 'google',connection?.connectionId);
      if (!latest || latest.connectionId !== connection?.connectionId || latest.accessToken !== connection?.accessToken) throw fail(409, '서비스 연결이 바뀌었어요. 다시 찾아주세요.');
      const matches = pages.flatMap(({list, page}) => page.items.filter(item => words.every(word => normalize(item.title).includes(word))).map(item => ({ ...item, listTitle: list.title })));
      return { items: [...new Map(matches.map(item => [item.id, item])).values()], partial: lists.hasMore || lists.items.length > 5 || pages.some(({page}) => page.hasMore), searchedLists: selected.length };
    },
    import(userId, provider, ids) { settings(provider); if (!store.connection(userId, provider)) throw fail(409, '서비스를 먼저 연결해주세요.'); if (!Array.isArray(ids) || !ids.length || ids.length > 20 || ids.some(id => typeof id !== 'string' || id.length > 1200)) throw fail(400, '최대 20개의 자료를 선택해주세요.'); return store.importResources(userId, provider, [...new Set(ids)]); },
    async disconnect(userId, provider,connectionId) {
      if(provider==='naver')return naver.disconnect(userId);
      if(provider==='google'&&!connectionId){store.invalidateOAuthStates?.(userId,provider);const results=[];for(const r of googleAccounts(store,userId))results.push(await this.disconnect(userId,provider,r.connectionId));return {revoked:results.every(r=>r.revoked)};}
      const record = provider==='google'?googleConnection(store,userId,connectionId):store.connection(userId, provider); if (!record) return { revoked: true };
      if(provider==='google')store.invalidateOAuthStates?.(userId,provider,record.connectionId);
      store.cancelAssistantWatches?.(userId,record.connectionId);
      const config = settings(provider); let revoked = false;
      try {
        if (provider === 'google') { const response = await fetcher('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: record.refreshToken ?? record.accessToken }), signal: AbortSignal.timeout(5000) }); revoked = response.ok; }
        if (provider === 'slack') { await providerRequest('https://slack.com/api/auth.revoke', { method: 'POST', headers: { Authorization: 'Bearer ' + record.accessToken, 'Content-Type': 'application/x-www-form-urlencoded' }, body: '' }, true); revoked = true; }
        if (provider === 'notion') { await providerRequest('https://api.notion.com/v1/oauth/revoke', { method: 'POST', headers: { Authorization: 'Basic ' + (config.basicAuth || Buffer.from(config.clientId + ':' + config.clientSecret).toString('base64')), 'Content-Type': 'application/json' }, body: JSON.stringify({ token: record.accessToken }) }); revoked = true; }
      } catch {} finally { const latest=store.connection(userId,provider,record.connectionId);if(latest?.accessToken===record.accessToken)store.removeConnection(userId, provider,provider==='google'?record.connectionId:undefined); }
      return { revoked };
    },
    async calendarDetails(userId,input){return createCalendarWorkspace({store,token,read:googleRead}).saveDetails(userId,input);},
    async calendarEvent(userId,input){return createCalendarWorkspace({store,token,read:googleRead}).event(userId,input);},
    async reconcileDocenGoogleCalendar(user,id,revision){
      const {local,target}=store.linkedDocenCalendar(user,id,revision);
      const selected=calendarAccount(store,user,target.calendarId,target.connectionId);
      const record=await token(user,'google',selected.connectionId);
      if(record.connectionId!==target.connectionId||!record.features.includes('calendarWrite'))throw fail(403,'Google 캘린더 쓰기 권한이 필요해요.');
      const path='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(selected.calendarId)+'/events/'+encodeURIComponent(target.externalEventId);
      const fingerprint=fields=>createHash('sha256').update(JSON.stringify(calendarSyncFields(fields))).digest('hex');
      const snapshot=value=>{
        if(value.id!==target.externalEventId||value.status==='cancelled'||value.extendedProperties?.private?.docenEvent!==target.externalEventId
          ||value.recurringEventId||value.recurrence?.length||!value.etag||value.locked)throw fail(409,'연결된 Google 원본을 확인해주세요.');
        const fields={title:value.summary??'제목 없음',notes:value.description??'',allDay:!!value.start?.date,
          startDate:value.start?.date,endDate:value.end?.date,start:value.start?.dateTime,end:value.end?.dateTime};
        const tags=value.extendedProperties.private;
        const echoRevision=tags.docenSyncDigest===fingerprint(fields)?Number(tags.docenSyncRevision):undefined;
        return {id:value.id,version:value.etag,updatedAt:value.updated,fields,echoRevision,extendedProperties:value.extendedProperties};
      };
      const confirmDeletion=async()=>{
        // Google can return 404 when the whole calendar is inaccessible. Confirm the
        // same connected account still has access before treating an event as absent.
        const calendar=await googleRead(user,record,'https://www.googleapis.com/calendar/v3/users/me/calendarList/'+encodeURIComponent(selected.calendarId));
        const current=store.connection(user,'google',record.connectionId);
        if(!['owner','writer'].includes(calendar.accessRole)||current?.accountId!==record.accountId||
          current?.connectionId!==record.connectionId||!current?.features.includes('calendarWrite'))throw fail(409,'연결된 Google 캘린더를 확인해주세요.');
        return store.reconcileMissingCalendarOriginal(user,id,revision,'google',{id:target.externalEventId,calendarId:target.calendarId,connectionId:record.connectionId});
      };
      let value;
      try{value=await googleRead(user,record,path);}
      catch(error){if(error.status===404||error.status===410)return confirmDeletion();throw error;}
      if(value.id===target.externalEventId&&value.status==='cancelled')return confirmDeletion();
      const original=snapshot(value);
      const result=store.reconcileDocenCalendar(user,id,revision,original,'google');
      if(result.action!=='push')return result;
      const {args}=local,current=await token(user,'google',selected.connectionId);
      if(current.accountId!==record.accountId||!current.features.includes('calendarWrite'))throw fail(409,'Google 연결이 바뀌었어요.');
      store.linkedDocenCalendar(user,id,revision);
      const saved=await providerRequest(path+'?sendUpdates=none',{method:'PATCH',headers:{
        Authorization:'Bearer '+current.accessToken,'Content-Type':'application/json','If-Match':original.version,
      },body:JSON.stringify({summary:args.title,description:args.notes??'',
        extendedProperties:{...original.extendedProperties,private:{...original.extendedProperties.private,
          docenSyncRevision:String(revision),docenSyncDigest:fingerprint(args)}},
        start:args.allDay?{date:args.startDate}:{dateTime:args.start,timeZone:args.timeZone},
        end:args.allDay?{date:args.endDate}:{dateTime:args.end,timeZone:args.timeZone},
      })});
      return store.reconcileDocenCalendar(user,id,revision,snapshot(saved),'google',true);
    },
    async deliverDocenCalendar(job,retryAuth=true){
      const {user,id,target,args}=job,selected=calendarAccount(store,user,target.calendarId,target.connectionId);
      const record=await token(user,'google',selected.connectionId);
      if(record.connectionId!==target.connectionId||!record.features.includes('calendarWrite'))throw fail(403,'Google 캘린더 쓰기 권한이 필요해요.');
      const remoteId=createHash('sha256').update(user+':'+id).digest('hex');
      const collection='https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(selected.calendarId)+'/events';
      const lookup=async()=>{
       try{return await googleRead(user,record,collection+'/'+remoteId);}
       catch(error){if(error.status===404||job.removing&&error.status===410)return null;throw error;}
      };
      if(job.removing){
       const existing=await lookup();
       if(!existing||existing.status==='cancelled')return remoteId;
       if(existing.extendedProperties?.private?.docenEvent!==remoteId||!existing.etag)throw fail(409,'기존 원본 일정을 확인해주세요.');
       const current=await token(user,'google',target.connectionId);
       try{
        await providerRequest(collection+'/'+remoteId+'?sendUpdates='+(existing.attendees?.length?'all':'none'),{method:'DELETE',headers:{Authorization:'Bearer '+current.accessToken,'If-Match':existing.etag}});
       }catch(error){
        if(error.status===404||error.status===410)return remoteId;
        if(error.status===409)throw fail(502,'원본이 갱신되어 삭제를 다시 시도해요.');
        if(!retryAuth||error.code!=='integration-reauthorization')throw error;
        await token(user,'google',target.connectionId,current.accessToken);
        return this.deliverDocenCalendar(job,false);
       }
       return remoteId;
      }
      const existing=job.attempt>1||!retryAuth?await lookup():null;
      if(existing){
       if(existing.status==='cancelled'||existing.extendedProperties?.private?.docenEvent!==remoteId)throw fail(409,'기존 원본 일정을 확인해주세요.');
       return existing.id;
      }
      const current=await token(user,'google',target.connectionId);
      if(current.connectionId!==target.connectionId||!current.features.includes('calendarWrite'))throw fail(403,'Google 캘린더 쓰기 권한이 필요해요.');
      const body={id:remoteId,summary:args.title,description:args.notes??'',extendedProperties:{private:{docenEvent:remoteId}},
       start:args.allDay?{date:args.startDate}:{dateTime:args.start,timeZone:args.timeZone},end:args.allDay?{date:args.endDate}:{dateTime:args.end,timeZone:args.timeZone},
       ...(args.recurrence?{recurrence:args.recurrence}:{}),...(args.attendees?{attendees:args.attendees.map(email=>({email}))}:{})};
      let result;
      try{result=await providerRequest(collection+'?sendUpdates='+(args.attendees?.length?'all':'none'),{method:'POST',headers:{Authorization:'Bearer '+current.accessToken,'Content-Type':'application/json'},body:JSON.stringify(body)});}
      catch(error){
       if(error.status===409){
        const saved=await lookup();
        if(saved?.status!=='cancelled'&&saved?.extendedProperties?.private?.docenEvent===remoteId)return remoteId;
       }
       if(!retryAuth||error.code!=='integration-reauthorization')throw error;
       await token(user,'google',target.connectionId,current.accessToken);
       return this.deliverDocenCalendar(job,false);
      }
      if(result.id!==remoteId)throw fail(502,'원본 일정 번호를 확인하지 못했어요.');
      return remoteId;
    },
    async calendarReminders(userId){return createCalendarWorkspace({store,token,read:googleRead}).reminders(userId);},
    async calendarList(userId,cursor){return createCalendarWorkspace({store,token,read:googleRead}).calendars(userId,cursor);},
    async calendar(userId,month,cursor,options) { if(options)return createCalendarWorkspace({store,token,read:googleRead}).events(userId,month,cursor,options); const record=store.connection(userId,'google');if(!record?.features.includes('calendar'))return month?{items:[],nextCursor:null}:[];const result=await this.resources(userId,'google','calendar',null,cursor,'incomplete',month);return month?result:result.items; },
  };
}
