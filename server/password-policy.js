import {fail} from './secrets.js';
export const passwordRules={minimumLength:8,maximumLength:128,requiresDigit:true,requiresSpecial:true};
export const passwordGuidance='숫자와 특수문자를 포함해 8자 이상으로 입력해주세요.';
export function validNewPassword(value){return typeof value==='string'&&value.length>=8&&value.length<=128&&/[0-9]/.test(value)&&/[!-/:-@\x5b-\x60\x7b-\x7e]/.test(value);}
export function requireNewPassword(value,confirmation){if(!validNewPassword(value))throw fail(400,passwordGuidance);if(typeof confirmation!=='string')throw fail(400,'비밀번호 확인이 필요합니다. 최신 앱을 사용하거나 docen 웹에서 가입·재설정을 진행해주세요.');if(value!==confirmation)throw fail(400,'비밀번호가 일치하지 않습니다.');}
