import test from 'node:test';
import assert from 'node:assert/strict';
import {readNotionDocument} from '../server/notion-document.js';
const block=(id,text,extra={})=>({id,type:'paragraph',paragraph:{rich_text:[{plain_text:text}]},...extra});
test('Notion table cells remain readable and unsupported embedded bodies are identified as partial',async()=>{
 const result=await readNotionDocument(async()=>({results:[{id:'row',type:'table_row',table_row:{cells:[[{plain_text:'요청'}],[{plain_text:'검토 대기'}]]}},{id:'file',type:'pdf',pdf:{caption:[{plain_text:'첨부 문서'}]}}]}),'root');
 assert.match(result.text,/요청 \| 검토 대기/);assert.match(result.text,/본문은 읽지 못했어요/);assert.equal(result.partial,true);
});
test('Notion traversal preserves hierarchy/check status and follows paginated children',async()=>{
 const pages={root:{results:[block('a','큰 제목',{has_children:true}),{id:'t',type:'to_do',to_do:{checked:true,rich_text:[{plain_text:'완료 항목'}]}}],has_more:true,next_cursor:'next'},a:{results:[block('b','하위 요청')],has_more:false},next:{results:[block('c','다음 페이지')],has_more:false}};
 const read=await readNotionDocument((id,cursor)=>pages[cursor??id],'root');assert.equal(read.partial,false);assert.match(read.text,/큰 제목\n  하위 요청\n\[x\] 완료 항목\n다음 페이지/);assert.equal(read.readRequests,3);
});
test('Notion limits, missing children and cycles are explicit; root failure is not reported as an empty document',async()=>{
 const reader=async id=>({results:[block(id==='root'?'a':'root','내용',{has_children:true})],has_more:false});
 assert.equal((await readNotionDocument(reader,'root')).partial,true);
 assert.equal((await readNotionDocument(reader,'root',{maxRequests:1})).readRequests,1);
 const truncated=await readNotionDocument(async()=>({results:[block('a','아'.repeat(100))]}),'root',{maxChars:10});assert.equal(truncated.text.length,10);assert.equal(truncated.partial,true);
 await assert.rejects(readNotionDocument(async()=>{throw Error('denied');},'root'),/denied/);
 const partial=await readNotionDocument(async id=>{if(id==='a')throw Error('denied');return {results:[block('a','상위',{has_children:true})]};},'root');assert.equal(partial.partial,true);assert.equal(partial.text,'상위');
});
