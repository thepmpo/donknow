/** Compile the real AppIntents source against Apple's SDK before EAS allocates a build number. */
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

assert.equal(process.platform,'darwin','This check needs the existing Mac runner and Apple SDK; Linux checks cannot replace it.');
const exec=promisify(execFile),root=fileURLToPath(new URL('../',import.meta.url));
const directory=await mkdtemp(join(tmpdir(),'duck-shortcuts-swift-'));
async function run(args){return exec('xcrun',args,{cwd:directory,timeout:90000,maxBuffer:4*1024*1024});}
try{
 const sdk=(await run(['--sdk','iphoneos','--show-sdk-path'])).stdout.trim();
 // Check below the feature's availability so a missing @available gate is diagnosed.
 const flags=['-sdk',sdk,'-target','arm64-apple-ios16.4','-swift-version','5','-module-cache-path',join(directory,'cache')];
 const source=await readFile(join(root,'mobile/modules/duckduck-duo/ios/DuckduckAssistantModule.swift'),'utf8');
 const marker='public final class DuckduckAssistantModule: Module {';
 assert.equal(source.split(marker).length,2,'Locate the actual bridge before its Expo adapter; never substitute a fake bridge.');
 const bridge=source.split(marker)[0].replace(/^import ExpoModulesCore\r?\n/m,'');
 assert.ok(bridge.includes('public enum DuckShortcutBridge {'));
 const bridgePath=join(directory,'DuckShortcutBridge.swift');
 await writeFile(bridgePath,bridge);
 await run(['swiftc',...flags,'-parse-as-library','-emit-module','-module-name','DuckduckDuo',bridgePath,'-emit-module-path',join(directory,'DuckduckDuo.swiftmodule')]);
 const shortcuts=join(root,'mobile/native/DuckShortcuts.swift');
 const check=path=>run(['swiftc',...flags,'-I',directory,'-typecheck',path]);
 await check(shortcuts);
 // Negative control proves this SDK check catches the precise build-38 failure.
 const regression=join(directory,'UngatedShortcuts.swift');
 const current=await readFile(shortcuts,'utf8');
 assert.equal((current.match(/@available\(iOS 18\.0, \*\)/g)??[]).length,2);
 await writeFile(regression,current.replaceAll('@available(iOS 18.0, *)','@available(iOS 16.4, *)'));
 let diagnostic='';
 try{await check(regression);}catch(error){diagnostic=String(error.stderr??error.message);}
 assert.match(diagnostic,/'OpenURLIntent' is only available in iOS 18\.0 or newer/,'The previous source must fail with the original Apple availability error.');
 console.log('PASS: real shortcut/bridge Swift source checked with Apple iPhoneOS SDK; previous availability error reproduced and rejected. Signing, app archive and Apple submission remain separate.');
}catch(error){
 if(error.stderr)process.stderr.write(error.stderr);
 throw error;
}finally{await rm(directory,{recursive:true,force:true});}
