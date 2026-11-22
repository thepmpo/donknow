import {zipSync,strToU8} from 'fflate';
import {readFile} from 'node:fs/promises';
import {PDFDocument,rgb} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import pptxgen from 'pptxgenjs';
import {fail} from './secrets.js';
const escape=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const xml=s=>'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+s;
const packed=files=>Buffer.from(zipSync(Object.fromEntries(Object.entries(files).map(([k,v])=>[k,strToU8(v)]))));
const mime={txt:'text/plain',md:'text/markdown',csv:'text/csv',json:'application/json',html:'text/html',pdf:'application/pdf',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation'};
let koreanFont;
export async function buildAgentFile({name,format,title='docen 문서',content}){
 if(!Object.hasOwn(mime,format)||typeof content!=='string'||content.length>250000||typeof name!=='string'||!name.trim()||/[\\/\x00-\x1f]/.test(name)||name.length>170)throw fail(400,'파일 이름·형식·내용을 확인해주세요.');
 const filename=name.toLowerCase().endsWith('.'+format)?name:name+'.'+format,lines=content.split('\n');let data;
 if(['txt','md'].includes(format))data=Buffer.from(content);
 if(format==='json'){try{data=Buffer.from(JSON.stringify(JSON.parse(content),null,2));}catch{throw fail(400,'JSON 내용을 확인해주세요.');}}
 if(format==='csv'){let rows;try{rows=JSON.parse(content);}catch{}if(Array.isArray(rows)&&rows.every(Array.isArray))data=Buffer.from('\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"').join(',')).join('\r\n'));else data=Buffer.from('\uFEFF'+content);}
 if(format==='html')data=Buffer.from('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>'+escape(title)+'</title><style>body{max-width:820px;margin:40px auto;padding:24px;font:16px/1.7 system-ui;overflow-wrap:anywhere}pre{white-space:pre-wrap}</style><h1>'+escape(title)+'</h1><pre>'+escape(content)+'</pre></html>');
 if(format==='docx'){
  const p=t=>'<w:p><w:r><w:t xml:space="preserve">'+escape(t)+'</w:t></w:r></w:p>';
  data=packed({'[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>'),'_rels/.rels':xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'),'word/document.xml':xml('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+p(title)+lines.map(p).join('')+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>')});
 }
 if(format==='xlsx'){
  let rows;try{rows=JSON.parse(content);}catch{rows=lines.map(line=>line.split('\t'));}if(!Array.isArray(rows)||rows.length>10000||!rows.every(r=>Array.isArray(r)&&r.length<=200))throw fail(400,'시트 데이터는 행의 배열로 넣어주세요.');const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
  const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,n)=>'<row r="'+(n+1)+'">'+row.map((cell,c)=>typeof cell==='number'&&Number.isFinite(cell)?'<c r="'+col(c)+(n+1)+'"><v>'+cell+'</v></c>':'<c r="'+col(c)+(n+1)+'" t="inlineStr"><is><t xml:space="preserve">'+escape(cell??'')+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>';
  data=packed({'[Content_Types].xml':xml('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>'),'_rels/.rels':xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),'xl/workbook.xml':xml('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="자료" sheetId="1" r:id="rId1"/></sheets></workbook>'),'xl/_rels/workbook.xml.rels':xml('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>'),'xl/worksheets/sheet1.xml':xml(sheet)});
 }
 if(format==='pptx'){
  const deck=new pptxgen();deck.layout='LAYOUT_WIDE';deck.author='docen';deck.subject=title;deck.title=title;deck.company='docen';deck.lang='ko-KR';
  deck.theme={headFontFace:'Noto Sans KR',bodyFontFace:'Noto Sans KR',lang:'ko-KR'};
  for(const page of content.split(/\n---+\n/).slice(0,100)){
   const [heading,...rest]=page.split('\n'),slide=deck.addSlide();slide.background={color:'FFFFFF'};
   slide.addText((heading||title).replace(/^#+\s*/,''),{x:.6,y:.45,w:12.1,h:.8,fontFace:'Noto Sans KR',fontSize:28,bold:true,color:'17212E',margin:0,breakLine:false,fit:'shrink'});
   slide.addText(rest.join('\n'),{x:.6,y:1.5,w:12.1,h:5.25,fontFace:'Noto Sans KR',fontSize:18,color:'273443',margin:0,breakLine:false,fit:'shrink',valign:'top',paraSpaceAfterPt:10});
   slide.addText(String(deck._slides.length),{x:12,y:7,w:.6,h:.2,fontSize:10,color:'677480',margin:0});
  }
  data=Buffer.from(await deck.write({outputType:'nodebuffer'}));
 }
 if(format==='pdf'){
  const pdf=await PDFDocument.create();pdf.registerFontkit(fontkit);koreanFont??=await readFile(new URL('./fonts/NotoSansKR.ttf',import.meta.url));const font=await pdf.embedFont(koreanFont,{subset:true});let page=pdf.addPage([595.28,841.89]),y=785;const draw=(text,size)=>{let line='';for(const c of [...text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g,'')]){if(font.widthOfTextAtSize(line+c,size)>495){if(y<55){page=pdf.addPage([595.28,841.89]);y=785;}page.drawText(line,{x:50,y,size,font,color:rgb(.09,.12,.16)});y-=size*1.6;line=c;}else line+=c;}if(y<55){page=pdf.addPage([595.28,841.89]);y=785;}page.drawText(line,{x:50,y,size,font,color:rgb(.09,.12,.16)});y-=size*1.6;};draw(title,20);y-=12;for(const line of lines)draw(line,11);data=Buffer.from(await pdf.save());
 }
 if(!data||data.length>12*1024*1024)throw fail(413,'파일 크기를 줄여주세요.');return {name:filename,mime:mime[format],data:data.toString('base64'),metadata:{format,title}};
}
