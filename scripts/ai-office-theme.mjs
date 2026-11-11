// Cosmetic changes only; no model, role, task, credentials or approvals are edited.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createOfficeClient} from './lib/ai-office-client.mjs';
import {validateTheme,appearanceChanges,preserveRuntimeSprite} from './lib/ai-office-theme.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),client=await createOfficeClient(),api=client.request,backupRoot=path.resolve(process.env.AI_OFFICE_STATE_DIR??'/workspace/ai-office/state','appearance-backups');
const [command,name]=process.argv.slice(2);
const agents=async()=>{const r=await api('/api/agents');return r.agents??r;};
if(command==='apply'&&name==='jjk'){
 const directory=path.join(repo,'tools/ai-office/themes/jujutsu-kaisen'),theme=validateTheme(directory),before=await agents(),changes=appearanceChanges(theme,before);
 // Preflight all paths before uploading/assigning any sprite; preserve other custom themes.
 for(const e of theme.entries)for(const f of Object.values(e.files)){const data=fs.readFileSync(path.join(directory,f.file));for(const base of ['public','dist']){const file=path.join(client.settings.runtimePath,base,f.file);if(fs.existsSync(file)&&!fs.readFileSync(file).equals(data))throw Error('office_existing_sprite_preserved:'+path.basename(file));}}
 fs.mkdirSync(backupRoot,{recursive:true,mode:0o700});const backup=path.join(backupRoot,'jjk-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json');const record={version:1,theme:'jjk',createdAt:new Date().toISOString(),changes,state:'prepared'};fs.writeFileSync(backup,JSON.stringify(record,null,2)+'\n',{mode:0o600,flag:'wx'});
 for(const e of theme.entries){for(const f of Object.values(e.files)){const data=fs.readFileSync(path.join(directory,f.file));preserveRuntimeSprite(path.join(client.settings.runtimePath,'public',f.file),data);if(fs.existsSync(path.join(client.settings.runtimePath,'dist')))preserveRuntimeSprite(path.join(client.settings.runtimePath,'dist',f.file),data);}}
 const applied=[];try{for(const change of changes){await api('/api/agents/'+change.id,'PATCH',change.after);applied.push(change);}record.state='applied';fs.writeFileSync(backup,JSON.stringify(record,null,2)+'\n',{mode:0o600});}catch(error){let rollbackFailed=false;for(const c of applied.reverse())try{await api('/api/agents/'+c.id,'PATCH',c.before);}catch{rollbackFailed=true;}record.state=rollbackFailed?'rollback_requires_review':'failed_rolled_back';fs.writeFileSync(backup,JSON.stringify(record,null,2)+'\n',{mode:0o600});throw error;}
 console.log(JSON.stringify({theme:'jjk',employees:theme.entries.length,changed:changes.length,backup,restorable:changes.length>0,rolesAndModelsChanged:false,staticIdleFrames:true},null,2));
}else if(command==='restore'&&name){
 const file=fs.realpathSync(name);if(!file.startsWith(fs.realpathSync(backupRoot)+path.sep))throw Error('office_theme_backup_outside_private_root');const record=JSON.parse(fs.readFileSync(file,'utf8'));if(record.version!==1||record.state!=='applied')throw Error('office_invalid_theme_backup');const current=await agents();for(const c of record.changes){const a=current.find(a=>a.id===c.id);if(!a||a.name!==c.originalName||a.name_ko!==c.after.name_ko||a.sprite_number!==c.after.sprite_number)throw Error('office_newer_appearance_preserved');}
 for(const c of record.changes)await api('/api/agents/'+c.id,'PATCH',c.before);record.state='restored';record.restoredAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(record,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({restored:record.changes.length,assetsPreserved:true,rolesAndModelsChanged:false}));
}else throw Error('Commands: apply jjk | restore <private-backup-path>');
