import {googleAccounts} from './google-accounts.js';

export function startGoogleBackgroundSync(store,integrations,{enabled=true}={}){
 let stopped=false,running=false,currentUser='',currentEvent={user:'',id:''};
 async function scanPages(read,visit){
  const cursors=new Set();
  let cursor;
  do{
   if(stopped)return;
   const page=await read(cursor);
   await visit(page.items);
   cursor=page.nextCursor;
   if(cursor&&cursors.has(cursor))throw Error('Repeated Google cursor');
   if(cursor)cursors.add(cursor);
  }while(cursor);
 }
 async function syncTasks(user){
  for(const account of googleAccounts(store,user)){
   if(stopped||!account.features.includes('tasks'))continue;
   const read=(list,cursor)=>integrations.resources(user,'google','tasks',list,cursor,'sync',undefined,account.connectionId);
   await scanPages(cursor=>read(null,cursor),async lists=>{
    for(const list of lists){
     await scanPages(cursor=>read(list.id,cursor),items=>{
      if(!stopped)store.syncTaskResources(user,'google',items);
     }).catch(()=>{});
    }
   }).catch(()=>{});
  }
 }
 async function tick(){
  if(stopped||running)return;
  running=true;
  try{
   const users=store.googleSyncUsers(currentUser,3);
   const events=store.linkedGoogleSyncPage(currentEvent,12);
   currentUser=users.length===3?users.at(-1):'';
   currentEvent=events.length===12?events.at(-1):{user:'',id:''};
   await Promise.allSettled([
    ...users.map(syncTasks),
    (async()=>{
     for(const item of events){
      if(stopped)return;
      await integrations.reconcileDocenGoogleCalendar(item.user,item.id,item.revision).catch(()=>{});
     }
    })(),
   ]);
  }finally{running=false;}
 }
 const run=()=>{void tick().catch(()=>{});};
 const timer=enabled?setInterval(run,60000):null;
 const start=enabled?setTimeout(run,1000):null;
 timer?.unref();start?.unref();
 return {tick,stop(){stopped=true;clearInterval(timer);clearTimeout(start);}};
}
