// Local document inbox, synchronous publication and live repository-document indexing.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {publishKnowledge,slug} from './lib/ai-office-knowledge.mjs';
const officeRoot=process.env.AI_OFFICE_ROOT??'/workspace/ai-office',repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const registered=()=>fs.readdirSync(path.join(officeRoot,'projects'),{withFileTypes:true}).filter(d=>d.isDirectory()).flatMap(d=>{try{const p=JSON.parse(fs.readFileSync(path.join(officeRoot,'projects',d.name,'project.json'),'utf8'));return [{slug:slug(d.name),source:p.source}];}catch{return [];}});
let status=[],lastError=null;
function sync(){const results=[];lastError=null;for(const p of registered()){const errorFile=path.join(officeRoot,'projects',p.slug,'knowledge','ERROR');try{results.push(publishKnowledge({officeRoot,project:p.slug,source:p.source}));fs.rmSync(errorFile,{force:true});}catch{lastError='문서를 반영하지 못했습니다. 파일 형식·크기·비밀값·심볼릭 링크를 확인하세요.';fs.mkdirSync(path.dirname(errorFile),{recursive:true});fs.writeFileSync(errorFile,'knowledge_sync_failed\n',{mode:0o600});}}status=results;return {ok:!lastError,projects:status,error:lastError};}
const cmd=process.argv[2]??'sync';
if(cmd==='sync'){const r=sync();console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=1;}
else if(cmd==='serve'){
 const csrf=randomBytes(32).toString('hex');sync();const timer=setInterval(sync,1000);timer.unref();
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; frame-ancestors 'none'");
  const host=req.headers.host??'';if(!/^127\.0\.0\.1:8791$|^localhost:8791$/.test(host)){res.writeHead(403);return res.end('Local access only');}
  const json=(code,value)=>{res.writeHead(code,{'content-type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  if(req.method==='GET'&&req.url==='/api/status')return json(200,sync());
  if(req.method==='POST'&&req.url==='/api/documents'){
   const origin=req.headers.origin;if(origin&&origin!=='http://'+host)return json(403,{error:'origin_rejected'});
   const token=String(req.headers['x-knowledge-token']??'');if(token.length!==csrf.length||!timingSafeEqual(Buffer.from(token),Buffer.from(csrf)))return json(403,{error:'local_form_required'});
   try{let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>2*1024*1024)throw Error('too_large');}const data=JSON.parse(body),scope=data.scope;
    if(scope!=='shared'&&!registered().some(p=>p.slug===scope))throw Error('scope');
    const name=String(data.name??'').normalize('NFC');if(!/^[^./\\\x00-\x1f][^/\\\x00-\x1f]{0,120}\.(md|txt|json)$/i.test(name)||name.includes('..'))throw Error('name');
    if(typeof data.text!=='string'||!data.text.trim())throw Error('empty');
    const inbox=path.join(officeRoot,'knowledge',scope==='shared'?'shared':'projects/'+slug(scope),'inbox');fs.mkdirSync(inbox,{recursive:true,mode:0o700});
    const file=path.join(inbox,name);if(fs.existsSync(file))return json(409,{error:'같은 이름이 있습니다. 새 이름으로 추가하세요.'});
    // Validate before publishing and remove rejected upload; never replace existing documents.
    fs.writeFileSync(file,data.text,{mode:0o600,flag:'wx'});const result=sync();if(!result.ok){fs.unlinkSync(file);sync();return json(400,{error:'지원하지 않는 문서 또는 비밀값이 포함된 문서입니다.'});}
    return json(201,{...result,saved:name});
   }catch{return json(400,{error:'문서 이름과 내용을 확인하세요. MD/TXT/JSON, 최대 2MB입니다.'});}
  }
  if(req.method!=='GET'||req.url!=='/'){res.writeHead(404);return res.end();}
  res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI 사무실 문서함</title><style>body{font:16px system-ui;max-width:760px;margin:40px auto;padding:20px;background:#f6f7f9;color:#222}input,select,textarea,button{font:inherit;box-sizing:border-box;padding:12px;margin:6px 0;width:100%;border:1px solid #bbb;border-radius:10px}textarea{min-height:240px}button{background:#225acb;color:white;cursor:pointer}pre{white-space:pre-wrap;background:white;padding:16px;border-radius:12px}label{display:block;margin-top:16px}</style><h1>AI 사무실 문서함</h1><p>문서를 추가하면 즉시 반영됩니다. 모든 담당자는 작업을 시작할 때 최신 문서 목록과 원문을 함께 받습니다.</p><p>기존 제품 문서는 자동 연결됩니다. 현재 실행 중인 작업의 기억이나 AI 모델 자체를 바꾸는 기능은 아닙니다. 새 문서는 다음 작업부터 적용됩니다.</p><form id="form"><label>적용할 프로젝트<select id="scope"></select></label><label>문서 파일 (MD·TXT·JSON)<input id="file" type="file" accept=".md,.txt,.json"></label><label>문서 이름<input id="name" placeholder="제품-추가-요구사항.md" required></label><label>문서 내용<textarea id="text" required placeholder="내용을 붙여넣어도 됩니다. 비밀번호·토큰은 넣지 마세요."></textarea></label><button>추가하고 즉시 반영</button></form><p id="message" role="status"></p><h2>반영 상태</h2><pre id="status"></pre><script>const token=${JSON.stringify(csrf)};const el=id=>document.getElementById(id);async function refresh(){const r=await fetch('/api/status').then(r=>r.json());el('status').textContent=r.ok?r.projects.map(p=>p.project+' · '+p.documents+'개 문서 · '+p.revision.slice(0,12)+' · '+p.updatedAt).join('\\n'):r.error;if(!el('scope').options.length){for(const p of [...r.projects.map(p=>({slug:p.project,name:p.project})),{slug:'shared',name:'모든 프로젝트 공통'}]){const o=document.createElement('option');o.value=p.slug;o.textContent=p.name;el('scope').append(o);}}}el('file').onchange=async e=>{const f=e.target.files[0];if(f){el('name').value=f.name;el('text').value=await f.text();}};el('form').onsubmit=async e=>{e.preventDefault();const b=el('form').querySelector('button');b.disabled=true;try{const r=await fetch('/api/documents',{method:'POST',headers:{'content-type':'application/json','x-knowledge-token':token},body:JSON.stringify({scope:el('scope').value,name:el('name').value,text:el('text').value})});const out=await r.json();el('message').textContent=r.ok?'반영 완료 — 다음 작업부터 모든 담당자에게 연결됩니다.':out.error;if(r.ok){el('name').value='';el('text').value='';el('file').value='';}await refresh();}catch{el('message').textContent='연결을 확인하고 다시 시도하세요.';}finally{b.disabled=false;}};refresh();setInterval(refresh,3000);</script></html>`);
 });server.listen(8791,'127.0.0.1',()=>console.log('AI office knowledge: http://127.0.0.1:8791'));
}else throw Error('Commands: sync | serve');
