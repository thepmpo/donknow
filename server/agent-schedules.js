import {localClock} from './automations-store.js';
import {fail} from './secrets.js';
export function validateAgentSchedule(value){if(!value||typeof value!=='object'||!Array.isArray(value.hours)||!value.hours.length||value.hours.some(h=>!Number.isInteger(h)||h<0||h>23)||!Array.isArray(value.weekdays)||!value.weekdays.length||value.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6)||!Number.isInteger(value.minute)||value.minute<0||value.minute>59||value.monthDays!==undefined&&(!Array.isArray(value.monthDays)||!value.monthDays.length||value.monthDays.some(d=>!Number.isInteger(d)||d<1||d>31)))throw fail(400,'반복할 요일·날짜·시간을 확인해주세요.');try{localClock(Date.now(),value.timezone);}catch{throw fail(400,'반복할 시간대를 확인해주세요.');}return {timezone:value.timezone,hours:[...new Set(value.hours)],weekdays:[...new Set(value.weekdays)],minute:value.minute,...(value.monthDays?{monthDays:[...new Set(value.monthDays)]}:{})};}
/** Resolve local candidate times instead of blocking the API with a year of minute-by-minute scans. */
export function nextAgentSchedule(schedule,after){
 const first=localClock(after,schedule.timezone).date,origin=Date.parse(first+'T00:00:00Z');
 for(let dayIndex=0;dayIndex<370;dayIndex++){
  const day=origin+dayIndex*86400000,date=new Date(day).toISOString().slice(0,10),weekday=new Date(day).getUTCDay();
  if(!schedule.weekdays.includes(weekday)||schedule.monthDays&&!schedule.monthDays.includes(new Date(day).getUTCDate()))continue;
  const offsets=new Set();for(const hours of [-36,-12,12,36]){const sample=day+hours*3600000,c=localClock(sample,schedule.timezone);offsets.add(Date.parse(c.date+'T'+c.time+':00Z')-sample);}
  const candidates=[];for(const hour of schedule.hours)for(const offset of offsets){const at=day+hour*3600000+schedule.minute*60000-offset;if(at<=after)continue;const c=localClock(at,schedule.timezone);if(c.date===date&&Number(c.time.slice(0,2))===hour&&Number(c.time.slice(3))===schedule.minute)candidates.push(at);}
  if(candidates.length)return Math.min(...candidates);
 }throw fail(400,'다음 반복 시간을 계산하지 못했어요.');
}
