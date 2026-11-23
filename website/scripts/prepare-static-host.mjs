import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const target=path.join(root,'website/dist/static');
await rm(target,{recursive:true,force:true});
await cp(path.join(root,'website/dist/client'),target,{recursive:true});
// Publish an explicit public allowlist, never copy the app/admin bundle or server.
for(const name of ['terms','privacy','ai-policy','cookies','support','coming-soon']){
 const html=await readFile(path.join(root,'public',name+'.html'),'utf8');
 await mkdir(path.join(target,name),{recursive:true});
 await writeFile(path.join(target,name,'index.html'),html);
}
const legalRoot=path.join(root,'public/legal');
const {readdir}=await import('node:fs/promises');
for(const version of await readdir(legalRoot))for(const name of ['terms','privacy','ai-policy','cookies']){
 const html=await readFile(path.join(legalRoot,version,name+'.html'),'utf8');
 const dir=path.join(target,'legal',version,name);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'index.html'),html);
}
// Do not expose service UI via legacy links or direct paths while not launched.
const notice=await readFile(path.join(root,'public/coming-soon.html'),'utf8');
for(const name of ['app','admin','project','agent-call']){
 await mkdir(path.join(target,name),{recursive:true});await writeFile(path.join(target,name,'index.html'),notice);
}
await writeFile(path.join(target,'404.html'),notice);
await writeFile(path.join(target,'static-release.json'),JSON.stringify({surface:'introduction-only',release:process.env.RENDER_GIT_COMMIT||'local'}));
console.log('Static introduction: root assets, legal/archive/support, launch notice; no API/server/admin app code.');
