export const passwordGuidance='숫자와 특수문자를 포함해 8자 이상으로 입력해주세요.';
export function validNewPassword(value:string){return value.length>=8&&value.length<=128&&/[0-9]/.test(value)&&/[!-/:-@\x5b-\x60\x7b-\x7e]/.test(value);}
