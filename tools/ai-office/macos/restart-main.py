#!/usr/bin/env python3
"""Stop only the verified idle office supervisor for a reviewed local upgrade."""
import json
import os
from pathlib import Path
import select
import signal
import sqlite3
import time
from urllib.parse import unquote, urlparse


def exact_path(path):
    path = Path(path)
    if path.resolve(strict=True) != path:
        raise RuntimeError('office_main_paths_preserved')
    return path


def require_idle(database):
    database = exact_path(database)
    if not database.is_file():
        raise RuntimeError('office_main_database_required')
    with sqlite3.connect(database.as_uri() + '?mode=ro', uri=True) as db:
        for table, condition in [('tasks', "status='in_progress'"),
                                 ('agents', "status='working'"),
                                 ('office_task_permissions', "state IN ('approved','running')")]:
            if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone():
                raise RuntimeError('office_main_database_schema_required')
            if db.execute('SELECT 1 FROM ' + table + ' WHERE ' + condition + ' LIMIT 1').fetchone():
                raise RuntimeError('office_main_work_active_preserved')


def listeners(proc, ports):
    found = {port: set() for port in ports}
    for name in ('tcp', 'tcp6'):
        file = proc / 'net' / name
        if not file.exists():
            if name == 'tcp':
                raise RuntimeError('office_main_listener_inspection_required')
            continue
        for row in file.read_text().splitlines()[1:]:
            fields = row.split()
            if len(fields) < 10 or fields[3] != '0A':
                continue
            address, port_text = fields[1].split(':')
            port = int(port_text, 16)
            if port not in found:
                continue
            if name != 'tcp' or address != '0100007F':
                raise RuntimeError('office_main_foreign_listener_preserved')
            found[port].add(fields[9])
    return found


def processes(proc):
    rows = {}
    for entry in proc.iterdir():
        if not entry.name.isdigit() or entry.is_symlink():
            continue
        try:
            fields = (entry / 'stat').read_text().rsplit(')', 1)[1].split()
            if fields[0] == 'Z':
                continue
            # Retain parentage even when a child hides its descriptors/executable.
            # An unreadable descendant must be refused, not silently disappear.
            rows[int(entry.name)] = {
                'uid': entry.stat().st_uid, 'ppid': int(fields[1]), 'start': fields[19],
                'args': [], 'exe': None, 'cwd': None, 'sockets': set(),
            }
            args = [part.decode() for part in (entry / 'cmdline').read_bytes().split(b'\0') if part]
            rows[int(entry.name)] = {
                'uid': entry.stat().st_uid, 'ppid': int(fields[1]), 'start': fields[19], 'args': args,
                'exe': (entry / 'exe').resolve(strict=True), 'cwd': (entry / 'cwd').resolve(strict=True),
                'sockets': {os.readlink(fd) for fd in (entry / 'fd').iterdir()},
            }
        except (FileNotFoundError, PermissionError, ProcessLookupError, UnicodeError):
            continue
    return rows


def node_script(args, relative, repo):
    return len(args) == 2 and args[1] in (relative, str(repo / relative))


def module_path(value, runtime, suffix):
    if value.startswith('file:'):
        url = urlparse(value)
        if url.scheme != 'file' or url.netloc:
            return False
        value = unquote(url.path)
    try:
        path = Path(value).resolve(strict=True)
        return path.is_relative_to(runtime / 'node_modules') and path.as_posix().endswith(suffix)
    except (OSError, RuntimeError):
        return False


