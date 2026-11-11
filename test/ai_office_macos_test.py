import json, os, pathlib, shutil, stat, subprocess, tempfile, unittest, zipfile
ROOT = pathlib.Path(__file__).resolve().parents[1]
class MacLauncherTests(unittest.TestCase):
 def test_package_and_vm_actions_preserve_spaces_and_local_keys(self):
  with tempfile.TemporaryDirectory() as temp:
   root=pathlib.Path(temp); package=root/'Mac office with spaces';shutil.copytree(ROOT/'tools/ai-office/macos',package)
   bin=root/'bin';bin.mkdir();log=root/'calls.jsonl';version=(package/'control-version.txt').read_text().strip()
   mock='''#!/usr/bin/env python3
import json,os,pathlib,sys
name=pathlib.Path(sys.argv[0]).name;args=sys.argv[1:]
with open(os.environ['MOCK_LOG'],'a') as f:f.write(json.dumps([name,args])+'\\n')
if name=='uname':print('Darwin')
elif name=='curl':print(json.dumps({'app':'Claw-Empire' if ':8790/' in args[-1] else 'AI-Office-Control','packageVersion':os.environ['MOCK_VERSION']},separators=(',',':')))
elif name=='limactl':
 if 'mktemp' in args:print('/tmp/office-login-fixture' if '/tmp/office-login-XXXXXXXX' in args else '/tmp/office-control-fixture')
 elif args[-1:] == ['/workspace/ai-office/state/control-access.key']:print('a'*64)
'''
   for name in ['uname','limactl','curl','open']:
    p=bin/name;p.write_text(mock);p.chmod(0o755)
   env={**os.environ,'PATH':str(bin)+os.pathsep+os.environ['PATH'],'MOCK_LOG':str(log),'MOCK_VERSION':version}
   for action in ['input','login','doctor']:
    r=subprocess.run(['bash',str(package/'macos.sh'),action],env=env,capture_output=True,text=True)
    self.assertEqual(r.returncode,0,r.stderr);self.assertNotIn('a'*64,r.stdout+r.stderr)
   calls=[json.loads(x) for x in log.read_text().splitlines()]
   self.assertTrue(any(c[0]=='limactl' and c[1][0]=='copy' and c[1][1]==str(package/'control-payload.zip') for c in calls))
   self.assertTrue(any(c[0]=='open' and c[1]==['http://127.0.0.1:8810/#access='+'a'*64] for c in calls))
   self.assertFalse(any('delete' in c[1] or 'stop' in c[1] for c in calls))
  with zipfile.ZipFile(ROOT/'tools/ai-office/ai-office-macos.zip') as archive:
   self.assertNotIn('auth.json',' '.join(archive.namelist()))
   for item in archive.infolist():
    if item.filename.endswith('.command'):self.assertTrue((item.external_attr>>16)&stat.S_IXUSR)
 def test_resume_transfers_new_installer_without_replacing_checkout_or_creating_vm(self):
  with tempfile.TemporaryDirectory() as temp:
   root=pathlib.Path(temp);bin=root/'bin';bin.mkdir();log=root/'calls.jsonl'
   mock='''#!/usr/bin/env python3
import json,os,pathlib,sys
name=pathlib.Path(sys.argv[0]).name;args=sys.argv[1:]
with open(os.environ['MOCK_LOG'],'a') as f:f.write(json.dumps([name,args])+'\\n')
if name=='uname':print('Darwin')
elif name=='limactl':
 if args[0]=='list' and os.environ['MOCK_EXISTS']=='1':print('duckduck-office')
 elif 'mktemp' in args:print('/tmp/office-install-fixture')
'''
   for name in ['uname','limactl']:
    p=bin/name;p.write_text(mock);p.chmod(0o755)
   env={**os.environ,'PATH':str(bin)+os.pathsep+os.environ['PATH'],'MOCK_LOG':str(log),'MOCK_EXISTS':'1'}
   launcher=ROOT/'tools/ai-office/install/macos.sh'
   r=subprocess.run(['bash',str(launcher),'resume'],env=env,capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr)
   calls=[json.loads(x) for x in log.read_text().splitlines()]
   copied=[pathlib.Path(c[1][1]).name for c in calls if c[0]=='limactl' and c[1][0]=='copy']
   self.assertEqual(copied,['linux.sh','repair-sandbox.py','verify-sandbox.mjs'])
   self.assertTrue(any(c[1]==['shell','duckduck-office','bash','/tmp/office-install-fixture/linux.sh'] for c in calls))
   self.assertFalse(any('delete' in c[1] or '--name' in c[1] for c in calls))
   log.unlink();env['MOCK_EXISTS']='0'
   r=subprocess.run(['bash',str(launcher),'resume'],env=env,capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
   calls=[json.loads(x) for x in log.read_text().splitlines()]
   self.assertFalse(any(c[0]=='limactl' and c[1][0] in ['copy','shell','start'] for c in calls))
 def test_launchers_have_valid_bash_syntax(self):
  for p in [ROOT/'tools/ai-office/install/macos.sh',*list((ROOT/'tools/ai-office/macos').glob('*.command'))]:
   subprocess.run(['bash','-n',str(p)],check=True)
