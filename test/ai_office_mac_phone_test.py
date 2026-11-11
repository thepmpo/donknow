"""Private phone setup uses fixture status only; no live Tailscale or account calls."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('office_phone_config_fixture', ROOT / 'tools/ai-office/install/phone-config.py')
phone = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(phone)
DNS = 'mac.fixture.ts.net'
ORIGIN = 'https://' + DNS
OWNER = 'owner@example.test'
VERSION = '1.90.0'


def account():
    return {
        'BackendState': 'Running',
        'Self': {'DNSName': DNS + '.', 'UserID': 123, 'Tags': []},
        'User': {'123': {'LoginName': OWNER}},
    }


def serving():
    return {
        'TCP': {'443': {'HTTPS': True}},
        'Web': {DNS + ':443': {'Handlers': {'/': {'Proxy': 'http://127.0.0.1:8810'}}}},
    }


class PhoneConfigurationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.state = self.base / 'state'
        self.state.mkdir(mode=0o700)
        self.pin = self.state / 'private-access.json'
        self.sentinels = {
            'office.sqlite': b'fixture-existing-office-database',
            'control-access.key': b'c' * 64,
            'auth.json': b'fixture-existing-authentication',
        }
        for name, content in self.sentinels.items():
            p = self.state / name
            p.write_bytes(content)
            p.chmod(0o600)

    def preserved(self):
        for name, content in self.sentinels.items():
            self.assertEqual((self.state / name).read_bytes(), content)

    def prepare(self, status=None, serve=None, version=VERSION, state=None):
        return phone.prepare(account() if status is None else status, {} if serve is None else serve,
                             version, state=self.state if state is None else state)

    def verify(self, status=None, serve=None, version=VERSION):
        return phone.verify(account() if status is None else status, serving() if serve is None else serve,
                            version, state=self.state)

    def test_new_pin_is_private_and_preserves_office_login_and_data(self):
        out = self.prepare()
        self.assertEqual(out, ORIGIN)
        saved = json.loads(self.pin.read_text())
        self.assertEqual(saved['origin'], ORIGIN)
        self.assertEqual(saved['ownerLogin'], OWNER)
        self.assertEqual(stat.S_IMODE(self.pin.stat().st_mode), 0o600)
        self.assertEqual(self.verify(), ORIGIN)
        self.preserved()

    def test_same_pin_and_route_are_reused_without_rewriting(self):
        self.prepare()
        before = self.pin.read_bytes(), self.pin.stat().st_mtime_ns, self.pin.stat().st_ino
        self.prepare(serve=serving())
        self.verify()
        after = self.pin.read_bytes(), self.pin.stat().st_mtime_ns, self.pin.stat().st_ino
        self.assertEqual(before, after)
        self.preserved()

    def test_other_owner_or_origin_pin_is_preserved(self):
        for changes in ({'ownerLogin': 'another@example.test'}, {'origin': 'https://other.fixture.ts.net'}):
            with self.subTest(changes=changes):
                saved = {'version': 1, 'origin': ORIGIN, 'ownerLogin': OWNER, **changes}
                self.pin.write_text(json.dumps(saved))
                self.pin.chmod(0o600)
                before = self.pin.read_bytes()
                with self.assertRaises(Exception):
                    self.prepare()
                self.assertEqual(self.pin.read_bytes(), before)
                self.preserved()

    def test_verify_requires_an_existing_matching_pin_and_exact_https_route(self):
        with self.assertRaises(Exception):
            self.verify()
        self.assertFalse(self.pin.exists())
        self.prepare()
        for serve in ({}, {'TCP': {'443': {'HTTPS': True}}}, {'Web': serving()['Web']}):
            with self.subTest(serve=serve), self.assertRaises(Exception):
                self.verify(serve=serve)
        other = account()
        other['User']['123']['LoginName'] = 'another@example.test'
        with self.assertRaises(Exception):
            self.verify(status=other)
        self.preserved()

    def test_hostile_or_non_tailnet_dns_is_rejected_before_pin_creation(self):
        for value in ('evil.example', 'fake.ts.net.evil.test', 'https://mac.fixture.ts.net',
                      'mac.fixture.ts.net/path', 'mac.fixture.ts.net:443',
                      'mac.fixture.ts.net\nanything', '-mac.fixture.ts.net',
                      'mac..fixture.ts.net', 'mac_fixture.ts.net', 'mac.fixture.ts.net#token'):
            with self.subTest(value=value):
                status = account()
                status['Self']['DNSName'] = value
                with self.assertRaises(Exception):
                    self.prepare(status=status)
                self.assertFalse(self.pin.exists())
        self.preserved()

    def test_disconnected_tagged_or_ownerless_devices_are_rejected(self):
        statuses = []
        for backend in ('NeedsLogin', 'Stopped', 'NoState'):
            status = account()
            status['BackendState'] = backend
            statuses.append(status)
        status = account()
        status['Self']['Tags'] = ['tag:server']
        statuses.append(status)
        status = account()
        del status['User']['123']
        statuses.append(status)
        status = account()
        status['User']['123']['LoginName'] = ''
        statuses.append(status)
        for status in statuses:
            with self.subTest(status=status), self.assertRaises(Exception):
                self.prepare(status=status)
        self.assertFalse(self.pin.exists())
        self.preserved()

    def test_old_or_unreadable_client_version_does_not_change_state(self):
        for version in ('1.89.9', '1.52.0', '', 'not-a-version'):
            with self.subTest(version=version), self.assertRaises(Exception):
                self.prepare(version=version)
        self.assertFalse(self.pin.exists())
        self.preserved()

    def test_funnel_foreground_and_other_services_are_preserved(self):
        examples = [
            {'AllowFunnel': {DNS + ':443': True}},
            {'Foreground': {'existing-session': serving()}},
            {'Foreground': {'existing-session': {'AllowFunnel': {'another.ts.net:443': True}}}},
            {'Services': {'svc:existing': serving()}},
            {'TCP': {'8080': {'HTTP': True}}},
            {'TCP': {'443': {'HTTPS': True, 'TCPForward': '127.0.0.1:9000'}}},
            {'Web': {'other.fixture.ts.net:443': {'Handlers': {'/': {'Proxy': 'http://127.0.0.1:8810'}}}}},
            {'unknown-config': {'anything': True}},
        ]
        for serve in examples:
            before = copy.deepcopy(serve)
            with self.subTest(serve=serve), self.assertRaises(Exception):
                self.prepare(serve=serve)
            self.assertEqual(serve, before)
            self.assertFalse(self.pin.exists())
        self.preserved()

    def test_existing_file_routes_and_extra_handlers_are_preserved(self):
        handlers = [
            {'/': {'Proxy': 'http://127.0.0.1:9000'}},
            {'/': {'Path': '/home/example/private'}},
            {'/': {'Proxy': 'http://127.0.0.1:8810', 'Text': 'other'}},
            {'/': {'Proxy': 'http://127.0.0.1:8810', 'Redirect': 'https://example.test'}},
            {'/': {'Proxy': 'http://127.0.0.1:8810'}, '/other': {'Text': 'preserve'}},
        ]
        for handler in handlers:
            serve = serving()
            serve['Web'][DNS + ':443']['Handlers'] = handler
            with self.subTest(handler=handler), self.assertRaises(Exception):
                self.prepare(serve=serve)
            self.assertFalse(self.pin.exists())
        self.preserved()

    def test_symlink_state_or_pin_never_overwrites_target(self):
        target = self.base / 'sentinel.json'
        target.write_text('preserve-target')
        self.pin.symlink_to(target)
        with self.assertRaises(Exception):
            self.prepare()
        self.assertEqual(target.read_text(), 'preserve-target')
        self.pin.unlink()
        alternate = self.base / 'state-link'
        alternate.symlink_to(self.state, target_is_directory=True)
        with self.assertRaises(Exception):
            self.prepare(state=alternate)
        self.assertFalse(self.pin.exists())
        self.preserved()

    def test_insecure_existing_pin_permissions_are_preserved_and_rejected(self):
        self.pin.write_text(json.dumps({'version': 1, 'origin': ORIGIN, 'ownerLogin': OWNER}))
        self.pin.chmod(0o644)
        before = self.pin.read_bytes()
        with self.assertRaises(Exception):
            self.prepare()
        self.assertEqual(self.pin.read_bytes(), before)
        self.assertEqual(stat.S_IMODE(self.pin.stat().st_mode), 0o644)
        self.preserved()


HOST_MOCK = r'''#!/usr/bin/env python3
import json,os,pathlib,stat,sys,tempfile
name=pathlib.Path(sys.argv[0]).name;args=sys.argv[1:]
row={'name':name,'args':args,'cli':os.environ.get('TAILSCALE_BE_CLI')}
if name=='limactl' and args[0]=='copy':
 p=pathlib.Path(args[1])
 row['mode']=stat.S_IMODE(p.stat().st_mode)
with open(os.environ['PHONE_CALLS'],'a') as f:f.write(json.dumps(row)+'\n')
if name=='uname':print('Darwin')
elif name=='mktemp':print(tempfile.mkdtemp(prefix='office-phone-',dir=os.environ['PHONE_TEMP']))
elif name=='tailscale':
 if os.environ.get('TAILSCALE_BE_CLI')!='1':print('fixture CLI environment missing',file=sys.stderr);sys.exit(4)
 if args==['version']:print('1.90.0')
 elif args==['status','--json']:print('{"BackendState":"Running"}')
 elif args==['serve','status','--json']:print('{}')
 elif args==['serve','--bg','--https=443','http://127.0.0.1:8810']:
  if os.environ.get('PHONE_SERVE_FAIL')=='1':sys.exit(1)
 else:print('unexpected Tailscale command',file=sys.stderr);sys.exit(5)
elif name=='limactl':
 if 'mktemp' in args:print('/tmp/office-phone-fixture')
 elif 'prepare' in args:
  if os.environ.get('PHONE_PREPARE_FAIL')=='1':print('office_phone_existing_owner_preserved',file=sys.stderr);sys.exit(1)
  print('https://mac.fixture.ts.net')
 elif 'verify' in args:
  if os.environ.get('PHONE_VERIFY_FAIL')=='1':print('office_phone_https_route_not_ready',file=sys.stderr);sys.exit(1)
  print('https://mac.fixture.ts.net')
'''


class PhoneMacHostTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.package = self.root / 'Mac phone folder with spaces'
        self.package.mkdir()
        self.bin = self.root / 'bin'
        self.bin.mkdir()
        self.calls_file = self.root / 'calls.jsonl'
        for name in ('connect-phone-mac.sh', 'phone-config.py'):
            shutil.copy2(ROOT / 'tools/ai-office/install' / name, self.package / name)
        # Existing daily launcher is tested separately. This fixture checks that
        # phone setup asks it to open instead of reinstalling or logging in.
        (self.package / 'macos.sh').write_text('#!/bin/sh\nexec office-open-fixture "$@"\n')
        for name in ('uname', 'mktemp', 'tailscale', 'limactl', 'office-open-fixture'):
            p = self.bin / name
            p.write_text(HOST_MOCK)
            p.chmod(0o755)
        self.env = {**os.environ, 'PATH': str(self.bin) + ':' + os.environ['PATH'],
                    'PHONE_CALLS': str(self.calls_file), 'PHONE_TEMP': str(self.root)}

    def run_host(self, **changes):
        result = subprocess.run(['bash', str(self.package / 'connect-phone-mac.sh')],
                                env={**self.env, **changes}, capture_output=True, text=True, timeout=15)
        self.calls = [json.loads(line) for line in self.calls_file.read_text().splitlines()]
        self.assertFalse(any(p.is_dir() for p in self.root.glob('office-phone-*')))
        for row in self.calls:
            self.assertFalse(any(arg in ('logout', 'reset', 'funnel', 'up', 'delete', 'stop') for arg in row['args']))
            self.assertFalse(any('review.sh' in arg or 'login.sh' in arg or 'restart-control.py' in arg for arg in row['args']))
        return result

    def serving_calls(self):
        return [row for row in self.calls if row['name'] == 'tailscale' and '--bg' in row['args']]

    def test_private_setup_order_cli_mode_and_spaced_folder(self):
        result = self.run_host()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn(ORIGIN + '/', result.stdout)
        self.assertIn({'name': 'office-open-fixture', 'args': ['open'], 'cli': None}, self.calls)
        prepared = next(i for i, row in enumerate(self.calls) if row['name'] == 'limactl' and 'prepare' in row['args'])
        served = next(i for i, row in enumerate(self.calls) if row['name'] == 'tailscale' and '--bg' in row['args'])
        verified = next(i for i, row in enumerate(self.calls) if row['name'] == 'limactl' and 'verify' in row['args'])
        self.assertLess(prepared, served)
        self.assertLess(served, verified)
        self.assertEqual(len(self.serving_calls()), 1)
        for row in self.calls:
            if row['name'] == 'tailscale':
                self.assertEqual(row['cli'], '1')
            if row['name'] == 'limactl' and row['args'][0] == 'copy' and Path(row['args'][1]).name in ('status.json', 'serve.json', 'version.txt'):
                self.assertEqual(row['mode'], 0o600)

    def test_conflicting_owner_or_config_failure_never_enables_serve(self):
        result = self.run_host(PHONE_PREPARE_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.serving_calls(), [])
        self.assertNotIn('휴대폰에서 열 사무실 주소:', result.stdout)

    def test_serve_consent_failure_does_not_claim_phone_is_connected(self):
        result = self.run_host(PHONE_SERVE_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(any(row['name'] == 'limactl' and 'verify' in row['args'] for row in self.calls))
        self.assertNotIn('휴대폰에서 열 사무실 주소:', result.stdout)

    def test_post_setup_verification_failure_does_not_print_success_address(self):
        result = self.run_host(PHONE_VERIFY_FAIL='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn('휴대폰에서 열 사무실 주소:', result.stdout)


if __name__ == '__main__':
    unittest.main()
