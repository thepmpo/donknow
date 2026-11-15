import {Unzip,UnzipInflate} from 'fflate';
import {fail} from './secrets.js';
const xmlText=s=>s.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[a-f\d]+);/gi,m=>{const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};if(named[m])return named[m];const n=parseInt(m.slice(m[2]?.toLowerCase()==='x'?3:2,-1),m[2]?.toLowerCase()==='x'?16:10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});
/** Read-only OOXML extraction. Macros, external relationships and formula code never run. */
export function readOfficeDocument(bytes,name,{maxBytes=24*1024*1024}={}){
 const ext=name.split('.').at(-1)?.toLowerCase();if(!['docx','xlsx','pptx'].includes(ext))throw fail(415,'지원하는 문서 형식이 아니에요.');if(bytes.length>12*1024*1024)throw fail(413,'문서는12MB 이내로 넣어주세요.');
 const parts=new Map();let total=0,files=0;
 const wanted=n=>ext==='docx'?/^word\/(document|header\d+|footer\d+|footnotes|endnotes|comments)\.xml$/.test(n):ext==='pptx'?/^ppt\/(slides\/slide\d+|notesSlides\/notesSlide\d+)\.xml$/.test(n):/^xl\/(sharedStrings|workbook|worksheets\/sheet\d+)\.xml$/.test(n);
 const unzip=new Unzip(file=>{if(!wanted(file.name))return;if(++files>500||file.originalSize>maxBytes)throw fail(413,'문서 내용이 너무 커요.');const chunks=[];file.ondata=(error,chunk,final)=>{if(error)throw fail(400,'문서 압축을 읽지 못했어요.');total+=chunk.length;if(total>maxBytes)throw fail(413,'문서 압축 내용이 너무 커요.');chunks.push(chunk);if(final){const text=Buffer.concat(chunks).toString('utf8');if(/<!DOCTYPE|<!ENTITY/i.test(text))throw fail(400,'외부 XML 선언은 처리하지 않아요.');parts.set(file.name,text);}};file.start();});unzip.register(UnzipInflate);
 try{for(let at=0;at<bytes.length;at+=1024)unzip.push(bytes.subarray(at,at+1024),at+1024>=bytes.length);}catch(error){if(error.status)throw error;throw fail(400,'문서 압축 형식을 확인해주세요.');}
 if(!parts.size)throw fail(400,'문서 본문을 찾을 수 없어요.');
 const texts=(xml,tag)=>[...xml.matchAll(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','g'))].map(m=>xmlText(m[1].replace(/<[^>]+>/g,'')));
 const order=([...parts]).sort(([a],[b])=>a.localeCompare(b,undefined,{numeric:true}));let lines=[];
 if(ext==='xlsx'){
  const shared=[...(parts.get('xl/sharedStrings.xml')??'').matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(m=>texts(m[1],'t').join(''));
  for(const [path,xml] of order.filter(([p])=>p.includes('/worksheets/'))){lines.push('# '+path);for(const row of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){const cells=[];for(const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){const coord=/\br="([^"]+)"/.exec(cell[1])?.[1]??'',type=/\bt="([^"]+)"/.exec(cell[1])?.[1],value=/<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1]??'';const text=type==='s'?shared[Number(value)]??'':type==='inlineStr'?texts(cell[2],'t').join(''):xmlText(value);cells.push(coord+': '+text);}lines.push(cells.join(' | '));}}
 }else for(const [path,xml] of order){lines.push('# '+path);const tag=ext==='docx'?'w:t':'a:t';for(const paragraph of xml.split(ext==='docx'?/<\/w:p>/:/<\/a:p>/)){const text=texts(paragraph,tag).join('');if(text)lines.push(text);}}
 return {text:lines.join('\n'),format:ext,partial:false,notice:ext==='xlsx'?'셀의 저장된 값과 텍스트를 읽었어요. 수식 재계산은 실행 도구로 처리해요.':'본문·주석/발표 노트의 텍스트를 읽었어요. 그림·배치의 시각 검토는 파일 분석을 사용해요.'};
}
