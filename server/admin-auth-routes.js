import {mailPublicError} from './mail-diagnostics.js';
import {fail} from './secrets.js';
export const adminToken=req=>/(?:^|;\s*)duckduck_admin_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie??'')?.[1]??'';
const emailOf=body=>typeof body.email==='string'?body.email.trim().toLowerCase():'';
const cookie=(token,secure,age)=>`duckduck_admin_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${age}${secure?'; Secure':''}`;
export async function adminAuthRoute(req,path,store,mailer,json,send,limited,address,secure){
 if(!path.startsWith('/api/admin/auth/'))return false;
 if(req.method!=='POST')throw fail(405,'지원하지 않는 관리자 인증 요청이에요.');
 if(limited('admin-auth:'+address))throw fail(429,'요청이 많아요. 잠시 뒤 다시 시도해주세요.');
 if(path==='/api/admin/auth/logout'){store.adminLogout(adminToken(req));send(200,{ok:true},{'Set-Cookie':cookie('',secure,0)});return true;}
 const body=await json(req);if(path==='/api/admin/auth/password/change'){const result=await store.changeRequiredAdminPassword(adminToken(req),body.password,body.currentPassword);send(200,{user:result.user,expiresAt:result.expiresAt},{'Set-Cookie':cookie(result.token,secure,result.user.mustChangePassword?10*60:8*60*60)});return true;}
 const email=emailOf(body);if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw fail(400,'관리자 이메일을 확인해주세요.');
 if(path==='/api/admin/auth/setup/send'){
  if(!mailer.configured)throw fail(503,'관리자 인증 메일 발송이 아직 설정되지 않았어요.');const job=store.adminSetupMail(email);
  if(job)try{await mailer.deliver(job.id,job.message);}catch(error){store.cancelAdminSetup(job.id);throw fail(503,mailPublicError(error));}
  send(202,{queued:true,message:'등록된 관리자 주소라면 인증번호가 발송됩니다.'});return true;
 }
 if(typeof body.password!=='string'||body.password.length<(path==='/api/admin/auth/login'?8:10)||body.password.length>128)throw fail(400,'비밀번호는 10~128자로 입력해주세요.');
 let result;
 if(path==='/api/admin/auth/setup/confirm')result=await store.finishAdminSetup(email,body.code,body.password);
 else if(path==='/api/admin/auth/login')result=await store.adminLogin(email,body.password);
 else throw fail(404,'관리자 인증 경로를 찾을 수 없어요.');
 if(!result)throw fail(path.endsWith('/login')?401:400,path.endsWith('/login')?'관리자 아이디와 비밀번호를 확인해주세요. 처음이라면 전용 계정을 설정해주세요.':'인증번호가 올바르지 않거나 만료됐어요.');
 store.adminLogout(adminToken(req));send(200,{user:result.user,expiresAt:result.expiresAt},{'Set-Cookie':cookie(result.token,secure,result.user.mustChangePassword?10*60:8*60*60)});return true;
}
