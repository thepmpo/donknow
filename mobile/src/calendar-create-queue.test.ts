import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCalendarCreateQueue} from './calendar-create-queue.ts';
import {createCalendarDeviceStore} from './calendar-snapshot-store.ts';
import type {QueuedCalendarCreate} from './calendar-create-queue.ts';

test('queued creates are committed before publication, survive restart and retain their exact destination and request ID',async()=>{
 const data=new Map<string,string>(),disk=()=>createCalendarDeviceStore({
  get:async key=>data.get(key)??null,
  set:async(key,value)=>{data.set(key,value);},
  remove:async key=>{data.delete(key);},
 },'docen.calendar.outbox.');
 const first=createCalendarCreateQueue(disk()),target={provider:'apple-calendar' as const,calendarId:'@apple/team',name:'팀 일정'};
 const event={id:'docen:a',title:'팀 회의',dueDate:'2026-11-26'};
 const job:QueuedCalendarCreate={id:'a',event,payload:{revision:0,args:{title:event.title},fields:{},target}};
 await Promise.all([first.add('site:owner',job),first.add('site:owner',job)]);
 const afterRestart=createCalendarCreateQueue(disk());
 assert.deepEqual(await afterRestart.read('site:owner'),[job]);
 assert.deepEqual(await afterRestart.read('site:other'),[]);
 await afterRestart.remove('site:owner',job.id);
 assert.deepEqual(await createCalendarCreateQueue(disk()).read('site:owner'),[]);
});

test('a failed device commit never publishes an event or erases the previous queue',async()=>{
 let raw:string|null=null,fail=false;
 const queue=createCalendarCreateQueue({read:async()=>raw,write:async(_owner,text)=>{if(fail)throw Error('disk failure');raw=text;},clear:async()=>{raw=null;}});
 const job=(id:string):QueuedCalendarCreate=>({id,event:{id:'docen:'+id,title:id,dueDate:null},payload:{revision:0,args:{},fields:{}}});
 await queue.add('owner',job('initial'));
 fail=true;
 await assert.rejects(queue.add('owner',job('rejected')),/disk failure/);
 assert.deepEqual(queue.snapshot('owner'),[job('initial')]);
});
