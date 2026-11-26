import {googleAccounts} from './google-accounts.js';
import {fail} from './secrets.js';

export function createTodoDelivery(store,integrations,{background=true}={}){
 const delivery=store.todoDelivery;
 let running=false,wakeup;
 async function options(user,connectionId,cursor){
  const accounts=googleAccounts(store,user).filter(a=>a.connectionId&&a.features.includes('tasksWrite'));
  if(!connectionId)return {accounts:accounts.map(a=>({id:a.connectionId,title:a.label})),items:[]};
  if(!accounts.some(a=>a.connectionId===connectionId))throw fail(403,'ME에서 Google Tasks 수정 권한을 승인해주세요.');
  return integrations.taskMoveLists(user,connectionId,cursor);
 }
 async function tick(){
  if(running)return;
  running=true;
  try{
   for(const job of delivery.pendingGoogle()){
    const {user_id:user,todo_id:id}=job,todo=store.get(user,id);
    if(!todo)continue;
    let attempt=null;
    try{
     const source=await integrations.createGoogleTask(user,JSON.parse(job.target),()=>{
      attempt=delivery.claim(user,id,'google');return attempt?store.get(user,id):null;
     });
     if(source&&attempt)delivery.finish(user,id,attempt,source);
    }catch(error){
     const code=error?.status,delay=Math.max(5000,Math.min(error?.retryAfterMs??30000,3600000));
     const blocked=code>=400&&code<500&&code!==408&&code!==429;
     // Google Tasks assigns its own ID. A lost response leaves the result uncertain.
     if(attempt)delivery.settle(user,id,attempt,blocked?'blocked':code===429?'queued':'checking',code===429?delay:0);
     else delivery.block(job,blocked?'blocked':'queued',blocked?0:delay);
    }
   }
  }finally{running=false;}
 }
 function wake(){if(background&&!wakeup){wakeup=setTimeout(()=>{wakeup=null;void tick().catch(()=>{});},100);wakeup.unref();}}
 const timer=background?setInterval(wake,5000):null;
 timer?.unref();
 return {options,wake,tick,stop(){clearInterval(timer);clearTimeout(wakeup);}};
}
