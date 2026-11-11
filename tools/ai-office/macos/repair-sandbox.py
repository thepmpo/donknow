#!/usr/bin/env python3
"""Enable the Ubuntu application exception for the pinned office Node only.

Never attach an unrestricted profile to bwrap or a system interpreter. The
dedicated Node allowance also applies to other code its owner chooses to run
with that binary; task isolation is enforced separately by the office runner.
"""
import fcntl
import json
import os
from pathlib import Path
import pwd
import stat
import subprocess
import sys

NODE = '/workspace/ai-office/toolchain/node/bin/node'
PROFILE_NAME = 'duckduck-office-node'
PROFILE_PATH = '/etc/apparmor.d/' + PROFILE_NAME
PROFILE = ('# Managed AI Office application exception; global restrictions stay enabled.\n'
           'abi <abi/4.0>,\ninclude <tunables/global>\n\n'
           'profile duckduck-office-node ' + NODE + ' flags=(unconfined) {\n'
           '  userns,\n}\n')
PROBE = r'''const {spawnSync}=require('node:child_process');const fs=require('node:fs');
if(requireOfficeProfile && fs.readFileSync('/proc/self/attr/current','utf8').trim()!=='duckduck-office-node (unconfined)') {console.error('office_probe_failed:profile:attachment');process.exit(1);}
const temporary=fs.mkdtempSync('/tmp/duckduck-namespace-probe-');const canary=temporary+'/source';
fs.writeFileSync(canary,'preserve');
const outer=['--ro-bind','/','/','--proc','/proc','--unshare-net'];
let stage='outer',reason='command_failed';
try {
for(const [name,args] of [['outer',outer.concat('/bin/true')],['nested',outer.concat('/usr/bin/bwrap',...outer,'/bin/true')],
['read_only',outer.concat('/bin/sh','-c','if (printf blocked > "$1") 2>/dev/null; then exit 1; fi','probe',canary)]]) {
 stage=name;
 const r=spawnSync('/usr/bin/bwrap',args,{encoding:'utf8',timeout:10000});
 if(r.error||r.status!==0) {
  reason=String(r.stderr).includes('Read-only file system')?'proc_readonly':String(r.stderr).includes('Operation not permitted')?'permission':r.error?.code==='ETIMEDOUT'?'timeout':'command_failed';
  throw Error('blocked');
 }
}
stage='integrity';reason='canary_changed';
if(fs.readFileSync(canary,'utf8')!=='preserve') throw Error('write_allowed');
process.stdout.write('office_namespace_probe_passed\n');
}catch{console.error('office_probe_failed:'+stage+':'+reason);process.exitCode=1;}finally{fs.rmSync(temporary,{recursive:true,force:true});}'''


def error(code):
    raise RuntimeError('office_' + code)


