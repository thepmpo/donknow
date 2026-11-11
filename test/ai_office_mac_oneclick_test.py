"""Mac host orchestration only: Lima/macOS tools are fixtures, not a real Mac."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
KEY = "a" * 64
MOCK = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
name = pathlib.Path(sys.argv[0]).name
args = sys.argv[1:]
with open(os.environ['MOCK_LOG'], 'a') as f:
    f.write(json.dumps([name, args]) + '\n')
if name == 'uname':
    print('Darwin')
elif name == 'limactl':
    if args[0] == 'list':
        if '--filter' in args:
            sys.exit('This fixture requires Lima positional instance selection.')
        if os.environ['MOCK_VM_EXISTS'] == '1':
            print(os.environ['MOCK_VM_STATE'] if '{{.Status}}' in args else 'duckduck-office')
    elif 'mktemp' in args:
        print(os.environ.get('MOCK_TRANSFER', '/tmp/office-open-fixture'))
    elif args[-1:] == ['/workspace/ai-office/state/control-access.key']:
        print(os.environ.get('MOCK_KEY', 'a' * 64))
    elif args[-1:] == ['/tmp/office-open-fixture/start-services.py']:
        if os.environ.get('MOCK_HELPER_FAIL') == '1':
            print('{"ready":false,"reasonCode":"office_service_port_occupied"}')
            sys.exit(1)
        print('{"ready":true}')
elif name == 'curl':
    url = args[-1]
    app = 'Claw-Empire' if ':8790/' in url else 'AI-Office-Control'
    if os.environ.get('MOCK_WRONG_PORT') in ['8790', '8810'] and ':' + os.environ['MOCK_WRONG_PORT'] + '/' in url:
        app = 'Unrelated-Service'
    print(json.dumps({'ok': True, 'app': app, 'packageVersion': 'b' * 64}, separators=(',', ':')))
elif name == 'open' and os.environ.get('MOCK_OPEN_FAIL') == '1':
    print('Cannot open: ' + args[0], file=sys.stderr)
    print('Cannot open: ' + args[0])
    sys.exit(1)
'''


class MacOneClickTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.package = self.root / 'Mac office with spaces'
        self.package.mkdir()
        shutil.copy2(ROOT / 'tools/ai-office/install/macos.sh', self.package / 'macos.sh')
        # Copy mocks need an existing source path, but never execute this helper.
        (self.package / 'start-services.py').write_text('# fixture transfer only\n')
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.log = self.root / 'calls.jsonl'
        for name in ['uname', 'limactl', 'curl', 'open', 'sleep']:
            command = self.bin / name
            command.write_text(MOCK)
            command.chmod(0o755)
        self.env = {
            **os.environ,
            'PATH': str(self.bin) + os.pathsep + os.environ['PATH'],
            'MOCK_LOG': str(self.log),
            'MOCK_VM_EXISTS': '1',
            'MOCK_VM_STATE': 'Running',
        }

    def launch(self, **updates):
        result = subprocess.run(
            ['bash', str(self.package / 'macos.sh'), 'open'],
            env={**self.env, **updates}, capture_output=True, text=True, timeout=20,
        )
        self.assertNotIn(KEY, result.stdout + result.stderr)
        self.calls = [json.loads(line) for line in self.log.read_text().splitlines()]
        return result

    def assert_no_reset_or_model_execution(self):
        for name, args in self.calls:
            self.assertFalse(any(word in args for word in ['delete', 'stop', 'create', '--name', 'sudo']))
            self.assertFalse(any('login.sh' in value or 'review.sh' in value or 'install-control.py' in value or 'update-readability.py' in value for value in args))

    def assert_browser_not_opened(self):
        self.assertFalse(any(name == 'open' for name, _ in self.calls))

    def test_running_vm_is_reused_and_private_browser_opens_from_spaced_folder(self):
        result = self.launch()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(any(name == 'limactl' and args[0] == 'start' for name, args in self.calls))
        self.assertIn(['limactl', ['list', 'duckduck-office', '--format', '{{.Status}}']], self.calls)
        self.assertIn(['limactl', ['copy', str(self.package / 'start-services.py'), 'duckduck-office:/tmp/office-open-fixture/start-services.py']], self.calls)
        self.assertIn(['open', ['http://127.0.0.1:8810/#access=' + KEY]], self.calls)
        self.assert_no_reset_or_model_execution()

    def test_stopped_existing_vm_is_started_once(self):
        result = self.launch(MOCK_VM_STATE='Stopped')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        starts = [args for name, args in self.calls if name == 'limactl' and args[0] == 'start']
        self.assertEqual(len(starts), 1)
        self.assertIn('duckduck-office', starts[0])
        self.assert_no_reset_or_model_execution()

    def test_missing_vm_never_creates_or_starts_a_replacement(self):
        result = self.launch(MOCK_VM_EXISTS='0')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(name == 'limactl' and args[0] in ['start', 'copy', 'shell'] for name, args in self.calls))
        self.assert_browser_not_opened()
        self.assert_no_reset_or_model_execution()

    def test_unknown_vm_state_is_preserved_without_starting(self):
        result = self.launch(MOCK_VM_STATE='Broken')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(name == 'limactl' and args[0] in ['start', 'copy', 'shell'] for name, args in self.calls))
        self.assert_browser_not_opened()

    def test_helper_failure_does_not_open_browser_or_read_private_key(self):
        result = self.launch(MOCK_HELPER_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assert_browser_not_opened()
        self.assertFalse(any('/workspace/ai-office/state/control-access.key' in args for _, args in self.calls))

    def test_wrong_host_port_blocks_private_browser_link(self):
        for port in ['8790', '8810']:
            with self.subTest(port=port):
                if self.log.exists():
                    self.log.unlink()
                result = self.launch(MOCK_WRONG_PORT=port)
                self.assertNotEqual(result.returncode, 0)
                self.assert_browser_not_opened()
                self.assertFalse(any('/workspace/ai-office/state/control-access.key' in args for _, args in self.calls))

    def test_bad_transfer_path_never_copies_or_executes_payload(self):
        result = self.launch(MOCK_TRANSFER='/tmp/office-open-fixture; unexpected')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(name == 'limactl' and args[0] == 'copy' for name, args in self.calls))
        self.assert_browser_not_opened()

    def test_invalid_browser_key_is_not_opened_or_printed(self):
        result = self.launch(MOCK_KEY='not-a-valid-private-key')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('not-a-valid-private-key', result.stdout + result.stderr)
        self.assert_browser_not_opened()

    def test_browser_failure_does_not_expose_private_url_in_tool_error(self):
        result = self.launch(MOCK_OPEN_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('#access=', result.stdout + result.stderr)
        self.assertNotIn(KEY, result.stdout + result.stderr)


if __name__ == '__main__':
    unittest.main()
