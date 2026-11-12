// Only loaded in the isolated end-to-end test server via NODE_OPTIONS.
import assert from 'node:assert/strict';
assert.equal(process.env.NODE_ENV,'test');
assert.equal(process.env.OPENAI_API_KEY,'fixture-todo-flow-key');
globalThis.fetch=async(url,options)=>{
 assert.equal(String(url),'https://api.openai.com/v1/responses');
 assert.equal(options.method,'POST');
 assert.equal(options.headers.Authorization,'Bearer fixture-todo-flow-key');
 const payload=JSON.parse(options.body),input=JSON.parse(payload.input);
 assert.equal(payload.store,false);
 assert.ok(input.context.sources.some(source=>source.ref==='paste:input'));
 return new Response(JSON.stringify({output_text:JSON.stringify({answer:'자료 검토 후보를 준비했어요.',suggestions:[{operation:'todo.create',argsJson:JSON.stringify({title:'확인한 자료 검토',notes:'담당자에게 전달할 내용을 정리하기',dueDate:null}),sourceRefs:['paste:input']}]})}),{headers:{'Content-Type':'application/json'}});
};
