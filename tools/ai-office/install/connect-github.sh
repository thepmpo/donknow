#!/usr/bin/env bash
set -euo pipefail
# Run in the existing Lima/WSL guest as its owner, not in the model sandbox.
if ! command -v gh >/dev/null; then
 echo 'GitHub 공식 로그인 도구를 설치합니다. 기존 사무실과 로그인은 유지합니다.'
 sudo apt-get update
 sudo apt-get install -y gh
fi
if gh auth status --hostname github.com >/dev/null 2>&1; then
 echo '기존 GitHub 로그인을 사용합니다.'
else
 echo '공식 GitHub 화면에서 로그인하세요. 비밀번호·토큰·일회 코드는 채팅에 보내지 마세요.'
 gh auth login --hostname github.com --git-protocol https --web
fi
# Read only: do not modify global Git credential helpers or existing remotes.
if ! gh api repos/thepmpo/donknow --jq '.permissions.push' | grep -Fx true >/dev/null; then
 echo '이 계정의 donknow 저장 권한을 확인하지 못했습니다. 기존 계정 설정을 유지합니다.' >&2
 exit 1
fi
echo 'GitHub 연결을 확인했습니다. 실제 코드 반영은 사무실에서 변경과 검사 결과를 확인한 뒤 실행합니다.'
