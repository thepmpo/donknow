import {test} from 'node:test';import assert from 'node:assert/strict';
import {readReminderItems} from './apple-reminder-read.ts';
test('reminder read fresh-resolves a REMINDER list, includes undated and completed records, and copies native values',async()=>{
 const calls:unknown[]=[],native=[{id:'undated',title:'날짜 없음',completed:false},{id:'done',title:'완료',completed:true,notes:'메모',dueDate:new Date(2026,10,16,9,30),allDay:false,lastModifiedDate:new Date('2026-11-15T00:00:00Z')}];
 const items=await readReminderItems('list',async()=>[{id:'list',listReminders:async(...args)=>{calls.push(args);return native;}}],()=>true);
 assert.deepEqual(calls,[[null,null,null]]);assert.equal(items?.[0].dueDate,null);assert.equal(items?.[1].completed,true);assert.equal(items?.[1].dueTime,'09:30');assert.equal(items?.[1].notes,'메모');native[0].title='changed';assert.equal(items?.[0].title,'날짜 없음');
});
test('empty EventKit read retries once on a fresh list, retains explicit empty, and never retries a failure forever',async()=>{
 let reads=0,waits=0;const lists=async()=>[{id:'list',listReminders:async()=>{reads++;return reads===1?[]:[{id:'late',title:'도착'}];}}];
 assert.equal((await readReminderItems('list',lists,()=>true,async()=>{waits++;}))?.[0].id,'late');assert.equal(reads,2);assert.equal(waits,1);
 reads=0;assert.deepEqual(await readReminderItems('list',async()=>[{id:'list',listReminders:async()=>{reads++;return [];}}],()=>true,async()=>{}),[]);assert.equal(reads,2);
 await assert.rejects(readReminderItems('missing',lists,()=>true),/목록을 찾지/);
 await assert.rejects(readReminderItems('list',async()=>[{id:'list',listReminders:async()=>{throw Error('permission');}}],()=>true),/permission/);
});
test('a reminder result arriving after account exit is discarded',async()=>{let current=true;const result=await readReminderItems('list',async()=>[{id:'list',listReminders:async()=>{current=false;return [{id:'old-account'}];}}],()=>current);assert.equal(result,null);});
