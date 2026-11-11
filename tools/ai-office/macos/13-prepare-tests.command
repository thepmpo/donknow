#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./macos.sh validation; then
 echo '검사 도구 준비가 아직 끝나지 않았습니다. 위 안내를 확인해주세요. 기존 사무실은 유지합니다.' >&2
 read -r -p 'Enter를 누르면 닫힙니다.' _
 exit 1
fi
read -r -p 'Enter를 누르면 닫힙니다.' _
