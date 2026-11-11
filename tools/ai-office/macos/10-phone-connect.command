#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./connect-phone-mac.sh; then
 echo '휴대폰 연결이 아직 완료되지 않았습니다. 위 안내를 확인해주세요. 기존 사무실은 초기화하지 않았습니다.' >&2
 read -r -p 'Enter를 누르면 닫힙니다.' _
 exit 1
fi
read -r -p '휴대폰에서 주소를 연 뒤 Enter를 누르면 닫힙니다.' _
