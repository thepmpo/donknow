import importlib.util
from pathlib import Path
import tempfile
import fcntl
import subprocess
import sys
import json
import unittest
spec = importlib.util.spec_from_file_location('repair_auth', Path(__file__).resolve().parents[1] / 'tools/ai-office/install/repair-auth.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AuthRepairTest(unittest.TestCase):
    def test_keeps_authentication_and_retains_disposable_cache(self):
        with tempfile.TemporaryDirectory() as root:
            state = Path(root)
            home = state / 'provider-home'
            codex = home / '.codex'
            (codex / 'tmp/arg0-linux').mkdir(parents=True)
            (codex / 'tmp/arg0-linux/lock').write_text('cache')
            auth = codex / 'auth.json'
            auth.write_bytes(b'private fixture authentication')
            auth.chmod(0o600)
            result = module.repair(home, state)
            self.assertTrue(result['temporaryCacheBackedUp'])
            self.assertEqual(auth.read_bytes(), b'private fixture authentication')
            self.assertEqual(auth.stat().st_mode & 0o777, 0o600)
            self.assertEqual([p.name for p in codex.iterdir()], ['auth.json'])
            self.assertEqual(len(list((state / 'provider-cache-backups').iterdir())), 1)
            self.assertFalse(module.repair(home, state)['temporaryCacheBackedUp'])

    def test_unknown_configuration_is_preserved_and_refused(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            codex = home / '.codex'
            codex.mkdir(parents=True)
            (codex / 'auth.json').write_text('fixture')
            config = codex / 'config.toml'
            config.write_text('untrusted')
            with self.assertRaisesRegex(RuntimeError, 'additional_entries'):
                module.repair(home, root)
            self.assertTrue(config.exists())
            self.assertTrue((codex / 'auth.json').exists())

    def test_symlink_to_another_directory_is_not_moved(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            codex = home / '.codex'
            codex.mkdir(parents=True)
            (codex / 'auth.json').write_text('fixture')
            (codex / 'tmp').symlink_to('/tmp', target_is_directory=True)
            with self.assertRaisesRegex(RuntimeError, 'requires_review'):
                module.repair(home, root)
            self.assertTrue((codex / 'tmp').is_symlink())

    def test_windows_lock_and_log_layout_is_retained_intact(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            codex = home / '.codex'
            (codex / 'tmp').mkdir(parents=True)
            (codex / 'log').mkdir()
            (codex / 'log/codex.log').write_text('private fixture log')
            for name in ('auth.json.lock', 'auth.lock'):
                (codex / name).write_text('')
            auth = codex / 'auth.json'
            auth.write_bytes(b'private fixture authentication')
            before = auth.stat()
            result = module.repair(home, root)
            self.assertEqual(set(result['backedUpNames']), {'tmp', 'log', 'auth.lock', 'auth.json.lock'})
            self.assertEqual(auth.read_bytes(), b'private fixture authentication')
            self.assertEqual(auth.stat().st_ino, before.st_ino)
            self.assertEqual(auth.stat().st_mtime_ns, before.st_mtime_ns)
            backups = list((Path(root) / 'provider-cache-backups').iterdir())
            self.assertEqual((backups[0] / 'log/codex.log').read_text(), 'private fixture log')

    def test_held_auth_lock_blocks_changes(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            codex = home / '.codex'
            codex.mkdir(parents=True)
            (codex / 'auth.json').write_text('fixture')
            lock = codex / 'auth.lock'
            lock.write_text('')
            with lock.open('rb') as handle:
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                with self.assertRaisesRegex(RuntimeError, 'provider_in_use'):
                    module.repair(home, root)
            self.assertTrue(lock.exists())
            self.assertFalse((Path(root) / 'provider-cache-backups').exists())

    def test_another_process_with_open_provider_log_blocks_changes(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            codex = home / '.codex'
            (codex / 'log').mkdir(parents=True)
            (codex / 'auth.json').write_text('fixture')
            log = codex / 'log/native.log'
            log.write_text('fixture')
            child = subprocess.Popen([sys.executable, '-c', 'import sys; f=open(sys.argv[1]); print("ready",flush=True); sys.stdin.read()', str(log)], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)
            try:
                self.assertEqual(child.stdout.readline().strip(), 'ready')
                with self.assertRaisesRegex(RuntimeError, 'provider_in_use'):
                    module.repair(home, root)
                self.assertTrue(log.exists())
            finally:
                child.communicate(input='', timeout=3)

    def test_safe_reason_code_for_missing_authentication(self):
        with tempfile.TemporaryDirectory() as root:
            home = Path(root) / 'provider-home'
            (home / '.codex').mkdir(parents=True)
            result = subprocess.run([sys.executable, str(spec.origin), '--provider-home', str(home), '--state-dir', root], capture_output=True, text=True)
            self.assertEqual(result.returncode, 1)
            status = json.loads(result.stdout)
            self.assertEqual(status['reasonCode'], 'office_auth_file_missing_login_required')
            self.assertFalse(status['credentialsPrinted'])


if __name__ == '__main__':
    unittest.main()
