import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),base=path.join(repo,'tools/ai-office/control'),install=path.join(repo,'tools/ai-office/install');
fs.copyFileSync(path.join(repo,'scripts/lib/ai-office-client.mjs'),path.join(base,'lib/ai-office-client.mjs'));
const files={};for(const name of ['lib/access.mjs','lib/ai-office-client.mjs','lib/controller.mjs','server.mjs','ui.html'])files[name]=createHash('sha256').update(fs.readFileSync(path.join(base,name))).digest('hex');
const manifest={version:1,packageId:createHash('sha256').update(JSON.stringify(files)).digest('hex'),files};fs.writeFileSync(path.join(base,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
execFileSync('python3',['-c',`import sys,zipfile,json,pathlib
base=pathlib.Path(sys.argv[1]); target=pathlib.Path(sys.argv[2]); manifest=json.loads((base/'manifest.json').read_text())
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
 for name in [*manifest['files'],'manifest.json']: z.write(base/name,name)
`,base,path.join(install,'control-payload.zip')],{stdio:'pipe'});
execFileSync('python3',['-c',`import sys,zipfile,pathlib
root=pathlib.Path(sys.argv[1]); names=['update-readability.py','readability.json','0-open-office.cmd','restart-control.py','9-open-office.cmd','10-phone-connect.cmd','open-control.ps1','connect-phone.ps1','install-control.py','control-payload.zip','CONTROL-README.txt']
with zipfile.ZipFile(root.parent/'ai-office-control.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in names: z.write(root/name,'ai-office-control/'+name)
with zipfile.ZipFile(root.parent/'ai-office-windows.zip','w',zipfile.ZIP_DEFLATED) as z:
 for file in sorted(root.iterdir()):
  if file.is_file() and file.suffix in ['.cmd','.ps1','.py','.json','.txt','.zip']: z.write(file,'ai-office-windows/'+file.name)
`,install],{stdio:'pipe'});
console.log('Control UI and Windows private-phone package built: '+manifest.packageId);
const mac=path.join(repo,'tools/ai-office/macos');
for(const name of ['macos.sh','install-control.py','repair-auth.py','control-payload.zip','update-readability.py','readability.json'])fs.copyFileSync(path.join(install,name),path.join(mac,name));
fs.writeFileSync(path.join(mac,'control-version.txt'),manifest.packageId+'\n');
execFileSync('python3',['-c',`import sys,zipfile,pathlib
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(root.parent/'ai-office-macos.zip','w',zipfile.ZIP_DEFLATED) as z:
 for file in sorted(root.iterdir()):
  if file.is_file(): z.write(file,'ai-office-macos/'+file.name)
`,mac],{stdio:'pipe'});

execFileSync('python3',['-c',`import sys,zipfile,pathlib
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(root.parent/'ai-office-readable-text.zip','w',zipfile.ZIP_DEFLATED) as z:
 for name in ['8-larger-text.cmd','windows.ps1','update-readability.py','readability.json','READABLE-TEXT.txt']:z.write(root/name,'ai-office-readable-text/'+name)
`,install],{stdio:'pipe'});
