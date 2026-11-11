#!/usr/bin/env bash
set -euo pipefail

# This is an isolated GitHub-hosted CI fixture, never a repair command for a PC.
[[ ${GITHUB_ACTIONS:-} == true && ${RUNNER_OS:-} == Linux && $(id -u) != 0 ]] || {
  echo 'Run only on the fresh GitHub-hosted Ubuntu CI runner.' >&2; exit 1;
}
source /etc/os-release
[[ "$ID" == ubuntu && "$VERSION_ID" == 24.04 ]] || { echo 'Ubuntu 24.04 required.' >&2; exit 1; }
[[ $(node --version) == v24.22.1 ]] || { echo 'Pinned Node version required.' >&2; exit 1; }

# GitHub's Azure mirror list can have DNS failures. Use the official Ubuntu
# HTTPS archives for this fixture only, retaining the distribution signing key.
# Do not modify the runner's saved sources or bypass signature verification.
office_apt_dir=$(mktemp -d)
chmod 0755 "$office_apt_dir"
office_apt_source="$office_apt_dir/ubuntu.sources"
cat > "$office_apt_source" <<'APT'
Types: deb
URIs: https://archive.ubuntu.com/ubuntu
Suites: noble noble-updates
Components: main universe
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: https://security.ubuntu.com/ubuntu
Suites: noble-security
Components: main universe
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
APT
chmod 0644 "$office_apt_source"
office_apt_options=(-o "Dir::Etc::sourcelist=$office_apt_source" -o 'Dir::Etc::sourceparts=-' -o 'Acquire::Retries=0' -o 'Acquire::http::Timeout=15' -o 'Acquire::https::Timeout=15')
trap 'rm -f "$office_apt_source"; rmdir "$office_apt_dir"' EXIT
timeout 90s sudo apt-get "${office_apt_options[@]}" update
timeout 60s sudo apt-get "${office_apt_options[@]}" install -y --no-install-recommends bubblewrap apparmor
rm -f "$office_apt_source"
rmdir "$office_apt_dir"
trap - EXIT
[[ $(cat /sys/module/apparmor/parameters/enabled) == Y ]] || { echo 'AppArmor kernel support is required.' >&2; exit 1; }
sudo systemctl is-active --quiet apparmor || { echo 'AppArmor must already be active.' >&2; exit 1; }
# Strengthen this throwaway VM to the user's observed restriction; never disable
# any restriction or touch a generic bwrap/system-interpreter profile.
sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=1
sysctl kernel.apparmor_restrict_unprivileged_userns kernel.apparmor_restrict_unprivileged_unconfined kernel.unprivileged_userns_clone
dpkg-query -W -f='${Package} ${Version}\n' bubblewrap apparmor
for candidate in /etc/apparmor.d/bwrap /etc/apparmor.d/bwrap-userns-restrict /etc/apparmor.d/usr.bin.bwrap /etc/apparmor.d/duckduck-office-node; do
  [[ ! -e "$candidate" && ! -L "$candidate" ]] || { echo "Existing profile preserved: $candidate" >&2; exit 1; }
done
if sudo cat /sys/kernel/security/apparmor/profiles | grep -E 'bwrap|^duckduck-office-node ' >/dev/null; then
  echo 'Existing bwrap/office profile preserved; runner differs from the Mac reproduction.' >&2; exit 1
fi

office_node=/workspace/ai-office/toolchain/node/bin/node
[[ ! -e "$office_node" && ! -L "$office_node" ]] || { echo 'Existing dedicated Node preserved.' >&2; exit 1; }
sudo install -d -o "$(id -u)" -g "$(id -g)" "$(dirname "$office_node")"
install -m 0755 "$(command -v node)" "$office_node"

diagnostics() {
  local result=$?
  if [[ $result != 0 ]]; then
    echo 'Fixture failure: policy/namespace diagnostic fields only.' >&2
    "$office_node" -e 'const fs=require("fs");let label="unavailable";try{const s=fs.readFileSync("/proc/self/attr/current","utf8").trim();label=/^(unconfined|duckduck-office-node \((unconfined|enforce|complain)\))$/.test(s)?s:"other"}catch{};console.log(JSON.stringify({officeLabel:label}))' || true
    sudo journalctl -k --since '-10min' --no-pager -o cat | python3 -c 'import sys,json; lines=[x for x in sys.stdin if "apparmor=\"DENIED\"" in x]; print(json.dumps({"usernsDenied":any("userns" in x for x in lines),"bwrapDenied":any("bwrap" in x for x in lines),"netAdminDenied":any("capname=\"net_admin\"" in x for x in lines)}))' || true
  fi
  return "$result"
}
trap diagnostics EXIT

if /usr/bin/bwrap --ro-bind / / --unshare-net /bin/true; then
  echo 'Unscoped bwrap unexpectedly succeeded; this runner does not reproduce the blocked baseline.' >&2
  exit 1
fi
python3 tools/ai-office/install/repair-sandbox.py
[[ $(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns) == 1 ]]
if /usr/bin/bwrap --ro-bind / / --unshare-net /bin/true; then
  echo 'Unscoped bwrap became enabled; refusing success.' >&2
  exit 1
fi

# Independently verify network separation from an allowed application process.
# This local fixture is not a provider request and contains no credentials.
"$office_node" <<'JS'
const assert=require('node:assert/strict'),fs=require('node:fs'),net=require('node:net'),cp=require('node:child_process');
assert.equal(fs.readFileSync('/proc/self/attr/current','utf8').trim(),'duckduck-office-node (unconfined)');
const server=net.createServer(s=>s.end());
server.listen(0,'127.0.0.1',()=>{
  const port=server.address().port;
  const child=cp.spawnSync('/usr/bin/bwrap',['--ro-bind','/','/','--unshare-net','/usr/bin/python3','-c',
    'import socket,sys\ntry:\n s=socket.create_connection(("127.0.0.1",int(sys.argv[1])),1)\nexcept OSError:\n sys.exit(0)\nelse:\n s.close();sys.exit(1)',String(port)],{encoding:'utf8',timeout:10000});
  server.close();
  assert.equal(child.status,0,'Scoped sandbox must not reach host loopback');
  console.log('PASS: scoped outer/nested/read-only probes and host loopback isolation; ordinary bwrap remains blocked.');
});
JS
