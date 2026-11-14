import {test} from 'node:test';import assert from 'node:assert/strict';
import {calendarStartLabel,calendarReminderInstant,reminderDateLabel,todoReminderInstant} from './calendar-display.ts';
import {notificationFromDetails} from '../../server/calendar-details.js';

test('two-week start labels use display zone, omit end time and distinguish continuation/all-day',()=>{
 const event={id:'a',title:'회의',dueDate:null,startAt:'2026-11-14T00:00:00Z',endAt:'2026-11-15T02:00:00Z'};
 assert.equal(calendarStartLabel(event,'2026-11-14','Asia/Seoul'),'09:00');
 assert.equal(calendarStartLabel(event,'2026-11-15','Asia/Seoul'),'계속');
 assert.equal(calendarStartLabel({...event,allDay:true},'2026-11-14','Asia/Seoul'),'');
 assert.equal(calendarStartLabel({...event,startAt:null},'2026-11-14','Asia/Seoul'),'시간 미정');
});
test('calendar reminder preview is the same absolute instant as server scheduling across DST',()=>{
 for(const day of ['2026-03-08','2026-11-01'])for(const minutes of [0,15,1440,2880,10080]){
  const snapshot={day,timeZone:'America/New_York',title:'종일 일정'};
  const server=notificationFromDetails({id:'a',eventId:'e',calendarId:'p',fields:{reminderMinutes:minutes},snapshot},0);
  assert.equal(calendarReminderInstant(day,'12:00',true,'America/New_York',minutes),server.at);
 }
});
test('reminder preview names the exact day even when an alert crosses midnight',()=>{
 const at=calendarReminderInstant('2026-11-14','00:05',false,'Asia/Seoul',10);
 assert.equal(at,'2026-11-13T14:55:00.000Z');const label=reminderDateLabel(at!,'Asia/Seoul');assert.match(label,/2026/);assert.match(label,/11월 13일/);assert.match(label,/11:55/);
});
test('invalid or nonexistent alert times cannot be silently normalized to another hour',()=>{
 assert.equal(calendarReminderInstant('2026-11-14','09:00',true,'UTC',null),null);
 assert.throws(()=>calendarReminderInstant('2026-03-08','02:30',false,'America/New_York',0));
 assert.throws(()=>calendarReminderInstant('2026-11-14','09:00',true,'UTC',-1));
});
test('editing text preserves an existing alarm on the second DST overlap occurrence',()=>{
 const original='2026-11-01T06:30:00.000Z';
 assert.equal(todoReminderInstant('2026-11-01','01:30','America/New_York',original),original);
 assert.equal(calendarReminderInstant('2026-11-01','01:30',false,'America/New_York',15,original),'2026-11-01T06:15:00.000Z');
 assert.equal(todoReminderInstant('2026-11-02','09:00','America/New_York',original),'2026-11-02T14:00:00.000Z');
});
