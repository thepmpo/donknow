import {spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
// Use the same checked implementation for login postprocessing and the standalone
// Windows repair. Credentials stay in place; known auxiliary data is retained privately.
export function retainOnlyProviderAuth({providerHome,stateDir}){
 const repair=fileURLToPath(new URL('../../tools/ai-office/install/repair-auth.py',import.meta.url));
 const result=spawnSync('python3',[repair,'--provider-home',providerHome,'--state-dir',stateDir],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:15000});
 if(result.error)throw Error('office_auth_repair_python_required');
 let status;try{status=JSON.parse(result.stdout);}catch{throw Error('office_auth_repair_response_invalid');}
 if(result.status!==0)throw Error(typeof status.reasonCode==='string'&&/^office_[a-z0-9_]+$/.test(status.reasonCode)?status.reasonCode:'office_auth_repair_failed');
 return status;
}
