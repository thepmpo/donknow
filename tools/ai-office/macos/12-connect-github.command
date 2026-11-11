#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if ! bash ./macos.sh github; then
 echo 'GitHub 연결을 확인하지 못했습니다. 기존 계정과 사무실을 초기화하지 않았습니다.' >&2
 read -r -p 'Enter를 누르면 닫힙니다.' _
 exit 1
fi
read -r -p 'Enter를 누르면 닫힙니다.' _
