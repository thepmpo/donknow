import contextlib, io, json, pathlib, subprocess, unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
CODE = (ROOT / 'tools/ai-office/macos/7-check-sandbox.command').read_text().split("<<'PY'\n", 1)[1].split('\nPY\n', 1)[0]

class MacDiagnosticTests(unittest.TestCase):
    def diagnose(self, outer_ok=False, unavailable=False):
        calls = []
        def run(args, **kwargs):
            calls.append(args)
            if unavailable:
                raise FileNotFoundError()
            if args[0] == 'dpkg-query':
                return subprocess.CompletedProcess(args, 0, 'bubblewrap 0.9.0\napparmor 4.0.1\n', '')
            if args[0] == 'sudo':
                return subprocess.CompletedProcess(args, 0, 'apparmor="DENIED" operation="userns_create" comm="bwrap" private-path-and-credential-must-not-escape\n', '')
            success = outer_ok and args.count('/usr/bin/bwrap') == 1
            return subprocess.CompletedProcess(args, 0 if success else 1, '', '' if success else 'bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted')
        def read(path):
            if str(path) == '/etc/os-release': return 'ID=ubuntu\nVERSION_ID="24.04"\n'
            if str(path) == '/proc/self/attr/current': return 'unconfined\n'
            return '1\n'
        output = io.StringIO()
        with patch('subprocess.run', run), patch('pathlib.Path.read_text', read), patch('pathlib.Path.exists', return_value=False), patch('pathlib.Path.is_file', return_value=False), contextlib.redirect_stdout(output):
            exec(compile(CODE, '<diagnostic>', 'exec'), {})
        rendered = output.getvalue()
        report = json.loads(rendered.split('--- OFFICE SANDBOX CHECK ---\n')[1].split('\n--- END CHECK ---')[0])
        self.assertNotIn('private-path-and-credential', rendered)
        self.assertTrue(all(c[0] in ('dpkg-query', '/usr/bin/bwrap', 'sudo') for c in calls))
        self.assertTrue(all(c[:3] == ['sudo', '-n', 'journalctl'] for c in calls if c[0] == 'sudo'))
        return report, calls

    def test_blocked_outer_preserves_error_and_skips_nested(self):
        report, calls = self.diagnose()
        self.assertEqual(report['system'], {'ID': 'ubuntu', 'VERSION_ID': '24.04'})
        self.assertEqual(report['outer_sandbox']['status'], 'blocked')
        self.assertEqual(report['nested_sandbox']['status'], 'not_run_outer_blocked')
        self.assertEqual(sum(c[0] == '/usr/bin/bwrap' for c in calls), 1)
        self.assertTrue(report['recent_apparmor_denial']['user_namespace'])

    def test_outer_pass_is_not_nested_success(self):
        report, calls = self.diagnose(outer_ok=True)
        self.assertEqual(report['outer_sandbox']['status'], 'passed')
        self.assertEqual(report['nested_sandbox']['status'], 'blocked')
        self.assertEqual(sum(c[0] == '/usr/bin/bwrap' for c in calls), 2)

    def test_missing_utilities_report_unknown_without_mutation(self):
        report, _ = self.diagnose(unavailable=True)
        self.assertEqual(report['outer_sandbox']['status'], 'unavailable_or_timeout')
        self.assertEqual(report['recent_apparmor_denial'], 'unavailable')
        self.assertFalse(report['settingsChanged'])
        self.assertFalse(report['modelStarted'])

if __name__ == '__main__': unittest.main()
