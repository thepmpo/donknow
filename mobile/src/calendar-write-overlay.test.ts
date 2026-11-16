import {test} from 'node:test';
import assert from 'node:assert/strict';
import {putCalendarWrite,removeCalendarWrite,clearCalendarWrites,overlayCalendarWrites} from './calendar-write-overlay.ts';
import type {CalendarEvent} from './calendar-model.ts';
test('an in-memory calendar write survives stale reads and period changes without changing source authority or another owner',()=>{
 const owner='overlay-owner',other='overlay-other',original:CalendarEvent={id:'event',title:'old',dueDate:'2026-11-16',endDate:'2026-11-17',allDay:true,calendarId:'primary',canWrite:true,etag:'source-version'};
 const pending:CalendarEvent={...original,title:'new',dueDate:'2026-11-17',endDate:'2026-11-18',saveState:'saving',canWrite:false,etag:null};
 putCalendarWrite(owner,'write',pending,original.id);
 assert.deepEqual(overlayCalendarWrites(owner,[original],'2026-11-16','2026-11-17','Asia/Seoul',['primary']),[],'moved event leaves old day immediately');
 assert.equal(overlayCalendarWrites(owner,[],'2026-11-17','2026-11-18','Asia/Seoul',['primary'])[0].title,'new');
 const stale=overlayCalendarWrites(owner,[original],'2026-11-01','2026-12-01','Asia/Seoul',['primary']);assert.equal(stale.length,1);assert.equal(stale[0].etag,null);assert.equal(stale[0].canWrite,false);
 assert.deepEqual(overlayCalendarWrites(other,[original],'2026-11-01','2026-12-01','Asia/Seoul',['primary']),[original]);assert.equal(original.title,'old');
 removeCalendarWrite(owner,'write');assert.deepEqual(overlayCalendarWrites(owner,[original],'2026-11-01','2026-12-01','Asia/Seoul',['primary']),[original]);
 putCalendarWrite(owner,'unknown',{...pending,saveState:'checking'},original.id);clearCalendarWrites(owner);assert.equal(overlayCalendarWrites(owner,[],'2026-11-01','2026-12-01','Asia/Seoul',['primary']).length,0);
});
