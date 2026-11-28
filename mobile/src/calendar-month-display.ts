import {calendarStartLabel} from './calendar-display.ts';
import type {CalendarEvent} from './calendar-model.ts';

const gap=3;
export const monthTitleLine=16,monthTimeLine=13,monthLabelScale=1.15;
export const monthTitleFadeWidth=12;

export function monthStartLabel(event:CalendarEvent,day:string,zone:string){
 const time=calendarStartLabel(event,day,zone);
 if(!/^\d{2}:\d{2}$/.test(time))return time;
 const [hour,minute]=time.split(':');
 return (+hour<12?'오전 ':'오후 ')+(+hour%12||12)+(minute==='00'?'시':':'+minute);
}

export function monthDayLayout(events:CalendarEvent[],todoCount:number,budget:number,fontScale:number){
 const scale=Math.min(fontScale,monthLabelScale);
 const title=Math.ceil(monthTitleLine*scale),time=Math.ceil(monthTimeLine*scale);
 const row=title+4,overflow=Math.ceil(monthTimeLine*scale);
 const ordered=[...events].sort((a,b)=>Number(!!b.allDay)-Number(!!a.allDay)||(a.startAt?Date.parse(a.startAt):0)-(b.startAt?Date.parse(b.startAt):0));
 const showTodo=todoCount>0?1:0,total=ordered.length+todoCount;
 let visible=Math.min(ordered.length+showTodo,Math.max(0,Math.floor((budget+gap)/(row+gap))));
 if(visible<total)visible=Math.min(visible,Math.max(0,Math.floor((budget-overflow)/(row+gap))));
 const remaining=total-visible;
 let space=budget-visible*(row+gap)-(remaining?overflow:-gap);
 const cards=ordered.slice(0,visible).map(event=>({event,height:row,titleLines:1,showTime:false}));
 // Fit the most titles first, then spend spare space on time and wrapping.
 for(const card of cards){
  if(card.event.allDay||!card.event.startAt||space<time)continue;
  card.showTime=true;card.height+=time;space-=time;
 }
 for(const card of cards){
  if(!card.showTime||space<title)continue;
  card.titleLines=2;card.height+=title;space-=title;
 }
 return {cards,showTodo:visible>cards.length,remaining,row,overflowFits:budget>=overflow};
}

function mix(hex:string,target:string,amount:number){
 return '#'+[0,2,4].map(offset=>{
  const start=parseInt(hex.slice(offset,offset+2),16),end=parseInt(target.slice(offset,offset+2),16);
  return Math.round(start+(end-start)*amount).toString(16).padStart(2,'0');
 }).join('');
}

export function monthEventPalette(color:string,dark:boolean){
 if(!/^#[0-9a-f]{6}$/i.test(color))return null;
 const hex=color.slice(1);
 return dark
  ?{background:mix(hex,'10151f',.72),text:mix(hex,'ffffff',.76)}
  :{background:mix(hex,'ffffff',.73),text:mix(hex,'10151f',.74)};
}
