# “인수인계서 만들어줘”의 공식 처리 기준

2026-11-11 사용자 요청: 앞으로 “인수인계서”, “인수인계서 뭐 해야 해”라고 하면 방법 설명이나 빈 양식으로 끝내지 않고 **인수인계서 + 실제 작업물 + 검증 결과 + 남은 일**을 묶어 제공한다. PC에서 먼저 일하고 이후 클라우드 작업자가 이어가는 상황을 지원한다.

## AI 작업자가 해야 할 것

1. 기존 사용자 지시·승인 범위·최신 소스와 작업 상태를 읽는다. 완료/미완료/미확인을 구분한다.
2. 아래 생성기를 실행한다. 실제 검사 결과를 수집하며 실패한 검사는 실패로 남긴다.
3. 생성한 `HANDOFF.md`의 **작업자 보완 기록**을 실제 내용으로 완성한다. 목표, 결정 이유, 파일/커밋, 테스트, 예외, 막힌 이유, 다음 순서와 사용자 선택을 구체적으로 적는다. 빈 양식을 완성본으로 제출하지 않는다.
4. 내용을 보완한 뒤 `node scripts/ai-office-handoff.mjs finalize <생성한-폴더>`를 실행해 manifest SHA256과 ZIP을 갱신한다. 빈 보완 필드가 남으면 finalize는 거부한다. 문서·실제 작업물·검증 JSON/로그를 하나의 개인 전달 패키지로 묶어 다운로드 링크와 함께 전달한다. 원래 소스/DB/키/사용자 작업을 삭제하지 않는다.
5. 다음 AI가 읽어야 할 순서와 첫 실행/검사 명령을 쉬운 말로 설명한다. 이전 AI의 기억이 자동 복제된다고 설명하지 않는다.

```sh
cd /workspace/donknow
node scripts/ai-office-handoff.mjs
# 모바일 타입/공개 문서 브라우저 검사까지 가능한 환경이라면
node scripts/ai-office-handoff.mjs --full
```

Windows 패키지에는 `5-handoff.cmd`, Linux/WSL에는 `/workspace/ai-office/bin/handoff.sh`가 있다. 자동 생성만 한 상태는 `humanSummaryRequired:true`이며 AI 작업자가 반드시 보완한 뒤 최종 제출한다.

## 실제로 수집하는 파일

- `HANDOFF.md`: 이어갈 기준·복구 순서와 작업자 보완 내용
- `source.bundle`: 모든 로컬 Git ref. 새 폴더에 clone해서 확인할 수 있는 실제 Git 작업물
- `source.tar`: HEAD 소스 파일 스냅샷
- `worktree.patch`: 추적 파일의 미커밋 변경. 기존 작업 폴더에 무조건 덮지 않고 새 복구 사본에서 검사
- `untracked/`: 비밀/DB/인증/대형 파일을 제외한 미추적 소스·문서·이미지 작업물
- `office-records.json`: API가 실행 중이면 프로젝트·업무 내용/결과·직원/캐릭터 메타데이터. 권한/로그인 값 제외
- `verification.json`, `verification/*.log`: 실행 명령·시간·실제 종료 코드·출력. 실행하지 않은 실기기/계정/배포는 성공으로 적지 않음
- `excluded.json`: 제외 파일 목록. 원본은 삭제하지 않음
- `manifest.json`: 파일별 SHA256·크기와 기준 커밋

패키지는 `/workspace/ai-office/handoffs/<시각>/`와 같은 이름의 ZIP에 생성하며 Git/공개 사이트에 자동 게시하지 않는다. `.env`, 로그인 인증·토큰·암호화 키·SQLite 원본·작업 승인 권한은 기본 전달에서 제외한다. 공개 Git history에 비밀값이 있었던 저장소는 bundle 생성 전 별도 보안 검토가 필요하다. 새 설치의 키로 기존 암호화 DB를 열 수 있다고 설명하지 않는다.

## 클라우드로 옮길 때

1. PC 쪽에서 최종 작업을 저장하고 인수인계 패키지를 만든다.
2. 다음 작업자에게 패키지를 개인 전달한다. 코드가 GitHub main에 저장됐으면 저장소 링크·정확한 커밋도 함께 준다.
3. 다음 작업자는 새 사본에서 manifest/커밋/패치를 확인하고 문서와 검증 결과를 읽는다. 완료 작업을 반복하지 않는다.
4. 새 사무실을 공식 로그인으로 연결하고 프로젝트 ID/경로 차이를 대조한다. 이전 업무/승인/전송 대기 상태를 자동 재생하지 않는다.
5. 기록 기반 인계와 DB 전체 이전을 구분한다. 전체 DB 이전이 필요하면 원래 암호화 키와 검증된 백업/복원 절차를 별도로 마련하고 비밀값을 채팅/문서/Git에 넣지 않는다.

사용자 등록 캐릭터는 runtime의 새로 추가/변경된 PNG를 `office-assets/sprites/`에 수집하고 `office-assets.json`에 수집 상태를 기록한다. 삭제/누락/검사 실패는 미수집으로 남긴다. metadata만으로 이미지가 복원되지 않으므로 파일과 직원 sprite_number를 대조해 다음 설치의 충돌 없는 새 번호로 등록한다. 자동 덮어쓰기는 하지 않는다.

[Windows/Mac 설치와 캐릭터 변경](ai-office-local-install.md) · [현재 인계 문서](notion-handoff.md)

## 새 제어 모듈 인계

[업무 입력/보고서/휴대폰 제어 모듈](ai-office-control.md)의 소스·버전 해시·설치 패키지도 포함한다. control-requests의 사용자 요청·처리 기록은 개인 전달 범위에서 검토하되 control-access.key, private-access의 계정 연결과 API owner/OAuth 키는 자동 이전하지 않는다. 다음 환경에서 사용자 본인 인증으로 새로 연결한다. 실제 Windows/폰의 결과와 모의 테스트를 구분한다.

2026-11-11 추가: [사무실 채팅·내 지시](ai-office-control.md)는9번의8810 화면에서 제공한다. 기존 직원 채팅은 확인창으로 전달하며 자동 실행하지 않는다. 후속 업무는 원 보고서 digest와 parentTaskId를 기록한다. [Mac용 패키지](ai-office-macos.md)는 tools/ai-office/ai-office-macos.zip에 보관하며 요청 시 즉시 전달 가능하다. 실제 Mac 검증/기존 Windows 업무 이전은 미완료다.

최신 Windows 실행은 **0-open-office.cmd 하나**다.2번→9번 수동 시작 안내는 이전 절차다. 주 서버 자동 시작/재사용, 구버전 gateway만 UID/실행 경로/소켓/pidfd로 검증해 교체하고 최소화한다. 사무실 상단 이름·대사 확대는 초기150%,100~200% 선택·브라우저 저장이며 소스 글꼴 수정과 구분한다. [새 시작·안전 경계·검증](ai-office-control.md).

최신v2 글자 패치: 이름22px·대사24px로 이전v1의2배. 기존 장면 확대율은 유지한다.0번에서 SHA/idle 검사 후 최초 한 번 빌드한다. 원본과dist를 백업하고 실패하면 복구한다. [정확한 기준](ai-office-control.md).
