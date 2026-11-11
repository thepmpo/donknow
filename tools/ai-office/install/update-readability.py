#!/usr/bin/env python3
"""Update only the five reviewed office UI files; preserve tasks, auth and data."""
from contextlib import ExitStack
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

FILES = {'src/components/office-view/' + name for name in (
    'model.ts', 'buildScene-departments.ts', 'buildScene-department-agent.ts',
    'buildScene-break-room.ts', 'useOfficeDeliveryEffects.ts')}


def digest(data):
    return hashlib.sha256(data).hexdigest()


def require_idle(database):
    if not database.is_file():
        raise RuntimeError('office_database_missing_review_required')
    with sqlite3.connect(database.resolve().as_uri() + '?mode=ro', uri=True) as db:
        if db.execute("SELECT COUNT(*) FROM tasks WHERE status='in_progress'").fetchone()[0]:
            raise RuntimeError('office_review_running_wait_until_finished')
        if db.execute("SELECT COUNT(*) FROM agents WHERE status='working'").fetchone()[0]:
            raise RuntimeError('office_review_running_wait_until_finished')
        if db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='office_task_permissions'").fetchone():
            if db.execute("SELECT COUNT(*) FROM office_task_permissions WHERE state='running'").fetchone()[0]:
                raise RuntimeError('office_review_running_wait_until_finished')


def update(runtime, state, payload, builder, idle=None):
    runtime, state = Path(runtime).resolve(strict=True), Path(state).resolve(strict=True)
    idle = idle or (lambda: require_idle(state / 'office.sqlite'))
    if payload.get('version') != 1 or {e['path'] for e in payload.get('files', [])} != FILES or len(payload['files']) != len(FILES):
        raise RuntimeError('office_ui_manifest_invalid')
    originals, pending = {}, []
    for entry in payload['files']:
        file = runtime / entry['path']
        if file.resolve(strict=True) != file or not file.is_file():
            raise RuntimeError('office_ui_path_requires_review')
        data = entry['content'].encode('utf-8')
        if digest(data) != entry['afterSha256']:
            raise RuntimeError('office_ui_package_hash_mismatch')
        current = file.read_bytes()
        if digest(current) == entry['afterSha256']:
            continue
        if digest(current) != entry['beforeSha256']:
            raise RuntimeError('office_existing_ui_changes_preserved')
        originals[entry['path']] = current
        pending.append(entry)
    if not pending:
        return dict(updated=False, alreadyInstalled=True)
    idle()
    if (runtime / 'dist').is_symlink():
        raise RuntimeError('office_ui_path_requires_review')
    backups = state / 'ui-backups'
    if backups.is_symlink():
        raise RuntimeError('office_ui_backup_requires_review')
    backups.mkdir(mode=0o700, exist_ok=True)
    backup = backups / ('readability-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex)
    backup.mkdir(mode=0o700)
    staging, dist, swapped = backup / 'new-dist', runtime / 'dist', False
    for entry in pending:
        target = backup / 'source' / entry['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(runtime / entry['path'], target)
    applied = []
    try:
        for entry in pending:
            target = runtime / entry['path']
            if digest(target.read_bytes()) != entry['beforeSha256']:
                raise RuntimeError('office_existing_ui_changes_preserved')
            target.write_bytes(entry['content'].encode('utf-8'))
            applied.append(entry)
        builder(staging)
        if not (staging / 'index.html').is_file():
            raise RuntimeError('office_ui_build_output_missing')
        idle()
        if dist.exists():
            dist.rename(backup / 'previous-dist')
        try:
            staging.rename(dist)
            swapped = True
        except Exception:
            if (backup / 'previous-dist').exists() and not dist.exists():
                (backup / 'previous-dist').rename(dist)
            raise
    except Exception:
        for entry in reversed(applied):
            target = runtime / entry['path']
            if digest(target.read_bytes()) == entry['afterSha256']:
                shutil.copy2(backup / 'source' / entry['path'], target)
        raise
    return dict(updated=swapped, backup=str(backup), authenticationChanged=False, tasksChanged=False,
                reloadUrl='http://127.0.0.1:8790')


def build(runtime, staging):
    toolchain = Path('/workspace/ai-office/toolchain')
    env = dict(os.environ)
    env['PATH'] = str(toolchain / 'node/bin') + ':' + env.get('PATH', '')
    pnpm = toolchain / 'package-manager/node_modules/.bin/pnpm'
    subprocess.run([str(pnpm), 'exec', 'tsc', '-b'], cwd=runtime, env=env, check=True)
    subprocess.run([str(pnpm), 'exec', 'vite', 'build', '--outDir', str(staging)], cwd=runtime, env=env, check=True)


if __name__ == '__main__':
    state, runtime = Path('/workspace/ai-office/state'), Path('/workspace/ai-office-runtime')
    try:
        with (state / 'ui-update.lock').open('a') as lock:
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            payload = json.loads(Path(sys.argv[1]).read_text())
            result = update(runtime, state, payload, lambda staging: build(runtime, staging))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_') or not code.replace('_', '').isalnum():
            code = 'office_ui_update_failed_original_ui_preserved'
        print(json.dumps(dict(updated=False, reasonCode=code, authenticationChanged=False, tasksChanged=False)))
        raise SystemExit(1)
    print(json.dumps(result))
