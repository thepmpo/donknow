import {test} from 'node:test';
import assert from 'node:assert/strict';
import {apiHarness} from '../test-support/api.js';

test('Docen events can be created, read, moved and deleted without a provider connection',async()=>{
 const h=await apiHarness({GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''});
 try{
  const owner=await h.verified('docen-calendar-owner@example.test'),other=await h.verified('docen-calendar-other@example.test');
  const path='/api/calendar/docen/event-calendar-test-create';
  const range='/api/calendar/events?v=2&calendarId=%40docen&start=2026-11-23&end=2026-11-30&timeZone=Asia%2FSeoul';
  const args={title:'도슨 일정',allDay:false,start:'2026-11-26T09:00:00.000Z',end:'2026-11-26T10:00:00.000Z',timeZone:'Asia/Seoul',notes:'보관할 메모'};
  const body={args,fields:{url:'https://example.test/meet'},revision:0};
  assert.equal((await h.request('/api/capabilities')).data.docenCalendar,1);
  assert.equal((await h.request(range)).status,401);
  const created=await h.request(path,'PUT',body,owner.token);
  assert.equal(created.status,200,JSON.stringify(created.data));
  assert.equal(created.data.calendarId,'@docen');
  assert.equal(created.data.etag,'1');
  assert.deepEqual((await h.request(path,'PUT',body,owner.token)).data,created.data);
  const listed=await h.request(range,'GET',undefined,owner.token);
  assert.deepEqual(listed.data.items,[created.data]);
  assert.deepEqual((await h.request(range,'GET',undefined,other.token)).data.items,[]);
  assert.equal((await h.request(path,'DELETE',{revision:1},other.token)).status,409);
  const updated={...body,revision:1,args:{...args,start:'2026-11-27T09:00:00.000Z',end:'2026-11-27T10:00:00.000Z'}};
  const move=await h.request(path,'PUT',updated,owner.token);
  assert.equal(move.status,200);
  assert.equal(move.data.dueDate,'2026-11-27');
  assert.equal(move.data.etag,'2');
  assert.equal((await h.request(path,'PUT',updated,owner.token)).status,409);
  assert.equal((await h.request(path,'DELETE',{revision:2},owner.token)).status,200);
  assert.deepEqual((await h.request(range,'GET',undefined,owner.token)).data.items,[]);
 }finally{await h.close();}
});

test('Apple delivery has one owner-bound device claim and keeps an uncertain local event',async()=>{
 const h=await apiHarness({GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:''});
 try{
  const owner=await h.verified('docen-apple-owner@example.test'),other=await h.verified('docen-apple-other@example.test');
  const path='/api/calendar/docen/event-apple-safe-claim';
  const body={revision:0,args:{title:'아이폰에 보낼 일정',allDay:true,startDate:'2026-11-26',endDate:'2026-11-27',timeZone:'Asia/Seoul'},fields:{},target:{provider:'apple-calendar',calendarId:'@apple/private',name:'개인',color:'#123456'}};
  const save=await h.request(path,'PUT',body,owner.token);
  assert.equal(save.status,200);
  assert.equal(save.data.mirror.state,'queued');
  const outsideRange=await h.request('/api/calendar/events?calendarId=%40docen&start=2026-12-01&end=2026-12-08&timeZone=Asia%2FSeoul', 'GET',undefined,owner.token);
  assert.deepEqual(outsideRange.data.items,[]);
  assert.equal(outsideRange.data.appleCreates[0].id,save.data.id);
  const delivery=path+'/apple-delivery';
  assert.equal((await h.request(delivery,'POST',{state:'sending'},other.token)).status,404);
  assert.equal((await h.request(delivery,'POST',{state:'sending'},owner.token)).status,200);
  assert.equal((await h.request(delivery,'POST',{state:'sending'},owner.token)).status,409);
  assert.equal((await h.request(delivery,'POST',{state:'checking'},owner.token)).status,200);
  const range='/api/calendar/events?v=2&calendarId=%40docen&start=2026-11-23&end=2026-11-30&timeZone=Asia%2FSeoul';
  const [event]=(await h.request(range,'GET',undefined,owner.token)).data.items;
  assert.equal(event.id,save.data.id);
  assert.equal(event.mirror.state,'checking');
 }finally{await h.close();}
});

test('deleting a Docen event during Apple delivery hides it immediately, then queues removal of the delivered original',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified('docen-apple-delete@example.test');
  const path='/api/calendar/docen/event-apple-delete-pending',delivery=path+'/apple-delivery';
  const range='/api/calendar/events?v=2&calendarId=%40docen&start=2026-11-23&end=2026-11-30&timeZone=Asia%2FSeoul';
  const body={revision:0,args:{title:'삭제할 일정',allDay:true,startDate:'2026-11-26',endDate:'2026-11-27',timeZone:'Asia/Seoul'},target:{provider:'apple-calendar',calendarId:'@apple/test'}};
  const request=(url,method,body)=>h.request(url,method,body,owner.token);
  assert.equal((await request(path,'PUT',body)).status,200);
  assert.equal((await request(delivery,'POST',{state:'sending'})).status,200);
  for(let attempt=0;attempt<2;attempt++)assert.equal((await request(path,'DELETE',{revision:1})).status,200);
  assert.deepEqual((await request(range)).data.items,[]);
  assert.equal((await request(path,'PUT',body)).status,409);
  const original={externalEventId:'apple-provider-record'};
  assert.equal((await request(delivery,'POST',{state:'synced',...original})).status,200);
  const pending=(await request(range)).data.hiddenMirrors;
  assert.equal(pending[0].state,'delete-queued');
  assert.equal(pending[0].externalEventId,original.externalEventId);
  assert.equal((await request(delivery,'POST',{state:'deleted',...original})).status,200);
  assert.deepEqual((await request(range)).data.hiddenMirrors,[]);
  assert.deepEqual((await request(range)).data.items,[]);
 }finally{await h.close();}
});

test('device cancellation is durable whether the delayed create arrives before or after it',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified('calendar-device-cancel@example.test');
  const other=await h.verified('calendar-device-other@example.test');
  const body={revision:0,args:{title:'전송 전 삭제',allDay:true,startDate:'2026-11-26',endDate:'2026-11-27',timeZone:'Asia/Seoul'}};
  for(const createdFirst of [false,true]){
   const path='/api/calendar/docen/event-device-cancel-'+(createdFirst?'after':'before');
   if(createdFirst)assert.equal((await h.request(path,'PUT',body,owner.token)).status,200);
   for(let attempt=0;attempt<2;attempt++)assert.equal((await h.request(path,'DELETE',{revision:0},owner.token)).status,200);
   const retried=await h.request(path,'PUT',body,owner.token);
   assert.equal(retried.status,409);
   assert.equal(retried.data.code,'calendar-event-deleted');
   assert.equal((await h.request(path,'GET',undefined,owner.token)).status,404);
   assert.equal((await h.request(path,'PUT',body,other.token)).status,200);
  }
 }finally{await h.close();}
});
