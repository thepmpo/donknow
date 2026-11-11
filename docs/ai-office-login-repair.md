# Windows 사무실 로그인 확인 오류 수정

2026-11-11. 사용자의 실제 Windows 설치에서 OpenAI 연결·실행기·격리는 준비됐으나 `office_provider_home_not_fresh`로 로그인 확인이 거부됐다.

## 지금 사용자가 할 일

1. [로그인 수정 파일 다운로드](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-login-fix.zip)
2. 압축을 풀고 **`7-fix-login.cmd`**를 실행한다. 사무실 서버 창은 켜 둔다.
3. 결과에 **`authReady: true`**가 나오면 원래 설치 폴더의 **`4-first-review.cmd`**를 실행한다.
4. 중단하거나 false가 나오면 오류 문구만 전달한다. 인증 파일·비밀번호·토큰·일회 코드를 전달하지 않는다.

이 파일은 설치/업데이트/재로그인을 하지 않는다. 기존 Windows 사무실 소스33c3587에서도 독립 실행한다. 인증 파일, DB, 키, 프로젝트 소스·검토 대상 커밋과 승인 상태를 변경하지 않으므로 서버 재시작이나 사무실 재설치는 필요 없다. 개인 PC에서 수행한 수정/실제 AI 실행 성공은 사용자 진단으로 다시 확인한다.

## 확인한 원인

공식 Codex0.167.0의 `login status` 명령을 가짜 인증 파일과 네트워크 차단 상태에서 실행해 `.codex/tmp/arg0-linux/` 및 lock/실행 shim을 생성하는 것을 재현했다. 기존 사무실은 `.codex/`에 auth.json 외 항목이 있으면 전부 거부하여, 이 정상 임시 폴더도 인증 실패로 잘못 분류했다. 사용자 계정 인증이 실제 유효하다는 뜻은 아니며 원래 진단이 토큰 검증까지 도달하지 못한 이유다.

## 수정과 보존 범위

- 독립 Python 수정기는 사무실 전용 provider-home의 `.codex/tmp`만 `state/provider-cache-backups/` 아래 고유한 백업 폴더로 이동한다. 임시 파일을 삭제하지 않는다.
- auth.json의 바이트/권한/위치, `.env`, 암호화 키, SQLite를 보존한다. 파일 내용을 출력하지 않고 이동 전후 해시 비교 결과만 내부 검사한다.
- provider-home은 사무실 상태 폴더 안이어야 하며 심볼릭 링크/범위 밖 경로는 거부한다. 알 수 없는 config.toml/다른 파일이 있으면 덮거나 지우지 않고 중단한다.
- worker에는 기존처럼 auth.json 하나만 읽기 전용 제공한다. 임시 폴더/설정/다른 프로젝트를 worker에 마운트하는 예외를 추가하지 않는다. vendor 정책과 pinned patch는 변경하지 않는다.
- 새 root CLI는 개인 로그인 완료 후 같은 정리를 수행하고, authReady가 false이면 로그인 성공처럼 반환하지 않는다. Windows 최신3-login은 기존 소스를 쓰더라도 후처리와 진단을 수행한다.

## 검증

- 실제 공식 CLI로 오류를 재현하고 가짜 인증 파일 바이트를 그대로 유지한 채 strict-auth 진단이 false→true로 바뀌는 것을 확인했다. 실제 계정/모델 호출은 수행하지 않았다.
- JavaScript/Python 회귀는 원본 인증 바이트·권한·임시 폴더 백업·재실행 멱등성·범위 밖/심볼릭 링크/알 수 없는 설정 거부를 확인한다.
- 실제 PowerShell 엔진에서 구문과 모의 WSL 호출을 확인했다. 로그인은 개인 대화형 WSL 실행을 유지하고 이후 독립 Python 수정/비밀값 없는 진단으로 이어진다.
- Windows 실기기의 실제 authReady 및 첫 모델 응답은 수정 파일 실행 후 사용자 결과로 확인해야 한다. 네트워크 도달이나 fake-auth 진단 성공을 실제 로그인 성공으로 기록하지 않는다.

[첫 실행](ai-office-ready.md) · [Windows 설치](ai-office-local-install.md) · [인수인계](ai-office-handoff.md)
