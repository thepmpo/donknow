import {AsyncLocalStorage} from 'node:async_hooks';
const current=new AsyncLocalStorage();
export function requestMetrics(req,res,work){
 const metric={dbCalls:0,dbMs:0,providerCalls:0,providerMs:0},start=performance.now();
 res.once('finish',()=>{const totalMs=Math.round(performance.now()-start);if(totalMs<1000)return;const path=req.url.split('?')[0];
  console.log(JSON.stringify({event:'handler-timing',route:path.startsWith('/api/admin/')?'admin':path.startsWith('/api/calendar')?'calendar':path.startsWith('/api/todos')?'todo':path.startsWith('/api/assistant')?'assistant':'other',method:req.method,status:res.statusCode,totalMs,dbCalls:metric.dbCalls,dbMs:Math.round(metric.dbMs),providerCalls:metric.providerCalls,providerMs:Math.round(metric.providerMs)}));
 });return current.run(metric,work);
}
export async function measureExternal(work){const metric=current.getStore(),start=performance.now();try{return await work();}finally{if(metric){metric.providerCalls++;metric.providerMs+=performance.now()-start;}}}
export function instrumentDatabase(db){
 function measured(fn){const metric=current.getStore(),start=performance.now();try{return fn();}finally{if(metric){metric.dbCalls++;metric.dbMs+=performance.now()-start;}}}
 return {exec:sql=>measured(()=>db.exec(sql)),prepare(sql){const stmt=db.prepare(sql);return new Proxy(stmt,{get(target,key){const value=Reflect.get(target,key,target);return typeof value==='function'?(...args)=>['get','all','run'].includes(key)?measured(()=>value.apply(target,args)):value.apply(target,args):value;}});},close:()=>db.close()};
}
