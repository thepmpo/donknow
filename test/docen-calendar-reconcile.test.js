import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolveCalendarCopies} from '../server/docen-calendar-reconcile.js';
import {apiHarness} from '../test-support/api.js';

const baseline={title:'기존 일정',notes:'',allDay:true,startDate:'2026-11-26',endDate:'2026-11-27'};
const local={fields:{...baseline,title:'도슨 수정'},updatedAt:'2026-11-26T12:00:00Z'};
const remote={fields:{...baseline,title:'원본 수정'},updatedAt:'2026-11-26T13:00:00Z'};

test('linked schedule reconciliation uses the latest actual edit, the preceding copy, then Docen',()=>{
 assert.equal(resolveCalendarCopies(local,remote,baseline),'original');
 assert.equal(resolveCalendarCopies({...local,updatedAt:'2026-11-26T14:00:00Z'},remote,baseline),'docen');
 assert.equal(resolveCalendarCopies({fields:baseline},{fields:remote.fields},baseline),'original');
 assert.equal(resolveCalendarCopies({fields:local.fields},{fields:baseline},baseline),'docen');
 assert.equal(resolveCalendarCopies({fields:local.fields},{fields:remote.fields},baseline),'docen');
 assert.equal(resolveCalendarCopies(remote,remote,baseline),'equal');
});

test('Apple claim and receipt survive a repeated request; remote edits and moves use a guarded Docen revision',async()=>{
 const h=await apiHarness();
 try{
  const owner=await h.verified('apple-reconcile@example.test'),other=await h.verified('other-reconcile@example.test');
  const path='/api/calendar/docen/event-apple-reconcile-case';
  const args={...baseline,timeZone:'Asia/Seoul'},target={provider:'apple-calendar',calendarId:'@apple/reconcile'};
  const create=(revision,fields=args)=>h.request(path,'PUT',{revision,args:fields,target:revision===0?target:undefined},owner.token);
  const request=(suffix,body,token=owner.token)=>h.request(path+suffix,'POST',body,token);
  const claimId='01234567-1234-4234-8234-123456789abc',otherClaim='11234567-1234-4234-8234-123456789abc';
  assert.equal((await create(0)).status,200);
  assert.equal((await request('/apple-delivery',{state:'sending',claimId})).status,200);
  assert.equal((await request('/apple-delivery',{state:'sending',claimId})).status,200);
  assert.equal((await request('/apple-delivery',{state:'sending',claimId:otherClaim})).status,409);
  const receipt={state:'synced',claimId,externalEventId:'eventkit-uuid',externalUid:'shared-id'};
  assert.equal((await request('/apple-delivery',receipt)).status,200);
  assert.equal((await request('/apple-delivery',receipt)).status,200);
  const update={id:'eventkit-uuid',version:'remote-v2',fields:{...baseline,title:'아이폰에서 이동',startDate:'2026-11-27',endDate:'2026-11-28'}};
  assert.equal((await request('/reconcile',{revision:1,original:update},other.token)).status,409);
  const inbound=await request('/reconcile',{revision:1,original:update});
  assert.equal(inbound.status,200,JSON.stringify(inbound.data));
  assert.equal(inbound.data.action,'done');assert.equal(inbound.data.event.dueDate,'2026-11-27');
  assert.equal(inbound.data.event.etag,'2');
  assert.equal((await request('/reconcile',{revision:1,original:update})).status,409);
  const edited={...update.fields,title:'도슨에서 편집',timeZone:args.timeZone};
  assert.equal((await create(2,edited)).status,200);
  const outbound=await request('/reconcile',{revision:3,original:update});
  assert.equal(outbound.status,200);assert.equal(outbound.data.action,'push');assert.equal(outbound.data.event.title,edited.title);
  const ack=await request('/reconcile',{revision:3,original:{...update,version:'remote-v3',fields:edited},ack:true});
  assert.equal(ack.status,200,JSON.stringify(ack.data));assert.equal(ack.data.event.mirror.syncVersion,'remote-v3');
  const rebound={...update,id:'eventkit-rebuilt',linkedId:'eventkit-uuid',externalUid:'shared-id',version:'remote-v4',fields:edited};
  const reassociated=await request('/reconcile',{revision:3,original:rebound});
  assert.equal(reassociated.status,200);
  assert.equal(reassociated.data.event.mirror.externalEventId,'eventkit-rebuilt');
  assert.equal((await request('/reconcile',{revision:3,original:{...rebound,id:'another',externalUid:'unrelated'}})).status,409);
  assert.equal((await h.request(path,'GET',undefined,owner.token)).data.etag,'3');
  assert.equal((await h.request(path,'GET',undefined,other.token)).status,404);
 }finally{await h.close();}
});
