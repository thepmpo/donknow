import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../server/store.js';
import {createAssistant} from '../server/assistant.js';
import {createIntegrations} from '../server/integrations.js';
import {createConversationAssistant} from '../server/assistant-conversation.js';
const env={AI_ENABLED:'true',OPENAI_API_KEY:'fixture-memory-key',OPENAI_MODEL:'fixture-model'};
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
async function setup(){const dir=await mkdtemp(join(tmpdir(),'duck-memory-'));let store=await openStore(dir);const a=await store.register('memory@example.test','fixture-password-123'),b=await store.register('other@example.test','fixture-password-123');store.queueAccountMail(a.user.id,'verify');store.verifyEmail(a.user.id,/인증번호: (\d{6})/.exec(store.claimMail().message.text)[1]);return {dir,user:a.user.id,other:b.user.id,get store(){return store;},async restart(){store.close();store=await openStore(dir);},async close(){store.close();await rm(dir,{recursive:true,force:true});}};}
test('memory is opt-in, encrypted, owner-scoped, editable/exportable and survives restart; full forgetting invalidates pending generations',async()=>{const h=await setup();try{
 assert.equal(h.store.memorySettings(h.user).enabled,false);assert.equal(h.store.conversation(h.user).turns.length,0);h.store.configureMemory(h.user,true);
 const run=h.store.claimConversation(h.user,'request-one',{message:'난 답장은 간결한 한국어가 좋아',providers:[]});
 const note=h.store.saveMemory(h.user,'간결한 한국어 답장',{automatic:true,quote:'답장은 간결한 한국어가 좋아',sourceTurnId:run.userTurnId});assert.equal(note.source,'conversation');
 assert.throws(()=>h.store.saveMemory(h.other,'다른 사람의 기억',{automatic:true,quote:'답장은 간결한 한국어가 좋아',sourceTurnId:run.userTurnId}));
 assert.throws(()=>h.store.saveMemory(h.user,'없는 근거',{automatic:true,quote:'이 말은 한 적이 없음',sourceTurnId:run.userTurnId}));
 assert.throws(()=>h.store.forgetMemory(h.other,note.id),e=>e.status===404);assert.equal(h.store.memories(h.other).length,0);
 const result={answer:'기억할게요.',proposals:[],sources:[{ref:'paste:input',provider:'paste',kind:'text',title:'붙여넣기',text:'원문비공개절대보관금지'}],warnings:[]};h.store.completeConversation(run,result);
 await h.restart();assert.equal(h.store.memories(h.user)[0].text,note.text);assert.equal(h.store.conversation(h.user).turns.length,2);assert.equal(h.store.searchConversation(h.user,'한국어').turns.length,1);
 const replay=h.store.claimConversation(h.user,'request-one',{message:'난 답장은 간결한 한국어가 좋아',providers:[]});assert.equal(replay.response.conversation.userTurn.id,run.userTurnId);assert.equal(replay.response.sources[0].text,'');
 assert.throws(()=>h.store.claimConversation(h.user,'request-one',{message:'바뀐 요청',providers:[]}),e=>e.status===409);assert.throws(()=>h.store.conversation(h.other,{before:run.userTurnId}),e=>e.status===404);
 const disk=await readFile(join(h.dir,'duckduck.sqlite'));assert.equal(disk.includes(Buffer.from('간결한 한국어 답장')),false);assert.equal(disk.includes(Buffer.from('원문비공개절대보관금지')),false);
 assert.equal(h.store.exportAssistantMemory(h.user).memories.length,1);h.store.saveMemory(h.user,'더 짧게 답장',{id:note.id});assert.equal(h.store.memories(h.user)[0].text,'더 짧게 답장');
 const pending=h.store.claimConversation(h.user,'pending-new',{message:'남아 있으면 안 됨',providers:[]});h.store.clearAssistantMemory(h.user,{conversations:true});assert.throws(()=>h.store.completeConversation(pending,result),e=>e.status===409);assert.equal(h.store.conversation(h.user).turns.length,0);assert.equal(h.store.memories(h.user).length,0);
 assert.equal(await h.store.deleteAccount(h.user,'fixture-password-123'),true);assert.equal(h.store.exportAssistantMemory(h.user).turns.length,0);
}finally{await h.close();}});
test('opted-in conversation/model tools remember verified user words and restore checklist IDs without replaying a model or source writes',async()=>{const h=await setup();try{
 h.store.configureMemory(h.user,true);let calls=0;const integrations=createIntegrations(h.store,{}),assistant=createAssistant(h.store,integrations,env,async(_url,options)=>{calls++;const req=JSON.parse(options.body);if(calls===1){assert.ok(req.tools.some(t=>t.name==='remember_fact'));return json({output:[{type:'function_call',name:'remember_fact',call_id:'remember',arguments:JSON.stringify({text:'답장은 간결한 한국어로',quote:'답장은 간결한 한국어로'})}]});}return json({output_text:JSON.stringify({answer:'기억하고 자료 확인을 준비했어요.',suggestions:[{operation:'todo.create',argsJson:JSON.stringify({title:'자료 확인'}),sourceRefs:[]}]})});});const chat=createConversationAssistant(h.store,assistant),body={message:'답장은 간결한 한국어로. 자료 확인도 할 일로 정리해줘',providers:[],consent:true,requestId:'conversation-first'};
 const first=await chat.chat(h.user,body);assert.equal(h.store.memories(h.user).length,1);assert.equal(first.conversation.assistantTurn.items.length,1);const item=first.conversation.assistantTurn.items[0];const saved=h.store.applyConversationItem(h.user,first.conversation.assistantTurn.id,item.key,'complete');assert.equal(saved.todo.done,true);assert.equal(h.store.list(h.user).length,1);const replay=await chat.chat(h.user,body);assert.equal(calls,2);assert.equal(replay.conversation.assistantTurn.items[0].todoId,saved.todo.id);assert.equal(h.store.conversation(h.user).turns.at(-1).items[0].todoId,saved.todo.id);assert.equal(h.store.assistantActions(h.user).length,0);
 h.store.configureMemory(h.user,false);assert.equal((await assistant.context(h.user,[])).sources.some(s=>s.provider==='memory'),false);assert.throws(()=>h.store.saveMemory(h.user,'자동 기억 금지',{automatic:true,quote:'답장은 간결한 한국어로',sourceTurnId:first.conversation.userTurn.id}),e=>e.status===409);
}finally{await h.close();}});
test('HTTP memory management requires authentication/ownership and explicit full deletion; business records survive',async()=>{const {apiHarness}=await import('../test-support/api.js'),h=await apiHarness();try{
 assert.equal((await h.request('/api/assistant/memory')).status,401);const a=await h.verified('memory-api@example.test'),b=await h.verified('memory-other@example.test');assert.equal((await h.request('/api/assistant/memory/settings','GET',undefined,a.token)).data.enabled,false);
 assert.equal((await h.request('/api/assistant/memory/settings','POST',{enabled:true},a.token)).data.enabled,true);const note=await h.request('/api/assistant/memory','POST',{text:'응답은 간결하게'},a.token);assert.equal(note.status,201);assert.equal((await h.request('/api/assistant/memory/'+note.data.id,'DELETE',{},b.token)).status,404);assert.equal((await h.request('/api/assistant/memory','GET',undefined,b.token)).data.memories.length,0);
 assert.equal((await h.request('/api/assistant/memory/'+note.data.id,'PATCH',{text:'짧은 한국어 답장'},a.token)).status,200);assert.equal((await h.request('/api/account/export','GET',undefined,a.token)).data.assistantMemory.memories[0].text,'짧은 한국어 답장');const todo=await h.request('/api/todos','POST',{title:'보관할 일',category:'일상',dueDate:null},a.token);assert.equal(todo.status,201);
 assert.equal((await h.request('/api/assistant/memory','DELETE',{conversations:true},a.token)).status,400);assert.equal((await h.request('/api/assistant/memory','DELETE',{confirmation:'DELETE',conversations:true},a.token)).status,200);assert.equal((await h.request('/api/assistant/conversation','GET',undefined,a.token)).data.turns.length,0);assert.equal((await h.request('/api/assistant/memory','GET',undefined,a.token)).data.memories.length,0);assert.equal((await h.request('/api/todos','GET',undefined,a.token)).data.length,1);
 }finally{await h.close();}});
