import {createHmac,timingSafeEqual,createPublicKey,verify} from 'node:crypto';
import {fail} from './secrets.js';
function same(a,b){return typeof a==='string'&&typeof b==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export function verifySlackWebhook(raw,headers,secret,now=Date.now()){
 if(!secret)throw fail(503,'Slack 변경 수신 설정이 필요해요.');const stamp=headers['x-slack-request-timestamp'];if(typeof stamp!=='string'||!/^\d{10}$/.test(stamp)||Math.abs(now/1000-Number(stamp))>300)throw fail(403,'Slack 요청 시간이 유효하지 않아요.');const expected='v0='+createHmac('sha256',secret).update('v0:'+stamp+':').update(raw).digest('hex');if(!same(headers['x-slack-signature'],expected))throw fail(403,'Slack 요청 서명을 확인해주세요.');return true;
}
export function verifyNotionWebhook(raw,headers,secret){if(!secret)throw fail(503,'Notion 변경 수신 설정이 필요해요.');const expected='sha256='+createHmac('sha256',secret).update(raw).digest('hex');if(!same(headers['x-notion-signature'],expected))throw fail(403,'Notion 요청 서명을 확인해주세요.');return true;}
export function createGooglePushAuth({audience,email,fetcher=fetch,now=Date.now}){
 let cache=null,lastRefresh=0;return async header=>{
  if(!audience||!email)throw fail(503,'Gmail 변경 수신 설정이 필요해요.');const token=/^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(header??'')?.[1];if(!token||token.length>16000)throw fail(401,'Google 수신 인증이 필요해요.');let h,c,parts;try{parts=token.split('.');h=JSON.parse(Buffer.from(parts[0],'base64url'));c=JSON.parse(Buffer.from(parts[1],'base64url'));}catch{throw fail(403,'Google 수신 인증을 확인해주세요.');}
  if(h.alg!=='RS256'||typeof h.kid!=='string'||!['https://accounts.google.com','accounts.google.com'].includes(c.iss)||c.aud!==audience||c.email!==email||c.email_verified!==true||typeof c.exp!=='number'||c.exp<=now()/1000||typeof c.iat!=='number'||c.iat>now()/1000+30||c.iat<now()/1000-3700||c.exp-c.iat>3700)throw fail(403,'허용된 Google 수신 계정이 아니에요.');
  if(!cache||cache.until<=now()||!cache.keys.some(k=>k.kid===h.kid)){if(cache&&now()-lastRefresh<60000)throw fail(403,'Google 수신 키를 확인해주세요.');lastRefresh=now();let r;try{r=await fetcher('https://www.googleapis.com/oauth2/v3/certs',{redirect:'error',signal:AbortSignal.timeout(8000)});const data=await r.json();if(!r.ok||!Array.isArray(data.keys)||data.keys.length>20)throw Error();cache={keys:data.keys,until:now()+3600000};}catch{throw fail(503,'Google 수신 서명을 확인하지 못했어요.');}}
  const key=cache.keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));
  try{if(!key||!verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error();}catch{throw fail(403,'Google 수신 서명이 유효하지 않아요.');}return true;
 };
}
