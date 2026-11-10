// Apply only the reviewed patch to the exact upstream version; never start workers or alter credentials.
import {readFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
const checkout=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const metadata=JSON.parse(await readFile(resolve(checkout,'tools/ai-office/runtime-policy.json'),'utf8'));
const patchPath=resolve(checkout,'tools/ai-office/runtime-policy.patch');
const patch=await readFile(patchPath);if(createHash('sha256').update(patch).digest('hex')!==metadata.patchSha256)throw Error('Policy patch checksum mismatch');
const target=resolve(process.argv[2]??'/workspace/ai-office-runtime');
const git=(...args)=>execFileSync('git',['-C',target,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
if(git('rev-parse','--show-toplevel')!==target)throw Error('Target must be a repository root');
const head=git('rev-parse','HEAD');
if(head===metadata.policyCommit&&git('diff','HEAD','--')===''){
 console.log('Policy patch already installed; configuration and worker lock preserved.');
}else{
 if(head!==metadata.baseCommit||git('diff','HEAD','--')!=='')throw Error('Target differs from pinned clean upstream. Preserve changes and review before applying.');
 const check=spawnSync('git',['-C',target,'apply','--check',patchPath],{stdio:'pipe'});if(check.status!==0)throw Error('Patch cannot apply cleanly; target was not changed');
 execFileSync('git',['-C',target,'apply',patchPath],{stdio:'pipe'});
 console.log('Reviewed policy source applied. Configure isolated office policy with workers disabled before starting. No models, keys, database, commits or remotes were changed.');
}
