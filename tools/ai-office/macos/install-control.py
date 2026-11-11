#!/usr/bin/env python3
"""Install a versioned owner console without changing app, database, auth or runtime."""
import hashlib
import json
import os
from pathlib import Path
import sys
import uuid
import zipfile

ALLOWED = {'server.mjs', 'ui.html', 'lib/access.mjs', 'lib/controller.mjs', 'lib/ai-office-client.mjs'}
LAUNCH = '''import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const root='/workspace/ai-office/control';const p=JSON.parse(fs.readFileSync(path.join(root,'current.json'),'utf8'));if(!/^[a-f0-9]{64}$/.test(p.packageId))throw Error('office_control_manifest_invalid');const dir=path.join(root,'versions',p.packageId);if(fs.realpathSync(dir)!==dir)throw Error('office_control_path_invalid');process.env.AI_OFFICE_CONTROL_VERSION=p.packageId;await import(pathToFileURL(path.join(dir,'server.mjs')).href);
'''
SHELL = '#!/bin/sh\nset -eu\nexport PATH="/workspace/ai-office/toolchain/node/bin:$PATH"\nexec node /workspace/ai-office/control/launch.mjs\n'


def install(archive, office_root='/workspace/ai-office'):
    root = Path(office_root).resolve(strict=True)
    if not (root / 'state/office.sqlite').is_file():
        raise RuntimeError('office_installation_not_found')
    if (root / 'control').is_symlink() or (root / 'control/versions').is_symlink() or (root / 'bin').is_symlink():
        raise RuntimeError('office_control_path_requires_review')
    with zipfile.ZipFile(archive) as bundle:
        manifest = json.loads(bundle.read('manifest.json'))
        files = manifest.get('files', {})
        if set(files) != ALLOWED or set(bundle.namelist()) != ALLOWED | {'manifest.json'}:
            raise RuntimeError('office_control_manifest_invalid')
        package_id = hashlib.sha256(json.dumps(files, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
        if manifest.get('packageId') != package_id:
            raise RuntimeError('office_control_manifest_invalid')
        data = {name: bundle.read(name) for name in ALLOWED}
        if any(hashlib.sha256(content).hexdigest() != files[name] for name, content in data.items()):
            raise RuntimeError('office_control_package_corrupt')
    control = root / 'control'
    if control.is_symlink():
        raise RuntimeError('office_control_path_requires_review')
    destination = control / 'versions' / package_id
    destination.mkdir(mode=0o700, parents=True, exist_ok=True)
    if destination.resolve(strict=True) != destination:
        raise RuntimeError('office_control_path_requires_review')
    for name, content in data.items():
        target = destination / name
        if any(parent.is_symlink() for parent in target.parents if parent != destination and destination in parent.parents) or target.is_symlink() or (target.exists() and target.read_bytes() != content):
            raise RuntimeError('office_existing_control_changes_preserved')
    for target, content in [(control / 'launch.mjs', LAUNCH), (root / 'bin/control.sh', SHELL)]:
        if target.is_symlink() or (target.exists() and target.read_text() != content):
            raise RuntimeError('office_existing_launcher_preserved')
    for name, content in data.items():
        target = destination / name
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not target.exists():
            with target.open('xb') as stream:
                stream.write(content)
            target.chmod(0o600)
    for target, content, mode in [(control / 'launch.mjs', LAUNCH, 0o600), (root / 'bin/control.sh', SHELL, 0o700)]:
        target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        if not target.exists():
            with target.open('x') as stream:
                stream.write(content)
            target.chmod(mode)
    pointer = control / 'current.json'
    if pointer.is_symlink():
        raise RuntimeError('office_control_path_requires_review')
    temp = control / ('current-' + uuid.uuid4().hex)
    temp.write_text(json.dumps(dict(version=1, packageId=package_id)))
    temp.chmod(0o600)
    temp.replace(pointer)
    return dict(installed=True, packageId=package_id, appDataChanged=False, authenticationChanged=False)


if __name__ == '__main__':
    try:
        print(json.dumps(install(sys.argv[1])))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_') or not code.replace('_', '').isalnum():
            code = 'office_control_install_stopped_safely'
        print(json.dumps(dict(installed=False, reasonCode=code)))
        raise SystemExit(1)
