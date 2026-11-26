type Offset={x:number;y:number};
export function calendarGestureAxis(from:Offset,to:Offset){
 'worklet';
 const x=Math.abs(to.x-from.x),y=Math.abs(to.y-from.y);
 if(x>=13&&x>y*1.35)return 'horizontal';
 if(y>=14&&y>x*1.15)return 'vertical';
 return 'undecided';
}
