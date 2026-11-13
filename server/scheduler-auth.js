import {createPublicKey,verify} from 'node:crypto';
import {fail} from './secrets.js';
const issuer='https://token.actions.githubusercontent.com';
export function createSchedulerAuth({fetcher=fetch,now=Date.now,origin=process.env.PUBLIC_ORIGIN,repository=process.env.BRIEFING_GITHUB_REPOSITORY||'thepmpo/donknow',repositoryId=process.env.BRIEFING_GITHUB_REPOSITORY_ID||'1430767404'}={}){
 let cached=null,pending=null;
 async function keys(){if(cached&&cached.expires>now())return cached.keys;if(!pending)pending=(async()=>{try{const r=await fetcher(issuer+'/.well-known/jwks',{signal:AbortSignal.timeout(8000),redirect:'error'});if(!r.ok)throw Error();const j=await r.json();if(!Array.isArray(j.keys)||j.keys.length>20)throw Error();cached={keys:j.keys,expires:now()+3600000};return j.keys;}catch{throw fail(503,'예약 실행 인증을 확인하지 못했어요.');}finally{pending=null;}})();return pending;}
 return async function authorize(header){
  const token=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(header||'')?.[1];if(!token||token.length>16000)throw fail(401,'예약 실행 인증이 필요해요.');
  let h,c,segments;try{segments=token.split('.');h=JSON.parse(Buffer.from(segments[0],'base64url'));c=JSON.parse(Buffer.from(segments[1],'base64url'));}catch{throw fail(401,'예약 실행 인증을 확인해주세요.');}
  const seconds=now()/1000;
  if(!origin||h.alg!=='RS256'||typeof h.kid!=='string'||h.kid.length>200||c.iss!==issuer||c.aud!==origin+'/api/automations/tick'||c.repository!==repository||c.repository_id!==repositoryId||c.ref!=='refs/heads/main'||c.workflow_ref!==repository+'/.github/workflows/briefing-delivery.yml@refs/heads/main'||!['schedule','workflow_dispatch'].includes(c.event_name)||typeof c.exp!=='number'||c.exp<=seconds||typeof c.iat!=='number'||c.iat>seconds+30||c.iat<seconds-600||c.exp-c.iat>600||typeof c.nbf!=='number'||c.nbf>seconds+30)throw fail(403,'허용된 예약 실행에서만 요청할 수 있어요.');
  const key=(await keys()).find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
  try{if(!key||!verify('RSA-SHA256',Buffer.from(segments[0]+'.'+segments[1]),createPublicKey({key,format:'jwk'}),Buffer.from(segments[2],'base64url')))throw Error();}catch{throw fail(403,'예약 실행 서명을 확인하지 못했어요.');}
  return true;
 };
}
