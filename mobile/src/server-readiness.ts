/** Warm a sleeping API using only health GETs before sending a user write once. */
export function createServerReadiness({probe,now=Date.now,pause=(ms:number)=>new Promise<void>(r=>setTimeout(r,ms)),budget=45000}:{probe:(base:string)=>Promise<void>;now?:()=>number;pause?:(ms:number)=>Promise<void>;budget?:number}){
 const ready=new Map<string,number>(),pending=new Map<string,Promise<void>>();
 function mark(base:string){ready.set(base,now());}
 async function wait(base:string){
  if(ready.has(base)&&now()-ready.get(base)!<30000)return;
  let task=pending.get(base);if(task)return task;
  task=(async()=>{const deadline=now()+budget;let attempt=0;for(;;){try{await probe(base);mark(base);return;}catch(error){const status=(error as {status?:number})?.status;if(status!==undefined&&status<500&&status!==200)throw error;if(now()>=deadline)throw error;await pause(Math.min(250*2**Math.min(attempt++,3),Math.max(0,deadline-now())));}}})();
  pending.set(base,task);try{await task;}finally{if(pending.get(base)===task)pending.delete(base);}
 }
 return {mark,wait};
}
