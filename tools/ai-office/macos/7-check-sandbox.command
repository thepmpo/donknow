#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
echo '사무실 실행 환경을 확인합니다. 설치·설정·인증은 변경하지 않습니다.'
if ! command -v limactl >/dev/null; then
  echo 'Lima를 찾지 못했습니다. 이 문구를 알려주세요.'
elif ! limactl shell duckduck-office python3 - <<'PY'
import json, pathlib, re, subprocess

def run(args):
    try:
        return subprocess.run(args, capture_output=True, text=True, timeout=15)
    except (OSError, subprocess.TimeoutExpired):
        return None

def value(path):
    try:
        return pathlib.Path(path).read_text().strip()
    except OSError:
        return 'unavailable'

release = dict(re.findall(r'^(ID|VERSION_ID)="?([^"\n]+)"?$', value('/etc/os-release'), re.M))
report = {'system': release, 'settingsChanged': False, 'modelStarted': False}
for key in ['apparmor_restrict_unprivileged_userns', 'apparmor_restrict_unprivileged_unconfined', 'unprivileged_userns_clone']:
    raw = value('/proc/sys/kernel/' + key)
    report[key] = raw if raw in ('0', '1') else 'unavailable'
report['apparmor_enabled'] = value('/sys/module/apparmor/parameters/enabled') in ('Y', '1')
report['current_process_profile'] = value('/proc/self/attr/current') if value('/proc/self/attr/current') in ('unconfined', 'unconfined\n') else 'confined_or_unavailable'
report['profile_files'] = {p: pathlib.Path(p).exists() for p in [
    '/etc/apparmor.d/bwrap', '/etc/apparmor.d/bwrap-userns-restrict',
    '/usr/share/apparmor/extra-profiles/bwrap-userns-restrict']}
versions = run(['dpkg-query', '-W', '-f=${Package} ${Version}\n', 'bubblewrap', 'apparmor', 'apparmor-profiles'])
report['packages'] = versions.stdout.strip().splitlines() if versions else []

def probe(args):
    result = run(args)
    if result is None:
        return {'status': 'unavailable_or_timeout'}
    # Only these known errors are reported; never include arbitrary command output.
    known = ['Failed RTM_NEWADDR', 'setting up uid map', 'Creating new namespace failed', 'Operation not permitted', 'Permission denied']
    return {'status': 'passed' if result.returncode == 0 else 'blocked',
            'errors': [item for item in known if item in result.stderr]}

outer = ['/usr/bin/bwrap', '--ro-bind', '/', '/', '--unshare-net']
report['outer_sandbox'] = probe(outer + ['/bin/true'])
if report['outer_sandbox']['status'] == 'passed':
    report['nested_sandbox'] = probe(outer + outer + ['/bin/true'])
else:
    report['nested_sandbox'] = {'status': 'not_run_outer_blocked'}
# No password prompt, no raw kernel logs, no credentials or user paths in output.
logs = run(['sudo', '-n', 'journalctl', '-k', '--since', '-10min', '--no-pager', '-o', 'cat'])
report['recent_apparmor_denial'] = 'unavailable'
if logs and logs.returncode == 0:
    lines = [line for line in logs.stdout.splitlines() if 'apparmor="DENIED"' in line]
    report['recent_apparmor_denial'] = {
        'user_namespace': any('userns' in line for line in lines),
        'bwrap': any('bwrap' in line for line in lines),
        'network_capability': any('capname="net_admin"' in line or 'capability=12 ' in line for line in lines),
    }
print('--- OFFICE SANDBOX CHECK ---')
print(json.dumps(report, ensure_ascii=False, indent=2))
print('--- END CHECK ---')
PY
then
  echo '기존 사무실 환경에 연결하지 못했습니다. 새로 만들거나 지우지 않았습니다.'
fi
echo '위 OFFICE SANDBOX CHECK 결과를 채팅에 보내주세요.'
read -r -p '확인한 뒤 Enter를 누르면 닫힙니다.' _ || true
