import test from 'node:test';
import assert from 'node:assert/strict';
import {integrationState,permissionSummary,readIntegrationStatuses,readTaskSyncStatus} from './integration-settings.ts';
test('a read failure keeps the last known connection distinct from a disconnect',()=>{
 const connected={provider:'google' as const,connected:true,configured:true,features:['calendar']};
 assert.equal(integrationState(connected,true),'연결됨 · 상태 재확인 필요');assert.equal(integrationState({...connected,connected:false}),'연결하기');assert.equal(integrationState(undefined,true),'상태 확인 필요');
});
test('permission descriptions distinguish reading from specific writes without inventing grants',()=>{
 assert.equal(permissionSummary(['calendar']),'일정 읽기');assert.equal(permissionSummary(['tasks','tasksWrite']),'할 일 읽기 · 할 일 완료 상태 수정');assert.equal(permissionSummary(['calendar','calendar']),'일정 읽기');assert.ok(!permissionSummary(['calendar']).includes('작성'));assert.ok(!permissionSummary(['new_unknown_grant']).includes('new_unknown_grant'));
});
test('malformed successful service and sync responses cannot erase history or crash settings',()=>{
 for(const bad of [null,{},[],[{provider:'google',connected:true,configured:true,features:null}],[{provider:'google',connected:true,configured:true,features:['calendar'],label:{}}]])assert.throws(()=>readIntegrationStatuses(bad));
 const value=[{provider:'google',connected:true,configured:true,features:['calendar']}];assert.deepEqual(readIntegrationStatuses(value),value);
 for(const bad of [null,{}, {enabled:false,canEnable:true}, {enabled:false,canEnable:true,jobs:[{}]}])assert.throws(()=>readTaskSyncStatus(bad));assert.deepEqual(readTaskSyncStatus({enabled:false,canEnable:true,jobs:[]}),{enabled:false,canEnable:true,jobs:[]});
});
