// Operator-only approval control. Secrets remain in the independent office's local settings.
import {readFile} from 'node:fs/promises';
const [command,id,value,confirmation]=process.argv.slice(2);
const runtime=process.env.AI_OFFICE_RUNTIME_PATH??'/workspace/ai-office-runtime';
const config=Object.fromEntries((await readFile(runtime+'/.env','utf8')).split(/\r?\n/).filter(line=>line&&!line.startsWith('#')&&line.includes('=')).map(line=>{const i=line.indexOf('=');return [line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^['"]|['"]$/g,'')];}));
const url=new URL(process.env.AI_OFFICE_API_URL??'http://127.0.0.1:8790');
if(!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.protocol!=='http:'||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw Error('Only a loopback office origin is allowed');
const headers={'content-type':'application/json',...(config.API_AUTH_TOKEN?{authorization:'Bearer '+config.API_AUTH_TOKEN}:{})};
const session=await fetch(url.origin+'/api/auth/session',{headers,signal:AbortSignal.timeout(5000)});
if(!session.ok)throw Error('Office authentication unavailable: '+session.status);
headers['x-csrf-token']=(await session.json()).csrf_token;
const cookie=session.headers.get('set-cookie')?.split(';')[0];if(cookie)headers.cookie=cookie;
let endpoint='/api/office-policy/status',method='GET',body;
if(command!=='status'){
 if(!/^[a-zA-Z0-9-]{1,64}$/.test(id??''))throw Error('Use an existing office task ID');
 if(!config.AI_OFFICE_OWNER_KEY)throw Error('Office owner control has not been configured');
 headers['x-office-owner-key']=config.AI_OFFICE_OWNER_KEY;
 method='POST';
 if(command==='prepare'){
  if(!['product','development'].includes(value))throw Error('Phase must be product or development');
  endpoint=`/api/office-policy/tasks/${id}/prepare`;body={phase:value};
 }else if(command==='approve'){
  if(!/^[a-f0-9]{64}$/.test(value??'')||confirmation!=='--confirm')throw Error('Review the handoff and use approve <task-id> <exact-digest> --confirm only after the user approves this scope');
  endpoint=`/api/office-policy/tasks/${id}/approve`;body={expectedDigest:value,confirmation:true};
 }else if(command==='revoke'){endpoint=`/api/office-policy/tasks/${id}/revoke`;body={};}
 else throw Error('Commands: status | prepare <task-id> <product|development> | approve <task-id> <digest> --confirm | revoke <task-id>');
}
const response=await fetch(url.origin+endpoint,{method,headers,signal:AbortSignal.timeout(10000),...(body?{body:JSON.stringify(body)}:{})});
const result=await response.json();if(!response.ok)throw Error(`Office policy ${response.status}: ${result.error??'request_failed'}`);
console.log(JSON.stringify(result,null,2));
