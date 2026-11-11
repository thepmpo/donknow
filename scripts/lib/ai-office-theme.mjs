import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
export const spriteHash=data=>createHash('sha256').update(data).digest('hex');
export function validateTheme(directory){
 const theme=JSON.parse(fs.readFileSync(path.join(directory,'theme.json'),'utf8')),numbers=new Set(),names=new Set();
 if(theme.version!==1||!Array.isArray(theme.entries)||!theme.entries.length)throw Error('office_invalid_theme');
 for(const e of theme.entries){if(!/^[a-zA-Z0-9_-]+$/.test(e.originalName)||typeof e.label!=='string'||!e.label.trim()||!Number.isInteger(e.spriteNumber)||e.spriteNumber<1||e.spriteNumber>9999||numbers.has(e.spriteNumber)||names.has(e.originalName))throw Error('office_invalid_theme_entry');numbers.add(e.spriteNumber);names.add(e.originalName);
  for(const frame of ['D-1','D-2','D-3','L-1','R-1']){const f=e.files?.[frame];if(!f||f.file!==`sprites/${e.spriteNumber}-${frame}.png`)throw Error('office_invalid_theme_path');const file=path.join(directory,f.file);if(fs.realpathSync(file)!==file||fs.statSync(file).size>8*1024*1024)throw Error('office_invalid_theme_file');const data=fs.readFileSync(file);if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||spriteHash(data)!==f.sha256)throw Error('office_theme_integrity_failed');}
 }return theme;
}
export function appearanceChanges(theme,agents){const changes=[];for(const e of theme.entries){const matches=agents.filter(a=>a.name===e.originalName);if(matches.length!==1)throw Error('office_theme_staff_match_required:'+e.originalName);const a=matches[0];if(a.name_ko===e.label&&a.sprite_number===e.spriteNumber)continue;changes.push({id:a.id,originalName:a.name,before:{name_ko:a.name_ko??null,sprite_number:a.sprite_number??null},after:{name_ko:e.label,sprite_number:e.spriteNumber}});}return changes;}
export function preserveRuntimeSprite(file,buffer){if(fs.existsSync(file)){if(spriteHash(fs.readFileSync(file))!==spriteHash(buffer))throw Error('office_existing_sprite_preserved');return false;}fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,buffer,{flag:'wx',mode:0o644});return true;}
