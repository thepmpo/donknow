#!/usr/bin/env bash
set -euo pipefail
# Runs inside Windows WSL2 Ubuntu or the dedicated macOS Lima Ubuntu VM.
if [[ $(uname -s) != Linux || $(id -u) == 0 ]]; then echo 'Run as your normal Ubuntu user, not root.' >&2; exit 1; fi
repo=/workspace/donknow
installer_dir=$(cd -- "$(dirname -- "$0")" && pwd)
if [[ ! -f "$repo/tools/ai-office/runtime-policy.json" ]]; then echo 'Repository missing at /workspace/donknow' >&2; exit 1; fi
if [[ ! -w /workspace ]]; then echo 'Keep existing permissions; /workspace must be writable by your Ubuntu user.' >&2; exit 1; fi
sudo apt-get update
sudo apt-get install -y ca-certificates curl git bubblewrap xz-utils python3 make g++
case $(uname -m) in x86_64) node_arch=x64;; aarch64|arm64) node_arch=arm64;; *) echo 'Unsupported CPU' >&2; exit 1;; esac
node_version=v24.22.1
toolchain=/workspace/ai-office/toolchain
mkdir -p "$toolchain"
if [[ ! -x "$toolchain/node/bin/node" ]]; then
 tmp=$(mktemp -d)
 trap 'rm -rf "$tmp"' EXIT
 name="node-$node_version-linux-$node_arch"
 curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/$node_version/$name.tar.xz" -o "$tmp/$name.tar.xz"
 curl --fail --location --proto '=https' --tlsv1.2 "https://nodejs.org/dist/$node_version/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
 (cd "$tmp"; awk -v name="$name.tar.xz" '$2==name {print}' SHASUMS256.txt > expected; test "$(wc -l < expected)" -eq 1; sha256sum -c expected)
 tar -xJf "$tmp/$name.tar.xz" -C "$tmp"
 mv "$tmp/$name" "$toolchain/node"
fi
export PATH="$toolchain/node/bin:$PATH"
[[ $(node -v) == "$node_version" ]] || { echo 'Existing Node version differs; preserved without replacement.' >&2; exit 1; }
# Ubuntu permits user namespaces per application. Probe through the exact office
# Node used by start/login/workers, never by granting generic bash/bwrap access.
python3 "$installer_dir/repair-sandbox.py"
meta="$repo/tools/ai-office/runtime-policy.json"
base=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).baseCommit' "$meta")
expected_tree=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).policyTree' "$meta")
runtime=/workspace/ai-office-runtime
if [[ ! -e "$runtime" ]]; then git clone --no-checkout https://github.com/GreenSheep01201/claw-empire "$runtime"; git -C "$runtime" checkout --detach "$base"; fi
if [[ $(git -C "$runtime" rev-parse 'HEAD^{tree}') != "$expected_tree" ]]; then
 [[ $(git -C "$runtime" rev-parse HEAD) == "$base" && -z $(git -C "$runtime" status --porcelain) ]] || { echo 'Existing runtime differs; kept unchanged.' >&2; exit 1; }
 node "$repo/scripts/apply-ai-office-policy.mjs" "$runtime"
 fresh_runtime=true
else
 [[ -z $(git -C "$runtime" diff HEAD --) ]] || { echo 'Existing runtime edits preserved; review before reinstalling.' >&2; exit 1; }
 fresh_runtime=false
fi
npm --cache "$toolchain/npm-cache" install --prefix "$toolchain/package-manager" --save-exact --ignore-scripts --no-audit --no-fund pnpm@10.30.1
pnpm="$toolchain/package-manager/node_modules/.bin/pnpm"
(cd "$runtime"; "$pnpm" install --frozen-lockfile --ignore-scripts; AI_OFFICE_POLICY_ENABLED=false AI_OFFICE_KNOWLEDGE_ENABLED=false "$pnpm" exec vitest run --config server/vitest.config.ts; "$pnpm" run build)
if [[ "$fresh_runtime" == true ]]; then
 git -C "$runtime" add -A
 [[ $(git -C "$runtime" write-tree) == "$expected_tree" ]] || { echo 'Installed source tree mismatch' >&2; exit 1; }
 git -C "$runtime" -c user.name='AI Office Local Installer' -c user.email='local-office@localhost' commit -m 'Install verified office policy locally'
fi
npm --cache "$toolchain/npm-cache" install --prefix /workspace/ai-office/provider/official-codex --save-exact --ignore-scripts --no-audit --no-fund @openai/codex@0.167.0
# Real official CLI sandbox, fixture data only; no login, model or office DB.
node "$installer_dir/verify-sandbox.mjs"
node "$repo/scripts/ai-office-local.mjs" configure
# Browser regression and source handoff helpers use the project's locked dependencies.
(cd "$repo"; npm --cache "$toolchain/npm-cache" ci --ignore-scripts --no-audit --no-fund)
node "$repo/scripts/ai-office-local.mjs" setup
echo 'Installation checked. Start in this terminal:'
echo '  /workspace/ai-office/bin/start.sh'
echo 'Then use a SECOND Ubuntu terminal for ChatGPT login:'
echo '  /workspace/ai-office/bin/login.sh'
echo 'Open on this computer: http://127.0.0.1:8790'
echo 'No provider login, model task or cloud migration has been performed.'
