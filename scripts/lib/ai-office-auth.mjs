import fs from 'node:fs';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';
// Keep the worker's auth-only HOME rule. Official Codex creates disposable .codex/tmp
// even during login/status; retain that directory outside the credential projection.
export function retainOnlyProviderAuth({providerHome,stateDir}){
 const state=fs.realpathSync(stateDir),home=fs.realpathSync(providerHome),codex=path.join(home,'.codex');
 if(home===state||!home.startsWith(state+path.sep)||fs.lstatSync(providerHome).isSymbolicLink()||fs.realpathSync(codex)!==codex)throw Error('office_scoped_auth_directory_required');
 if(fs.readdirSync(home).some(n=>n!=='.codex')||fs.readdirSync(codex).some(n=>!['auth.json','tmp'].includes(n)))throw Error('office_auth_additional_entries_require_review');
 const auth=path.join(codex,'auth.json');if(fs.realpathSync(auth)!==auth||!fs.statSync(auth).isFile()||fs.statSync(auth).size>524288)throw Error('office_invalid_provider_auth');
 const hash=()=>createHash('sha256').update(fs.readFileSync(auth)).digest('hex'),before=hash(),temporary=path.join(codex,'tmp');let moved=false;
 let temporaryStat;try{temporaryStat=fs.lstatSync(temporary);}catch(error){if(error.code!=='ENOENT')throw error;}
 if(temporaryStat){
  if(fs.realpathSync(temporary)!==temporary||!fs.statSync(temporary).isDirectory())throw Error('office_auth_tmp_requires_review');
  const backupRoot=path.join(state,'provider-cache-backups');if(fs.existsSync(backupRoot)&&fs.lstatSync(backupRoot).isSymbolicLink())throw Error('office_auth_backup_requires_review');fs.mkdirSync(backupRoot,{recursive:true,mode:0o700});
  fs.renameSync(temporary,path.join(backupRoot,'codex-tmp-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID()));moved=true;
 }
 if(hash()!==before)throw Error('office_auth_changed_during_repair');return {temporaryCacheBackedUp:moved,authenticationFilePreserved:true};
}
