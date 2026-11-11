#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./macos.sh development; then
 echo '개발 연결이 아직 완료되지 않았습니다. 업무 실행 중이면 완료 후 다시 열어주세요. 기존 데이터와 로그인은 유지합니다.' >&2
 read -r -p 'Enter를 누르면 닫힙니다.' _
 exit 1
fi
read -r -p '연결이 끝났습니다. Enter를 누르면 닫힙니다.' _
