import {randomBytes,timingSafeEqual} from 'node:crypto';
export function remoteConfiguration(input){if(!input)return null;try{const url=new URL(input.origin);if(url.protocol!=='https:'||!url.hostname.endsWith('.ts.net')||url.port||url.pathname!=='/'||url.search||url.hash||url.username||url.password||typeof input.ownerLogin!=='string'||!input.ownerLogin.trim()||input.ownerLogin.length>240)throw Error();return {origin:url.origin,ownerLogin:input.ownerLogin};}catch{throw Error('office_private_connection_configuration_invalid');}}
export function authorize(req,remote,port=8810){
 if(req.headers['tailscale-funnel-request']!==undefined)throw Object.assign(Error('office_public_funnel_not_allowed'),{status:403});
 const host=req.headers.host;if(['127.0.0.1:'+port,'localhost:'+port].includes(host)){
  if(req.headers['tailscale-user-login']||req.headers['x-forwarded-host']||req.headers['forwarded'])throw Object.assign(Error('office_untrusted_forwarding_headers'),{status:403});return {mode:'local',origin:'http://'+host,owner:'본인 PC'};
 }
 if(!remote||host!==new URL(remote.origin).host||req.headers['tailscale-user-login']!==remote.ownerLogin)throw Object.assign(Error('office_private_owner_required'),{status:403});
 return {mode:'private',origin:remote.origin,owner:'연결된 본인 계정'};
}
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
export function createSessions(){const sessions=new Map();return {
 open(req,res,actor,allowLocal=false){const cookies=String(req.headers.cookie??'').split(';').map(x=>x.trim()),sid=cookies.find(x=>x.startsWith('office_control='))?.slice(15);let row=sessions.get(sid);if(!row||row.until<Date.now()||row.origin!==actor.origin){if(actor.mode==='local'&&!allowLocal)throw Object.assign(Error('office_open_from_start_file'),{status:401});const id=randomBytes(32).toString('hex');row={id,csrf:randomBytes(32).toString('hex'),origin:actor.origin,until:Date.now()+24*60*60*1000};sessions.set(id,row);res.setHeader('set-cookie',`office_control=${id}; Path=/; HttpOnly; SameSite=Strict${actor.mode==='private'?'; Secure':''}`);}for(const [id,s] of sessions)if(s.until<Date.now())sessions.delete(id);return row;},
 check(req,row,actor){if(req.headers.origin!==actor.origin||!same(req.headers['x-control-csrf'],row.csrf))throw Object.assign(Error('office_refresh_before_action'),{status:403});},
};}

export function validAccessKey(provided,expected){return same(provided,expected);}
