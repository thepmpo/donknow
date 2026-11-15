/** Bounded, read-only traversal; checked tasks and nesting survive flattening. */
export async function readNotionDocument(readPage,root,{maxRequests=8,maxBlocks=200,maxChars=12000,maxDepth=8}={}){
 const lines=[],seen=new Set();let requests=0,blocks=0,size=0,partial=false;
 async function walk(id,depth){
  if(seen.has(id)){partial=true;return;}seen.add(id);let cursor=null;
  do{
   if(requests>=maxRequests||blocks>=maxBlocks||size>=maxChars||depth>maxDepth){partial=true;return;}
   requests++;let page;try{page=await readPage(id,cursor);}catch(error){if(id===root&&requests===1)throw error;partial=true;return;}
   for(const block of page.results??[]){
    if(blocks>=maxBlocks||size>=maxChars){partial=true;return;}blocks++;
    const value=block[block.type]??{},plain=rich=>(rich??[]).map(t=>t.plain_text??t.text?.content??'').join('');
    let text=plain(value.rich_text)||value.title||plain(value.caption)||'';
    if(block.type==='table_row')text=(value.cells??[]).map(plain).join(' | ');
    if(['image','file','pdf','video','audio','embed','bookmark','child_database','link_to_page','unsupported'].includes(block.type)){partial=true;text+=' [첨부·연결 자료의 본문은 읽지 못했어요]';}
    const line='  '.repeat(depth)+(block.type==='to_do'?(value.checked?'[x] ':'[ ] '):'')+text;
    if(line.trim()){const available=maxChars-size;if(line.length>available)partial=true;lines.push(line.slice(0,available));size+=Math.min(line.length,available)+1;}
    if(block.has_children)await walk(block.id,depth+1);
   }
   cursor=page.has_more?page.next_cursor:null;if(page.has_more&&!cursor){partial=true;return;}
  }while(cursor);
 }
 await walk(root,0);
 return {id:root,text:lines.join('\n').slice(0,maxChars),partial,readBlocks:blocks,readRequests:requests,notice:partial?'문서가 길거나 접근할 수 없는 하위 내용이 있어 일부만 읽었어요.':'접근 가능한 문서의 하위 내용까지 확인했어요.'};
}
