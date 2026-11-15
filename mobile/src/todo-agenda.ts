import type {Todo} from './domain.ts';
import type {CalendarEvent} from './calendar-model.ts';
import {eventOccurs,shiftDay} from './calendar-model.ts';
export function todoAgenda(todos:Todo[],events:CalendarEvent[],today:string,zone:string){
 const dates=new Set(todos.filter(t=>t.dueDate&&t.dueDate>=today).map(t=>t.dueDate!));
 for(let i=0;i<14;i++){const day=shiftDay(today,i);if(events.some(e=>eventOccurs(e,day,zone)))dates.add(day);}
 if(!dates.size&&!todos.length)dates.add(today);
 const groups=[...[...dates].sort().map(day=>({key:day,day,title:day===today?'오늘':day===shiftDay(today,1)?'내일':new Intl.DateTimeFormat('ko-KR',{weekday:'long'}).format(new Date(day+'T12:00:00')),todos:todos.filter(t=>t.dueDate===day).sort((a,b)=>(a.dueTime??'99:99').localeCompare(b.dueTime??'99:99')),events:events.filter(e=>eventOccurs(e,day,zone)).sort((a,b)=>Number(!a.allDay)-Number(!b.allDay)||(a.startAt??'').localeCompare(b.startAt??''))}))];
 const overdue=todos.filter(t=>t.dueDate&&t.dueDate<today),undated=todos.filter(t=>!t.dueDate);
 if(overdue.length)groups.unshift({key:'overdue',day:'',title:'지난 할 일',todos:overdue,events:[]});
 if(undated.length)groups.push({key:'undated',day:'',title:'날짜 없음',todos:undated,events:[]});
 return groups;
}
