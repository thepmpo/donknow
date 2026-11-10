// Foreground supervisor: document indexing and office server share the same lifetime.
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const runtime=process.env.AI_OFFICE_RUNTIME_PATH??'/workspace/ai-office-runtime';
const children=[];let stopping=false;
function stop(code=0){if(stopping)return;stopping=true;for(const child of children)child.kill('SIGTERM');process.exitCode=code;}
for(const [file,args,cwd] of [[process.execPath,['scripts/ai-office-knowledge.mjs','serve'],repo],[path.join(runtime,'node_modules/.bin/tsx'),['server/index.ts'],runtime]]){
 const child=spawn(file,args,{cwd,stdio:'inherit',env:{...process.env,NODE_ENV:'production',AI_OFFICE_KNOWLEDGE_ENABLED:'true',AI_OFFICE_WORKERS_ENABLED:'false',AI_OFFICE_DEVELOPMENT_ENABLED:'false'}});children.push(child);child.on('error',()=>stop(1));child.on('exit',code=>{if(!stopping)stop(code||1);});
}
process.on('SIGTERM',()=>stop());process.on('SIGINT',()=>stop());
