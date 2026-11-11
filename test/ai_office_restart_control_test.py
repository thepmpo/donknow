import importlib.util, os, pathlib, tempfile, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('restart_control',ROOT/'tools/ai-office/install/restart-control.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class RestartControlTest(unittest.TestCase):
 def fixture(self,root,args=None):
  proc=root/'proc';(proc/'net').mkdir(parents=True);(proc/'net/tcp').write_text('header\n0: 0100007F:226A 00000000:0000 0A 0:0 0:0 0 0 0 123 0\n')
  node=root/'node';node.write_text('fixture');launcher=root/'launch.mjs';launcher.write_text('fixture');p=proc/'42';(p/'fd').mkdir(parents=True);(p/'cmdline').write_bytes(b'node\0'+str(args or launcher).encode()+b'\0');(p/'exe').symlink_to(node);(p/'fd/9').symlink_to('socket:[123]');return proc,node,launcher
 def test_only_exact_control_launcher_and_owner_of_listening_socket(self):
  with tempfile.TemporaryDirectory() as temp:
   proc,node,launcher=self.fixture(pathlib.Path(temp));self.assertEqual(module.verified_pid(proc,node,launcher),42)
   with self.assertRaisesRegex(RuntimeError,'preserved'):module.verified_pid(proc,node,launcher,uid=os.getuid()+1)
   (proc/'42/cmdline').write_bytes(b'node\0/workspace/donknow/scripts/start-ai-office.mjs\0')
   with self.assertRaisesRegex(RuntimeError,'preserved'):module.verified_pid(proc,node,launcher)
 def test_foreign_executable_and_nonloopback_listener_are_not_stopped(self):
  with tempfile.TemporaryDirectory() as temp:
   proc,node,launcher=self.fixture(pathlib.Path(temp));(proc/'42/exe').unlink();(proc/'42/exe').symlink_to('/usr/bin/python3')
   with self.assertRaisesRegex(RuntimeError,'preserved'):module.verified_pid(proc,node,launcher)
   (proc/'net/tcp').write_text('header\n0: 00000000:226A 00000000:0000 0A 0:0 0:0 0 0 0 123 0\n');self.assertIsNone(module.verified_pid(proc,node,launcher))
