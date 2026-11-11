import importlib.util
from pathlib import Path
import tempfile
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


if __name__ == '__main__':
    unittest.main()
