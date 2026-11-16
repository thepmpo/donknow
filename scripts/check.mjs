import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
const files=['server.js','server-runtime.js','public/app.js',...(await readdir(new URL('../server/',import.meta.url))).filter(name=>name.endsWith('.js')).map(name=>'server/'+name),...(await readdir(new URL('./',import.meta.url))).filter(name=>/\.(mjs|js)$/.test(name)).map(name=>'scripts/'+name),...(await readdir(new URL('../companion/',import.meta.url))).filter(name=>name.endsWith('.mjs')).map(name=>'companion/'+name),...(await readdir(new URL('../mobile/plugins/',import.meta.url))).filter(name=>name.endsWith('.cjs')).map(name=>'mobile/plugins/'+name)];
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit',cwd:new URL('../',import.meta.url)});if(result.status!==0)process.exit(result.status??1);}
console.log(`Syntax checked ${files.length} server/web/tool files`);
