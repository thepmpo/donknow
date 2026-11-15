import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createAssistant} from '../server/assistant.js';
import {createIntegrations} from '../server/integrations.js';
const env={AI_ENABLED:'true',OPENAI_API_KEY:'fixture-key',OPENAI_MODEL:'fixture-model',PUBLIC_ORIGIN:'https://fixture.test',NOTION_CLIENT_ID:'fixture',NOTION_CLIENT_SECRET:'fixture',GOOGLE_CLIENT_ID:'fixture',GOOGLE_CLIENT_SECRET:'fixture'};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
async function setup(){const dir=await mkdtemp(join(tmpdir(),'duck-doc-tools-')),store=await openStore(dir),a=await store.register('docs@example.test','fixture-password-123');store.queueAccountMail(a.user.id,'verify');store.verifyEmail(a.user.id,/인증번호: (\d{6})/.exec(store.claimMail().message.text)[1]);store.saveConnection(a.user.id,'notion',{connectionId:'notion-connection',accessToken:'fixture-notion-secret',features:['pages','pagesWrite']},'문서');return {store,user:a.user.id,async close(){store.close();await rm(dir,{recursive:true,force:true});}};}
test('chat searches outside recent documents and reads nested content with bounded read-only tools and exact citations',async()=>{
 const h=await setup();try{
  const calls=[],page='12345678-1234-1234-1234-123456789012',full='notion-connection:page:'+page,ref='notion:'+full;let requests=0;
  const integrations=createIntegrations(h.store,env,async(url,options={})=>{calls.push([String(url),options.method??'GET']);if(String(url).includes('/search'))return json({results:options.body?.includes('기획')?[{id:page,properties:{Name:{type:'title',title:[{plain_text:'이전 기획 문서'}]}}}]:[]});if(String(url).includes('/children'))return json({results:[{id:'nested',has_children:false,type:'to_do',to_do:{checked:false,rich_text:[{plain_text:'기획안을 검토해주세요.'}]}}]});throw Error('unexpected provider URL');});
  const assistant=createAssistant(h.store,integrations,env,async(url,options)=>{
   requests++;const request=JSON.parse(options.body);assert.equal(request.store,false);assert.equal(JSON.stringify(request).includes('fixture-notion-secret'),false);
   if(requests===1){assert.ok(!JSON.parse(request.input[0].content).catalog.some(a=>a.provider==='google'));return json({output:[{type:'function_call',call_id:'search1',name:'search_documents',arguments:JSON.stringify({provider:'notion',query:'기획',connectionId:null})}]});}
   if(requests===2){assert.match(request.input.at(-1).output,/이전 기획 문서/);return json({output:[{type:'function_call',call_id:'read1',name:'read_document',arguments:JSON.stringify({provider:'notion',id:full})}]});}
   assert.match(request.input.at(-1).output,/기획안을 검토/);return json({output_text:JSON.stringify({answer:'기획 문서에 검토 요청이 있어요.',suggestions:[{operation:'todo.create',argsJson:JSON.stringify({title:'기획안 검토'}),sourceRefs:[ref]}]})});
  });
  const result=await assistant.chat(h.user,{message:'기획 문서를 확인해줘',providers:['notion'],consent:true});assert.equal(result.proposals.length,1);assert.match(result.sources.find(s=>s.ref===ref).text,/\[ \] 기획안을/);assert.equal(h.store.list(h.user).length,0);assert.equal(h.store.assistantActions(h.user).length,0);assert.ok(calls.every(([url,method])=>method==='GET'||url.endsWith('/search')));
 }finally{await h.close();}
});
test('model cannot read an invented document or continue with revoked source consent',async()=>{
 const h=await setup();try{
  let reads=0,round=0;const integration=createIntegrations(h.store,env,async()=>json({results:[]}));integration.readSource=async()=>{reads++;throw Error('must not read');};
  const a=createAssistant(h.store,integration,env,async()=>{if(++round===1)return json({output:[{type:'function_call',call_id:'bad',name:'read_document',arguments:JSON.stringify({provider:'notion',id:'notion-connection:page:invented'})}]});return json({output_text:JSON.stringify({answer:'접근 가능한 문서를 먼저 알려주세요.',suggestions:[]})});});
  const result=await a.chat(h.user,{message:'문서 확인',providers:['notion'],consent:true});assert.equal(reads,0);assert.equal(result.proposals.length,0);
  const b=createAssistant(h.store,integration,env,async()=>{h.store.removeConnection(h.user,'notion');return json({output_text:JSON.stringify({answer:'확인했어요.',suggestions:[]})});});
  await assert.rejects(b.chat(h.user,{message:'문서 확인',providers:['notion'],consent:true}),error=>error.status===409);
 }finally{await h.close();}
});
test('Drive title search escapes query syntax and body reads still require a separate content grant',async()=>{
 const h=await setup();try{
  h.store.saveConnection(h.user,'google',{connectionId:'google-connection',accessToken:'fixture-google-secret',features:['drive']},'Google');let query;
  const integrations=createIntegrations(h.store,env,async url=>{query=new URL(url).searchParams.get('q');return json({files:[{id:'file',name:'검색 결과'}]});});
  const result=await integrations.searchDocuments(h.user,'google',"a' or trashed=true");assert.equal(result.canReadBody,false);assert.match(query,/a\\' or trashed=true/);assert.equal(result.items[0].id,'google-connection:drive:file');await assert.rejects(integrations.readSource(h.user,'google',result.items[0].id),error=>error.status>=400);
 }finally{await h.close();}
});
