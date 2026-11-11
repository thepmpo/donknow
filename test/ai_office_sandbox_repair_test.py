import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import contextlib
import io
import shutil

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('office_sandbox_repair', ROOT / 'tools/ai-office/install/repair-sandbox.py')
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)


class SandboxRepairTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.calls, self.probes = [], [False, True]
        self.fail_load, self.fail_remove, self.foreign_change = False, False, False
        self.version = 'v24.22.1'
        self.plain_bwrap = [False, False]
        for name, contents in {
            '/etc/os-release': 'ID=ubuntu\nVERSION_ID="24.04"\n',
            '/proc/sys/kernel/apparmor_restrict_unprivileged_userns': '1\n',
            '/sys/module/apparmor/parameters/enabled': 'Y\n',
            '/sys/kernel/security/apparmor/profiles': '',
            repair.NODE: 'fixture node, never executed',
        }.items():
            p = self.path(name)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(contents)
        self.path('/etc/apparmor.d').mkdir()
        self.path(repair.NODE).chmod(0o755)
        self.subject = repair.Repair(self.root, self.run_command, owner_uid=os.getuid())

    def path(self, name):
        return self.root / name.lstrip('/')

    def run_command(self, args, **kwargs):
        self.calls.append(args)
        if args[-1] == '--version':
            return subprocess.CompletedProcess(args, 0, self.version + '\n', '')
        if '-e' in args:
            success = self.probes.pop(0)
            return subprocess.CompletedProcess(args, 0 if success else 1,
                                               'office_namespace_probe_passed\n' if success else '', '')
        if args[0] == '/usr/bin/bwrap':
            success = self.plain_bwrap.pop(0)
            return subprocess.CompletedProcess(args, 0 if success else 1, '', '')
        self.assertEqual(args[0], '/sbin/apparmor_parser')
        self.assertEqual(args[-1], str(self.path(repair.PROFILE_PATH)))
        if args[1] == '-r':
            if self.foreign_change:
                self.path(repair.PROFILE_PATH).write_text('foreign administrator change')
            if not self.fail_load:
                self.path('/sys/kernel/security/apparmor/profiles').write_text(repair.PROFILE_NAME + ' (unconfined)\n')
            return subprocess.CompletedProcess(args, int(self.fail_load), '', '')
        self.assertEqual(args[1], '-R')
        if not self.fail_remove:
            self.path('/sys/kernel/security/apparmor/profiles').write_text('')
        return subprocess.CompletedProcess(args, int(self.fail_remove), '', '')

    def test_exact_application_profile_and_success(self):
        result = self.subject.apply()
        self.assertTrue(result['ready'])
        self.assertTrue(result['profileCreated'])
        self.assertEqual(self.path(repair.PROFILE_PATH).read_text(), repair.PROFILE)
        self.assertNotIn('/usr/bin/bwrap', repair.PROFILE)
        self.assertNotIn('*', repair.PROFILE)
        self.assertEqual(self.path('/proc/sys/kernel/apparmor_restrict_unprivileged_userns').read_text(), '1\n')
        self.assertFalse(result['modelStarted'])
        self.assertFalse(result['fullRunnerVerified'])
        probes = [c[-1] for c in self.calls if '-e' in c]
        self.assertIn('requireOfficeProfile=true', probes[-1])

    def test_ordinary_bwrap_must_remain_blocked(self):
        self.plain_bwrap = [False, True]
        with self.assertRaisesRegex(RuntimeError, 'unscoped_bwrap_changed'):
            self.subject.apply()
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())

    def test_already_working_does_not_create_policy(self):
        self.probes = [True]
        result = self.subject.apply()
        self.assertFalse(result['settingsChanged'])
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())
        self.assertFalse(any(c[0] == '/sbin/apparmor_parser' for c in self.calls))

    def test_public_working_sandbox_needs_no_ubuntu_or_apparmor(self):
        self.path('/etc/os-release').write_text('ID=debian\nVERSION_ID="13"\n')
        self.path('/proc/sys/kernel/apparmor_restrict_unprivileged_userns').unlink()
        self.probes = [True]
        output = io.StringIO()
        with patch.object(repair, 'Repair', return_value=self.subject), patch.object(repair.os, 'geteuid', return_value=1000), patch.object(repair.sys, 'argv', ['repair-sandbox.py']), contextlib.redirect_stdout(output):
            repair.main()
        self.assertIn('"settingsChanged": false', output.getvalue())
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())

    def test_partial_write_failure_removes_only_new_file(self):
        with patch.object(repair.os, 'fsync', side_effect=OSError('fixture disk full')):
            with self.assertRaises(OSError):
                self.subject.apply()
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())
        self.assertFalse(any(c[0] == '/sbin/apparmor_parser' for c in self.calls))

    def test_exact_existing_profile_reuses_without_rewrite(self):
        p = self.path(repair.PROFILE_PATH)
        p.write_text(repair.PROFILE)
        before = p.stat()
        result = self.subject.apply()
        self.assertFalse(result['profileCreated'])
        self.assertEqual(p.stat().st_ino, before.st_ino)
        self.assertEqual(p.stat().st_mtime_ns, before.st_mtime_ns)

    def test_foreign_existing_and_symlink_profiles_are_preserved(self):
        p = self.path(repair.PROFILE_PATH)
        p.write_text('foreign policy')
        with self.assertRaisesRegex(RuntimeError, 'existing_profile_preserved'):
            self.subject.apply()
        self.assertEqual(p.read_text(), 'foreign policy')
        p.unlink()
        p.symlink_to(self.path(repair.NODE))
        with self.assertRaisesRegex(RuntimeError, 'existing_profile_preserved'):
            self.subject.apply()
        self.assertTrue(p.is_symlink())

    def test_bwrap_policy_conflicts_stop_before_change(self):
        p = self.path('/etc/apparmor.d/bwrap-userns-restrict')
        p.write_text('distribution policy')
        with self.assertRaisesRegex(RuntimeError, 'existing_bwrap_policy_preserved'):
            self.subject.apply()
        p.unlink()
        self.path('/sys/kernel/security/apparmor/profiles').write_text('unpriv_bwrap (enforce)\n')
        with self.assertRaisesRegex(RuntimeError, 'loaded_bwrap_policy_preserved'):
            self.subject.apply()
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())

    def test_failed_nested_probe_rolls_back_only_new_profile(self):
        self.probes = [False, False]
        with self.assertRaisesRegex(RuntimeError, 'probe_failed_unknown'):
            self.subject.apply()
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())
        self.assertEqual(self.path('/sys/kernel/security/apparmor/profiles').read_text(), '')
        self.assertEqual(self.path('/proc/sys/kernel/apparmor_restrict_unprivileged_userns').read_text(), '1\n')

    def test_existing_profile_is_not_removed_on_failure(self):
        p = self.path(repair.PROFILE_PATH)
        p.write_text(repair.PROFILE)
        self.probes = [False, False]
        with self.assertRaisesRegex(RuntimeError, 'probe_failed_unknown'):
            self.subject.apply()
        self.assertEqual(p.read_text(), repair.PROFILE)
        self.assertFalse(any(c[1:2] == ['-R'] for c in self.calls))

    @unittest.skipUnless(os.environ.get('OFFICE_TEST_REAL_SANDBOX') == '1', 'requires a host permitting real user namespaces')
    def test_actual_probe_preserves_nested_proc_and_readonly_canary(self):
        result = subprocess.run([shutil.which('node'), '-e', 'const requireOfficeProfile=false;\n' + repair.PROBE], capture_output=True, text=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stdout.strip(), 'office_namespace_probe_passed')

    def test_probe_reports_stage_without_raw_child_output(self):
        self.subject.run = lambda args, **kwargs: subprocess.CompletedProcess(args, 1, '', 'private-value-must-not-escape\noffice_probe_failed:nested:proc_readonly\n')
        self.assertFalse(self.subject.probe(require_profile=True))
        self.assertEqual(self.subject.last_probe_failure, 'nested_proc_readonly')

    def test_unload_failure_preserves_profile_for_review(self):
        self.probes, self.fail_remove = [False, False], True
        with self.assertRaisesRegex(RuntimeError, 'rollback_unconfirmed_profile_preserved'):
            self.subject.apply()
        self.assertEqual(self.path(repair.PROFILE_PATH).read_text(), repair.PROFILE)

    def test_foreign_change_during_repair_is_never_removed(self):
        self.probes, self.foreign_change = [False, False], True
        with self.assertRaisesRegex(RuntimeError, 'existing_profile_preserved'):
            self.subject.apply()
        self.assertEqual(self.path(repair.PROFILE_PATH).read_text(), 'foreign administrator change')

    def test_node_and_platform_mismatch_stop(self):
        self.version = 'v99.0.0'
        with self.assertRaisesRegex(RuntimeError, 'node_version_mismatch'):
            self.subject.apply()
        self.assertFalse(self.path(repair.PROFILE_PATH).exists())
        self.version = 'v24.22.1'
        self.path('/etc/os-release').write_text('ID=debian\nVERSION_ID="13"\n')
        with self.assertRaisesRegex(RuntimeError, 'requires_ubuntu_2404'):
            self.subject.apply()


if __name__ == '__main__': unittest.main()
