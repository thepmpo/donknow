#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./macos.sh open; then
 echo '사무실을 여는 도중 멈췄습니다. 기존 데이터와 로그인은 초기화하지 않았습니다.' >&2
 read -r -p '위 메시지를 확인한 뒤 Enter를 누르면 닫힙니다.' _
 exit 1
fi
