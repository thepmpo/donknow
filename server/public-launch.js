// Only the new introduction domain is restricted. Existing native API,
// provider callbacks and operator testing keep their current origin.
const publicHosts=new Set(['docen.today','www.docen.today']);
const pages=new Set(['/','/index.html','/home','/home/','/pricing','/pricing/','/terms','/refund','/privacy','/ai-policy','/cookies','/support','/coming-soon','/robots.txt','/favicon.ico']);
export function publicLaunchRestriction(req,path){
 let host;try{host=new URL('http://'+req.headers.host).hostname.toLowerCase().replace(/\.$/,'');}catch{return null;}
 let originHost;try{originHost=new URL(req.headers.origin).hostname.toLowerCase().replace(/\.$/,'');}catch{}
 if(!publicHosts.has(host)&&!publicHosts.has(originHost))return null;
 const read=['GET','HEAD'].includes(req.method);
 if(read&&(pages.has(path)||pages.has(path.replace(/\/$/,''))||/^\/legal\/\d{4}-\d{2}-\d{2}(?:\.\d+)?\/(terms|privacy|ai-policy|cookies|refund)\/?$/.test(path)||path.startsWith('/site/')||/^\/assets\/(reference\/|demos\/|duck\.png$|brand\/(?:docen-logo\.png|docen-loading\.mp4|loading\.js|brand\.css)$)/.test(path)||path==='/api/health'||path==='/api/legal'))return null;
 return path.startsWith('/api/')?'api':'page';
}
export function sendPublicLaunchRestriction(res,kind,method='GET'){
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(kind==='api'){res.writeHead(503,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(method==='HEAD'?undefined:JSON.stringify({error:'docen 웹서비스는 아직 오픈 준비 중이에요.',code:'SERVICE_NOT_LAUNCHED'}));}
 else{res.writeHead(303,{...headers,Location:'/coming-soon'});res.end();}
}
