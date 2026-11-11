#!/usr/bin/env bash
set -euo pipefail
# Linux sandbox is retained in a dedicated VM on both Intel and Apple Silicon Macs.
action=${1:-install}
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
if [[ $(uname -s) != Darwin ]]; then echo 'This launcher is for macOS.' >&2; exit 1; fi
if ! command -v limactl >/dev/null; then
 echo 'Install Lima first: brew install lima (https://lima-vm.io/docs/installation/)'; exit 1
fi
vm=duckduck-office
if [[ "$action" == install || "$action" == resume ]]; then
 if ! limactl list --format '{{.Name}}' | grep -Fx "$vm" >/dev/null 2>&1; then
  if [[ "$action" == resume ]]; then echo '기존 사무실 VM을 찾지 못했습니다. 새로 만들거나 지우지 않았습니다.' >&2; exit 1; fi
  config_dir=$(mktemp -d -t duckduck-office)
  config="$config_dir/office.yaml"
  trap 'rm -f "$config"; rmdir "$config_dir"' EXIT
  cat > "$config" <<'YAML'
images:
  - location: https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img
    arch: x86_64
  - location: https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-arm64.img
    arch: aarch64
cpus: 4
memory: 6GiB
disk: 30GiB
mounts: []
portForwards:
  - guestPort: 8790
    hostPort: 8790
    hostIP: 127.0.0.1
  - guestPort: 8810
    hostPort: 8810
    hostIP: 127.0.0.1
  - guestPort: 8791
    hostPort: 8791
    hostIP: 127.0.0.1
YAML
  limactl start --name "$vm" "$config"
 else limactl start "$vm"; fi
 limactl shell "$vm" bash -lc 'set -euo pipefail; if ! test -d /workspace; then sudo install -d -o "$(id -u)" -g "$(id -g)" /workspace; fi; test -w /workspace; sudo apt-get update; sudo apt-get install -y git ca-certificates; if ! test -e /workspace/donknow; then git clone https://github.com/thepmpo/donknow /workspace/donknow; fi'
 # Ship the reviewed installer alongside the package. Existing checkout/auth/data
 # remain unchanged even when the first attempt cloned an older main.
 transfer=$(limactl shell "$vm" mktemp -d /tmp/office-install-XXXXXXXX)
 [[ "$transfer" =~ ^/tmp/office-install-[A-Za-z0-9]+$ ]] || exit 1
 for name in linux.sh repair-sandbox.py verify-sandbox.mjs; do
  limactl copy "$package_dir/$name" "$vm:$transfer/$name"
 done
 limactl shell "$vm" bash "$transfer/linux.sh"
else
 case "$action" in
 initialize) limactl shell "$vm" bash -lc 'export PATH="/workspace/ai-office/toolchain/node/bin:$PATH"; cd /workspace/donknow; node scripts/ai-office-local.mjs initialize && node scripts/ai-office-ready.mjs prepare';;
 input)
  curl --fail --silent --max-time 3 http://127.0.0.1:8790/health | grep -q 'Claw-Empire' || { echo '먼저 2-start.command로 사무실을 켜주세요.' >&2; exit 1; }
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-control-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-control-[A-Za-z0-9]+$ ]] || exit 1
  limactl copy "$package_dir/install-control.py" "$vm:$transfer/install-control.py"
  limactl copy "$package_dir/control-payload.zip" "$vm:$transfer/control-payload.zip"
  limactl copy "$package_dir/update-readability.py" "$vm:$transfer/update-readability.py"
  limactl copy "$package_dir/readability.json" "$vm:$transfer/readability.json"
  limactl shell "$vm" python3 "$transfer/update-readability.py" "$transfer/readability.json"
  limactl shell "$vm" python3 "$transfer/install-control.py" "$transfer/control-payload.zip"
  open_input(){
   access=$(limactl shell "$vm" cat /workspace/ai-office/state/control-access.key)
   [[ "$access" =~ ^[a-f0-9]{64}$ ]] || { echo '사무실 연결 키를 확인하지 못했습니다.' >&2; return 1; }
   open "http://127.0.0.1:8810/#access=$access"
   unset access
  }
  expected=$(cat "$package_dir/control-version.txt")
  if health=$(curl --fail --silent --max-time 2 http://127.0.0.1:8810/health); then
   [[ "$health" == *'"app":"AI-Office-Control"'* && "$health" == *"$expected"* ]] || { echo '8810 포트의 기존 서버를 보존했습니다. 이전 입력 서버 창만 종료한 뒤 다시 실행하세요.' >&2; exit 1; }
   open_input
  else
   (for attempt in {1..30}; do
     if health=$(curl --fail --silent --max-time 2 http://127.0.0.1:8810/health) && [[ "$health" == *'"app":"AI-Office-Control"'* && "$health" == *"$expected"* ]]; then open_input; exit; fi
     sleep 1
    done; echo '입력 서버 접속을 확인하지 못했습니다. 기존 VM 설정을 지우지 말고 진단을 요청하세요.' >&2) &
   browser_pid=$!
   trap 'kill "$browser_pid" 2>/dev/null || true' EXIT
   limactl shell "$vm" /workspace/ai-office/bin/control.sh
  fi;;
 login)
  limactl shell "$vm" /workspace/ai-office/bin/login.sh
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-login-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-login-[A-Za-z0-9]+$ ]] || exit 1
  limactl copy "$package_dir/repair-auth.py" "$vm:$transfer/repair-auth.py"
  limactl shell "$vm" python3 "$transfer/repair-auth.py"
  limactl shell "$vm" /workspace/ai-office/bin/doctor.sh;;
 start|review|doctor|handoff|characters) limactl shell "$vm" "/workspace/ai-office/bin/$action.sh";;
 *) echo 'Actions: install resume start initialize login review doctor handoff characters input' >&2; exit 1;;
 esac
fi
