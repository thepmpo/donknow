import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeCalendarCopies} from './calendar-copies.ts';
import type {CalendarEvent} from './calendar-model.ts';

const apple:CalendarEvent={id:'apple-12',externalUid:'first',provider:'apple-calendar',calendarId:'@apple/test',
 title:'일정',dueDate:'2026-11-12',startAt:'2026-11-12T00:00:00.000Z',endAt:'2026-11-12T01:00:00.000Z',canWrite:true};
const google:CalendarEvent={...apple,id:'google-12',provider:'google',calendarId:'primary',
 startAt:'2026-11-12T09:00:00+09:00',endAt:'2026-11-12T10:00:00+09:00'};

test('merge the same calendar occurrence across Apple and Google and prefer a writable copy',()=>{
 const nextOccurrence={...apple,id:'apple-13',dueDate:'2026-11-13',startAt:'2026-11-13T00:00:00Z',endAt:'2026-11-13T01:00:00Z'};
 assert.deepEqual(mergeCalendarCopies([apple,google,nextOccurrence]).map(e=>e.id),[google.id,nextOccurrence.id]);
 assert.deepEqual(mergeCalendarCopies([apple,{...google,canWrite:false}]).map(e=>e.id),[apple.id]);
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
