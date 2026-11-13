import test from 'node:test';
import assert from 'node:assert/strict';
import {sendJson} from '../server/http-json.js';
test('serialization failure cannot leave a successful empty/truncated API response',()=>{
 const response={headersSent:false,status:null,body:null,writeHead(status){this.headersSent=true;this.status=status;},end(body){this.body=body;}};
 assert.throws(()=>sendJson(response,200,{private:1n}));assert.equal(response.headersSent,false);
 sendJson(response,500,{error:'요청을 처리하지 못했어요.'});assert.equal(response.status,500);assert.deepEqual(JSON.parse(response.body),{error:'요청을 처리하지 못했어요.'});
});
