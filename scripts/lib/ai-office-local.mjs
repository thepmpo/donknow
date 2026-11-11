import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {parseOfficeConfig} from './ai-office-client.mjs';
export function platformBundle(arch,metadata){const entry=metadata.linuxRunners?.[arch];if(!entry)throw Error('office_unsupported_architecture');return entry;}
export function ensureLocalConfig({workspace='/workspace',metadata,arch=process.arch}){
 const root=path.join(workspace,'ai-office'),runtime=path.join(workspace,'ai-office-runtime'),file=path.join(runtime,'.env'),runner=platformBundle(arch,metadata);
 const bundle=path.join(root,'provider/official-codex/node_modules/@openai',`codex-linux-${arch}`,'vendor',runner.triple),binary=path.join(bundle,'bin/codex');
 if(createHash('sha256').update(fs.readFileSync(binary)).digest('hex')!==runner.sha256)throw Error('office_runner_hash_mismatch');
 const values={HOST:'127.0.0.1',PORT:'8790',DB_PATH:path.join(root,'state/office.sqlite'),LOGS_DIR:path.join(root,'state/logs'),AI_OFFICE_POLICY_ENABLED:'true',AI_OFFICE_WORKERS_ENABLED:'false',AI_OFFICE_DEVELOPMENT_ENABLED:'false',AI_OFFICE_KNOWLEDGE_ENABLED:'true',AI_OFFICE_PROJECTS_ROOT:path.join(root,'projects'),AI_OFFICE_PROVIDER_AUTH_DIR:path.join(root,'state/provider-home'),AI_OFFICE_PROVIDER_BIN_ROOT:path.join(root,'provider'),AI_OFFICE_CODEX_BUNDLE_DIR:bundle,AI_OFFICE_CODEX_SHA256:runner.sha256};
 for(const dir of ['state','state/logs','state/provider-home/.codex','projects','knowledge/shared/inbox','bin'])fs.mkdirSync(path.join(root,dir),{recursive:true,mode:0o700});
 if(fs.existsSync(file)){
  const current=parseOfficeConfig(fs.readFileSync(file,'utf8'));
  for(const [key,value] of Object.entries(values))if(current[key]!==value)throw Error('office_existing_configuration_preserved_review_required:'+key);
  for(const key of ['OAUTH_ENCRYPTION_SECRET','AI_OFFICE_OWNER_KEY','INBOX_WEBHOOK_SECRET'])if(!current[key]||current[key]==='__CHANGE_ME__')throw Error('office_existing_secret_requires_review:'+key);
  return {created:false,preserved:true};
 }
 if(fs.existsSync(values.DB_PATH))throw Error('office_existing_database_requires_its_original_encryption_key');
 const secrets=Object.fromEntries(['OAUTH_ENCRYPTION_SECRET','AI_OFFICE_OWNER_KEY','INBOX_WEBHOOK_SECRET'].map(k=>[k,randomBytes(32).toString('hex')]));
 fs.writeFileSync(file,Object.entries({...values,...secrets}).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{mode:0o600,flag:'wx'});
 return {created:true,preserved:false};
}
