import {createReadStream} from 'node:fs';
import {realpath,stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.webm':'video/webm','.mp4':'video/mp4','.woff2':'font/woff2','.woff':'font/woff','.ttf':'font/ttf','.json':'application/json'};
/** Fixed public build directory only; API, app assets and account state stay separate. */
export function createSiteRoutes(directory){
 if(!directory)return async()=>false;
 const base=realpath(directory);
 return async(req,res,path)=>{
  const main=['/','/index.html','/home','/home/'].includes(path),pricing=['/pricing','/pricing/'].includes(path);
  const asset=path.startsWith('/site/')||/^\/assets\/(reference\/|demos\/|duck\.png$)/.test(path);
  if(!main&&!pricing&&!asset)return false;
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return true;}
  if(pricing){res.writeHead(302,{Location:'/#pricing','Cache-Control':'no-cache'});res.end();return true;}
  let relative;try{relative=main?'index.html':decodeURIComponent(path.startsWith('/site/')?path.slice(6):path.slice(1));}catch{res.writeHead(404);res.end();return true;}
  if(!relative||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);res.end();return true;}
  const root=await base,candidate=resolve(root,relative);
  if(!candidate.startsWith(root+sep)){res.writeHead(404);res.end();return true;}
  let file,info;try{file=await realpath(candidate);if(!file.startsWith(root+sep))throw Object.assign(Error(),{code:'ENOENT'});info=await stat(file);if(!info.isFile())throw Object.assign(Error(),{code:'ENOENT'});}catch(error){if(error.code!=='ENOENT'&&error.code!=='ENOTDIR')throw error;res.writeHead(404);res.end();return true;}
  const html=extname(file)==='.html',headers={'Content-Type':types[extname(file)]??'application/octet-stream','Cache-Control':html?'no-cache':'public,max-age=3600','Accept-Ranges':'bytes'};
  if(html)headers['Content-Security-Policy']="default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
  let start=0,end=info.size-1,status=200;
  if(req.headers.range&&!html){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);if(!match||!match[1]&&!match[2]){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return true;}if(!match[1])start=Math.max(0,info.size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(end,Number(match[2]));if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=info.size){res.writeHead(416,{'Content-Range':'bytes */'+info.size});res.end();return true;}status=206;headers['Content-Range']='bytes '+start+'-'+end+'/'+info.size;}
  headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);if(req.method==='HEAD')res.end();else if(!info.size)res.end();else{const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}return true;
 };
}
