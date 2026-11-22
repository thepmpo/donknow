import {fail} from './secrets.js';
export function configuredAdminEmails(env=process.env){
 if(typeof env.DUCK_ADMIN_EMAILS!=='string'||env.DUCK_ADMIN_EMAILS.length>6000)return [];
 const emails=env.DUCK_ADMIN_EMAILS.split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return emails.length>0&&emails.length<=20&&emails.every(v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))?[...new Set(emails)]:[];
}
export function isAdmin(user,env=process.env){return user?.identity==='admin'&&(user.emailVerified===true||user.activated===true)&&(configuredAdminEmails(env).includes(user.email.toLowerCase())||user.managedAdmin===true&&['operator','reader'].includes(user.role));}
export function adminRoute(req,path,url,user,store,send,env=process.env){
 if(!path.startsWith('/api/admin/'))return false;
 if(!isAdmin(user,env))throw fail(403,'운영자 권한이 있는 이메일 인증 계정으로 로그인해주세요.');
 if(user.mustChangePassword&&path!=='/api/admin/session'){send(403,{error:'임시 비밀번호를 먼저 변경해주세요.',code:'ADMIN_PASSWORD_CHANGE_REQUIRED'});return true;}
 if(req.method!=='GET'){send(405,{error:'지원하지 않는 관리자 작업이에요.'},{Allow:'GET'});return true;}
 let operation,result,subject=null;
 if(path==='/api/admin/session'){operation='session';result={user:{id:user.id,email:user.email,mustChangePassword:!!user.mustChangePassword},role:user.mustChangePassword?'admin-password-change':user.role??'reader',permissions:user.mustChangePassword?[]:user.permissions??[],readOnly:user.mustChangePassword||user.role==='reader'};}
 else if(path==='/api/admin/overview'){operation='overview';result=store.adminOverview();}
 else if(path==='/api/admin/members'){operation='members';const raw=url.searchParams.get('offset')??'0';if(!/^\d{1,7}$/.test(raw))throw fail(400,'페이지를 확인해주세요.');result=store.adminMembers({query:url.searchParams.get('q')??'',offset:Number(raw)});}
 else if(path.startsWith('/api/admin/members/')){operation='member';subject=path.slice('/api/admin/members/'.length);result=store.adminMember(subject);}
 else if(path==='/api/admin/operators'){operation='operators';result=store.adminOperators();}
 else if(path==='/api/admin/audit'){operation='audit';result=store.adminAudit();}
 else throw fail(404,'운영 메뉴를 찾을 수 없어요.');
 store.recordAdminAccess(user.id,operation,subject);send(200,result);return true;
}
