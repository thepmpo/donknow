#!/usr/bin/env bash
set -euo pipefail
# Linux sandbox is retained in a dedicated VM on both Intel and Apple Silicon Macs.
action=${1:-install}
if [[ $(uname -s) != Darwin ]]; then echo 'This launcher is for macOS.' >&2; exit 1; fi
if ! command -v limactl >/dev/null; then
 echo 'Install Lima first: brew install lima (https://lima-vm.io/docs/installation/)'; exit 1
fi
vm=duckduck-office
if [[ "$action" == install ]]; then
 if ! limactl list --format '{{.Name}}' | grep -Fx "$vm" >/dev/null 2>&1; then
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
  - guestPort: 8791
    hostPort: 8791
    hostIP: 127.0.0.1
YAML
  limactl start --name "$vm" "$config"
 else limactl start "$vm"; fi
 limactl shell "$vm" bash -lc 'set -euo pipefail; if ! test -d /workspace; then sudo install -d -o "$(id -u)" -g "$(id -g)" /workspace; fi; test -w /workspace; sudo apt-get update; sudo apt-get install -y git ca-certificates; if ! test -e /workspace/donknow; then git clone https://github.com/thepmpo/donknow /workspace/donknow; fi; bash /workspace/donknow/tools/ai-office/install/linux.sh'
else
 case "$action" in
 initialize) limactl shell "$vm" bash -lc 'export PATH="/workspace/ai-office/toolchain/node/bin:$PATH"; cd /workspace/donknow; node scripts/ai-office-local.mjs initialize && node scripts/ai-office-ready.mjs prepare';;
 start|login|review|doctor|handoff|characters) limactl shell "$vm" "/workspace/ai-office/bin/$action.sh";;
 *) echo 'Actions: install start initialize login review doctor handoff characters' >&2; exit 1;;
 esac
fi
