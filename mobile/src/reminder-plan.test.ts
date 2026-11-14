import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reminderPlan, reconcileReminders } from './reminder-plan.ts';
import type { Todo } from './domain.ts';
const NOW = Date.parse('2029-01-01T00:00:00Z');
const base: Todo = { id: 'one', title: '알림 할 일', category: '일상', dueDate: '2030-01-01', done: false, reminderAt: '2030-01-01T00:00:00.000Z' };
test('reminders include only future active todos, are account scoped, ordered and capped at 60', () => {
 const values = [base, { ...base, id: 'done', done: true }, { ...base, id: 'past', reminderAt: '2000-01-01T00:00:00.000Z' }];
 assert.equal(reminderPlan(values, 'alice', true, NOW).length, 1); assert.equal(reminderPlan(values, null, true, NOW).length, 0); assert.equal(reminderPlan(values, 'alice', false, NOW).length, 0);
 assert.notEqual(reminderPlan([base], 'alice', true, NOW)[0].id, reminderPlan([base], 'bob', true, NOW)[0].id);
 assert.equal(reminderPlan(Array.from({ length: 100 }, (_, id) => ({ ...base, id: String(id) })), 'alice', true, NOW).length, 60);
});
test('completion, edits and account changes cancel only this app’s notifications and do not duplicate schedules', async () => {
 let existing: { identifier: string; content: { body?: string; data: Record<string, unknown> } }[] = [{ identifier: 'other', content: { data: { app: 'other-feature' } } }];
 const cancelled: string[] = [], scheduled: string[] = [];
 const client = { getAllScheduledNotificationsAsync: async () => existing, cancelScheduledNotificationAsync: async (id: string) => { cancelled.push(id); existing = existing.filter(item => item.identifier !== id); }, scheduleNotificationAsync: async (value: { identifier: string; content: { body: string; data: Record<string, unknown> } }) => { scheduled.push(value.identifier); existing.push(value); return value.identifier; } };
 const plan = reminderPlan([base], 'alice', true, NOW); await reconcileReminders(client, plan, date => date); await reconcileReminders(client, plan, date => date); assert.equal(scheduled.length, 1);
 await reconcileReminders(client, reminderPlan([{ ...base, title: '제목 변경' }], 'alice', true, NOW), date => date); assert.equal(cancelled.length, 1); assert.equal(scheduled.length, 2);
 await reconcileReminders(client, [], date => date); assert.equal(existing.length, 1); assert.equal(existing[0].identifier, 'other');
});
test('calendar and todo alerts share 60 slots, coexist, update and cancel without touching other notifications',async()=>{
 const calendar=Array.from({length:65},(_,i)=>({id:'e'+i,title:'일정'+i,at:new Date(NOW+(i+1)*60000).toISOString(),eventId:'event'+i,calendarId:'primary'}));
 const plan=reminderPlan([base],'alice',true,NOW,calendar);assert.equal(plan.length,60);assert.equal(plan[0].kind,'calendar');assert.equal(plan.at(-1)?.eventId,'event59');
 const both=reminderPlan([base],'alice',true,NOW,calendar.slice(0,2));assert.equal(both.length,3);assert.ok(both.some(r=>r.todoId==='one'));assert.notEqual(both[0].id,reminderPlan([],'bob',true,NOW,calendar)[0].id);
 let existing:any[]=[{identifier:'other',content:{data:{app:'else'}}}];const client={getAllScheduledNotificationsAsync:async()=>existing,cancelScheduledNotificationAsync:async(id:string)=>{existing=existing.filter(v=>v.identifier!==id);},scheduleNotificationAsync:async(v:any)=>{existing.push(v);return v.identifier;}};
 await reconcileReminders(client,both,d=>d);assert.equal(existing.length,4);await reconcileReminders(client,both,d=>d);assert.equal(existing.length,4);
 await reconcileReminders(client,reminderPlan([base],'alice',true,NOW),d=>d);assert.equal(existing.length,2);assert.ok(existing.some(v=>v.identifier==='other'));assert.ok(existing.some(v=>v.content.data.todoId==='one'));
});
test('failed source refresh after restart retains only this account calendar schedules',async()=>{
 const {retainedCalendarReminders}=await import('./reminder-plan.ts');
 const items=[{identifier:'duckduck-alice-calendar-abc',content:{body:'일정',data:{app:'duckduck',kind:'calendar',at:'2030-01-01T00:00:00Z',eventId:'event',calendarId:'primary'}}},{identifier:'duckduck-bob-calendar-other',content:{body:'다른 계정',data:{app:'duckduck',kind:'calendar',at:'2030-01-01T00:00:00Z',eventId:'other',calendarId:'primary'}}},{identifier:'duckduck-alice-todo',content:{body:'할 일',data:{app:'duckduck',todoId:'todo',at:'2030-01-01T00:00:00Z'}}}];
 assert.deepEqual(retainedCalendarReminders(items,'alice'),[{id:'abc',title:'일정',at:'2030-01-01T00:00:00Z',eventId:'event',calendarId:'primary',day:undefined}]);
});
