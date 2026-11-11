#!/usr/bin/env bash
set -euo pipefail
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
package_dir=$(cd -- "$(dirname -- "$0")" && pwd)
if [[ $(uname -s) != Darwin ]]; then echo '이 파일은 Mac 전용입니다.' >&2; exit 1; fi
if command -v tailscale >/dev/null 2>&1; then
 tailscale_cli=$(command -v tailscale)
elif [[ -x /Applications/Tailscale.app/Contents/MacOS/Tailscale ]]; then
 tailscale_cli=/Applications/Tailscale.app/Contents/MacOS/Tailscale
else
 echo '먼저 Tailscale을 설치하고 본인 계정으로 로그인해주세요.'
 echo '공식 다운로드: https://tailscale.com/download/mac'
 open 'https://tailscale.com/download/mac' >/dev/null 2>&1 || true
 exit 1
fi
ts(){ TAILSCALE_BE_CLI=1 "$tailscale_cli" "$@"; }
bash "$package_dir/macos.sh" open
umask 077
local_dir=$(mktemp -d -t office-phone)
trap 'rm -f "$local_dir/status.json" "$local_dir/serve.json" "$local_dir/version.txt"; rmdir "$local_dir"' EXIT
if ! ts version > "$local_dir/version.txt" 2>/dev/null ||
   ! ts status --json > "$local_dir/status.json" 2>/dev/null ||
   ! ts serve status --json > "$local_dir/serve.json" 2>/dev/null; then
 echo 'Tailscale 앱에서 로그인과 연결을 마친 뒤 이 파일을 다시 열어주세요. 기존 연결은 초기화하지 않았습니다.' >&2; exit 1
fi
vm=duckduck-office
transfer=$(limactl shell "$vm" mktemp -d /tmp/office-phone-XXXXXXXX)
[[ "$transfer" =~ ^/tmp/office-phone-[A-Za-z0-9]+$ ]] || exit 1
limactl copy "$package_dir/phone-config.py" "$vm:$transfer/phone-config.py"
for name in status.json serve.json version.txt; do limactl copy "$local_dir/$name" "$vm:$transfer/$name"; done
origin=$(limactl shell "$vm" python3 "$transfer/phone-config.py" prepare "$transfer/status.json" "$transfer/serve.json" "$transfer/version.txt")
[[ "$origin" =~ ^https://[a-zA-Z0-9.-]+\.ts\.net$ ]] || exit 1
echo '본인 계정으로만 접속하는 휴대폰 주소를 연결합니다.'
echo 'Tailscale이 HTTPS 허용 링크를 표시하면 해당 공식 화면에서 확인해주세요.'
if ! ts serve --bg --https=443 http://127.0.0.1:8810; then
 echo 'Tailscale의 HTTPS 허용을 마친 뒤 10번 파일을 다시 열어주세요. 사무실은 그대로 유지됩니다.' >&2; exit 1
fi
if ! ts status --json > "$local_dir/status.json" 2>/dev/null ||
   ! ts serve status --json > "$local_dir/serve.json" 2>/dev/null; then
 echo '설정 후 Tailscale 상태를 확인하지 못했습니다. 기존 사무실을 유지하며 연결 확인을 중단합니다.' >&2; exit 1
fi
for name in status.json serve.json; do limactl copy "$local_dir/$name" "$vm:$transfer/$name"; done
origin=$(limactl shell "$vm" python3 "$transfer/phone-config.py" verify "$transfer/status.json" "$transfer/serve.json" "$transfer/version.txt")
[[ "$origin" =~ ^https://[a-zA-Z0-9.-]+\.ts\.net$ ]] || exit 1
echo ''
echo '휴대폰에서 열 사무실 주소:'
printf '%s/\n' "$origin"
echo ''
echo '휴대폰 Tailscale에서 맥과 같은 계정으로 로그인하고 연결을 켜세요.'
echo '휴대폰 브라우저에서 위 주소를 열면 사무실과 전체 대화를 사용할 수 있어요.'
echo '맥은 켜두고 잠자기 상태로 두지 마세요. 사무실의 업무·로그인은 유지했습니다.'
echo '주소 설정은 끝났습니다. 실제 외부 접속은 휴대폰 Wi-Fi를 끄고 확인해주세요.'
