import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatNoteEdit,MAX_NOTES_LENGTH} from './notes.ts';
import {validateDraft,parseTodos} from './domain.ts';
test('plain notes turn line-start dash-space into bullets without changing ordinary hyphens',()=>{
 assert.equal(formatNoteEdit('','- 준비물\n- 자료').text,'• 준비물\n• 자료');
 assert.equal(formatNoteEdit('','회의 - 준비 / 2026-11-03').text,'회의 - 준비 / 2026-11-03');
 assert.equal(formatNoteEdit('• 준비물','• 준비물\n').text,'• 준비물\n• ');
 assert.equal(formatNoteEdit('• 준비물\n• ','• 준비물\n• \n').text,'• 준비물\n');
 assert.equal(formatNoteEdit('','x'.repeat(MAX_NOTES_LENGTH+1)).text.length,MAX_NOTES_LENGTH);
});
test('notes validation preserves old todos and rejects invalid/oversized note fields',()=>{
 const draft={title:'할 일',dueDate:null,category:'일상' as const,notes:'• 메모'};
 assert.equal(validateDraft(draft).notes,'• 메모');
 assert.throws(()=>validateDraft({...draft,notes:'x'.repeat(MAX_NOTES_LENGTH+1)}));
 assert.equal(parseTodos([{id:'old',title:'기존 할 일',done:false,dueDate:null}]).length,1);
 assert.throws(()=>parseTodos([{id:'bad',title:'할 일',done:false,notes:42}]));
});
