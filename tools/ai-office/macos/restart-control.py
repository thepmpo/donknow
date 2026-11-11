#!/usr/bin/env python3
"""Stop only our UID's verified loopback control launcher; never the office/model."""
import os
from pathlib import Path
import select
import signal


def listener_inodes(proc=Path('/proc'), port=8810):
    address = '0100007F:%04X' % port
    return {row.split()[9] for row in (proc / 'net/tcp').read_text().splitlines()[1:]
            if len(row.split()) > 9 and row.split()[1] == address and row.split()[3] == '0A'}


def verified_pid(proc=Path('/proc'), node=Path('/workspace/ai-office/toolchain/node/bin/node'),
                 launcher=Path('/workspace/ai-office/control/launch.mjs'), uid=None, port=8810):
    uid = os.getuid() if uid is None else uid
    inodes = listener_inodes(proc, port)
    if not inodes:
        return None
    found = []
    for entry in proc.iterdir():
        if not entry.name.isdigit():
            continue
        try:
            if entry.stat().st_uid != uid:
                continue
            args = (entry / 'cmdline').read_bytes().split(b'\0')
            args = [x.decode() for x in args if x]
            if len(args) != 2 or args[1] != str(launcher):
                continue
            if (entry / 'exe').resolve(strict=True) != node.resolve(strict=True):
                continue
            sockets = {os.readlink(fd) for fd in (entry / 'fd').iterdir()}
            if any('socket:[' + inode + ']' in sockets for inode in inodes):
                found.append(int(entry.name))
        except (FileNotFoundError, PermissionError, ProcessLookupError, UnicodeError):
            continue
    if len(found) != 1:
        raise RuntimeError('office_existing_listener_preserved')
    return found[0]


def stop():
    pid = verified_pid()
    if pid is None:
        return {'stopped': False, 'alreadyStopped': True}
    if not hasattr(os, 'pidfd_open') or not hasattr(signal, 'pidfd_send_signal'):
        raise RuntimeError('office_restart_requires_pidfd')
    fd = os.pidfd_open(pid)
    try:
        if verified_pid() != pid:
            raise RuntimeError('office_listener_changed_preserved')
        signal.pidfd_send_signal(fd, signal.SIGTERM)
        if not select.select([fd], [], [], 10)[0]:
            raise RuntimeError('office_input_shutdown_wait_required')
    finally:
        os.close(fd)
    return {'stopped': True, 'mainOfficeChanged': False}


if __name__ == '__main__':
    import json
    try:
        print(json.dumps(stop()))
    except Exception:
        print('{"stopped":false,"reasonCode":"office_old_input_preserved_review_required"}')
        raise SystemExit(1)
