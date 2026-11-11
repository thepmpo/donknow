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
 development)
  bash "$0" open
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-development-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-development-[A-Za-z0-9]+$ ]] || exit 1
  for name in enable-development.py update-development.py development-runtime.json restart-main.py restart-control.py start-services.py update-readability.py readability.json install-control.py control-payload.zip prepare-validation.mjs; do
   limactl copy "$package_dir/$name" "$vm:$transfer/$name"
  done
  echo '코드 수정과 검증 기능을 연결합니다. 업무가 실행 중이면 변경하지 않고 기다립니다.'
  limactl shell "$vm" python3 "$transfer/enable-development.py"
  echo '자동 검사 도구를 준비합니다. 첫 다운로드가 끝날 때까지 기다려주세요.'
  if ! limactl shell "$vm" /workspace/ai-office/toolchain/node/bin/node "$transfer/prepare-validation.mjs"; then
   echo '코드 수정 연결은 적용됐지만 검사 도구 준비가 중단됐습니다. 13-prepare-tests.command로 이어서 준비해주세요.' >&2; exit 1
  fi
  bash "$0" open;;
 github)
  bash "$0" open
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-github-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-github-[A-Za-z0-9]+$ ]] || exit 1
  limactl copy "$package_dir/connect-github.sh" "$vm:$transfer/connect-github.sh"
  limactl shell "$vm" bash "$transfer/connect-github.sh";;
 validation)
  bash "$0" open
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-validation-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-validation-[A-Za-z0-9]+$ ]] || exit 1
  limactl copy "$package_dir/prepare-validation.mjs" "$vm:$transfer/prepare-validation.mjs"
  limactl shell "$vm" /workspace/ai-office/toolchain/node/bin/node "$transfer/prepare-validation.mjs";;
 open)
  if ! limactl list --format '{{.Name}}' | grep -Fx "$vm" >/dev/null; then
   echo '설치된 사무실을 찾지 못했습니다. 기존 환경을 지우거나 새로 만들지 않았습니다.' >&2; exit 1
  fi
  status=$(limactl list "$vm" --format '{{.Status}}')
  case "$status" in
   Running) ;;
   Stopped) echo '사무실을 켜고 있어요. 잠시 기다려주세요.'; limactl start "$vm";;
   *) echo '사무실 환경 상태를 확인하지 못했습니다. 기존 환경은 유지합니다.' >&2; exit 1;;
  esac
  transfer=$(limactl shell "$vm" mktemp -d /tmp/office-open-XXXXXXXX)
  [[ "$transfer" =~ ^/tmp/office-open-[A-Za-z0-9]+$ ]] || exit 1
  limactl copy "$package_dir/start-services.py" "$vm:$transfer/start-services.py"
  echo '사무실과 채팅을 여는 중입니다. 이미 켜져 있으면 그대로 사용합니다.'
  limactl shell "$vm" python3 "$transfer/start-services.py"
  # Guest readiness does not guarantee Mac port forwarding is ready yet.
  forwarded=false
  for attempt in {1..30}; do
   if main_health=$(curl --fail --silent --max-time 2 http://127.0.0.1:8790/health) &&
      chat_health=$(curl --fail --silent --max-time 2 http://127.0.0.1:8810/health); then
    if ! printf '%s' "$main_health" | grep -Eq '"app"[[:space:]]*:[[:space:]]*"Claw-Empire"' ||
       ! printf '%s' "$chat_health" | grep -Eq '"app"[[:space:]]*:[[:space:]]*"AI-Office-Control"'; then
     echo '같은 주소에서 다른 프로그램이 확인되어 보존 후 중단했습니다.' >&2; exit 1
    fi
    forwarded=true; break
   fi
   sleep 1
  done
  if [[ "$forwarded" != true ]]; then
   echo '사무실은 실행했지만 Mac 화면 연결을 확인하지 못했습니다. 환경을 지우지 말고 이 메시지를 알려주세요.' >&2; exit 1
  fi
  access=$(limactl shell "$vm" cat /workspace/ai-office/state/control-access.key)
  [[ "$access" =~ ^[a-f0-9]{64}$ ]] || { echo '사무실 연결 키를 확인하지 못했습니다.' >&2; exit 1; }
  if ! open "http://127.0.0.1:8810/#access=$access" >/dev/null 2>&1; then
   unset access
   echo '사무실은 켜졌지만 브라우저를 열지 못했습니다. 기본 브라우저를 확인한 뒤 0번을 다시 열어주세요.' >&2; exit 1
  fi
  unset access
  echo '사무실을 열었어요. 다음에도 0-open-office.command 하나만 여세요.'
  echo '이번에 새로 켠 서버는 이 창을 닫아도 유지됩니다. 기존 서버 창은 실행 중인 업무가 끝날 때까지 그대로 두세요.';;
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
 *) echo 'Actions: open development github validation install resume start initialize login review doctor handoff characters input' >&2; exit 1;;
 esac
fi
