import {publicLaunchRestriction,sendPublicLaunchRestriction} from './server/public-launch.js';
import {requireNewPassword} from './server/password-policy.js';
import {publicLegal,validateSignupAgreements} from './server/legal-policy.js';
import {probeMailConfiguration} from './server/mail-diagnostics.js';
import {adminAuthRoute,adminToken} from './server/admin-auth-routes.js';
import {adminRoute} from './server/admin-routes.js';
import {adminManagementRoute} from './server/admin-management-routes.js';
import {requestMetrics} from './server/request-metrics.js';
import {isMainThread,parentPort,workerData} from 'node:worker_threads';
import {todoWire} from './server/todo-wire.js';
import {createSiteRoutes} from './server/site.js';
import {originalTodoLink} from './server/todo-source-link.js';
import {sendJson} from './server/http-json.js';
import {probeAiConnection} from './server/ai-transport.js';
import { createTaskSync } from './server/task-sync.js';
import { backupScheduler } from './server/backups.js';
import { createMailer, startMailWorker } from './server/mail.js';
import { createIntegrations } from './server/integrations.js';
import { featureRoutes } from './server/feature-routes.js';
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { realpath } from 'node:fs/promises';
import { isIP } from 'node:net';
import { openStore, validDate, validTitle, validNotes } from './server/store.js';
if (!process.env.PUBLIC_ORIGIN && process.env.RENDER_EXTERNAL_URL) process.env.PUBLIC_ORIGIN = process.env.RENDER_EXTERNAL_URL;
if (process.env.NODE_ENV === 'production') { try { const origin=new URL(process.env.PUBLIC_ORIGIN); if(origin.protocol!=='https:'||origin.origin!==process.env.PUBLIC_ORIGIN||origin.username||origin.password)throw new Error(); } catch { throw new Error('Production requires PUBLIC_ORIGIN as an exact HTTPS origin'); } }
const lane=!isMainThread?workerData?.role:null,background=lane!=='core';
const root = fileURLToPath(new URL('.', import.meta.url));
const store = await openStore(process.env.DATA_DIR || `${root}data`);
const backupJob = backupScheduler(process.env.DATA_DIR || `${root}data`,background?process.env:{...process.env,BACKUP_ENABLED:'0'});
const mailer = createMailer();
// Explicit account-mail requests still call worker.tick immediately. Idle remote DB polling is bounded.
const worker = startMailWorker(store, mailer, background?(process.env.NODE_ENV === 'test' ? 20 : process.env.STORE_DRIVER==='turso'?15000:2000):null);
const integrations = createIntegrations(store);
const taskSync=createTaskSync(store,integrations,{background});
const features = featureRoutes(store, mailer, worker, integrations, limited, clientAddress,{background});
const secureCookie = process.env.COOKIE_SECURE === '1' || process.env.NODE_ENV === 'production';
const allowedOrigin = process.env.PUBLIC_ORIGIN || '';
const attempts = new Map();
function clientAddress(req) { if(lane&&req.headers['x-duck-lane-key']===workerData.key&&isIP(req.headers['x-duck-client-address']??''))return req.headers['x-duck-client-address'];const forwarded = process.env.TRUST_PROXY === '1' ? req.headers['x-forwarded-for']?.split(',').at(-1)?.trim() : null; return forwarded && isIP(forwarded) ? forwarded : req.socket.remoteAddress; }
function limited(key) {
  const now = Date.now();
  for (const [ip, entry] of attempts) if (entry.reset <= now) attempts.delete(ip);
  const entry = attempts.get(key) ?? { count: 0, reset: now + 15 * 60 * 1000 };
  if (!attempts.has(key) && attempts.size >= 2000) return true;
  entry.count++; attempts.set(key, entry); return entry.count > 30;
}
function tokenFrom(req) {
  if (req.headers.authorization) return /^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization)?.[1] || '';
  return /(?:^|;\s*)duckduck_session=([A-Za-z0-9_-]{43})(?:;|$)/.exec(req.headers.cookie || '')?.[1] || '';
}
function cookie(token, maxAge) { return `duckduck_session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`; }
async function json(req) {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) throw Object.assign(new Error('JSON 요청이 필요해요.'), { status: 415 });
  const chunks=[];let length=0; for await (const chunk of req) { chunks.push(chunk);length+=chunk.length; if (length > 16384) throw Object.assign(new Error('입력 내용이 너무 길어요.'), { status: 413 }); }
  let body; try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Object.assign(new Error('잘못된 요청이에요.'), { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw Object.assign(new Error('잘못된 요청이에요.'), { status: 400 });
  return body;
}
function validReminder(value) { return value === null || (typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value); }
const siteRoutes=createSiteRoutes(process.env.LANDING_DIR);
const brandRoutes=createSiteRoutes(root+'public');
const server = http.createServer((req,res)=>requestMetrics(req,res,async()=>{
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin');
  const send = (status,data,headers={}) => sendJson(res,status,todoWire(data,/(?:[?&])writeStatus=2(?:&|$)/.test(req.url)),headers);
  try {
    const url = new URL(req.url, 'http://localhost'), path = url.pathname;
    const launchRestriction=publicLaunchRestriction(req,path);if(launchRestriction)return sendPublicLaunchRestriction(res,launchRestriction,req.method);
    // Only fixed, cryptographically authenticated provider receivers bypass app CSRF headers.
    if (await features.webhook(req,path,(status,data)=>{if(path==='/api/webhooks/sms'&&status===200){res.writeHead(200,{'Content-Type':'text/xml','Cache-Control':'no-store'});res.end('<Response/>');}else send(status,data);})) return;
    if(['/agent-call','/agent-call.js'].includes(path)&&req.method==='GET'){const js=path.endsWith('.js'),content=await readFile(root+'server/agent-call'+(js?'.js':'.html'));res.writeHead(200,{'Content-Type':js?'application/javascript; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Permissions-Policy':'microphone=(self), camera=()','Content-Security-Policy':"default-src 'none'; img-src 'self'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; media-src blob:; base-uri 'none'; form-action 'self'; frame-ancestors 'self'"});res.end(content);return;}
    if (await features.callback(req, res, path, url)) return;
    if(path.startsWith('/assets/brand/')&&await brandRoutes(req,res,path))return;
    if(await siteRoutes(req,res,path))return;
    const servicePages = { '/refund':'refund.html','/refund/':'refund.html', '/coming-soon':'coming-soon.html','/coming-soon/':'coming-soon.html', '/pricing':'pricing.html', '/pricing/':'pricing.html', '/privacy': 'privacy.html', '/privacy/': 'privacy.html','/terms':'terms.html','/terms/':'terms.html','/ai-policy':'ai-policy.html','/ai-policy/':'ai-policy.html','/cookies':'cookies.html','/cookies/':'cookies.html', '/support': 'support.html', '/support/': 'support.html' };
    const archivedLegal=/^\/legal\/(\d{4}-\d{2}-\d{2}(?:\.\d+)?)\/(terms|privacy|ai-policy|cookies|refund)\/?$/.exec(path);
    if(archivedLegal)servicePages[path]='legal/'+archivedLegal[1]+'/'+archivedLegal[2]+'.html';
    if (Object.hasOwn(servicePages, path)) {
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, { error: '이 안내는 조회만 할 수 있어요.' }, { Allow: 'GET, HEAD' });
      let content;try{content=await readFile(root+'public/'+servicePages[path]);}catch(error){if(error.code==='ENOENT')return send(404,{error:'문서 버전을 찾을 수 없어요.'});throw error;}
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
      res.end(req.method === 'HEAD' ? undefined : content); return;
    }
    if (/^\/project-assets\/[a-f0-9]{64}\.(png|jpg|jpeg|gif|webp|svg|ico)$/.test(path) && req.method === 'GET') {
      try {
        const content = await readFile(root+'public'+path);
        const mime = {'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
        res.writeHead(200, {'Content-Type':mime[extname(path)],'Cache-Control':'public,max-age=31536000,immutable'});res.end(content);
      } catch (error) { if(error.code !== 'ENOENT') throw error; send(404,{error:'이미지를 찾을 수 없어요.'}); }
      return;
    }
    if(['/admin-preview','/admin-preview/'].includes(path)&&req.method==='GET'){res.writeHead(302,{Location:'/admin','Cache-Control':'no-store'});res.end();return;}
    const projectFiles={'/admin':'admin.html','/admin/':'admin.html','/admin.js':'admin.js','/admin-controls.js':'admin-controls.js','/admin.css':'admin.css','/design-guide':'design-guide.html','/design-guide/':'design-guide.html','/project':'project.html','/project/':'project.html','/project-comments.js':'project-comments.js','/project-comments.css':'project-comments.css'};
    if(projectFiles[path]&&req.method==='GET'){
      const file=projectFiles[path],type=file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
      const content=await readFile(root+'public/'+file);res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-cache','Content-Security-Policy':"default-src 'none'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(content);return;
    }
    if (path.startsWith('/api/')) {
      const origin = req.headers.origin;
      const sameOrigin = `${secureCookie ? 'https' : 'http'}://${req.headers.host}`;
      if (origin && origin !== (allowedOrigin || sameOrigin)) return send(403, { error: '허용되지 않은 요청 출처예요.' });
      if (origin && allowedOrigin === origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Access-Control-Allow-Credentials', 'true'); res.setHeader('Vary', 'Origin'); }
      if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Duckduck-Client' }); return res.end(); }
      if (['POST', 'PATCH', 'DELETE'].includes(req.method) && !['web', 'native'].includes(req.headers['x-duckduck-client'])) return send(403, { error: '앱에서 다시 요청해주세요.' });
      if(path==='/api/legal'&&req.method==='GET')return send(200,publicLegal());
      if(path.startsWith('/api/admin/')){if(await adminAuthRoute(req,path,store,mailer,json,send,limited,clientAddress(req),secureCookie))return;const admin=store.adminSession(adminToken(req));if(!admin)return send(401,{error:'관리자 전용 계정으로 로그인해주세요.'});if(await adminManagementRoute(req,path,admin.user,store,integrations,taskSync,json,send,limited,clientAddress(req))){if(/\/sync\/source\/[^/]+\/retry$/.test(path))features.wakeSource();return;}if(adminRoute(req,path,url,admin.user,store,send))return;}
      if(path==='/api/project/comments'&&req.method==='GET'){const viewer=store.session(tokenFrom(req));return send(200,store.listProjectComments(viewer?.user.id,{cursor:url.searchParams.get('cursor')??'',status:url.searchParams.get('status')??'all'}));}
      const publicComment=/^\/api\/project\/comments\/([a-f0-9-]{36})$/.exec(path);if(publicComment&&req.method==='GET'){const viewer=store.session(tokenFrom(req));return send(200,store.getProjectComment(publicComment[1],viewer?.user.id));}
      if (await features.public(req, path, json, send)) return;
      if (['/api/auth/register', '/api/auth/login'].includes(path) && req.method === 'POST') {
        if (limited(clientAddress(req))) return send(429, { error: '잠시 후 다시 시도해주세요.' });
        const body = await json(req);
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (!path.endsWith('register')&&(typeof body.password !== 'string' || body.password.length < 1 || body.password.length > 128))) return send(400, { error: '이메일과 비밀번호를 입력해주세요.' });
        if(path.endsWith('register'))requireNewPassword(body.password,body.passwordConfirmation);
        const result = path.endsWith('register') ? await store.register(email, body.password,validateSignupAgreements(body.agreements),req.headers['x-duckduck-client']) : await store.login(email, body.password);
        if (!result) return send(path.endsWith('register') ? 409 : 401, { error: path.endsWith('register') ? '이 이메일로 계정을 만들 수 없어요. 로그인해 주세요.' : '이메일 또는 비밀번호를 확인해주세요.' });
        const previous = tokenFrom(req); if (previous) store.logout(previous);
        let verification;
        if (!result.user.emailVerified) {
          verification={required:true,queued:false};
          if (mailer.configured) {
            try { verification={...verification,...store.queueAccountMail(result.user.id,'verify'),queued:true};void worker.tick().catch(()=>undefined); }
            catch(error){if(error.status!==429)throw error;verification.queued=true;}
          }
        }
        return send(path.endsWith('register') ? 201 : 200, { user: result.user, expiresAt: result.expiresAt, ...(verification?{verification}:{}), ...(req.headers['x-duckduck-client'] === 'native' ? { token: result.token } : {}) }, { 'Set-Cookie': cookie(result.token, 30 * 24 * 60 * 60) });
      }
      if (path === '/api/health' && req.method === 'GET') return send(200, { ok: true, authentication: 'session', version: 1, calendarWorkspace:2, release:/^[a-f0-9]{40}$/.test(process.env.RENDER_GIT_COMMIT??'')?process.env.RENDER_GIT_COMMIT:null });
      const token = tokenFrom(req), session = store.session(token);
      if (!session) return send(401, { error: '로그인이 필요해요.', code: 'AUTH_REQUIRED' });
      // Unverified sessions identify only the mailbox being verified. They are
      // never authorization to read or change member data, including old clients.
      const verificationRoute=(path==='/api/auth/session'&&req.method==='GET')||(path==='/api/auth/logout'&&req.method==='POST')||(path==='/api/account'&&req.method==='GET')||(/^\/api\/account\/verification\/(send|confirm)$/.test(path)&&req.method==='POST');
      if(!session.user.emailVerified&&!verificationRoute)return send(403,{error:'이메일 인증을 완료한 뒤 이용해주세요.',code:'EMAIL_VERIFICATION_REQUIRED'});
      if(path==='/api/project/comments'&&req.method==='POST'){
        if(!session.user.emailVerified)return send(403,{error:'이메일 인증된 계정으로 댓글을 작성해주세요.'});
        if(limited('comments:'+session.user.id))return send(429,{error:'댓글 작성이 많아요. 잠시 후 다시 시도해주세요.'});
        return send(201,store.createProjectComment(session.user.id,await json(req)));
      }
      const comment=/^\/api\/project\/comments\/([a-f0-9-]{36})$/.exec(path);
      if(comment&&['PATCH','DELETE'].includes(req.method))return send(200,store.changeProjectComment(session.user.id,comment[1],await json(req),req.method==='DELETE'));
      if (path === '/api/operations/backup' && req.method === 'GET') { send(200, backupJob.status); return; }
      if(path==='/api/integrations/google/task-sync'){
        if(req.method==='GET')return send(200,taskSync.status(session.user.id,url.searchParams.get('connectionId')??undefined));
        if(req.method==='POST'){const body=await json(req);return send(200,taskSync.configure(session.user.id,body.enabled,body.connectionId));}
      }
      if(path==='/api/integrations/google/task-sync/pull'&&req.method==='POST'){const body=await json(req);return send(200,await taskSync.pull(session.user.id,body.cursor??'',body.connectionId));}
      if(path==='/api/integrations/google/task-sync/retry'&&req.method==='POST')return send(200,taskSync.retry(session.user.id,(await json(req)).connectionId));
      if (await features.private(req, path, url, session.user, json, send,token)) return;
      if(path==='/api/account/agreements'&&req.method==='GET')return send(200,{accepted:store.signupAgreements(session.user.id),current:publicLegal()});
      if (path === '/api/auth/session' && req.method === 'GET') return send(200, session);
      if (path === '/api/auth/logout' && req.method === 'POST') { store.logout(token); return send(200, { ok: true }, { 'Set-Cookie': cookie('', 0) }); }
      if (path === '/api/todos' && req.method === 'GET') return send(200, store.list(session.user.id));
      if(path==='/api/todo-order'&&req.method==='PUT'){if(limited('todo-order:'+session.user.id))return send(429,{error:'잠시 뒤 다시 옮겨주세요.'});return send(200,store.reorder(session.user.id,(await json(req)).ids));}
      const writeReceipt=/^\/api\/todo-writes\/([A-Za-z0-9_-]{20,120})$/.exec(path);if(writeReceipt&&req.method==='GET')return send(200,{todo:store.todoWriteReceipt(session.user.id,writeReceipt[1])});
      if (path === '/api/todos' && req.method === 'POST') {
        const body = await json(req);
        if (!validNotes(body.notes ?? '')) return send(400, { error: '메모는 4,000자 이내로 적어주세요.' });
        if (!validTitle(body.title) || !validDate(body.dueDate ?? null) || !validReminder(body.reminderAt ?? null)) return send(400, { error: '할 일 제목과 날짜를 확인해주세요.' });
        const todo = store.create(session.user.id, { title: body.title.trim(), category: ['일상', '업무', '건강'].includes(body.category) ? body.category : '일상', dueDate: body.dueDate ?? null, reminderAt: body.reminderAt ?? null, notes: body.notes ?? '' },{requestKey:body.clientRequestKey});
        return send(201, todo);
      }
      const sourceLink=/^\/api\/todos\/([^/]+)\/source-link$/.exec(path);if(sourceLink&&req.method==='GET')return send(200,await originalTodoLink(store,integrations,session.user.id,sourceLink[1]));
      if (path.startsWith('/api/todos/')) {
        const id = path.slice('/api/todos/'.length), userId = session.user.id;
        if (!store.get(userId, id)) return send(404, { error: '할 일을 찾을 수 없어요.' });
        if(req.method==='GET')return send(200,store.get(userId,id));
        if (req.method === 'DELETE') { store.remove(userId, id); return send(200, { ok: true }); }
        if (req.method === 'PATCH') {
          const body = await json(req), patch = {};
          if ('title' in body) { if (!validTitle(body.title)) return send(400, { error: '할 일을 120자 이내로 적어주세요.' }); patch.title = body.title.trim(); }
          if ('dueDate' in body) { if (!validDate(body.dueDate)) return send(400, { error: '날짜를 확인해주세요.' }); patch.dueDate = body.dueDate; }
          if ('reminderAt' in body) { if (!validReminder(body.reminderAt)) return send(400, { error: '알림 시간을 확인해주세요.' }); patch.reminderAt = body.reminderAt; }
          if ('notes' in body) { if (!validNotes(body.notes)) return send(400, { error: '메모는 4,000자 이내로 적어주세요.' }); patch.notes = body.notes; }
          if('dueTime' in body){if(body.dueTime!==null&&(typeof body.dueTime!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.dueTime)))return send(400,{error:'예정 시간을 확인해주세요.'});patch.dueTime=body.dueTime;}
          if ('done' in body) { if (typeof body.done !== 'boolean') return send(400, { error: '완료 상태가 올바르지 않아요.' }); patch.done = body.done; }
          if (!Object.keys(patch).length) return send(400, { error: '변경할 내용이 없어요.' });
          const saved=await features.updateTodo(userId,id,patch);taskSync.wake();return send(200,saved);
        }
      }
      return send(405, { error: '지원하지 않는 요청이에요.' });
    }
    if(process.env.WEB_DIR && req.method === 'GET') {
      const directory=await realpath(process.env.WEB_DIR), pathname=decodeURIComponent(path);
      if(pathname.split('/').some(part=>part.startsWith('.')))return send(404,{error:'페이지를 찾을 수 없어요.'});
      let candidate=resolve(directory,'.'+pathname);
      if(candidate!==directory&&!candidate.startsWith(directory+sep))return send(404,{error:'페이지를 찾을 수 없어요.'});
      if(candidate===directory)candidate=resolve(directory,'index.html');
      try { candidate=await realpath(candidate); if(!candidate.startsWith(directory+sep))return send(404,{error:'페이지를 찾을 수 없어요.'}); }
      catch(error){if(error.code!=='ENOENT')throw error;if(extname(candidate))return send(404,{error:'파일을 찾을 수 없어요.'});candidate=resolve(directory,'index.html');}
      const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.woff2':'font/woff2','.png':'image/png','.mp4':'video/mp4','.jpg':'image/jpeg','.ico':'image/x-icon','.json':'application/json'}[extname(candidate)]||'application/octet-stream';
      if(extname(candidate)==='.mp4'){
        const info=await stat(candidate),headers={'Content-Type':type,'Accept-Ranges':'bytes','Cache-Control':'public,max-age=3600'};let start=0,end=info.size-1,status=200;
        if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||!match[1]&&!match[2]){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return;}if(!match[1])start=Math.max(0,info.size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(end,Number(match[2]));if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return;}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+info.size;}
        headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD')res.end();else{const stream=createReadStream(candidate,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}return;
      }
      const content=await readFile(candidate);res.writeHead(200,{'Content-Type':type,'Cache-Control':extname(candidate)==='.html'?'no-cache':'public,max-age=3600'});res.end(content);return;
    }
    const files = { '/app': ['index.html', 'text/html; charset=utf-8'], '/app/': ['index.html', 'text/html; charset=utf-8'], '/': ['index.html', 'text/html; charset=utf-8'], '/style.css': ['style.css', 'text/css'], '/app.js': ['app.js', 'text/javascript'] };
    if (!files[path] || req.method !== 'GET') return send(404, { error: '페이지를 찾을 수 없어요.' });
    const [file, type] = files[path]; const content = await readFile(`${root}public/${file}`); res.writeHead(200, { 'Content-Type': type }); res.end(content);
  } catch (error) { if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : '요청을 처리하지 못했어요. 다시 시도해주세요.' }); else res.end(); }
})).listen(Number(process.env.PORT || 3000), lane?'127.0.0.1':'0.0.0.0', () => {if(lane)parentPort.postMessage({type:'ready',port:server.address().port});else console.log('Donknow listening on port ' + server.address().port);if(background&&process.env.NODE_ENV!=='test'){void probeAiConnection();void probeMailConfiguration();}});
if(lane)parentPort.on('message',message=>{if(message.type==='wake')features.wakeSource();if(message.type==='close'){features.close();taskSync.stop();worker.stop();backupJob.stop();server.close(()=>{store.close();process.exit(0);});}});

