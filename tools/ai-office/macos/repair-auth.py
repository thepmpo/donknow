#!/usr/bin/env python3
"""Retain official Codex auxiliary files without changing or exposing credentials."""
import argparse
from contextlib import ExitStack
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import uuid

AUXILIARY = {'tmp': 'directory', 'log': 'directory', 'auth.json.lock': 'file', 'auth.lock': 'file'}


def require_idle(codex):
    # Look only at open-file pathnames, never process arguments or file contents.
    for process in Path('/proc').iterdir():
        if not process.name.isdigit() or int(process.name) == os.getpid():
            continue
        try:
            descriptors = list((process / 'fd').iterdir())
        except OSError:
            continue
        for descriptor in descriptors:
            try:
                target = os.readlink(descriptor)
                if target.endswith(' (deleted)'):
                    target = target[:-10]
            except OSError:
                continue
            if target == str(codex) or target.startswith(str(codex) + '/'):
                raise RuntimeError('office_auth_provider_in_use')


def repair(provider_home, state_dir):
    state = Path(state_dir).resolve(strict=True)
    raw_home = Path(provider_home)
    home = raw_home.resolve(strict=True)
    if home == state or state not in home.parents or raw_home.is_symlink():
        raise RuntimeError('office_scoped_auth_directory_required')
    codex = home / '.codex'
    if codex.resolve(strict=True) != codex:
        raise RuntimeError('office_scoped_auth_directory_required')
    if any(p.name != '.codex' for p in home.iterdir()) or any(p.name not in {'auth.json', *AUXILIARY} for p in codex.iterdir()):
        raise RuntimeError('office_auth_additional_entries_require_review')
    auth = codex / 'auth.json'
    if not auth.exists():
        raise RuntimeError('office_auth_file_missing_login_required')
    if auth.resolve(strict=True) != auth or not auth.is_file() or auth.stat().st_size > 524288:
        raise RuntimeError('office_invalid_provider_auth')
    artifacts = []
    for name, kind in AUXILIARY.items():
        file = codex / name
        if not file.exists() and not file.is_symlink():
            continue
        if file.resolve(strict=True) != file or (kind == 'directory' and not file.is_dir()) or (kind == 'file' and not file.is_file()):
            raise RuntimeError('office_auth_artifact_requires_review')
        artifacts.append(file)
    if not artifacts:
        return dict(repairVersion=2, temporaryCacheBackedUp=False, backedUpNames=[], authenticationFilePreserved=True)
    require_idle(codex)
    before = hashlib.sha256(auth.read_bytes()).digest()
    moved_names = []
    with ExitStack() as stack:
        # Keep advisory locks held until the move and integrity check finish.
        for file in artifacts:
            if file.name.endswith('.lock'):
                handle = stack.enter_context(open(file, 'rb'))
                try:
                    fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    raise RuntimeError('office_auth_provider_in_use') from None
        if artifacts:
            backup_root = state / 'provider-cache-backups'
            if backup_root.is_symlink():
                raise RuntimeError('office_auth_backup_requires_review')
            backup_root.mkdir(mode=0o700, parents=True, exist_ok=True)
            target = backup_root / ('codex-aux-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex)
            target.mkdir(mode=0o700)
            moved = []
            try:
                for file in artifacts:
                    file.rename(target / file.name)
                    moved.append(file)
                    moved_names.append(file.name)
                if hashlib.sha256(auth.read_bytes()).digest() != before:
                    raise RuntimeError('office_auth_changed_during_repair')
            except Exception:
                for file in reversed(moved):
                    if not file.exists() and not file.is_symlink():
                        (target / file.name).rename(file)
                raise
    return dict(repairVersion=2, temporaryCacheBackedUp=bool(moved_names), backedUpNames=moved_names,
                authenticationFilePreserved=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--provider-home')
    parser.add_argument('--state-dir')
    args = parser.parse_args()
    try:
        if bool(args.provider_home) != bool(args.state_dir):
            raise RuntimeError('office_scoped_auth_directory_required')
        if args.provider_home:
            home, state = args.provider_home, args.state_dir
        else:
            config = {}
            for line in Path('/workspace/ai-office-runtime/.env').read_text().splitlines():
                if line and not line.lstrip().startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    config[key.strip()] = value.strip().strip('\"\'')
            home, state = config['AI_OFFICE_PROVIDER_AUTH_DIR'], '/workspace/ai-office/state'
        result = repair(home, state)
    except Exception as error:
        code = str(error)
        if not re.fullmatch(r'office_[a-z0-9_]+', code):
            code = 'office_auth_repair_io_error'
        print(json.dumps(dict(repairStopped=True, repairVersion=2, reasonCode=code, credentialsPrinted=False)))
        raise SystemExit(1)
    print(json.dumps(result))
