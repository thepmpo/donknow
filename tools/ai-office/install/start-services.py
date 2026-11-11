#!/usr/bin/env python3
"""Open an installed office. Never install, reset, stop services or start AI work."""
from contextlib import contextmanager
import fcntl
import http.client
import json
import os
from pathlib import Path
import socket
import stat
import subprocess
import time


def private_directory(path):
    path.mkdir(mode=0o700, exist_ok=True)
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError('office_launch_private_path_required')


def private_file(path):
    fd = os.open(path, os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_NOFOLLOW | os.O_CLOEXEC, 0o600)
    info = os.fstat(fd)
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077 or info.st_nlink != 1:
        os.close(fd)
        raise RuntimeError('office_launch_private_file_required')
    return os.fdopen(fd, 'a+')


@contextmanager
def launch_lock(path, timeout=90):
    with private_file(path) as lock:
        deadline = time.monotonic() + timeout
        while True:
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
                break
            except BlockingIOError:
                if time.monotonic() >= deadline:
                    raise RuntimeError('office_launch_already_in_progress') from None
                time.sleep(0.2)
        yield


def health(port, app):
    connection = http.client.HTTPConnection('127.0.0.1', port, timeout=2)
    try:
        connection.request('GET', '/health' if app else '/api/status')
        response = connection.getresponse()
        body = response.read(65537)
        data = json.loads(body)
        matches = (data.get('app') == app if app else
                   type(data.get('ok')) is bool and isinstance(data.get('projects'), list))
        if response.status != 200 or len(body) > 65536 or not matches:
            raise ValueError()
        return True
    except ConnectionRefusedError:
        return False
    except (OSError, ValueError, AttributeError, http.client.HTTPException):
        raise RuntimeError('office_launch_port_%s_preserved' % port) from None
    finally:
        connection.close()


def occupied(port):
    with socket.socket() as connection:
        connection.settimeout(1)
        return connection.connect_ex(('127.0.0.1', port)) == 0


def process_stamp(pid):
    try:
        # The command name may contain spaces or parentheses.
        fields = Path('/proc/%d/stat' % pid).read_text().rsplit(')', 1)[1].split()
        return fields[19] if fields[0] != 'Z' else None
    except (OSError, IndexError):
        return None


def pending_process(record):
    if record.is_symlink():
        raise RuntimeError('office_launch_private_path_required')
    if not record.exists():
        return False
    try:
        data = json.loads(record.read_text())
        pid = data['pid']
        return type(pid) is int and pid > 0 and data['start'] is not None and process_stamp(pid) == data['start']
    except (OSError, ValueError, KeyError, TypeError):
        raise RuntimeError('office_launch_process_record_requires_review') from None


def ensure_service(root, logs, name, port, app, extra_ports=(), timeout=60):
    if health(port, app):
        return 'reused'
    record = logs / (name + '.json')
    if pending_process(record):
        raise RuntimeError('office_launch_%s_still_starting_check_log' % name)
    if any(occupied(p) for p in (port, *extra_ports)):
        raise RuntimeError('office_launch_%s_ports_preserved' % name)
    env = dict(os.environ)
    env['PATH'] = str(root / 'toolchain/node/bin') + ':' + env.get('PATH', '')
    with private_file(logs / (name + '.log')) as log:
        child = subprocess.Popen([str(root / ('bin/' + name + '.sh'))], stdin=subprocess.DEVNULL,
                                 stdout=log, stderr=log, env=env, close_fds=True, start_new_session=True)
    # Keep a startup receipt so a slow-but-live process is never started twice.
    with private_file(record) as output:
        output.seek(0)
        output.truncate()
        output.write(json.dumps({'pid': child.pid, 'start': process_stamp(child.pid)}))
        output.flush()
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if child.poll() is not None:
            raise RuntimeError('office_launch_%s_failed_check_log' % name)
        if health(port, app):
            # Let an immediately failing sibling (knowledge) report its failure.
            time.sleep(0.2)
            if child.poll() is not None:
                raise RuntimeError('office_launch_%s_failed_check_log' % name)
            return 'started'
        time.sleep(0.25)
    raise RuntimeError('office_launch_%s_timeout_check_log' % name)


def start(root=Path('/workspace/ai-office'), ports=(8790, 8810, 8791), timeout=60):
    root = Path(root)
    if root.resolve() != root or any((root / part).is_symlink() for part in ('state', 'bin')):
        raise RuntimeError('office_launch_existing_paths_require_review')
    if not (root / 'state/office.sqlite').is_file() or not (root / 'bin/start.sh').is_file():
        raise RuntimeError('office_launch_installation_required')
    if not (root / 'bin/control.sh').is_file():
        raise RuntimeError('office_launch_chat_setup_required_run_9_once')
    for script in ('start.sh', 'control.sh'):
        path = root / 'bin' / script
        if path.is_symlink() or not os.access(path, os.X_OK):
            raise RuntimeError('office_launch_existing_launcher_requires_review')
    logs = root / 'state/launcher'
    private_directory(logs)
    with launch_lock(logs / 'open.lock'):
        # Check both identities before starting either missing service.
        health(ports[0], 'Claw-Empire')
        health(ports[1], 'AI-Office-Control')
        main = ensure_service(root, logs, 'start', ports[0], 'Claw-Empire', (ports[2],), timeout)
        deadline = time.monotonic() + timeout
        while not health(ports[2], None):
            if time.monotonic() >= deadline:
                raise RuntimeError('office_launch_knowledge_unavailable_check_log')
            time.sleep(0.25)
        control = ensure_service(root, logs, 'control', ports[1], 'AI-Office-Control', timeout=timeout)
    return dict(ready=True, office=main, chat=control, logs=str(logs), automaticTaskStarted=False)


if __name__ == '__main__':
    try:
        print(json.dumps(start()))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_launch_') or not code.replace('_', '').isalnum():
            code = 'office_launch_stopped_existing_state_preserved'
        print(json.dumps({'ready': False, 'reasonCode': code}))
        raise SystemExit(1)
