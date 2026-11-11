#!/usr/bin/env python3
"""Validate private Tailscale access. Never expose the office to the public internet."""
import json
import os
from pathlib import Path
import re
import stat
import sys
import tempfile


def identity(status, version):
    match = re.search(r'(?m)^\s*(\d+)\.(\d+)\.(\d+)', version)
    if not match or tuple(map(int, match.groups())) < (1, 90, 0):
        raise RuntimeError('office_phone_update_tailscale_required')
    if status.get('BackendState') != 'Running':
        raise RuntimeError('office_phone_tailscale_login_required')
    own = status.get('Self') or {}
    dns = str(own.get('DNSName', '')).rstrip('.')
    if not re.fullmatch(r'(?=.{1,253}$)(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+ts\.net', dns):
        raise RuntimeError('office_phone_https_name_required')
    user_id = str(own.get('UserID', ''))
    owner = (status.get('User', {}).get(user_id) or {}).get('LoginName')
    if own.get('Tags') or not isinstance(owner, str) or not owner.strip() or len(owner) > 240 or any(ord(c) < 32 for c in owner):
        raise RuntimeError('office_phone_personal_account_required')
    return {'version': 1, 'origin': 'https://' + dns, 'ownerLogin': owner}


def inspect_serve(serve, origin, required=False):
    if serve is None:
        serve = {}
    if not isinstance(serve, dict):
        raise RuntimeError('office_phone_existing_serve_preserved')
    # Foreground can contain nested public/other routes. Never silently replace it.
    known = {'TCP', 'Web', 'Services', 'AllowFunnel', 'Foreground', 'ETag'}
    if any(key not in known and value not in (None, {}, []) for key, value in serve.items()):
        raise RuntimeError('office_phone_existing_serve_preserved')
    if serve.get('Foreground') or serve.get('Services'):
        raise RuntimeError('office_phone_existing_serve_preserved')
    funnel = serve.get('AllowFunnel') or {}
    if not isinstance(funnel, dict) or any(value is not False for value in funnel.values()):
        raise RuntimeError('office_phone_public_funnel_preserved_stop_for_review')
    tcp, web = serve.get('TCP') or {}, serve.get('Web') or {}
    host = origin.removeprefix('https://') + ':443'
    expected_tcp = {'443': {'HTTPS': True}}
    expected_web = {host: {'Handlers': {'/': {'Proxy': 'http://127.0.0.1:8810'}}}}
    if tcp not in ({}, expected_tcp) or web not in ({}, expected_web):
        raise RuntimeError('office_phone_existing_serve_preserved')
    if required and (tcp != expected_tcp or web != expected_web):
        raise RuntimeError('office_phone_https_route_not_ready')


def check_state(state):
    state = Path(state)
    if state.resolve() != state or not state.is_dir() or not (state / 'office.sqlite').is_file():
        raise RuntimeError('office_phone_office_state_required')
    info = state.stat()
    if info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError('office_phone_private_state_required')
    return state


def read_pin(path):
    if path.is_symlink():
        raise RuntimeError('office_phone_existing_owner_preserved')
    try:
        info = path.stat()
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or info.st_mode & 0o077:
        raise RuntimeError('office_phone_existing_owner_preserved')
    return json.loads(path.read_text())


def prepare(status, serve, version, state=Path('/workspace/ai-office/state')):
    value = identity(status, version)
    inspect_serve(serve, value['origin'])
    state = check_state(state)
    pin = state / 'private-access.json'
    old = read_pin(pin)
    if old is not None:
        if old != value:
            raise RuntimeError('office_phone_existing_owner_preserved')
        return value['origin']
    fd, temporary = tempfile.mkstemp(prefix='private-access-', dir=state)
    try:
        with os.fdopen(fd, 'w') as output:
            json.dump(value, output)
            output.flush()
            os.fsync(output.fileno())
        try:
            # Atomic create-if-absent: two setup windows cannot replace each other's owner.
            os.link(temporary, pin)
        except FileExistsError:
            if read_pin(pin) != value:
                raise RuntimeError('office_phone_existing_owner_preserved') from None
    finally:
        os.unlink(temporary)
    return value['origin']


def verify(status, serve, version, state=Path('/workspace/ai-office/state')):
    value = identity(status, version)
    inspect_serve(serve, value['origin'], required=True)
    if read_pin(check_state(state) / 'private-access.json') != value:
        raise RuntimeError('office_phone_existing_owner_preserved')
    return value['origin']


if __name__ == '__main__':
    try:
        action = {'prepare': prepare, 'verify': verify}[sys.argv[1]]
        print(action(json.loads(Path(sys.argv[2]).read_text()),
                     json.loads(Path(sys.argv[3]).read_text()), Path(sys.argv[4]).read_text()))
    except Exception as error:
        code = str(error)
        if not code.startswith('office_phone_') or not code.replace('_', '').isalnum():
            code = 'office_phone_setup_stopped_existing_state_preserved'
        print(code, file=sys.stderr)
        raise SystemExit(1)
