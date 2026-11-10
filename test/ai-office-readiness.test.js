import {test} from 'node:test';import assert from 'node:assert/strict';
import {createOfficeClient,officeOrigin,parseOfficeConfig} from '../scripts/lib/ai-office-client.mjs';
import {pilotPayload,validatePilot,textHash,readinessBlockers} from '../scripts/lib/ai-office-pilot.mjs';
test('office operator never sends credentials to external origins or endpoint URLs',async()=>{
 for(const url of ['https://evil.test','http://127.0.0.1@evil.test','http://localhost/path','http://localhost/?key=x'])assert.throws(()=>officeOrigin(url));
 let calls=0;const client=await createOfficeClient({config:{API_AUTH_TOKEN:'fixture-private',AI_OFFICE_OWNER_KEY:'fixture-owner'},fetcher:async()=>{calls++;throw Error('unexpected');}});
 await assert.rejects(client.request('https://evil.test/api/'),/local_api/);assert.equal(calls,0);assert.equal(JSON.stringify(client.settings).includes('fixture-private'),false);assert.equal(JSON.stringify(client.settings).includes('fixture-owner'),false);
});
test('office client keeps owner control separate and sanitizes unexpected error text',async()=>{
 const seen=[];const client=await createOfficeClient({config:{API_AUTH_TOKEN:'fixture-api',AI_OFFICE_OWNER_KEY:'fixture-owner'},fetcher:async(url,opts)=>{seen.push({url,headers:opts.headers});return url.endsWith('/session')?Response.json({csrf_token:'fixture-csrf'},{headers:{'set-cookie':'fixture=s; HttpOnly'}}):url.endsWith('/denied')?Response.json({error:'secret <raw body>'},{status:403}):Response.json({ok:true});}});
 await client.request('/api/projects');await client.request('/api/office-policy/runtime/check','POST',{}, {owner:true});
 assert.equal(seen[1].headers['x-office-owner-key'],undefined);assert.equal(seen[2].headers['x-office-owner-key'],'fixture-owner');await assert.rejects(client.request('/api/denied'),e=>e.message==='office_403:request_failed');
 assert.equal(parseOfficeConfig('A=a=b\n#hidden\nB="quoted"').A,'a=b');
});
test('pilot staging is inbox only, project-specific and never auto-approves',()=>{
 const task=pilotPayload({name:'duckduck',id:'p1',project_path:'/isolated/p1'},{id:'a1'});
 assert.equal(task.status,'inbox');assert.equal(task.project_id,'p1');assert.equal(task.assigned_agent_id,'a1');assert.match(task.description,/읽기 전용/);assert.equal(task.confirmation,undefined);
 assert.match(pilotPayload({name:'DAYWIT',id:'p2',project_path:'/isolated/p2'},{id:'a2'}).description,/다른 프로젝트에 duckduck 고유 디자인을 강요하지/);
});
test('prepared pilot cannot be replayed for another task/project/agent/source or edited prompt',()=>{
 const task={id:'t1',project_id:'p1',assigned_agent_id:'a1',description:'fixed scope',status:'inbox'},plan={taskId:'t1',projectId:'p1',agentId:'a1',promptSha256:textHash(task.description),sourceHead:'head1'};
 assert.equal(validatePilot(plan,task,'head1'),true);
 for(const patch of [{id:'t2'},{project_id:'p2'},{assigned_agent_id:'a2'},{description:'change'},{status:'done'}])assert.throws(()=>validatePilot(plan,{...task,...patch},'head1'));assert.throws(()=>validatePilot(plan,task,'head2'));
});
test('pilot only becomes ready with policy, readonly lane, real auth, sandbox, task and provider network',()=>{
 const state={server:{enabled:true,developmentEnabled:false},provider:{runnerConfigured:true,authReady:true,sandboxAvailable:true},pilot:true,network:[{host:'auth.openai.com',reachable:true},{host:'chatgpt.com',reachable:true}]};assert.deepEqual(readinessBlockers(state),[]);
 assert.ok(readinessBlockers({...state,provider:{...state.provider,authReady:false}}).includes('chatgpt_login_required'));
 assert.ok(readinessBlockers({...state,server:{enabled:true,developmentEnabled:true}}).includes('development_must_remain_locked'));
 assert.ok(readinessBlockers({...state,network:[{host:'chatgpt.com',reachable:false}]}).includes('network_allowlist:chatgpt.com'));
});
