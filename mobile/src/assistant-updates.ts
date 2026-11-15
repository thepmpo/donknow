type Change={owner:string;clear?:boolean};
const listeners=new Set<(change:Change)=>void>();
export function assistantUpdated(change:Change){for(const listener of listeners)listener(change);}
export function onAssistantUpdated(listener:(change:Change)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
