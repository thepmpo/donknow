import {test} from 'node:test';import assert from 'node:assert/strict';
import {createAgentEvents} from '../server/agent-events.js';
test('5-minute refresh makes a baseline then skips unchanged sources, and partial reads never erase the baseline',async()=>{
 let pending=[],snapshot={},text='first',partial=false;const jobs=[],finished=[],deferred=[];
 const profile={providers:['google'],proactive:true,consentScopes:{google:'v1'}},event=()=>({id:String(finished.length+deferred.length),userId:'u',provider:'google',connectionId:'conn',payload:{kind:'refresh'}});
 const store={pendingAgentEvents:()=>pending,account:()=>({emailVerified:true}),agentEventConsent:()=>true,connection:()=>({connectionId:'conn'}),agentProfile:()=>profile,agentResponsibilities:()=>[],agentSync:()=>snapshot,saveAgentSync:(_u,_c,_r,value)=>{snapshot=value;},finishAgentEvent:id=>finished.push(id),deferAgentEvent:id=>deferred.push(id),createAgentJob:(_user,job)=>jobs.push(job)};
 const assistant={status:()=>({consentScopes:{google:'v1'}}),context:async()=>({warnings:partial?['read failed']:[],sources:[{provider:'google',ref:'google:conn:tasks:list:id',title:'자료',text,completed:false}]})},events=createAgentEvents(store,assistant);
 pending=[event()];await events.dispatch();assert.equal(jobs.length,0);assert.equal(snapshot.initialized,true);
 pending=[event()];await events.dispatch();assert.equal(jobs.length,0,'unchanged polling never creates a model job');
 text='changed';pending=[event()];await events.dispatch();assert.equal(jobs.length,1);const saved=JSON.stringify(snapshot);
 text='missing';partial=true;pending=[event()];await events.dispatch();assert.equal(jobs.length,1);assert.equal(JSON.stringify(snapshot),saved);assert.equal(deferred.length,1);
});
test('a Gmail history control notification does not duplicate the child model job',async()=>{const jobs=[],finished=[];const store={pendingAgentEvents:()=>[{id:'control',userId:'u',provider:'google',connectionId:'conn',payload:{historyId:'1',changes:2}}],account:()=>({emailVerified:true}),agentEventConsent:()=>true,connection:()=>({connectionId:'conn'}),finishAgentEvent:id=>finished.push(id),createAgentJob:(_u,j)=>jobs.push(j)};await createAgentEvents(store,{},{}).dispatch();assert.deepEqual(finished,['control']);assert.equal(jobs.length,0);});
