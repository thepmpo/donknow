// Diagnostics contain classifications only: never provider messages, addresses, keys or codes.
const networkCodes=new Set(['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','ETIMEDOUT','ENETUNREACH','UND_ERR_CONNECT_TIMEOUT','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','ERR_INVALID_CHAR']);
export function mailFailure(error){if(error?.name==='AbortError'||error?.name==='TimeoutError')return 'timeout';const code=error?.cause?.code??error?.code;return networkCodes.has(code)?code:'network';}
export function mailRejection(status,body={}){
 const name=typeof body.name==='string'?body.name:'',message=typeof body.message==='string'?body.message.toLowerCase():'';
 if(name==='restricted_api_key')return 'restricted-api-key';
 if(status===401||['missing_api_key','invalid_api_key'].includes(name))return 'invalid-api-key';
 if(/testing emails|own email address|test.*recipient/.test(message))return 'testing-recipient-restricted';
 if(/domain/.test(message)&&/not verified|verify|verification/.test(message))return 'sender-domain-unverified';
 if(status===429)return 'rate-limit';if(status===403)return 'permission-denied';
 if(status===422||status===400)return 'invalid-mail-configuration';if(status>=500)return 'provider-unavailable';return 'provider-rejected';
}
export async function mailErrorBody(response){
 const reader=response.body?.getReader();if(!reader)return {};let text='',bytes=0;
 try{for(;;){const n=await reader.read();if(n.done)break;bytes+=n.value.byteLength;if(bytes>8192){void reader.cancel().catch(()=>{});return {truncated:true};}text+=new TextDecoder().decode(n.value);}return JSON.parse(text);}catch{return {};}finally{reader.releaseLock();}
}
export function mailPublicError(error){return ({'testing-recipient-restricted':'메일 서비스의 테스트 수신자 제한으로 발송하지 못했어요. 운영자가 발신 도메인을 인증해야 해요.','sender-domain-unverified':'메일 발신 도메인이 인증되지 않아 보내지 못했어요. 운영자의 발신 도메인 설정이 필요해요.','invalid-api-key':'메일 서비스 인증 설정에 문제가 있어요. 운영자의 발송 키 확인이 필요해요.','restricted-api-key':'메일 발송 키의 권한을 확인해야 해요.','rate-limit':'메일 서비스의 발송 한도에 도달했어요. 잠시 뒤 다시 요청해주세요.','permission-denied':'메일 서비스가 발송을 거절했어요. 운영자의 발신 주소와 권한 확인이 필요해요.','invalid-mail-configuration':'메일 발신 설정을 확인해야 해요.','provider-unavailable':'메일 서비스 응답이 불안정해요. 잠시 뒤 다시 요청해주세요.','timeout':'메일 서비스 응답을 기다리다 시간이 초과됐어요. 잠시 뒤 다시 요청해주세요.'})[error?.mailKind]??'인증 메일을 보내지 못했어요. 운영자가 발송 연결 상태를 확인해야 해요.';}
export async function probeMailConfiguration(env=process.env,fetcher=fetch,log=console.warn){
 const key=env.MAIL_API_KEY?.trim(),from=env.MAIL_FROM?.trim();if(!key||!from)return;
 try{const response=await fetcher('https://api.resend.com/domains',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(10000)}),body=await mailErrorBody(response);
  if(!response.ok){log(JSON.stringify({event:'mail-config-probe',status:response.status,kind:mailRejection(response.status,body)}));return;}
  const match=/<([^<>]+)>/.exec(from),address=(match?.[1]??from).trim().toLowerCase(),domain=address.split('@')[1],domains=Array.isArray(body.data)?body.data:[],selected=domains.find(d=>d.name?.toLowerCase()===domain);
  const senderState=domain==='resend.dev'?'testing-sender':selected?.status==='verified'?'verified':selected?'unverified':!Array.isArray(body.data)?'unknown-response':body.has_more?'unknown-partial':'not-listed';
  log(JSON.stringify({event:'mail-config-probe',status:response.status,kind:'read-only',senderState}));
 }catch(error){log(JSON.stringify({event:'mail-config-probe',kind:mailFailure(error)}));}
}
