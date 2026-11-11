"""Real loopback/process tests in temporary directories; never use the user's office."""
from concurrent.futures import ThreadPoolExecutor
import http.server
import importlib.util
import json
import os
from pathlib import Path
import signal
import socket
import stat
import subprocess
import sys
import tempfile
import threading
import time
import unittest


ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'tools/ai-office/install/start-services.py'
SPEC = importlib.util.spec_from_file_location('office_start_services_fixture', HELPER)
services = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(services)


class StartServicesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'office with spaces'
        (self.root / 'bin').mkdir(parents=True)
        (self.root / 'state').mkdir()
        (self.root / 'state/office.sqlite').write_bytes(b'fixture database remains unchanged')
        (self.root / 'state/control-access.key').write_bytes(b'fixture private key remains unchanged')
        self.protected = {p: p.read_bytes() for p in (self.root / 'state').iterdir()}
        sockets = [socket.socket() for _ in range(3)]
        try:
            for connection in sockets:
                connection.bind(('127.0.0.1', 0))
            self.ports = tuple(connection.getsockname()[1] for connection in sockets)
        finally:
            for connection in sockets:
                connection.close()
        self.write_service('start', [(self.ports[0], 'Claw-Empire'), (self.ports[2], 'AI-Office-Knowledge')])
        self.write_service('control', [(self.ports[1], 'AI-Office-Control')])
        self.addCleanup(self.cleanup_fixture)

    def write_service(self, name, endpoints):
        script = self.root / ('bin/' + name + '.sh')
        script.write_text(
            '#!' + sys.executable + '\n'
            'import http.server, json, os, pathlib, threading\n'
            'marker=pathlib.Path(' + repr(str(self.root / (name + '.calls'))) + ')\n'
            'with marker.open("a") as f:f.write(str(os.getpid())+"\\n")\n'
            'class Handler(http.server.BaseHTTPRequestHandler):\n'
            ' def do_GET(self):\n'
            '  value={"ok":True,"projects":[]} if self.server.app=="AI-Office-Knowledge" else {"app":self.server.app}\n'
            '  data=json.dumps(value).encode()\n'
            '  self.send_response(200);self.send_header("Content-Length",str(len(data)));self.end_headers();self.wfile.write(data)\n'
            ' def log_message(self,*args):pass\n'
            'servers=[]\n'
            'for port, app in ' + repr(endpoints) + ':\n'
            ' server=http.server.ThreadingHTTPServer(("127.0.0.1",port),Handler);server.app=app\n'
            ' servers.append(server);threading.Thread(target=server.serve_forever,daemon=True).start()\n'
            'print("private fixture startup log",flush=True)\n'
            'threading.Event().wait()\n'
        )
        script.chmod(0o700)

    def cleanup_fixture(self):
        # Only receipts from this fixture and processes whose exact argv points
        # to its temporary directory may be terminated by this test.
        for record in (self.root / 'state/launcher').glob('*.json'):
            data = json.loads(record.read_text())
            pid = data['pid']
            if services.process_stamp(pid) == data['start']:
                try:
                    command = Path('/proc/%d/cmdline' % pid).read_bytes()
                    if (str(self.root / 'bin') + '/').encode() not in command:
                        continue
                    os.kill(pid, signal.SIGTERM)
                    deadline = time.monotonic() + 2
                    while services.process_stamp(pid) is not None and time.monotonic() < deadline:
                        time.sleep(0.02)
                except ProcessLookupError:
                    pass
        self.temp.cleanup()

    def launch_in_subprocess(self):
        code = (
            'import importlib.util,json,pathlib;'
            's=importlib.util.spec_from_file_location("office_launch",' + repr(str(HELPER)) + ');'
            'm=importlib.util.module_from_spec(s);s.loader.exec_module(m);'
            'print(json.dumps(m.start(pathlib.Path(' + repr(str(self.root)) + '),ports=' + repr(self.ports) + ',timeout=5)))'
        )
        result = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, timeout=15)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def assert_no_service_started(self):
        self.assertFalse((self.root / 'start.calls').exists())
        self.assertFalse((self.root / 'control.calls').exists())

    def test_detached_services_survive_launcher_and_repeated_open_reuses_them(self):
        first = self.launch_in_subprocess()
        self.assertEqual((first['office'], first['chat']), ('started', 'started'))
        self.assertFalse(first['automaticTaskStarted'])
        records = {name: json.loads((self.root / ('state/launcher/' + name + '.json')).read_text()) for name in ['start', 'control']}
        for name, record in records.items():
            self.assertEqual(os.getsid(record['pid']), record['pid'])
            self.assertEqual(os.readlink('/proc/%s/fd/0' % record['pid']), '/dev/null')
            self.assertEqual(len((self.root / (name + '.calls')).read_text().splitlines()), 1)
        second = self.launch_in_subprocess()
        self.assertEqual((second['office'], second['chat']), ('reused', 'reused'))
        for name, record in records.items():
            self.assertEqual(json.loads((self.root / ('state/launcher/' + name + '.json')).read_text()), record)
            self.assertEqual(len((self.root / (name + '.calls')).read_text().splitlines()), 1)
        self.assertTrue(services.occupied(self.ports[2]))
        for path, original in self.protected.items():
            self.assertEqual(path.read_bytes(), original)
        logs = self.root / 'state/launcher'
        self.assertEqual(stat.S_IMODE(logs.stat().st_mode), 0o700)
        for path in logs.iterdir():
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o600)

    def test_unknown_control_service_is_preserved_before_main_starts(self):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                data = b'{"app":"Other-App"}'
                self.send_response(200)
                self.send_header('Content-Length', str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        server = http.server.ThreadingHTTPServer(('127.0.0.1', self.ports[1]), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with self.assertRaisesRegex(RuntimeError, 'port_%s_preserved' % self.ports[1]):
                services.start(self.root, self.ports, timeout=1)
            self.assert_no_service_started()
            self.assertTrue(services.health(self.ports[1], 'Other-App'))
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

    def test_concurrent_double_clicks_start_only_one_of_each_service(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = [pool.submit(self.launch_in_subprocess) for _ in range(2)]
            results = [future.result(timeout=20) for future in futures]
        self.assertEqual(sorted(result['office'] for result in results), ['reused', 'started'])
        self.assertEqual(sorted(result['chat'] for result in results), ['reused', 'started'])
        for name in ['start', 'control']:
            self.assertEqual(len((self.root / (name + '.calls')).read_text().splitlines()), 1)

    def test_existing_main_without_knowledge_does_not_start_control(self):
        self.write_service('start', [(self.ports[0], 'Claw-Empire')])
        child = subprocess.Popen([str(self.root / 'bin/start.sh')], stdin=subprocess.DEVNULL,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True)
        try:
            deadline = time.monotonic() + 3
            while not services.health(self.ports[0], 'Claw-Empire'):
                self.assertIsNone(child.poll())
                self.assertLess(time.monotonic(), deadline)
                time.sleep(0.02)
            with self.assertRaisesRegex(RuntimeError, 'knowledge_unavailable_check_log'):
                services.start(self.root, self.ports, timeout=0.3)
            self.assertFalse((self.root / 'control.calls').exists())
            self.assertEqual(len((self.root / 'start.calls').read_text().splitlines()), 1)
            self.assertIsNone(child.poll())
        finally:
            child.terminate()
            child.wait(timeout=3)

    def test_occupied_knowledge_port_stops_before_spawning(self):
        with socket.socket() as unrelated:
            unrelated.bind(('127.0.0.1', self.ports[2]))
            unrelated.listen()
            with self.assertRaisesRegex(RuntimeError, 'start_ports_preserved'):
                services.start(self.root, self.ports, timeout=1)
            self.assert_no_service_started()
            self.assertTrue(services.occupied(self.ports[2]))

    def test_missing_chat_installation_does_not_partially_start_main(self):
        (self.root / 'bin/control.sh').unlink()
        with self.assertRaisesRegex(RuntimeError, 'chat_setup_required_run_9_once'):
            services.start(self.root, self.ports, timeout=1)
        self.assert_no_service_started()

    def test_live_pending_receipt_prevents_duplicate_start(self):
        logs = self.root / 'state/launcher'
        logs.mkdir(mode=0o700)
        # This existing process stands in for a slow service. Receipt validation
        # does not grant permission to stop it; the launcher must simply refuse.
        (logs / 'start.json').write_text(json.dumps({'pid': os.getpid(), 'start': services.process_stamp(os.getpid())}))
        with self.assertRaisesRegex(RuntimeError, 'start_still_starting_check_log'):
            services.start(self.root, self.ports, timeout=1)
        self.assert_no_service_started()

    def test_symlink_log_does_not_overwrite_another_file(self):
        logs = self.root / 'state/launcher'
        logs.mkdir(mode=0o700)
        sentinel = self.root / 'preserve.txt'
        sentinel.write_text('preserve this')
        (logs / 'start.log').symlink_to(sentinel)
        with self.assertRaises(OSError):
            services.start(self.root, self.ports, timeout=1)
        self.assertEqual(sentinel.read_text(), 'preserve this')
        self.assert_no_service_started()


if __name__ == '__main__':
    unittest.main()
