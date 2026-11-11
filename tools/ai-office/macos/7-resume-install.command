#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
echo '기존 사무실 설치를 이어갑니다. 사무실 전용 실행기의 보안 규칙과 격리를 검사합니다.'
if ! bash ./macos.sh resume; then
  echo '설치가 중단됐습니다. 위 오류를 알려주세요. 기존 환경과 인증은 삭제하지 않았습니다.' >&2
  read -r -p 'Enter를 누르면 닫힙니다.' _ || true
  exit 1
fi
echo '설치가 완료됐습니다. 원래 사무실 폴더에서 2-start.command를 열어주세요.'
read -r -p 'Enter를 누르면 닫힙니다.' _ || true
