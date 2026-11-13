import {visibleDays} from './calendar-model.ts';

export type YearZoomRect={x:number;y:number;width:number;height:number};
export const yearMotion={duration:420,fade:120,easing:[.22,1,.36,1] as const};
export const yearLimits={min:1900,max:2100};
export function boundedYear(year:number){return Math.max(yearLimits.min,Math.min(yearLimits.max,year));}
export function yearMonths(year:number){return Array.from({length:12},(_,i)=>String(boundedYear(year))+'-'+String(i+1).padStart(2,'0'));}
// Dates use the same Sunday/Monday preference and Gregorian rules as the real month.
export function miniMonthWeeks(month:string,startDay=0){
 const days=visibleDays(month,month+'-01','month',startDay);
 return Array.from({length:6},(_,row)=>Array.from({length:7},(_,col)=>{
  const day=days[row*7+col];return day?.startsWith(month)?day:null;
 }));
}
// Uniform scaling: preserve text proportions; crossfade to the miniature grid.
export function yearZoomTransform(body:{width:number;height:number},tile:YearZoomRect){
 const scale=Math.max(.01,Math.min(1,tile.width/Math.max(1,body.width),tile.height/Math.max(1,body.height)));
 return {scale,x:tile.x+tile.width/2-body.width/2,y:tile.y+tile.height/2-body.height/2};
}
