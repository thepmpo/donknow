import {test} from 'node:test';import assert from 'node:assert/strict';import {todoAgenda,upcomingTicketAgenda} from './todo-agenda.ts';import {visibleTodos} from './domain.ts';import type {Todo} from './domain.ts';
const task=(id:string,dueDate:string|null,dueTime?:string):Todo=>({id,title:id,dueDate,dueTime,done:false,category:'일상'});
test('Things-style agenda groups overdue/today/future/undated and sorts times while retaining the undo origin',()=>{
 const t=[task('late','2026-11-14'),task('b','2026-11-16','18:00'),task('a','2026-11-16','09:00'),task('later','2026-12-02'),task('undated',null),{...task('undo','2026-11-15'),done:true}];
 const groups=todoAgenda(visibleTodos(t,{undo:2000},1000),[],'2026-11-15','UTC');
 assert.equal(groups.length,5);assert.deepEqual(groups.map(g=>g.key),['overdue','2026-11-15','2026-11-16','2026-12-02','undated']);assert.deepEqual(groups[2].todos.map(t=>t.id),['a','b']);assert.equal(groups[1].todos[0].id,'undo');
});
test('calendar appointments precede checkboxes, keep all-day/multi-day occurrences and use the selected zone',()=>{
 const groups=todoAgenda([], [{id:'night',title:'회의',dueDate:'2026-11-15',startAt:'2026-11-15T23:30:00Z',endAt:'2026-11-16T00:30:00Z'},{id:'trip',title:'출장',dueDate:'2026-11-16',endDate:'2026-11-18',allDay:true}], '2026-11-15','Asia/Seoul');
 assert.deepEqual(groups.map(g=>g.day),['2026-11-16','2026-11-17']);assert.deepEqual(groups[0].events.map(e=>e.id),['trip','night']);assert.equal(groups[1].events[0].id,'trip');
});

test('an empty today does not precede upcoming work; a completely empty list keeps a today entry point',()=>{assert.equal(todoAgenda([task('future','2026-11-16')],[],'2026-11-15','UTC')[0].title,'내일');assert.equal(todoAgenda([],[],'2026-11-15','UTC')[0].title,'오늘');});

test('the next seven days stay separate, later days share monthly groups and undated stays last',()=>{
 const rows=[task('today','2026-11-28'),task('week','2026-12-05'),task('month-a','2026-12-06'),task('month-b','2026-12-31'),task('next','2027-01-01'),task('undated',null)];
 const groups=upcomingTicketAgenda(rows,[],'2026-11-28','UTC');
 assert.deepEqual(groups.map(group=>group.key),['2026-11-28','2026-12-05','month:2026-12','month:2027-01','undated']);
 assert.deepEqual(groups[2].todos.map(todo=>todo.id),['month-a','month-b']);
});
