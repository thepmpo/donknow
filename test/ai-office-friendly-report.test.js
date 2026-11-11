import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const fragment = fs.readFileSync(new URL('../tools/ai-office/native-chat/friendly-report.tsx.fragment', import.meta.url), 'utf8');
// The parser is pure TypeScript before the React component. Node24 strips its types without a new dependency.
const parserSource = fragment.split('export function FriendlyOfficeReport')[0];
const helpers = vm.runInNewContext(stripTypeScriptTypes(parserSource) + ';({parseFriendlyOfficeReport,buildOfficeReportPrintHtml,openOfficeReportPrint})', {});
const parse = helpers.parseFriendlyOfficeReport;

test('friendly report displays only explicit conclusion/actions/decisions, with source references folded', () => {
  const result = parse('## 한 줄 결론\n가입 흐름부터 검토하는 것이 좋습니다.\n## 지금 할 일\n1. 첫 저장 화면을 확인하세요.\n## 내가 결정할 것\n어느 화면부터 검토할지 골라주세요.\n## 기술 근거\nRevision abcdef0123456789abcdef /workspace/project/source/file.ts');
  assert.deepEqual(Array.from(result.sections, section => section.key), ['conclusion', 'actions', 'decisions']);
  assert.equal(result.olderFormat, false);
  assert.equal(result.technicalHidden, true);
  assert.equal(JSON.stringify(result.sections).includes('abcdef0123'), false);
});

test('older screenshot-style report retains uncertainty and next choices without inventing a conclusion', () => {
  const result = parse('**완료되어 제외한 일:** 저장 기능은 이미 구현했습니다.\n**미확인:** 실계정 응답은 아직 확인하지 못했습니다.\n**읽은 문서·버전:** Revision f826a95513a4343744fb902558851fac /workspace/product/AGENTS.md\n**다음 선택지:** 화면을 먼저 확인하거나, 확인이 끝난 뒤 개선하세요.');
  assert.equal(result.olderFormat, true);
  assert.equal(result.sections.some(section => section.key === 'conclusion'), false);
  assert.equal(result.sections.find(section => section.key === 'unknown').paragraphs[0], '실계정 응답은 아직 확인하지 못했습니다.');
  assert.equal(result.sections.find(section => section.key === 'options').paragraphs[0], '화면을 먼저 확인하거나, 확인이 끝난 뒤 개선하세요.');
  assert.equal(JSON.stringify(result.sections).includes('f826a955'), false);
});

test('mixed technical conditions keep a visible warning and remain intact in the original', () => {
  const content = '## 한 줄 결론\n검토만 끝났습니다.\n## 지금 할 일\n결과를 확인해주세요.\n## 미확인\n실계정 검증은 안 됐습니다. Revision abcdef0123456789를 확인하세요.';
  const result = parse(content);
  const unknown = result.sections.find(section => section.key === 'unknown');
  assert.equal(unknown.hiddenParagraphs, 1);
  assert.equal(unknown.paragraphs.length, 0);
  assert.equal(result.technicalHidden, true);
  assert.ok(fragment.includes('<MessageContent content={content}/>'));
  assert.ok(fragment.includes('section.hiddenParagraphs'));
  assert.equal(fragment.includes('dangerouslySetInnerHTML'), false);
});

test('unlabelled prose is not presented as an invented action or completion', () => {
  const result = parse('자동화는 아직 실계정에서 확인하지 못했습니다. 어떤 선택이 필요한지는 다음 검토에서 정해야 합니다.');
  assert.equal(result.sections.length, 0);
  assert.equal(result.olderFormat, true);
});


test('print document escapes model HTML and includes the exact complete report with folded technical conditions', () => {
  const content = '## 한 줄 결론\n검토가 끝났어요.\n## 지금 할 일\n첫 화면을 확인하세요.\n## 미확인\n실계정은 미검증입니다. Revision abcdef0123456789abcdef\n## 기술 근거\n/workspace/product/source.ts\n<script>globalThis.secret=1</script><img src="https://evil.test/private">\n' + '긴 원문을 줄이지 않습니다. '.repeat(8000);
  const html = helpers.buildOfficeReportPrintHtml(content, '<img src=x onerror="alert(1)"> 보고서');
  assert.match(html, /@page\{size:A4;margin:18mm\}/);
  assert.match(html, /인쇄 \/ PDF로 저장/);
  assert.match(html, /파일 저장이나 메일 발송이 완료되지는 않습니다/);
  assert.match(html, /설명과 조건이 함께 있는 항목/);
  assert.equal(html.includes('<script>'), false);
  assert.equal(html.includes('<img'), false);
  assert.match(html, /&lt;script&gt;globalThis.secret=1&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=&quot;https:\/\/evil.test\/private&quot;&gt;/);
  const escape = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  assert.ok(html.includes('<pre>'+escape(content)+'</pre>'));
});

test('print preview preserves unlabelled reports without inventing a summary or completion', () => {
  const html = helpers.buildOfficeReportPrintHtml('판단에 필요한 자료가 아직 없습니다.', '  ');
  assert.match(html, /<h1>AI 사무실 보고서<\/h1>/);
  assert.match(html, /<pre>판단에 필요한 자료가 아직 없습니다\.<\/pre>/);
  assert.equal(html.includes('class="summary"'), false);
  assert.equal(html.includes('<h2>한 줄 결론</h2>'), false);
});

test('print opens only a user-triggered preview and reports popup blocking without executing or saving anything', () => {
  const alerts=[],calls=[],preview={opener:{},document:{open(){calls.push('open');},write(html){calls.push(html);},close(){calls.push('close');}},focus(){calls.push('focus');},close(){calls.push('window-close');}};
  let blocked=true;
  const window={open(...args){calls.push(args);return blocked?null:preview;},alert(message){alerts.push(message);}};
  const open=vm.runInNewContext(stripTypeScriptTypes(parserSource)+';openOfficeReportPrint',{window});
  assert.equal(open('원문'),false);assert.equal(alerts.length,1);assert.match(alerts[0],/팝업을 허용/);
  assert.deepEqual(calls[0],['','_blank','width=900,height=900']);
  calls.length=0;blocked=false;
  assert.equal(open('보존된 원문','검토 결과'),true);assert.equal(preview.opener,null);
  assert.equal(calls.filter(c=>typeof c==='string'&&c.startsWith('<!doctype')).length,1);
  assert.ok(calls.some(c=>typeof c==='string'&&c.includes('<pre>보존된 원문</pre>')));
  assert.equal(calls.includes('window-close'),false);
  assert.equal(calls.at(-1),'focus');
});
