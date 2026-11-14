import {fail} from './secrets.js';
export function calendarZone(value='Asia/Seoul'){
 if(typeof value!=='string'||value.length>80)throw fail(400,'시간대를 확인해주세요.');
 try{return new Intl.DateTimeFormat('en',{timeZone:value}).resolvedOptions().timeZone;}catch{throw fail(400,'시간대를 확인해주세요.');}
}
export function calendarDay(instant,zone){return new Intl.DateTimeFormat('sv-SE',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(instant));}
export function calendarMidnight(day,zone){return calendarWallClock(day,zone);}
export function calendarWallClock(day,zone,hour=0,minute=0){
 const [y,m,d]=day.split('-').map(Number),target=Date.UTC(y,m-1,d,hour,minute);let guess=target;
 const format=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<5;i++){const p=Object.fromEntries(format.formatToParts(new Date(guess)).map(x=>[x.type,x.value]));const seen=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);const delta=target-seen;if(!delta)return new Date(guess).toISOString();guess+=delta;}
 throw fail(400,'이 시간대의 날짜 경계를 확인할 수 없어요.');
}
export function calendarIdentifier(value,fallback='primary'){
 const id=value??fallback;if(typeof id!=='string'||!id||id.length>1024||/[\x00-\x1f\x7f]/.test(id))throw fail(400,'캘린더를 다시 선택해주세요.');return id;
}
