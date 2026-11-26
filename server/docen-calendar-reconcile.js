import {fail} from './secrets.js';

const stamp=value=>typeof value==='string'&&Number.isFinite(Date.parse(value))?new Date(value).toISOString():null;
const day=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\d$/.test(value)&&stamp(value)?.slice(0,10)===value?value:null;

// Compare only fields shared by the two calendars. Provider metadata stays where it was set.
export function calendarSyncFields(value){
 const allDay=value?.allDay===true;
 const start=allDay?day(value?.startDate):stamp(value?.start);
 const end=allDay?day(value?.endDate):stamp(value?.end);
 if(!start||!end||start>=end||typeof value?.title!=='string'||value.title.length>300
  ||typeof (value.notes??'')!=='string'||(value.notes?.length??0)>4000)throw fail(422,'비교할 일정 내용을 확인해주세요.');
 return {title:value.title.trim()||'제목 없음',notes:value.notes??'',allDay,
  ...(allDay?{startDate:start,endDate:end}:{start,end})};
}
export function calendarSyncTime(value){return stamp(value);}
export function resolveCalendarCopies(docen,remote,baseline){
 const local=JSON.stringify(calendarSyncFields(docen.fields));
 const original=JSON.stringify(calendarSyncFields(remote.fields));
 if(local===original)return 'equal';
 const l=Date.parse(stamp(docen.updatedAt)??''),r=Date.parse(stamp(remote.updatedAt)??'');
 if(baseline){
  const previous=JSON.stringify(calendarSyncFields(baseline));
  if(local===previous)return 'original';
  if(original===previous)return 'docen';
 }
 if(Number.isFinite(l)&&Number.isFinite(r)&&l!==r)return r>l?'original':'docen';
 return 'docen';
}
