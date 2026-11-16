/** Older installed apps only accept the original four source states. Keep
 * their lists readable while upgraded clients can display the queued state. */
export function todoWire(value,modern){
 if(modern||value===null||typeof value!=='object')return value;
 if(Array.isArray(value))return value.map(item=>todoWire(item,false));
 return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='sourceSync'&&item?.state==='queued'?{...item,state:'unknown'}:todoWire(item,false)]));
}
