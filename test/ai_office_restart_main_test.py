"""Verified idle shutdown: fake proc trees plus disposable real Node services."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import sqlite3
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('restart_main_fixture', ROOT / 'tools/ai-office/install/restart-main.py')
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


class MainShutdownTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / 'office'
        self.repo = self.base / 'repo'
        self.runtime = self.base / 'runtime'
        self.proc = self.base / 'proc'
        for p in [self.root / 'state', self.repo / 'scripts', self.runtime / 'server', self.proc / 'net']:
            p.mkdir(parents=True)
        self.node = self.base / 'node'
        self.node.write_text('fixture node')
        (self.repo / 'scripts/start-ai-office.mjs').write_text('// fixture supervisor\n')
        self.db = self.root / 'state/office.sqlite'
        with sqlite3.connect(self.db) as db:
            db.executescript('CREATE TABLE tasks(status TEXT); CREATE TABLE agents(status TEXT); CREATE TABLE office_task_permissions(state TEXT);')
        self.ports = (8790, 8791)
        self.proc_net()
        self.add_process(40, 1, [str(self.node), 'scripts/start-ai-office.mjs'], self.repo)
        self.add_process(41, 40, [str(self.node), 'scripts/ai-office-knowledge.mjs', 'serve'], self.repo, inode=111)
        self.add_process(42, 40, [str(self.node), 'server/index.ts'], self.runtime, inode=222)
        self.kw = dict(root=self.root, repo=self.repo, runtime=self.runtime, proc=self.proc,
                       node=self.node, ports=self.ports, timeout=0.1)

    def proc_net(self, rows=None):
        rows = [(self.ports[0], 222, '0100007F'), (self.ports[1], 111, '0100007F')] if rows is None else rows
        (self.proc / 'net/tcp').write_text('header\n' + ''.join(
            '0: %s:%04X 00000000:0000 0A 0:0 0:0 0 0 0 %d 0\n' % (address, port, inode)
            for port, inode, address in rows))
        (self.proc / 'net/tcp6').write_text('header\n')

    def add_process(self, pid, parent, args, cwd, inode=None, exe=None):
        p = self.proc / str(pid)
        (p / 'fd').mkdir(parents=True)
        (p / 'stat').write_text('%d (fixture node) S %d %s 12345 0\n' % (pid, parent, ' '.join(['0'] * 17)))
        (p / 'cmdline').write_bytes(b'\0'.join(s.encode() for s in args) + b'\0')
        (p / 'exe').symlink_to(self.node if exe is None else exe)
        (p / 'cwd').symlink_to(cwd, target_is_directory=True)
        if inode:
            (p / 'fd/7').symlink_to('socket:[%s]' % inode)

    def verify(self, **changes):
        values = {k: v for k, v in self.kw.items() if k not in ('root', 'timeout')}
        return module.verified_supervisor(**{**values, **changes})

    def mark_busy(self, table, value):
        with sqlite3.connect(self.db) as db:
            db.execute('INSERT INTO ' + table + ' VALUES (?)', (value,))

    def test_known_supervisor_and_child_socket_tree_are_identified(self):
        self.assertEqual(self.verify(), (40, '12345'))
        (self.proc / '40/cmdline').write_bytes(b'node\0' + str(self.repo / 'scripts/start-ai-office.mjs').encode() + b'\0')
        self.assertEqual(self.verify(), (40, '12345'))

    def test_idle_shutdown_signals_only_verified_pidfd_then_waits_for_ports(self):
        def terminate(fd, sig):
            self.assertEqual((fd, sig), (999, signal.SIGTERM))
            self.proc_net([])
        before = self.db.read_bytes()
        with patch.object(module.os, 'pidfd_open', return_value=999) as opened, \
             patch.object(module.signal, 'pidfd_send_signal', side_effect=terminate) as sent, \
             patch.object(module.select, 'select', return_value=([999], [], [])), \
             patch.object(module.os, 'close') as closed:
            self.assertTrue(module.stop(**self.kw)['stopped'])
        opened.assert_called_once_with(40)
        sent.assert_called_once()
        closed.assert_called_once_with(999)
        self.assertEqual(self.db.read_bytes(), before)

    def test_running_or_approved_work_never_receives_a_signal(self):
        for table, value in [('tasks', 'in_progress'), ('agents', 'working'),
                             ('office_task_permissions', 'running'), ('office_task_permissions', 'approved')]:
            self.mark_busy(table, value)
            with patch.object(module.signal, 'pidfd_send_signal') as sent:
                with self.assertRaisesRegex(RuntimeError, 'work_active_preserved'):
                    module.stop(**self.kw)
                sent.assert_not_called()
            with sqlite3.connect(self.db) as db:
                db.execute('DELETE FROM ' + table)

    def test_work_started_between_checks_prevents_signal(self):
        original = module.require_idle
        calls = 0
        def check(database):
            nonlocal calls
            calls += 1
            if calls == 2:
                self.mark_busy('tasks', 'in_progress')
            return original(database)
        with patch.object(module, 'require_idle', side_effect=check), \
             patch.object(module.os, 'pidfd_open', return_value=999), \
             patch.object(module.os, 'close'), patch.object(module.signal, 'pidfd_send_signal') as sent:
            with self.assertRaisesRegex(RuntimeError, 'work_active_preserved'):
                module.stop(**self.kw)
            sent.assert_not_called()

    def test_model_or_unrelated_child_and_foreign_listener_are_preserved(self):
        self.add_process(43, 42, [str(self.node), '/tmp/codex.js'], self.runtime)
        with self.assertRaisesRegex(RuntimeError, 'unknown_child_preserved'):
            self.verify()
        shutil.rmtree(self.proc / '43')
        (self.proc / '42/stat').write_text('42 (node) S 1 ' + ' '.join(['0'] * 17) + ' 12345 0\n')
        with self.assertRaisesRegex(RuntimeError, 'foreign_listener_preserved'):
            self.verify()

    def test_uninspectable_child_is_not_silently_ignored(self):
        self.add_process(43, 42, [str(self.node), '/tmp/unknown.js'], self.runtime)
        (self.proc / '43/exe').unlink()
        with self.assertRaisesRegex(RuntimeError, 'unknown_child_preserved'):
            self.verify()

    def test_extra_supervisor_wrong_uid_or_wildcard_listener_are_preserved(self):
        self.add_process(44, 1, [str(self.node), 'scripts/start-ai-office.mjs'], self.repo)
        with self.assertRaisesRegex(RuntimeError, 'existing_processes_preserved'):
            self.verify()
        shutil.rmtree(self.proc / '44')
        with self.assertRaisesRegex(RuntimeError, 'preserved'):
            self.verify(uid=os.getuid() + 1)
        self.proc_net([(8790, 222, '00000000'), (8791, 111, '0100007F')])
        with self.assertRaisesRegex(RuntimeError, 'foreign_listener_preserved'):
            self.verify()

    def test_symlink_database_and_toolchain_are_refused(self):
        alternate = self.base / 'database'
        self.db.rename(alternate)
        self.db.symlink_to(alternate)
        with self.assertRaisesRegex(RuntimeError, 'paths_preserved'):
            module.stop(**self.kw)
        linked = self.base / 'node-link'
        linked.symlink_to(self.node)
        with self.assertRaisesRegex(RuntimeError, 'paths_preserved'):
            self.verify(node=linked)

    def test_start_identity_change_and_shutdown_timeout_never_escalate_to_kill(self):
        with patch.object(module, 'verified_supervisor', side_effect=[(40, '12345'), (40, '67890')]), \
             patch.object(module.os, 'pidfd_open', return_value=999), patch.object(module.os, 'close'), \
             patch.object(module.signal, 'pidfd_send_signal') as sent:
            with self.assertRaisesRegex(RuntimeError, 'listener_changed_preserved'):
                module.stop(**self.kw)
            sent.assert_not_called()
        with patch.object(module.os, 'pidfd_open', return_value=999), patch.object(module.os, 'close'), \
             patch.object(module.signal, 'pidfd_send_signal') as sent, \
             patch.object(module.select, 'select', return_value=([], [], [])):
            with self.assertRaisesRegex(RuntimeError, 'shutdown_wait_required'):
                module.stop(**self.kw)
            sent.assert_called_once_with(999, signal.SIGTERM)

    def test_real_owned_fixture_supervisor_and_ports_stop_without_data_changes(self):
        if not shutil.which('node') or not hasattr(os, 'pidfd_open'):
            self.skipTest('Node and Linux pidfd required for disposable integration test')
        node = Path(shutil.which('node')).resolve(strict=True)
        with socket.socket() as a, socket.socket() as b:
            a.bind(('127.0.0.1', 0)); b.bind(('127.0.0.1', 0))
            ports = (a.getsockname()[1], b.getsockname()[1])
        (self.repo / 'scripts/ai-office-knowledge.mjs').write_text(
            "import http from 'node:http';http.createServer((q,r)=>r.end('fixture')).listen(%d,'127.0.0.1');\n" % ports[1])
        (self.runtime / 'server/index.ts').write_text(
            "require('node:http').createServer((q,r)=>r.end('fixture')).listen(%d,'127.0.0.1');\n" % ports[0])
        supervisor = self.repo / 'scripts/start-ai-office.mjs'
        supervisor.write_text("import {spawn} from 'node:child_process';\n" +
            "const children=[spawn(process.execPath,['scripts/ai-office-knowledge.mjs','serve'],{cwd:" + json.dumps(str(self.repo)) + "})," +
            "spawn(process.execPath,['server/index.ts'],{cwd:" + json.dumps(str(self.runtime)) + "})];\n" +
            "process.on('SIGTERM',()=>{for(const c of children)c.kill('SIGTERM');});\n")
        child = subprocess.Popen([str(node), str(supervisor)], cwd=self.repo, stdin=subprocess.DEVNULL,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        before = self.db.read_bytes()
        try:
            deadline = time.monotonic() + 5
            while not all(module.listeners(Path('/proc'), ports).values()):
                self.assertIsNone(child.poll())
                self.assertLess(time.monotonic(), deadline)
                time.sleep(0.05)
            result = module.stop(self.root, self.repo, self.runtime, node=node, ports=ports, timeout=3)
            self.assertTrue(result['stopped'])
            child.wait(timeout=3)
            self.assertFalse(any(module.listeners(Path('/proc'), ports).values()))
            self.assertEqual(self.db.read_bytes(), before)
        finally:
            if child.poll() is None:
                os.killpg(child.pid, signal.SIGTERM)
                child.wait(timeout=3)


if __name__ == '__main__':
    unittest.main()
