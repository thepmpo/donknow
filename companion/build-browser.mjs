import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,cp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url)),context=await mkdtemp(join(tmpdir(),'duck-browser-build-')),exec=promisify(execFile);
try{const module=resolve(root,'../mobile/node_modules/playwright-core');const p=await exec('npm',['pack',module,'--offline','--pack-destination',context],{env:{...process.env,npm_config_cache:process.env.npm_config_cache||join(tmpdir(),'duck-npm-cache')},maxBuffer:1024*1024});const name=p.stdout.trim().split('\n').at(-1);await cp(join(root,'browser-worker.mjs'),join(context,'browser-worker.mjs'));await writeFile(join(context,'Dockerfile'),`FROM node:24-bookworm-slim\nRUN apt-get update && apt-get install -y --no-install-recommends chromium fonts-noto-cjk && rm -rf /var/lib/apt/lists/*\nWORKDIR /app\nCOPY ${name} /app/playwright.tgz\nRUN npm install --ignore-scripts --offline /app/playwright.tgz && rm /app/playwright.tgz\nCOPY browser-worker.mjs /app/browser-worker.mjs\nRUN chmod -R a+rX /app\nUSER node\nCMD ["node","/app/browser-worker.mjs"]\n`);const r=await exec('docker',['build','-t','duck-browser:local',context],{maxBuffer:8*1024*1024});process.stdout.write(r.stdout);process.stderr.write(r.stderr);}finally{await rm(context,{recursive:true,force:true});}
