import test from 'node:test';
import assert from 'node:assert/strict';
import {validNewPassword as client} from './password-policy.ts';
import {validNewPassword as server} from '../../server/password-policy.js';
test('mobile and server password composition agree at length and character boundaries',()=>{
 const samples:[string,boolean][]=[['Abc123!x',true],['1234567!',true],['abcdefg1',false],['abcdefg!',false],['Ab12!xy',false],['',false],['        ',false],['abcdef1 ',false],['한글한글한글1!',true],['x'.repeat(126)+'1!',true],['x'.repeat(127)+'1!',false],['1234567_',true],['1234567\\',true]];
 for(const [value,valid]of samples){assert.equal(client(value),valid,value);assert.equal(server(value),valid,value);}
});
