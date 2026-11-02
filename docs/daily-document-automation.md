# 매일 저녁 7시 문서 자동 정리

사용자 요청: 매일 한국 시간 19:00에 당일 작업을 HTML에 기록한다.

## 동작

`.github/workflows/daily-project-document.yml`이 UTC 10:00 (한국 시간 19:00)에 예약된다. GitHub 예약 실행은 지연되거나 서비스 상황에 따라 누락될 수 있어 정확한 정각 실행을 보장하지 않는다. Actions의 `Daily project document (19 KST)`에서 수동 실행도 가능하다.

1. 마지막 처리 커밋 이후 GitHub main에 저장된 변경을 집계한다. 최초 실행은 한국 시간 당일 00:00 이후 커밋을 대상으로 한다.
2. `docs/daily-updates.md`에 날짜·실제 정리 시간·커밋 링크와 제목을 기록한다. 같은 날 재실행하면 이전 항목을 유지하고 중복을 제거한다. 19시 이후 저장된 변경도 다음 실행에서 이어서 포함한다.
3. `docs/change-log.md`의 수동 설명과 함께 `scripts/build-handoff.py`로 단일 HTML 본문·목차·이미지를 다시 생성하고 GitHub에 커밋한다.
4. `RENDER_DEPLOY_HOOK` secret이 있으면 기존 duckduck-test Render 서비스 배포를 요청한다. 현재 구조에서는 문서와 웹 앱이 같은 서비스에 있어 그 시점 main의 앱 코드도 함께 배포된다. 유료 플랜을 추가하거나 TestFlight를 자동 제출하지 않는다.

자동 수집에는 이 대화·기기·개인 계정·미저장 작업 접근이 없다. 자연어 커밋 제목으로 테스트/심사/공개 성공을 추정하지 않는다. 개발자는 수정 시 `docs/change-log.md`에 사람이 읽는 변경 이유·검증·실제 배포 상태를 남긴다.

## 공개 페이지 자동 반영에 필요한 한 번의 설정

1. [Render 서비스 설정](https://dashboard.render.com/web/srv-dbgpc0ff3r2c73abc7e0/settings)의 Deploy Hook URL을 복사한다.
2. [GitHub Repository secrets](https://github.com/sjfieni/donknow/settings/secrets/actions/new)에 `RENDER_DEPLOY_HOOK`라는 이름으로 등록한다. URL에 비밀값이 포함되므로 채팅이나 문서에는 쓰지 않는다.
3. [문서 자동화 실행](https://github.com/sjfieni/donknow/actions/workflows/daily-project-document.yml)에서 Run workflow → main → Run workflow로 확인한다.
4. GitHub 실행 녹색만으로 Render Live까지 확인했다고 말하지 않는다. 배포 완료 후 `/project`에서 문서 갱신 날짜와 실제 당일 기록을 확인한다.

secret이 없으면 GitHub 문서는 갱신하지만 공개 페이지 배포 요청은 생략하고 경고를 남긴다. Render의 기존 일반 autoDeploy는 false로 유지한다. GitHub Actions에서 저장소 쓰기가 거부되면 워크플로/브랜치 정책을 확인하며 강제 푸시로 우회하지 않는다.

## 검증 상태

임시 Git 저장소로 재실행 중복 방지·앞선 항목 보존·자동 생성 커밋 제외·늦은 작업 포함을 검증했다. 로컬 브라우저로 새 문서 순서·펼치기·35개 이미지·댓글 저장/소유권·320px/데스크톱 레이아웃을 확인했다. 실제 GitHub 예약 실행 및 Render hook 연결은 사용자 설정/실행 결과 확인 전이다.
