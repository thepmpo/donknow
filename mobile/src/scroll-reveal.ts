/** Keep the whole control visible when it fits; align oversized regions at top. */
export function revealOffset(offset:number,viewportTop:number,viewportHeight:number,targetTop:number,targetHeight:number,gap=12){
 const available=Math.max(0,viewportHeight-gap*2),bottom=targetTop+Math.min(targetHeight,available);
 if(targetTop<viewportTop+gap)return Math.max(0,offset+targetTop-viewportTop-gap);
 if(bottom>viewportTop+viewportHeight-gap)return Math.max(0,offset+bottom-viewportTop-viewportHeight+gap);
 return offset;
}