def known_child(row, node, repo, runtime, uid):
    if row['uid'] != uid:
        return False
    args = row['args']
    if not args:
        return False
    if row['exe'] == node:
        if row['cwd'] == repo and len(args) == 3 and args[1] in (
                'scripts/ai-office-knowledge.mjs', str(repo / 'scripts/ai-office-knowledge.mjs')) and args[2] == 'serve':
            return True
        if row['cwd'] != runtime or args[-1] not in ('server/index.ts', str(runtime / 'server/index.ts')):
            return False
        if len(args) == 3 and module_path(args[1], runtime, '/tsx/dist/cli.mjs'):
            return True
        # tsx's dedicated server child: only its known preflight/loader flags.
        rest = args[1:-1]
        while rest:
            if len(rest) < 2 or rest[0] not in ('--require', '--import'):
                return False
            suffix = '/tsx/dist/preflight.cjs' if rest[0] == '--require' else '/tsx/dist/loader.mjs'
            if not module_path(rest[1], runtime, suffix):
                return False
            rest = rest[2:]
        return True
    return (row['cwd'] == runtime and row['exe'].is_relative_to(runtime / 'node_modules')
            and '@esbuild' in row['exe'].parts and row['exe'].name == 'esbuild'
            and len(args) in (2, 3) and args[1].startswith('--service=')
            and (len(args) == 2 or args[2] == '--ping'))


def verified_supervisor(proc=Path('/proc'), node=Path('/workspace/ai-office/toolchain/node/bin/node'),
                        repo=Path('/workspace/donknow'), runtime=Path('/workspace/ai-office-runtime'),
                        uid=None, ports=(8790, 8791)):
    proc, node, repo, runtime = Path(proc), exact_path(node), exact_path(repo), exact_path(runtime)
    exact_path(repo / 'scripts/start-ai-office.mjs')
    uid = os.getuid() if uid is None else uid
    active = listeners(proc, ports)
    rows = processes(proc)
    candidates = [pid for pid, row in rows.items() if row['uid'] == uid and row['exe'] == node
                  and row['cwd'] == repo and node_script(row['args'], 'scripts/start-ai-office.mjs', repo)]
    if not any(active.values()) and not candidates:
        return None
    if len(candidates) != 1 or not all(active.values()):
        raise RuntimeError('office_main_existing_processes_preserved')
    supervisor = candidates[0]
    descendants = set()
    while True:
        children = {pid for pid, row in rows.items() if row['ppid'] in descendants | {supervisor}}
        if children <= descendants:
            break
        descendants |= children
    if any(not known_child(rows[pid], node, repo, runtime, uid) for pid in descendants):
        raise RuntimeError('office_main_unknown_child_preserved')
    for inodes in active.values():
        for inode in inodes:
            owners = {pid for pid, row in rows.items() if 'socket:[' + inode + ']' in row['sockets']}
            if len(owners) != 1 or not owners <= descendants:
                raise RuntimeError('office_main_foreign_listener_preserved')
    return supervisor, rows[supervisor]['start']


def stop(root=Path('/workspace/ai-office'), repo=Path('/workspace/donknow'),
         runtime=Path('/workspace/ai-office-runtime'), proc=Path('/proc'), node=None,
         uid=None, ports=(8790, 8791), timeout=10):
    root, proc = exact_path(root), Path(proc)
    database = root / 'state/office.sqlite'
    node = root / 'toolchain/node/bin/node' if node is None else Path(node)
    require_idle(database)
    identity = verified_supervisor(proc, node, repo, runtime, uid, ports)
    if identity is None:
        return {'stopped': False, 'alreadyStopped': True}
    if not hasattr(os, 'pidfd_open') or not hasattr(signal, 'pidfd_send_signal'):
        raise RuntimeError('office_main_restart_requires_pidfd')
    fd = os.pidfd_open(identity[0])
    try:
        if verified_supervisor(proc, node, repo, runtime, uid, ports) != identity:
            raise RuntimeError('office_main_listener_changed_preserved')
        require_idle(database)
        signal.pidfd_send_signal(fd, signal.SIGTERM)
        deadline = time.monotonic() + timeout
        if not select.select([fd], [], [], timeout)[0]:
            raise RuntimeError('office_main_shutdown_wait_required')
        while any(listeners(proc, ports).values()):
            if time.monotonic() >= deadline:
                raise RuntimeError('office_main_ports_still_busy_preserved')
            time.sleep(0.1)
    finally:
        os.close(fd)
    return {'stopped': True, 'authenticationReset': False, 'dataReset': False}


if __name__ == '__main__':
    try:
        print(json.dumps(stop()))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_main_') or not code.replace('_', '').isalnum():
            code = 'office_main_stop_failed_existing_state_preserved'
        print(json.dumps({'stopped': False, 'reasonCode': code}))
        raise SystemExit(1)
