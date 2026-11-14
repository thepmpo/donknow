import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createAssistant} from '../server/assistant.js';

const secret='private-fixture-key-account-context';
const env={AI_ENABLED:'true',OPENAI_API_KEY:secret,OPENAI_MODEL:'fixture-model'};
const input={message:secret,consent:true,providers:[]};
function fixture(fetcher,{verified=true}={}){
 const calls=[];
 const store={connection:()=>null,account:()=>({emailVerified:verified}),list:()=>[],createAssistantAction:()=>{throw Error('AI errors must not save or execute actions');}};
 const integrations={status:()=>[],execute:()=>{throw Error('AI errors must not perform external writes');}};
 const assistant=createAssistant(store,integrations,env,async(url,options)=>{calls.push({url,method:options.method});return fetcher();});
 return {assistant,calls};
}
function watchLogs(t){const logs=[];for(const name of ['log','warn','error'])t.mock.method(console,name,(...args)=>logs.push(args));return logs;}
async function safeFailure(assistant,pattern){
 await assert.rejects(assistant.chat('fixture-user',input),error=>{
  assert.equal(error.status,502);assert.match(error.message,pattern);
  assert.equal(String(error.stack).includes(secret),false);
  assert.equal(JSON.stringify(error).includes(secret),false);return true;
 });
}

test('AI provider failures use fixed safe explanations and never retry or echo private response details',async t=>{
 const logs=watchLogs(t);
 const cases=[
  [401,'invalid_api_key',/연결 인증/],
  [403,'permission_denied',/이용 권한/],
  [404,'model_not_found',/모델을 사용할 수 없어요/],
  [400,'model_not_found',/모델을 사용할 수 없어요/],
  [429,'insufficient_quota',/사용 한도나 결제 설정/],
  [429,'credit_balance_exhausted',/사용 잔액이 부족/],
  [429,'organization_spend_limit_exceeded',/조직의 월 사용 금액 한도/],
  [429,'project_spend_limit_exceeded',/프로젝트 사용 금액 한도/],
  [429,'organization_usage_limit_exceeded',/조직에 허용된 월 사용 한도/],
  [429,'rate_limit_exceeded',/요청이 잠시 몰렸어요/],
  [429,'slow_down',/요청량이 갑자기 늘어/],
  [429,secret,/요청이 제한됐어요/],
  [500,'server_error',/일시적인 문제/],
  [503,'insufficient_quota',/일시적인 문제/],
  [400,secret,/서비스 설정을 확인/],
 ];
 for(const [status,code,pattern]of cases){
  const f=fixture(()=>new Response(JSON.stringify({error:{code,message:secret,account:secret}}),{status,headers:{'x-private-detail':secret}}));
  await safeFailure(f.assistant,pattern);
  assert.deepEqual(f.calls,[{url:'https://api.openai.com/v1/responses',method:'POST'}]);
 }
 assert.deepEqual(logs,[]);
});

test('AI error classification ignores malformed or oversized provider bodies and cancels unread data',async t=>{
 const logs=watchLogs(t);
 for(const status of [400,429])for(const body of ['not JSON '+secret,JSON.stringify({error:{code:{secret},message:secret}}),JSON.stringify({error:{message:secret}})]){
  const f=fixture(()=>new Response(body,{status}));
  await safeFailure(f.assistant,status===429?/요청이 제한됐어요/:/서비스 설정을 확인/);assert.equal(f.calls.length,1);
 }
 let cancelled=false;
 const stream=new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(JSON.stringify({error:{code:'model_not_found',message:secret},padding:'x'.repeat(9000)})));},cancel(){cancelled=true;}});
 const f=fixture(()=>new Response(stream,{status:400}));
 await safeFailure(f.assistant,/서비스 설정을 확인/);
 assert.equal(cancelled,true);assert.equal(f.calls.length,1);assert.deepEqual(logs,[]);
});

test('AI network and timeout failures remain private and do not retry automatically',async t=>{
 const logs=watchLogs(t);
 for(const name of ['TimeoutError','AbortError','TypeError']){
  const f=fixture(()=>{throw Object.assign(new Error(secret),{name});});
  await safeFailure(f.assistant,name==='TypeError'?/연결하지 못했어요/:/응답 시간이 초과/);
  assert.equal(f.calls.length,1);
 }
 assert.deepEqual(logs,[]);
});

test('AI provider diagnostics preserve email verification and explicit consent before any provider call',async()=>{
 const unverified=fixture(()=>{throw Error('unexpected provider call');},{verified:false});
 assert.equal(unverified.assistant.status('fixture-user').enabled,true);
 await assert.rejects(unverified.assistant.chat('fixture-user',input),error=>error.status===403&&/이메일 인증/.test(error.message));
 assert.equal(unverified.calls.length,0);
 const verified=fixture(()=>{throw Error('unexpected provider call');});
 await assert.rejects(verified.assistant.chat('fixture-user',{...input,consent:false}),error=>error.status===400);
 assert.equal(verified.calls.length,0);
});
