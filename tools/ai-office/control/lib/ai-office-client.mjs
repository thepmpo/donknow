import {readFile} from 'node:fs/promises';
export function parseOfficeConfig(text){return Object.fromEntries(text.split(/\r?\n/).filter(line=>line&&!line.trimStart().startsWith('#')&&line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));}
export function officeOrigin(value){const u=new URL(value);if(!['127.0.0.1','localhost','[::1]'].includes(u.hostname)||u.protocol!=='http:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw Error('office_loopback_origin_required');return u.origin;}
export async function createOfficeClient({config,baseUrl=process.env.AI_OFFICE_API_URL??'http://127.0.0.1:8790',runtimePath=process.env.AI_OFFICE_RUNTIME_PATH??'/workspace/ai-office-runtime',fetcher=fetch}={}){
 const base=officeOrigin(baseUrl),privateConfig=config??parseOfficeConfig(await readFile(runtimePath+'/.env','utf8'));let session;
 async function request(endpoint,method='GET',body,{owner=false}={}){
  if(!endpoint.startsWith('/api/')||endpoint.includes('://')||endpoint.startsWith('//'))throw Error('office_local_api_path_required');
  const headers={'content-type':'application/json',...(privateConfig.API_AUTH_TOKEN?{authorization:'Bearer '+privateConfig.API_AUTH_TOKEN}:{})};
  if(!session){const r=await fetcher(base+'/api/auth/session',{headers,signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error('office_session_unavailable_'+r.status);session={csrf:(await r.json()).csrf_token,cookie:r.headers.get('set-cookie')?.split(';')[0]};}
  if(session.csrf)headers['x-csrf-token']=session.csrf;if(session.cookie)headers.cookie=session.cookie;
  if(owner){if(!privateConfig.AI_OFFICE_OWNER_KEY)throw Error('office_owner_not_configured');headers['x-office-owner-key']=privateConfig.AI_OFFICE_OWNER_KEY;}
  const r=await fetcher(base+endpoint,{method,headers,signal:AbortSignal.timeout(15000),...(body!==undefined?{body:JSON.stringify(body)}:{})});let result;try{result=await r.json();}catch{throw Error('office_invalid_response_'+r.status);}
  if(!r.ok){const code=typeof result.error==='string'&&/^[a-z0-9_]{1,100}$/.test(result.error)?result.error:'request_failed';throw Object.assign(Error('office_'+r.status+':'+code),{code,status:r.status});}return result;
 }
 const settings={runtimePath,providerHome:privateConfig.AI_OFFICE_PROVIDER_AUTH_DIR,runnerBundle:privateConfig.AI_OFFICE_CODEX_BUNDLE_DIR,runnerHash:privateConfig.AI_OFFICE_CODEX_SHA256,providerRoot:privateConfig.AI_OFFICE_PROVIDER_BIN_ROOT??'/workspace/ai-office/provider',projectsRoot:privateConfig.AI_OFFICE_PROJECTS_ROOT??'/workspace/ai-office/projects'};
 return {request,settings};
}
