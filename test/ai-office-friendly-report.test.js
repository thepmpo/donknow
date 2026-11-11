import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
const fragment = fs.readFileSync(new URL('../tools/ai-office/native-chat/friendly-report.tsx.fragment', import.meta.url), 'utf8');
// The parser is pure TypeScript before the React component. Node24 strips its types without a new dependency.
const parserSource = fragment.split('export function FriendlyOfficeReport')[0];
const parse = vm.runInNewContext(stripTypeScriptTypes(parserSource) + ';parseFriendlyOfficeReport', {});

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
