#!/usr/bin/env python3
"""Apply a reviewed, idle-only runtime capability update without reinstalling."""
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import sqlite3
import subprocess
import sys
import uuid

FILES = {'server/office-policy.ts', 'server/office-policy.test.ts'}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require_idle(database):
    if database.is_symlink() or not database.is_file():
        raise RuntimeError('office_development_database_requires_review')
    with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        if db.execute("SELECT COUNT(*) FROM tasks WHERE status='in_progress'").fetchone()[0]:
            raise RuntimeError('office_development_wait_for_running_task')
        if db.execute("SELECT COUNT(*) FROM agents WHERE status='working'").fetchone()[0]:
            raise RuntimeError('office_development_wait_for_running_task')
        if db.execute("SELECT COUNT(*) FROM office_task_permissions WHERE state='running'").fetchone()[0]:
            raise RuntimeError('office_development_wait_for_running_task')


def update(runtime, state, payload, verifier, idle=None, check_only=False):
    runtime, state = Path(runtime).resolve(strict=True), Path(state).resolve(strict=True)
    idle = idle or (lambda: require_idle(state / 'office.sqlite'))
    if payload.get('version') != 1 or {e['path'] for e in payload.get('files', [])} != FILES or len(payload['files']) != len(FILES):
        raise RuntimeError('office_development_manifest_invalid')
    originals, pending = {}, []
    for entry in payload['files']:
        file = runtime / entry['path']
        if file.resolve(strict=True) != file or not file.is_file():
            raise RuntimeError('office_development_path_requires_review')
        content = entry['content'].encode('utf-8')
        if digest(content) != entry['afterSha256']:
            raise RuntimeError('office_development_package_hash_mismatch')
        current = file.read_bytes()
        if digest(current) == entry['afterSha256']:
            continue
        if digest(current) != entry['beforeSha256']:
            raise RuntimeError('office_existing_development_changes_preserved')
        originals[entry['path']] = current
        pending.append(entry)
    if check_only:
        idle()
        return dict(ready=True, needsUpdate=bool(pending), restartRequired=True)
    if not pending:
        return dict(updated=False, alreadyInstalled=True, restartRequired=True)
    idle()
    backups = state / 'development-backups'
    if backups.is_symlink():
        raise RuntimeError('office_development_backup_requires_review')
    backups.mkdir(mode=0o700, exist_ok=True)
    backup = backups / (datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex)
    backup.mkdir(mode=0o700)
    for entry in pending:
        target = backup / entry['path']
        target.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
        shutil.copy2(runtime / entry['path'], target)
    applied = []
    try:
        for entry in pending:
            target = runtime / entry['path']
            if target.read_bytes() != originals[entry['path']]:
                raise RuntimeError('office_existing_development_changes_preserved')
            target.write_bytes(entry['content'].encode('utf-8'))
            applied.append(entry)
        verifier(backup / 'verification.log')
        idle()
    except Exception:
        for entry in reversed(applied):
            target = runtime / entry['path']
            if target.resolve(strict=True) == target and digest(target.read_bytes()) == entry['afterSha256']:
                shutil.copy2(backup / entry['path'], target)
        raise
    return dict(updated=True, backup=str(backup), restartRequired=True, authenticationChanged=False,
                automaticTaskStarted=False, automaticPublication=False)


def verify(runtime, log):
    env = dict(os.environ)
    toolchain = Path('/workspace/ai-office/toolchain')
    env['PATH'] = str(toolchain / 'node/bin') + ':' + env.get('PATH', '')
    env['AI_OFFICE_POLICY_ENABLED'] = 'false'
    env['AI_OFFICE_KNOWLEDGE_ENABLED'] = 'false'
    pnpm = toolchain / 'package-manager/node_modules/.bin/pnpm'
    with log.open('x') as output:
        log.chmod(0o600)
        subprocess.run([str(pnpm), 'exec', 'vitest', 'run', '--config', 'server/vitest.config.ts'],
                       cwd=runtime, env=env, stdout=output, stderr=output, check=True, timeout=180)
        subprocess.run([str(pnpm), 'exec', 'tsc', '-b'], cwd=runtime, env=env,
                       stdout=output, stderr=output, check=True, timeout=180)


if __name__ == '__main__':
    state, runtime = Path('/workspace/ai-office/state'), Path('/workspace/ai-office-runtime')
    try:
        lock_path = state / 'development-update.lock'
        fd = os.open(lock_path, os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            payload = json.loads(Path(sys.argv[1]).read_text())
            result = update(runtime, state, payload, lambda log: verify(runtime, log), check_only='--check' in sys.argv[2:])
        print(json.dumps(result))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_') or not code.replace('_', '').isalnum():
            code = 'office_development_update_stopped_existing_state_preserved'
        print(json.dumps(dict(updated=False, reasonCode=code)))
        raise SystemExit(1)
