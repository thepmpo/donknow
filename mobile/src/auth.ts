import { Platform } from 'react-native';
import {readJsonResponse,InvalidJsonResponseError,HttpResponseError,TransportResponseError,connectionRead,connectionWrite,cancelledTransport} from './http-response';
import * as SecureStore from 'expo-secure-store';
import {createServerReadiness} from './server-readiness';
const readiness=createServerReadiness({probe:async base=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const response=await fetch(base+'/api/health',{signal:controller.signal});const data=await readJsonResponse(response) as {ok?:boolean};if(data?.ok!==true)throw new InvalidJsonResponseError(response.status);}finally{clearTimeout(timer);}}});
export type User = { id: string; email: string; emailVerified: boolean;plan?:'free'|'lite'|'pro';planAccess?:'complimentary'|'manual' };
export type SignupAgreements={termsVersion:string;privacyVersion:string;age14:true};
export class AuthRequiredError extends Error { constructor() { super('다시 로그인해주세요.'); } }
const storageKey = (origin: string) => 'duckduck.session.' + Array.from(origin).map(char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
type DeviceSession={token:string;user?:User};
const offlineSessionKey=(baseUrl:string)=>storageKey(baseUrl)+'.account';
const tokenTag=(token:string)=>token.length+':'+token.slice(-16);
const sessionWrites=new Map<string,Promise<unknown>>();
async function updateDeviceSession(baseUrl:string,update:(token:string|null)=>DeviceSession|null|undefined){
 const key=storageKey(baseUrl);
 const task=(sessionWrites.get(baseUrl)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const previous=await SecureStore.getItemAsync(key);
  const next=update(previous);
  if(next===undefined)return;
  if(next===null){
   await SecureStore.deleteItemAsync(key);
   await SecureStore.deleteItemAsync(offlineSessionKey(baseUrl));
   return;
  }
  const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
  if(next.token!==previous)await SecureStore.setItemAsync(key,next.token,options);
  if(next.user)await SecureStore.setItemAsync(offlineSessionKey(baseUrl),JSON.stringify({tag:tokenTag(next.token),user:next.user}),options).catch(()=>{});
 });
 sessionWrites.set(baseUrl,task);
 try{await task;}finally{if(sessionWrites.get(baseUrl)===task)sessionWrites.delete(baseUrl);}
}
export async function offlineUser(baseUrl:string):Promise<User|null>{
 if(Platform.OS!=='ios')return null;
 try{
  const [token,stored]=await Promise.all([SecureStore.getItemAsync(storageKey(baseUrl)),SecureStore.getItemAsync(offlineSessionKey(baseUrl))]);
  if(!token||!stored)return null;
  const {tag,user}=JSON.parse(stored);
  return tag===tokenTag(token)&&user?.emailVerified===true&&typeof user.id==='string'&&typeof user.email==='string'?user:null;
 }catch{return null;}
}
export function canRestoreOffline(error:unknown){
 return error instanceof TransportResponseError||error instanceof HttpResponseError&&[502,503,504].includes(error.status)
  ||error instanceof InvalidJsonResponseError&&[502,503,504].includes(error.status);
}
export async function request(baseUrl: string, path: string, method = 'GET', body?: unknown): Promise<unknown> {
  // Capture this session before a potentially long health wait; never send an old draft with a new login.
  const token = Platform.OS==='web'?null:await SecureStore.getItemAsync(storageKey(baseUrl));
  // A cold-start 503 must be handled before the write is sent. Never replay its POST/PATCH.
  if(Platform.OS==='ios'&&method!=='GET'&&(/^\/api\/(?:assistant\/(?:chat|actions)|calendar\/event-details)(?:\/|$)/.test(path)||connectionWrite(path,method)))await readiness.wait(baseUrl).catch(error=>{
    if(error instanceof Error&&(error.name==='AbortError'||error instanceof TypeError||/network request failed|failed to fetch|load failed/i.test(error.message)))throw new Error('서버 연결을 준비하지 못했어요. 작성한 내용은 유지했어요. 잠시 뒤 다시 시도해주세요.');
    throw error;
  });
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), connectionRead(path,method)||connectionWrite(path,method)||path==='/api/auth/login'||path==='/api/auth/register'||path==='/api/auth/session'||path==='/api/health'||/^\/api\/todos\/[a-f0-9-]{36}(?:\/source-(?:retry|result))?$/.test(path)||/^\/api\/(?:assistant\/(?:chat|context|actions)|calendar\/event-details)(?:\/|$)/.test(path)?60000:15000);
  try {
    const wirePath=path.startsWith('/api/todos')?path+(path.includes('?')?'&':'?')+'writeStatus=2':path;
    const fetchResponse = () => fetch(baseUrl + wirePath, { method, credentials: 'include', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Duckduck-Client': Platform.OS === 'web' ? 'web' : 'native', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    // Known read-only endpoints may recover once from a truncated/non-JSON body.
    // Confirmation, OAuth and all external writes are never automatically replayed.
    for(let attempt=0;;attempt++){
      let response:Response;
      try{response=await fetchResponse();}catch(error){if(attempt===0&&connectionRead(path,method)&&cancelledTransport(error)&&!controller.signal.aborted)continue;throw error;}
      if(response.status===401&&path!=='/api/auth/login'){
       if(Platform.OS==='ios'&&token)await updateDeviceSession(baseUrl,previous=>previous===token?null:undefined).catch(()=>{});
       throw new AuthRequiredError();
      }
      try{const data=await readJsonResponse(response);readiness.mark(baseUrl);return data;}catch(error){
        if(attempt===0&&connectionRead(path,method)&&error instanceof InvalidJsonResponseError&&(error.status===200||error.status>=500)&&!controller.signal.aborted)continue;
        throw error;
      }
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new TransportResponseError('서버 응답 시간이 초과됐어요. 무료 서버가 준비 중이거나 네트워크가 불안정할 수 있어요. 잠시 뒤 다시 시도해주세요.');
    if (cancelledTransport(error)) throw new TransportResponseError('통신이 잠시 중단됐어요. 연결과 로그인 정보는 유지했어요. 다시 확인해주세요.');
    if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network request failed|load failed/i.test(error.message))) throw new TransportResponseError('서버에 연결하지 못했어요. 주소와 네트워크를 확인해주세요.');
    throw error;
  } finally { clearTimeout(timer); }
}
export async function session(baseUrl: string): Promise<User> {
  const token=Platform.OS==='ios'?await SecureStore.getItemAsync(storageKey(baseUrl)):null;
  const result = await request(baseUrl, '/api/auth/session') as { user?: User };
  if (!result.user || typeof result.user.id !== 'string' || typeof result.user.email !== 'string') throw new Error('로그인 정보를 확인할 수 없어요.');
  const user=result.user;
  if(token)await updateDeviceSession(baseUrl,previous=>previous===token?{token,user}:undefined).catch(()=>{});
  return user;
}
export async function authenticate(baseUrl: string, email: string, password: string, register: boolean,agreements?:SignupAgreements,passwordConfirmation?:string): Promise<User> {
  const result = await request(baseUrl, register ? '/api/auth/register' : '/api/auth/login', 'POST', { email, password,...(register?{agreements,passwordConfirmation}:{}) }) as { user?: User; token?: string };
  if (!result.user || typeof result.user.id !== 'string' || typeof result.user.email !== 'string') throw new Error('로그인 정보를 확인할 수 없어요.');
  if (Platform.OS !== 'web') {
    if (typeof result.token !== 'string') throw new Error('로그인 정보를 저장할 수 없어요.');
    const {token,user}=result;
    if(Platform.OS==='ios')await updateDeviceSession(baseUrl,()=>({token,user}));
    else await SecureStore.setItemAsync(storageKey(baseUrl), token, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
  }
  return result.user;
}
export async function logout(baseUrl: string): Promise<void> {
  await request(baseUrl, '/api/auth/logout', 'POST', {});
  await forgetSession(baseUrl);
}

export async function forgetSession(baseUrl: string): Promise<void> {
 if(Platform.OS==='ios')await updateDeviceSession(baseUrl,()=>null);
 else if(Platform.OS!=="web")await SecureStore.deleteItemAsync(storageKey(baseUrl));
}
