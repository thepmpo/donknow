import {test} from 'node:test';import assert from 'node:assert/strict';
import {normalizeAppleEvent,appleEventPatch,saveAppleCalendar,appleCalendarSource} from './apple-calendar-model.ts';
import type {AppleCalendarDevice,DeviceEvent} from './apple-calendar-model.ts';
import {eventDraft} from './calendar-edit-model.ts';
import {appleCalendarDocument,utf8Base64} from './apple-calendar-export.ts';
const calendar={id:'icloud-1',title:'개인 일정',account:'iCloud',writable:true},native:DeviceEvent={id:'event-1',calendarId:'icloud-1',title:'원본 회의',notes:'실제 본문과 할 일',location:'원본 장소',url:'https://example.test',startDate:'2026-11-25T00:00:00.000Z',endDate:'2026-11-25T01:00:00.000Z',allDay:false,timeZone:'Asia/Seoul',modified:'2026-11-25T00:00:00.000Z',alarms:[{relativeOffset:-30}],recurrence:{frequency:'weekly'}};
function device(){let record={...native},writes=0;const d:AppleCalendarDevice={available:true,granted:async()=>true,authorize:async()=>true,calendars:async()=>[calendar],events:async()=>[record],read:async()=>record,create:async(id,patch)=>{writes++;record={...native,...patch,id:'created'};return record;},update:async(id,start,patch)=>{writes++;record={...record,...patch,modified:'2026-11-25T00:01:00.000Z'};return record;},remove:async()=>{writes++;}};return {d,get:()=>record,writes:()=>writes,change:()=>{record={...record,title:'원본에서 바뀜'};}};}
test('Apple calendar edits write back only changed fields and preserve native timing, alarms and recurrence',async()=>{const {d,get,writes}=device(),e=normalizeAppleEvent(native,calendar),draft={...eventDraft('2026-11-25','Asia/Seoul',e.calendarId!,e),title:'docen 수정'};
 assert.deepEqual(appleEventPatch(draft,e),{title:'docen 수정'});const saved=await saveAppleCalendar(d,draft,e,()=>true);assert.equal(saved.title,'docen 수정');assert.equal(get().title,'docen 수정');assert.deepEqual(get().recurrence,native.recurrence);assert.deepEqual(get().alarms,native.alarms);assert.equal(writes(),1);
});
test('native all-day end remains exclusive across source timezone; no cloud action is needed',async()=>{const {d,writes}=device(),id=appleCalendarSource(calendar).id,draft={...eventDraft('2026-11-25','Asia/Seoul',id),title:'화수 일정',endDay:'2026-11-26'};const saved=await saveAppleCalendar(d,draft,undefined,()=>true);assert.equal(saved.dueDate,'2026-11-25');assert.equal(saved.endDate,'2026-11-27');assert.equal(writes(),1);});
test('permission, source conflicts and owner changes block native writes; uncertain writes never retry themselves',async()=>{const f=device(),e=normalizeAppleEvent(native,calendar),draft={...eventDraft('2026-11-25','Asia/Seoul',e.calendarId!,e),title:'내 초안'};f.change();await assert.rejects(saveAppleCalendar(f.d,draft,e,()=>true),/원본 일정/);assert.equal(f.writes(),0);await assert.rejects(saveAppleCalendar({...f.d,granted:async()=>false},draft,e,()=>true),/ME/);await assert.rejects(saveAppleCalendar(f.d,draft,undefined,()=>false),/계정/);assert.equal(f.writes(),0);
 let calls=0;await assert.rejects(saveAppleCalendar({...f.d,create:async()=>{calls++;throw Error('lost result');}},draft,undefined,()=>true),e=>!!e&&typeof e==='object'&&'writeState' in e&&e.writeState==='unknown');assert.equal(calls,1);
});
test('AI calendar export contains selected real event bodies only, with owner-visible dates and UTF-8 intact',()=>{const text=appleCalendarDocument([calendar],[native,{...native,id:'other',calendarId:'not-selected'}],'2026-11-01','2026-12-01'),decoded=Buffer.from(utf8Base64(text),'base64').toString('utf8');assert.equal(decoded,text);const document=JSON.parse(decoded);assert.equal(document.events.length,1);assert.equal(document.events[0].notes,native.notes);assert.equal(document.start,'2026-11-01');assert.equal(document.end,'2026-12-01');assert.throws(()=>appleCalendarDocument([calendar],[native],'2026-12-01','2026-11-01'));});

test('EventKit civil dates stay on the selected local day for all-day events',()=>{
 const event=normalizeAppleEvent({...native,allDay:true,timeZone:'UTC',
  startDate:'2026-11-25T15:00:00Z',endDate:'2026-11-26T15:00:00Z',
  allDayStart:'2026-11-26',allDayEnd:'2026-11-27',externalUid:'eventkit-uid'},calendar);
 assert.equal(event.dueDate,'2026-11-26');
 assert.equal(event.endDate,'2026-11-27');
 assert.equal(event.externalUid,'eventkit-uid');
});

test('EventKit all-day occurrences with the same civil start and end still cover their start day',()=>{
 const event=normalizeAppleEvent({...native,allDay:true,recurrence:true,
  allDayStart:'2026-11-26',allDayEnd:'2026-11-26'},calendar);
 assert.equal(event.dueDate,'2026-11-26');
 assert.equal(event.endDate,'2026-11-27');
 assert.equal(event.recurring,true);
});

test('a timed response cannot acknowledge an all-day EventKit save',async()=>{
 const {d}=device(),id=appleCalendarSource(calendar).id;
 const draft={...eventDraft('2026-11-27','Asia/Seoul',id),title:'하루 종일'};
 let calls=0;
 await assert.rejects(saveAppleCalendar({...d,create:async(calendarId,patch)=>{
  calls++;
  assert.equal(patch.allDayStart,'2026-11-27');
  assert.equal(patch.allDayEnd,'2026-11-28');
  return {...native,calendarId,allDay:false};
 }},draft,undefined,()=>true),{writeState:'unknown'});
 assert.equal(calls,1);
});