class Repair:
    def __init__(self, root=Path('/'), run=subprocess.run, owner_uid=0, probe_options=None):
        self.root, self.run, self.owner_uid = root, run, owner_uid
        self.probe_options = probe_options or {}

    def path(self, name):
        return self.root / name.lstrip('/')

    def command(self, args, **options):
        return self.run(args, capture_output=True, text=True, timeout=35, **options)

    def validate(self):
        values = {}
        for line in self.path('/etc/os-release').read_text().splitlines():
            if '=' in line:
                key, value = line.split('=', 1)
                values[key] = value.strip('"')
        if values.get('ID') != 'ubuntu' or values.get('VERSION_ID') != '24.04':
            error('sandbox_repair_requires_ubuntu_2404')
        if self.path('/proc/sys/kernel/apparmor_restrict_unprivileged_userns').read_text().strip() != '1':
            error('sandbox_repair_unexpected_restriction')
        if self.path('/sys/module/apparmor/parameters/enabled').read_text().strip() not in ('Y', '1'):
            error('sandbox_repair_apparmor_not_enabled')
        node = self.path(NODE)
        if node.resolve(strict=True) != node or not stat.S_ISREG(node.stat().st_mode) or node.stat().st_mode & 0o022:
            error('sandbox_repair_node_path_changed')
        version = self.command([str(node), '--version'], **self.probe_options)
        if version.returncode or version.stdout.strip() != 'v24.22.1':
            error('sandbox_repair_node_version_mismatch')

    def probe(self, require_profile=False):
        script = 'const requireOfficeProfile=' + ('true' if require_profile else 'false') + ';\n' + PROBE
        result = self.command([str(self.path(NODE)), '-e', script], **self.probe_options)
        self.last_probe_failure = 'unknown'
        # Only our fixed markers leave the probe; never raw child output.
        for stage in ('profile', 'outer', 'nested', 'read_only', 'integrity'):
            for reason in ('attachment', 'proc_readonly', 'permission', 'timeout', 'command_failed', 'canary_changed'):
                if 'office_probe_failed:' + stage + ':' + reason in result.stderr.splitlines():
                    self.last_probe_failure = stage + '_' + reason
        return result.returncode == 0 and result.stdout.strip() == 'office_namespace_probe_passed'

    def ordinary_bwrap_blocked(self):
        result = self.command(['/usr/bin/bwrap', '--ro-bind', '/', '/', '--unshare-net', '/bin/true'], **self.probe_options)
        return result.returncode != 0

    def check_conflicts(self):
        for filename in ('bwrap', 'bwrap-userns-restrict', 'usr.bin.bwrap'):
            if os.path.lexists(self.path('/etc/apparmor.d/' + filename)):
                error('sandbox_repair_existing_bwrap_policy_preserved')
        profiles = self.path('/sys/kernel/security/apparmor/profiles').read_text()
        if any('bwrap' in line for line in profiles.splitlines()):
            error('sandbox_repair_loaded_bwrap_policy_preserved')
        destination = self.path(PROFILE_PATH)
        if os.path.lexists(destination):
            self.check_owned(destination)
        elif any(line.split(' (')[0] == PROFILE_NAME for line in profiles.splitlines()):
            error('sandbox_repair_unknown_loaded_profile_preserved')

    def check_owned(self, path, identity=None):
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != self.owner_uid or info.st_mode & 0o022 or path.read_text() != PROFILE:
            error('sandbox_repair_existing_profile_preserved')
        if identity and identity != (info.st_dev, info.st_ino):
            error('sandbox_repair_profile_changed_preserved')

    def apply(self):
        self.validate()
        self.check_conflicts()
        if self.probe():
            return {'ready': True, 'profileCreated': False, 'settingsChanged': False}
        if not self.ordinary_bwrap_blocked():
            error('sandbox_repair_unexpected_probe_difference')
        destination = self.path(PROFILE_PATH)
        directory = destination.parent
        info = directory.lstat()
        if not stat.S_ISDIR(info.st_mode) or info.st_uid != self.owner_uid or info.st_mode & 0o022:
            error('sandbox_repair_config_directory_untrusted')
        created, identity = False, None
        if not os.path.lexists(destination):
            fd = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o644)
            created = True
            st = os.fstat(fd)
            identity = (st.st_dev, st.st_ino)
            try:
                with os.fdopen(fd, 'w') as stream:
                    stream.write(PROFILE)
                    stream.flush()
                    os.fsync(stream.fileno())
            except BaseException:
                # A disk/write error cannot leave a partially managed policy behind.
                info = destination.lstat()
                if ((info.st_dev, info.st_ino) != identity or not stat.S_ISREG(info.st_mode)
                        or info.st_uid != self.owner_uid or not PROFILE.startswith(destination.read_text())):
                    error('sandbox_repair_partial_profile_changed_preserved')
                destination.unlink()
                raise
        try:
            self.check_owned(destination, identity)
            loaded = self.command(['/sbin/apparmor_parser', '-r', str(destination)])
            if loaded.returncode:
                error('sandbox_repair_profile_load_failed')
            if not self.probe(require_profile=True):
                error('sandbox_repair_probe_failed_' + self.last_probe_failure)
            if not self.ordinary_bwrap_blocked():
                error('sandbox_repair_unscoped_bwrap_changed')
            # Confirm the system-wide setting was never relaxed.
            if self.path('/proc/sys/kernel/apparmor_restrict_unprivileged_userns').read_text().strip() != '1':
                error('sandbox_repair_restriction_changed')
            return {'ready': True, 'profileCreated': created, 'settingsChanged': True,
                    'profile': PROFILE_NAME, 'globalUsernsRestriction': 1,
                    'modelStarted': False, 'fullRunnerVerified': False}
        except BaseException:
            if created:
                self.check_owned(destination, identity)
                # This profile was absent before this transaction; remove only ours.
                self.command(['/sbin/apparmor_parser', '-R', str(destination)])
                remaining = self.path('/sys/kernel/security/apparmor/profiles').read_text()
                if any(line.split(' (')[0] == PROFILE_NAME for line in remaining.splitlines()):
                    error('sandbox_repair_rollback_unconfirmed_profile_preserved')
                self.check_owned(destination, identity)
                destination.unlink()
            raise


def main():
    if sys.argv[1:] == ['--apply']:
        if os.geteuid() != 0:
            error('sandbox_repair_admin_helper_required')
        uid, gid = int(os.environ.get('SUDO_UID', '0')), int(os.environ.get('SUDO_GID', '0'))
        if uid <= 0 or pwd.getpwuid(uid).pw_gid != gid:
            error('sandbox_repair_original_user_required')
        clean = {'PATH': '/usr/bin:/bin', 'HOME': pwd.getpwuid(uid).pw_dir, 'LANG': 'C'}
        repair = Repair(probe_options={'user': uid, 'group': gid, 'extra_groups': [], 'env': clean, 'cwd': '/tmp'})
        # Serialize policy installation and rollback. No office data lock is used.
        fd = os.open('/run/lock/duckduck-office-apparmor.lock', os.O_WRONLY | os.O_CREAT | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, 'w') as lock:
            st = os.fstat(lock.fileno())
            if st.st_uid != 0 or not stat.S_ISREG(st.st_mode) or st.st_mode & 0o077:
                error('sandbox_repair_lock_untrusted')
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            result = repair.apply()
        print(json.dumps(result))
    elif not sys.argv[1:]:
        if os.geteuid() == 0:
            error('sandbox_repair_run_as_normal_user')
        repair = Repair()
        if repair.probe():
            print(json.dumps({'ready': True, 'profileCreated': False, 'settingsChanged': False, 'modelStarted': False}))
            return
        repair.validate()
        print('사무실 전용 Node의 격리 기능을 허용합니다. 전체 보안 설정은 유지합니다.', flush=True)
        result = subprocess.run(['sudo', '--', '/usr/bin/python3', str(Path(__file__).resolve()), '--apply'], check=False)
        if result.returncode:
            error('sandbox_repair_stopped_existing_state_preserved')
    else:
        error('sandbox_repair_invalid_arguments')


if __name__ == '__main__':
    try:
        main()
    except BaseException as exc:
        text = str(exc)
        print(text if text.startswith('office_') else 'office_sandbox_repair_failed_review_required', file=sys.stderr)
        raise SystemExit(1)
