export type ConsentPreferences={providers:string[];grants:string[]};
const known=['google','slack','notion','naver'];
export function consentPreferences(value:unknown):ConsentPreferences{const v=value as ConsentPreferences;if(!v||!Array.isArray(v.providers)||v.providers.some(p=>!known.includes(p))||!Array.isArray(v.grants)||v.grants.some(g=>typeof g!=='string'))return{providers:[],grants:[]};return{providers:[...new Set(v.providers)],grants:v.grants.slice(-16)};}
export function consentScope(providers:string[],scopes?:Record<string,string>){return JSON.stringify(['ai-consent-v1',...['todo',...new Set(providers)].sort().map(p=>[p,scopes?.[p]??'legacy'])]);}
export function durableConsentScope(scope:string){return !scope.includes('"legacy"');}
