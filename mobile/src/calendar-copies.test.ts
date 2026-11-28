import test from 'node:test';
import assert from 'node:assert/strict';
import {appleCalendarView,displayCalendarMirror,mergeCalendarCopies,mergeDeviceCalendarView} from './calendar-copies.ts';
import type {CalendarEvent} from './calendar-model.ts';

const apple:CalendarEvent={id:'apple-12',externalUid:'first',provider:'apple-calendar',calendarId:'@apple/test',
 title:'일정',dueDate:'2026-11-12',startAt:'2026-11-12T00:00:00.000Z',endAt:'2026-11-12T01:00:00.000Z',canWrite:true};
const google:CalendarEvent={...apple,id:'google-12',provider:'google',calendarId:'primary',
 startAt:'2026-11-12T09:00:00+09:00',endAt:'2026-11-12T10:00:00+09:00'};
test('Apple calendar view shows all native calendars, excludes stale copies, and retains a pending Apple write',()=>{
 const recurring={...apple,id:'apple-26',eventId:'repeat',externalUid:'monthly',calendarId:'@apple/other',
  dueDate:'2026-11-26',endDate:'2026-11-27',allDay:true,recurring:true};
 const stale:CalendarEvent={...apple,id:'stale',provider:'docen',calendarId:'@docen',
  mirror:{provider:'apple-calendar',calendarId:'@apple/test',externalEventId:'gone',state:'synced'}};
 const pending:CalendarEvent={...stale,id:'pending',mirror:{...stale.mirror!,externalEventId:undefined,state:'queued'}};
 assert.deepEqual(appleCalendarView([google,stale,apple,recurring,pending]).map(event=>event.id),
  ['apple-12','apple-26','pending']);
 assert.deepEqual(appleCalendarView([google,stale,apple,pending]).map(event=>event.id),['apple-12','pending']);
});
test('a newer Apple date is visible before reconciliation while a local unsent edit stays visible',()=>{
 const copy:CalendarEvent={...apple,id:'docen-copy',provider:'docen',etag:'4',duckDetails:{revision:4,fields:{}},
  mirror:{state:'synced',provider:'apple-calendar',calendarId:'@apple/test',syncRevision:4}};
 const moved={...apple,etag:'apple-current',dueDate:'2026-11-26',startAt:'2026-11-26T00:00:00.000Z',endAt:'2026-11-26T01:00:00.000Z'};
 const displayed=displayCalendarMirror(copy,moved);
 assert.equal(displayed.dueDate,'2026-11-26');
 assert.equal(displayed.id,copy.id);
 assert.equal(displayed.etag,'4');
 assert.equal(displayCalendarMirror({...copy,duckDetails:{revision:5,fields:{}}},moved).dueDate,'2026-11-12');
});

test('merge the same calendar occurrence across Apple and Google and prefer a writable copy',()=>{
 const nextOccurrence={...apple,id:'apple-13',dueDate:'2026-11-13',startAt:'2026-11-13T00:00:00Z',endAt:'2026-11-13T01:00:00Z'};
 assert.deepEqual(mergeCalendarCopies([apple,google,nextOccurrence]).map(e=>e.id),[google.id,nextOccurrence.id]);
 assert.deepEqual(mergeCalendarCopies([apple,{...google,canWrite:false}]).map(e=>e.id),[apple.id]);
});
test('the device view prefers the Apple copy and keeps selected independent cloud events',()=>{
 const separate={...google,id:'google-only',externalUid:'separate'};
 assert.deepEqual(mergeDeviceCalendarView([google,apple,separate]).map(event=>event.id),[apple.id,separate.id]);
 assert.deepEqual(mergeDeviceCalendarView([google,apple,separate],['@apple/test']).map(event=>event.id),[google.id,separate.id]);
});
test('keep separate same-title entries and calendars that share an ambiguous UID',()=>{
 assert.equal(mergeCalendarCopies([apple,{...google,externalUid:'second'}]).length,2);
 assert.equal(mergeCalendarCopies([apple,google,{...apple,id:'other-calendar',calendarId:'@apple/second'}]).length,3);
 assert.deepEqual(mergeCalendarCopies([apple,{...apple,id:'apple-new-id'}]).map(e=>e.id),['apple-new-id']);
});

test('same original stays merged while one provider still has the previous duration',()=>{
 const staleCopy={...apple,endAt:'2026-11-12T00:30:00Z'};
 assert.deepEqual(mergeCalendarCopies([staleCopy,google]).map(e=>e.id),[google.id]);
});

test('same Google calendar duplicates collapse but a second account is independent',()=>{
 const first={...google,connectionId:'one'};
 assert.deepEqual(mergeCalendarCopies([first,{...first,id:'duplicate'}]).map(e=>e.id),['duplicate']);
 assert.equal(mergeCalendarCopies([first,{...first,id:'independent',connectionId:'two'}]).length,2);
});
