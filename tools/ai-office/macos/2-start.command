#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./macos.sh start; then
 echo "작업이 중단됐습니다. 기존 데이터와 인증은 초기화하지 않았습니다." >&2
 read -r -p "Enter를 눌러 닫으세요." _
 exit 1
fi
read -r -p "Enter를 눌러 닫으세요." _
