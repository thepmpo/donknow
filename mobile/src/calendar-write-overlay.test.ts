import {test} from 'node:test';
import assert from 'node:assert/strict';
import {putCalendarWrite,removeCalendarWrite,removeCalendarEventWrites,clearCalendarWrites,overlayCalendarWrites} from './calendar-write-overlay.ts';
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


test('a confirmed Google receipt fills a stale read, prefers the event instance and clears on removal',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const owner='confirmed-overlay',event:CalendarEvent={id:'receipt',calendarId:'team',eventId:'series',connectionId:'google',title:'새 일정',dueDate:'2026-11-26',endDate:'2026-11-27',allDay:true,canWrite:false};
 const provider={...event,id:'instance',eventId:'series_20261126',seriesId:'series',canWrite:true,etag:'current',color:'#dc2127'};
 const later={...provider,id:'later-instance',eventId:'series_20261127',dueDate:'2026-11-27',endDate:'2026-11-28'};
 const read=(items:CalendarEvent[])=>overlayCalendarWrites(owner,items,'2026-11-25','2026-11-28','UTC',['team']);
 putCalendarWrite(owner,'create',event,undefined,true);
 assert.deepEqual(read([]),[event]);
 assert.deepEqual(read([provider,later]),[provider,later]);
 assert.deepEqual(read([later]),[later,event]);
 removeCalendarEventWrites(owner,provider);
 assert.deepEqual(read([]),[]);
 putCalendarWrite(owner,'another-create',event,undefined,true);
 t.mock.timers.tick(90_000);
 assert.deepEqual(read([]),[]);
});


test('legacy timed events without an allDay flag regain drag permission after refresh',t=>{
 t.mock.timers.enable({apis:['setTimeout','Date']});
 const owner='timed-confirmed',receipt:CalendarEvent={id:'timed',title:'일정',dueDate:'2026-11-26',allDay:false,startAt:'2026-11-26T10:00:00+09:00',endAt:'2026-11-26T11:00:00+09:00',canWrite:false};
 const original={...receipt,allDay:undefined,canWrite:true,etag:'after-move'};
 putCalendarWrite(owner,'move',receipt,receipt.id,true);
 assert.deepEqual(overlayCalendarWrites(owner,[original],'2026-11-26','2026-11-27','Asia/Seoul',['primary']),[original]);
 clearCalendarWrites(owner);
});
