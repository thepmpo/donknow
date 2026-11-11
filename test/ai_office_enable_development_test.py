"""Upgrade orchestration failures must not interrupt busy work or reset state."""
from contextlib import contextmanager
import importlib.util
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('enable_development', ROOT / 'tools/ai-office/install/enable-development.py')
upgrade = importlib.util.module_from_spec(spec)
spec.loader.exec_module(upgrade)


class UpgradeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'state').mkdir()
        (self.root / 'toolchain/node/bin').mkdir(parents=True)
        (self.root / 'toolchain/node/bin/node').write_text('fixture')
        self.sentinels = ['office.sqlite', 'control-access.key', 'auth-fixture.json']
        for name in self.sentinels:
            (self.root / 'state' / name).write_text('preserve-' + name)
        self.events = []
        self.fail_at = None
        self.locked = False

        @contextmanager
        def lock(_):
            self.locked = True
            try:
                yield
            finally:
                self.locked = False

        def start(root):
            self.assertFalse(self.locked, 'Restart must not deadlock on its own launch lock')
            self.events.append('restore-services')

        self.services = SimpleNamespace(private_directory=lambda p: p.mkdir(mode=0o700, exist_ok=True),
                                        private_file=lambda p: p.open('a'), launch_lock=lock,
                                        health=lambda *args: True, start=start)
        self.modules = {'start-services.py': self.services,
                        'restart-control.py': SimpleNamespace(stop=lambda: self.events.append('stop-control')),
                        'restart-main.py': SimpleNamespace(stop=lambda: self.events.append('stop-main'))}

    def run_upgrade(self):
        def run(command, **kwargs):
            self.assertIsNotNone(kwargs.get('stdin'))
            name = 'lock-runtime' if '--input-type=module' in command else Path(command[1]).name
            if '--check' in command:
                name = 'preflight'
            self.events.append(name)
            return SimpleNamespace(returncode=1 if name == self.fail_at else 0)

        with patch.object(upgrade, 'module', side_effect=lambda p: self.modules[p.name]), patch.object(upgrade.subprocess, 'run', side_effect=run):
            return upgrade.upgrade(self.root, self.root)

    def assert_preserved(self):
        for name in self.sentinels:
            self.assertEqual((self.root / 'state' / name).read_text(), 'preserve-' + name)

    def test_busy_or_unreviewed_preflight_never_stops_services(self):
        self.fail_at = 'preflight'
        with self.assertRaises(RuntimeError):
            self.run_upgrade()
        self.assertEqual(self.events, ['preflight'])
        self.assert_preserved()

    def test_owner_lock_failure_never_stops_services(self):
        self.fail_at = 'lock-runtime'
        with self.assertRaises(RuntimeError):
            self.run_upgrade()
        self.assertEqual(self.events, ['preflight', 'lock-runtime'])
        self.assert_preserved()

    def test_backend_or_ui_verification_failure_restores_services_and_stops_install(self):
        for failed in ['update-development.py', 'update-readability.py']:
            with self.subTest(failed=failed):
                self.events.clear()
                self.fail_at = failed
                with self.assertRaises(RuntimeError):
                    self.run_upgrade()
                self.assertEqual(self.events[-1], 'restore-services')
                self.assertNotIn('install-control.py', self.events)
                self.assert_preserved()

    def test_success_locks_then_stops_verified_services_and_installs_control_last(self):
        result = self.run_upgrade()
        self.assertTrue(result['updated'])
        self.assertFalse(result['automaticTaskStarted'])
        self.assertEqual(self.events, ['preflight', 'lock-runtime', 'stop-control', 'stop-main',
                                      'update-development.py', 'update-readability.py', 'install-control.py', 'restore-services'])
        self.assert_preserved()

    def test_unknown_main_preserved_and_control_restored(self):
        def refuse():
            raise RuntimeError('office_main_foreign_listener_preserved')
        self.modules['restart-main.py'] = SimpleNamespace(stop=refuse)
        with self.assertRaisesRegex(RuntimeError, 'foreign_listener_preserved'):
            self.run_upgrade()
        self.assertEqual(self.events[-1], 'restore-services')
        self.assertNotIn('update-development.py', self.events)
        self.assert_preserved()


if __name__ == '__main__':
    unittest.main()
