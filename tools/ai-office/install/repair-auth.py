#!/usr/bin/env python3
"""Repair the known Codex login tmp-directory conflict; never print credentials."""
import datetime
import hashlib
import json
import os
from pathlib import Path
import uuid


def repair(provider_home, state_dir):
    state = Path(state_dir).resolve(strict=True)
    raw_home = Path(provider_home)
    home = raw_home.resolve(strict=True)
    if home == state or state not in home.parents or raw_home.is_symlink():
        raise RuntimeError('office_scoped_auth_directory_required')
    codex = home / '.codex'
    if codex.resolve(strict=True) != codex:
        raise RuntimeError('office_scoped_auth_directory_required')
    if any(p.name != '.codex' for p in home.iterdir()) or any(p.name not in ('auth.json', 'tmp') for p in codex.iterdir()):
        raise RuntimeError('office_auth_additional_entries_require_review')
    auth = codex / 'auth.json'
    if auth.resolve(strict=True) != auth or not auth.is_file() or auth.stat().st_size > 524288:
        raise RuntimeError('office_invalid_provider_auth')
    before = hashlib.sha256(auth.read_bytes()).digest()
    temporary = codex / 'tmp'
    moved = False
    if temporary.exists() or temporary.is_symlink():
        if temporary.resolve(strict=True) != temporary or not temporary.is_dir():
            raise RuntimeError('office_auth_tmp_requires_review')
        backup_root = state / 'provider-cache-backups'
        if backup_root.is_symlink():
            raise RuntimeError('office_auth_backup_requires_review')
        backup_root.mkdir(mode=0o700, parents=True, exist_ok=True)
        target = backup_root / ('codex-tmp-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex)
        temporary.rename(target)
        moved = True
    if hashlib.sha256(auth.read_bytes()).digest() != before:
        raise RuntimeError('office_auth_changed_during_repair')
    return dict(temporaryCacheBackedUp=moved, authenticationFilePreserved=True)


if __name__ == '__main__':
    config = {}
    for line in Path('/workspace/ai-office-runtime/.env').read_text().splitlines():
        if line and not line.lstrip().startswith('#') and '=' in line:
            key, value = line.split('=', 1)
            config[key.strip()] = value.strip().strip('\"\'')
    try:
        result = repair(config['AI_OFFICE_PROVIDER_AUTH_DIR'], '/workspace/ai-office/state')
    except Exception:
        raise SystemExit('Office login repair stopped safely; no credentials were printed. Ask for review; do not delete authentication files.')
    print(json.dumps(result))
