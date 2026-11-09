import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pasteTodos} from './paste-todos.ts';
test('paste extracts unique explicit tasks, excludes checked records and never infers prose',()=>{
 assert.deepEqual(pasteTodos('회의 대화입니다\n- 자료 보내기\n- [ ] 예약하기\n- [x] 완료함\n☑ 끝남\n1. 자료 보내기\n☐ 문의하기'),['자료 보내기','예약하기','문의하기']);
 assert.deepEqual(pasteTodos('내일 자료 보내주세요'),[]);
 assert.deepEqual(pasteTodos('- '+ '가'.repeat(121)),[]);
 assert.equal(pasteTodos(Array.from({length:30},(_,i)=>'- 할 일 '+i).join('\n')).length,20);
});
