import {test} from 'node:test';import assert from 'node:assert/strict';
import {moveTodoIds,sourceAgenda,todoSource} from './todo-organization.ts';
import {todoAgenda} from './todo-agenda.ts';
import type {Todo} from './domain.ts';
const task=(id:string,provider?:string,extra:Partial<Todo>={}):Todo=>({id,title:id,done:false,dueDate:'2026-11-15',category:'업무',...(provider?{source:{provider,externalId:provider==='google'?'account:tasks:list:'+id:id}}:{}),...extra});
test('source view retains task date and provider, separates Google Tasks and Calendar, manual items first, unknown providers last',()=>{const items=[task('local'),task('google','google'),task('slack','slack'),task('event','google',{source:{provider:'google',externalId:'account:calendar:event'}}),task('apple','apple-reminders'),task('other','future-provider')];const groups=sourceAgenda(items);assert.equal(groups[0]?.source.key,'local');assert.equal(groups.length,6);assert.equal(groups.at(-1)?.source.key,'future-provider');assert.equal(todoSource(items[1]).label,'Google Tasks');assert.equal(groups.find(g=>g.source.key==='slack')?.todos[0].dueDate,'2026-11-15');assert.equal(groups.flatMap(g=>g.todos).length,6);});
test('manual order is shared across date/source views, group movement preserves relative order and provenance',()=>{const items=[task('a','slack',{order:0}),task('b','slack',{order:1}),task('c','google',{order:2}),task('d','slack',{order:3})];assert.deepEqual(moveTodoIds(items,['a','b'],'d'),['c','a','b','d']);assert.deepEqual(moveTodoIds(items,['a'],'a'),['a','b','c','d']);const moved=moveTodoIds(items,['d'],'a').map((id,order)=>({...items.find(t=>t.id===id)!,order}));assert.equal(todoAgenda(moved,[],'2026-11-15','Asia/Seoul')[0].todos[0].id,'d');assert.equal(sourceAgenda(moved).find(g=>g.source.key==='slack')?.todos[0].id,'d');assert.equal(moved[0].source?.provider,'slack');});

test('source view groups reminders by list ID and keeps empty lists and updated titles',()=>{
 const a=task('a','apple-reminders',{source:{provider:'apple-reminders',externalId:'one',listId:'one',listTitle:'옛 이름'}});
 const b=task('b','apple-reminders',{source:{provider:'apple-reminders',externalId:'two',listId:'two',listTitle:'Inbox'}});
 const groups=sourceAgenda([a,b],[{id:'one',title:'Inbox'},{id:'two',title:'Inbox'},{id:'empty',title:'빈 목록'}]);
 assert.equal(groups.find(g=>g.key==='source:apple-reminders:one')?.title,'Inbox');
 assert.deepEqual(groups.find(g=>g.key==='source:apple-reminders:two')?.todos.map(t=>t.id),['b']);
 assert.deepEqual(groups.find(g=>g.key==='source:apple-reminders:empty')?.todos,[]);
});
