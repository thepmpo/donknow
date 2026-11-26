/** Keep ready writes moving independently and wake when a retry becomes due. */
export function createDocenCalendarDelivery(store,deliver){
 const capacity=4;
 let timer,scheduled=Infinity,active=0,closed=false;

 function schedule(at){
  if(closed||at==null||scheduled<=at)return;
  clearTimeout(timer);
  scheduled=at;
  timer=setTimeout(()=>{
   scheduled=Infinity;
   pump();
  },Math.max(0,Math.min(2147483647,at-Date.now())));
  timer.unref();
 }

 function pump(){
  if(closed)return;
  try{
   while(active<capacity){
    const job=store.claimDocenGoogleDelivery();
    if(!job){
     schedule(store.nextDocenGoogleDeliveryAt());
     return;
    }
    active++;
    void send(job);
   }
  }catch{
   schedule(Date.now()+1000);
  }
 }

 async function send(job){
  let state='synced',externalId,retryAfterMs;
  try{
   externalId=await deliver(job);
  }catch(error){
   if(error?.code==='integration-reauthorization'||[401,403,404,409,410].includes(error?.status)){
    state='blocked';
    retryAfterMs=15*60*1000;
   }
   else if(error?.status===400)state='failed';
   else{
    state='queued';
    retryAfterMs=error?.retryAfterMs;
   }
  }
  try{
   store.finishDocenGoogleDelivery(job,state,externalId,retryAfterMs);
  }catch{
   // An expired lease is recoverable with the same provider event ID.
  }finally{
   active--;
   schedule(Date.now());
  }
 }

 return {
  wake:()=>schedule(Date.now()),
  close:()=>{closed=true;clearTimeout(timer);},
 };
}
