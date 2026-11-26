import {test} from 'node:test';import assert from 'node:assert/strict';
import {eventDraft,eventDraftForDateMove,calendarWriteArgs,calendarDuckPatch,confirmedCalendarPatch} from './calendar-edit-model.ts';
import type {CalendarEvent} from './calendar-model.ts';
const event:CalendarEvent={id:'scoped',eventId:'event',calendarId:'primary',title:'회의',dueDate:'2026-11-01',startAt:'2026-11-01T01:30:00-05:00',endAt:'2026-11-01T02:30:00-05:00',timeZone:'America/New_York',etag:'v1',location:'서울',notes:'원본',duckDetails:{revision:2,fields:{localNotes:'docen 메모',reminderMinutes:30,url:'https://example.test',attachments:[]}}};
test('unchanged and docen-only edits never rewrite source times at a DST overlap',()=>{
 const d=eventDraft('2026-11-01','America/New_York','primary',event);assert.equal(calendarWriteArgs(d,event),null);assert.deepEqual(calendarDuckPatch(d,event),{});
 const edited={...d,title:'바꾼 제목'};assert.deepEqual(calendarWriteArgs(edited,event),{title:'바꾼 제목',calendarId:'primary',id:'event',expectedETag:'v1'});assert.deepEqual(confirmedCalendarPatch(edited,event),{title:'바꾼 제목'});
 assert.equal(calendarWriteArgs({...d,localNotes:'별도 메모'},event),null);assert.deepEqual(calendarDuckPatch({...d,localNotes:'별도 메모'},event),{localNotes:'별도 메모'});
});
test('all-day end is inclusive in UI, exclusive in source; local patches do not clear omitted fields',()=>{
 const e={...event,allDay:true,dueDate:'2026-11-13',endDate:'2026-11-16'},d=eventDraft('2026-11-13','Asia/Seoul','primary',e);assert.equal(d.endDay,'2026-11-15');
 const args=calendarWriteArgs({...d,endDay:'2026-11-16'},e)!;assert.equal(args.endDate,'2026-11-17');assert.equal(args.startDate,'2026-11-13');assert.equal(args.title,undefined);assert.equal(args.reminderMinutes,undefined);
 assert.deepEqual(calendarDuckPatch({...d,reminderMinutes:null},e),{reminderMinutes:null});
 assert.throws(()=>calendarWriteArgs({...d,endDay:'2026-11-12'},e));
});
test('long provider notes remain untouched and legacy servers receive the previous complete common fields',()=>{
 const e={...event,notesPartial:true},d=eventDraft('2026-11-01','America/New_York','primary',e);const args=calendarWriteArgs({...d,title:'수정'},e,true)!;assert.equal(args.notes,undefined);assert.ok(args.start);assert.equal(args.localNotes,undefined);assert.equal(args.attachments,undefined);
});
test('new events validate invitation addresses, preserve repeat options and reject reversed times',()=>{
 const d={...eventDraft('2026-11-25','Asia/Seoul','primary'),title:'주간 회의',repeat:'weekly' as const,guests:'Person@example.test; other@example.test,Person@example.test'};
 const args=calendarWriteArgs(d)!;assert.deepEqual(args.recurrence,['RRULE:FREQ=WEEKLY']);assert.deepEqual(args.attendees,['person@example.test','other@example.test']);
 assert.throws(()=>calendarWriteArgs({...d,guests:'잘못된 주소'}),/이메일/);assert.throws(()=>calendarWriteArgs({...d,allDay:false,startTime:'12:00',endTime:'11:00'}),/종료 시간/);
 const edit=calendarWriteArgs({...eventDraft('2026-11-25','Asia/Seoul','primary',event),title:'제목만 변경',repeat:'daily',guests:'new@example.test'},event)!;assert.equal(edit.recurrence,undefined);assert.equal(edit.attendees,undefined);
});

test('dragging the second day of a multi-day event shifts all dates by the same amount',()=>{
 const source={id:'span',eventId:'original',calendarId:'primary',title:'여러 날',dueDate:'2026-11-24',endDate:'2026-11-27',allDay:true,etag:'v2'};
 const draft=eventDraftForDateMove(source,'2026-11-25','2026-11-28','Asia/Seoul');
 assert.deepEqual(calendarWriteArgs(draft,source),{allDay:true,startDate:'2026-11-27',endDate:'2026-11-30',timeZone:'Asia/Seoul',calendarId:'primary',id:'original',expectedETag:'v2'});
});
