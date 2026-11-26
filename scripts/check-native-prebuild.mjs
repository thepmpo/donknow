/** Validate real Expo prebuild/autolinking inputs without touching the signed project or credentials. */
import assert from 'node:assert/strict';
import {mkdtemp,cp,symlink,readFile,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const mobile=fileURLToPath(new URL('../mobile/',import.meta.url)),directory=await mkdtemp(join(tmpdir(),'duck-native-check-')),exec=promisify(execFile);
async function run(args){try{return await exec(process.execPath,args,{cwd:directory,env:{...process.env,CI:'1',EXPO_NO_TELEMETRY:'1',EXPO_OFFLINE:'1',npm_config_cache:join(tmpdir(),'duck-npm-cache')},timeout:90000,maxBuffer:4*1024*1024});}catch(e){throw Error(String(e.stderr??e.message).slice(-6000));}}
const imports=source=>[...source.matchAll(/^\s*(?:(public|package|internal|fileprivate|private)\s+)?import\s+(\w+)\b/gm)].map(m=>({level:m[1]??null,module:m[2]}));
try{
 for(const path of ['app.json','package.json','native','plugins','modules','assets'])await cp(join(mobile,path),join(directory,path),{recursive:true});
 await symlink(join(mobile,'node_modules'),join(directory,'node_modules'));
 await run([join(mobile,'node_modules/expo/bin/cli'),'prebuild','--platform','ios','--no-install']);
 const projects=(await readdir(join(directory,'ios'))).filter(name=>name.endsWith('.xcodeproj'));assert.equal(projects.length,1,'Exactly one generated app project is expected');const appName=projects[0].slice(0,-'.xcodeproj'.length);
 const plist=await readFile(join(directory,'ios',appName,'Info.plist'),'utf8');
 assert.match(plist,/<key>CADisableMinimumFrameDurationOnPhone<\/key>\s*<true\s*\/>/,'iPhone must allow adaptive high refresh for UI-thread motion');
 const project=await readFile(join(directory,'ios',projects[0],'project.pbxproj'),'utf8');assert.ok(project.includes('DuckShortcuts.swift'),'AppIntents source must be linked to the actual app project');
 const autolinker=join(mobile,'node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js'),resolved=JSON.parse((await run([autolinker,'resolve','--platform','apple','--project-root',directory,'--json'])).stdout),packages=resolved.modules.filter(m=>m.pods.some(p=>p.podspecDir.startsWith(join(directory,'modules')+sep))).map(m=>m.packageName);
 assert.ok(packages.length,'The local native module must be resolved');
 assert.ok(resolved.modules.some(m=>m.packageName==='expo-video'),'The bundled brand loading player must be resolved by native autolinking');
 // SDK macro scanning requires Xcode; check the real provider for our explicitly declared local modules on Linux.
 const provider=join(directory,'ExpoModulesProvider.swift');
 await run([join(mobile,'node_modules/expo-modules-autolinking/bin/expo-modules-autolinking.js'),'generate-modules-provider','--platform','apple','--project-root',directory,'--app-root',directory,'--target-platform','ios','--target',provider,'--packages',...packages]);
 const generated=await readFile(provider,'utf8'),levels=new Map(imports(generated).filter(i=>i.level).map(i=>[i.module,i.level]));
 assert.ok(generated.includes('DuckduckCalendarChangesModule.self'),'The EventKit change listener must be included by Expo autolinking');
 assert.ok(generated.includes('DuckduckAssistantModule.self'),'The assistant native bridge must be included by Expo autolinking');
 for(const file of ['DuckShortcuts.swift','AppDelegate.swift']){
  const source=await readFile(join(directory,'ios',appName,file),'utf8');
  for(const item of imports(source)){const expected=levels.get(item.module);if(expected)assert.equal(item.level,expected,`${file}: import ${item.module} must explicitly match generated ExpoModulesProvider (${expected}); Swift cannot resolve mixed explicit/implicit access`);}
 }
 console.log('PASS: isolated iOS prebuild, actual local-module provider/assistant bridge, and matching Swift import access. Native compilation still requires the Mac build.');
}finally{await rm(directory,{recursive:true,force:true});}
