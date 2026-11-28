import {test} from 'node:test';
import assert from 'node:assert/strict';
import {showAppleReminders} from './apple-reminder-view.ts';
import type {ListedReminder} from './apple-reminder-read.ts';
import type {Todo} from './domain.ts';

const item:ListedReminder={id:'native',listId:'inbox',listTitle:'Inbox',title:'Apple에서 수정',notes:'',completed:false,
 dueDate:'2026-11-28',dueTime:null,color:'#ff0000',modifiedAt:'2026-11-28T03:00:00Z'};
const lists=new Map([['inbox',[item]]]);
const linked:Todo={id:'docen',category:'업무',done:false,title:'이전 제목',dueDate:null,
 source:{provider:'apple-reminders',externalId:'native',modifiedAt:'2026-11-28T02:00:00Z'}};

test('device reminders appear before cloud registration and become one editable row once linked',()=>{
 const [preview]=showAppleReminders([],lists,new Set(),new Set());
 assert.equal(preview.title,item.title);
 assert.equal(preview.saveState,'saving');
 const rows=showAppleReminders([linked],lists,new Set(),new Set());
 assert.equal(rows.length,1);
 assert.equal(rows[0].id,linked.id);
 assert.equal(rows[0].dueDate,item.dueDate);
 assert.equal(rows[0].source?.color,item.color);
 assert.equal(rows[0].saveState,undefined);
});

test('a device read preserves a pending Docen edit and respects suppressed items',()=>{
 assert.deepEqual(showAppleReminders([linked],lists,new Set(),new Set([linked.id])),[linked]);
 assert.deepEqual(showAppleReminders([],lists,new Set([item.id]),new Set()),[]);
});
