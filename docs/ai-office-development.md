# 사무실에서 코드 수정과 배포까지 진행하기

2026-11-11 사용자 요청: 휴대폰에서 사무실을 사용하고, 검토에 이어 실제 코드 수정과 배포도 연결한다. 기존 전역 개발 잠금은 유지하면서 사용자가 확인한 개별 개발 작업을 실행하는 경로를 추가했다. 설치 자체가 모델 실행·GitHub 반영·배포 승인은 아니다.

## 쉬운 사용 순서

1. [Mac 개발 연결 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-development.zip)을 새 폴더에 풀고, 실행 중인 업무가 끝나면 **11-enable-development.command**를 연다. 기존 설치·인증·업무를 초기화하지 않는다.
2. **12-connect-github.command**에서 본인 GitHub 계정을 공식 화면으로 연결한다. 기존 로그인을 재사용하며 개인 토큰을 채팅으로 요구하지 않는다.
3. 11번은 필요한 검사 도구도 이어서 준비한다. 다운로드 단계가 중단되면 **13-prepare-tests.command**로 재개한다. 설치된 버전이 있으면 재사용한다. 평소에는 **0-open-office.command**로 연다.
4. 사무실의 **전체 대화 → 코드 수정 → 최신 코드 확인**에서 기준과 변경을 확인하고 **최신 코드 받기**를 실행한다. 현재 승인 대기나 보존할 미완료 변경이 있으면 갱신하지 않는다.
5. 수정할 내용을 적고 범위를 확인해 실행한다. AI는 전용 작업 사본만 수정한다. 원본·인증·DB에 자유롭게 쓰는 권한은 주지 않는다.
6. **코드 결과**에서 변경 내용과 실제 자동 검사 결과를 확인한다. 성공한 변경에만 **GitHub 반영**을 누른다. 이후 별도로 **운영 사이트 배포**를 확인한다.

Windows는 [최신 제어 패키지](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-control.zip)의 같은 번호 `.cmd` 파일을 사용한다. [휴대폰 연결](ai-office-phone.md)은 동일한 사무실 화면을 열며 코드 실행 권한을 별도로 우회하지 않는다.

## 현재 연결 범위와 남은 계정 단계

- 코드 수정은 등록된 프로젝트의 수동 배정된 Codex 직원과 승인된 인계서·문서·기준 커밋을 사용한다. 전역 workers/development 설정은 계속 false다. 승인된 단일 작업만 시작하며 임의 위임/자동 병합/추가 업무를 열지 않는다.
- 자동 반영·배포 대상은 `thepmpo/donknow`와 기존 Render 무료 서비스다. 다른 프로젝트의 저장소/검사/배포 대상은 아직 연결하지 않았다. DAYWIT 주소도 아직 제공되지 않았다.
- GitHub 저장에는 해당 Mac/WSL 사무실의 본인 GitHub 로그인과 저장소 쓰기 권한이 필요하다. 현재 ChatGPT 플랫폼의 GitHub 인증을 사용자 Mac으로 복사하지 않는다.
- Render 배포에는 저장소 Actions의 `RENDER_API_KEY` 비밀 설정이 필요하다. [Render 공식 API 안내](https://render.com/docs/api)와 [GitHub 비밀 설정](https://github.com/thepmpo/donknow/settings/secrets/actions)을 사용한다. 비밀 값은 채팅·문서·Git에 넣지 않는다. 연결이 없으면 배포를 멈추고 화면에 필요한 단계를 표시한다.
- `mobile/` 변경의 main 반영은 기존 TestFlight 자동화를 시작할 수 있음을 확인창에 표시한다. Render 요청 접수, Live 확인, TestFlight와 Apple 처리는 별도 상태다.

## 구현 계약

`development.mjs`는 프로젝트·담당자·제목/요청·소스 HEAD·공통 문서 revision·HANDOFF 해시를 작업별로 고정한다. 10분 내 정확한 digest와 명시적 확인으로 prepare/approve/scoped unlock/run을 수행하고 마지막에 잠근다. runtime의 `development-unlock`은 운영자 인증, approved 상태, 정확한 digest, 준비된 공급자/격리를 검사한다. 한 작업이 권한을 선점하면 재사용하지 못하며 글로벌 잠금은 해제하지 않는다. 실제 Codex 개발 격리에는 사무실 전용 Node를 읽기 전용으로 제공한다.

`최신 코드 받기`는 읽기 전용 미리보기와 정확한 기준/원격 HEAD/digest 확인을 분리한다. 실행 중 업무·승인 대기·원본 수정·미반영 작업 사본·divergence가 있으면 보존한다. 고정 GitHub 주소에서 fetch하고 fast-forward만 허용하며 reset/rebase/force push를 하지 않는다. 기존 origin과 `DISABLED_PENDING_APPROVAL` push URL을 바꾸지 않는다. 등록 metadata는 백업 후 `originalSource`를 보존하고 `source=isolatedSource`로 문서 기준을 맞춘다. 검토한 공통 문서 발행 모듈로 그 소스의 실제 revision을 만들며 기존 watcher도 같은 사본을 보게 한다. 새 프로젝트 등록도 같은 기준을 사용한다.

개발 결과는 review 상태, consumed 개발 권한, 실제 결과, source/worktree 관계와 HEAD가 일치해야 후보가 된다. 변경 파일·모드·해시·전체 patch를 확인하며 민감 파일·심볼릭 링크·지나치게 큰 변경을 거부한다. 모델의 “테스트 통과”라는 문장만으로 GitHub 반영을 열지 않는다.

`release-validation.mjs`는 승인한 HEAD의 Git blob과 정확한 patch로 별도 검사 사본을 만든다. 원본과 승인 작업 사본은 검사 중 수정하지 않는다. Linux 격리에서 네트워크·호스트 인증·다른 프로젝트를 차단하고 OS/Node/검증된 의존성은 읽기 전용, 임시 검사 사본만 쓰기 가능하게 한다. 같은 lockfile의 의존성과 브라우저가 없으면 통과로 대신하지 않고 준비 필요로 표시한다.

`releases.mjs`는 성공한 검사와 전체 diff에 대한 사용자 확인을 요구한다. 검사 후 후보/기준/원격 main이 바뀌면 중단한다. 별도 Git index와 commit-tree를 쓰고 프로젝트 hooks/filters를 실행하지 않으며 일반 push만 한다. 반영 결과가 불명확하면 자동 재전송하지 않는다. 게시 후에도 로컬 원본 사본과 작업 사본은 그대로 유지한다. 다음 작업 전 별도의 최신 코드 받기로 갱신한다. 게시된 과거 작업 사본은 승인된 patch/파일 해시/작업·문맥·기준·경로와 정확히 일치하고 게시 커밋이 원격 main 이력에 있을 때만 보존한 채 동기화를 허용한다. 추가 수정은 미완료 작업으로 보고 중단한다.

`office-render-deploy.yml`은 수동 dispatch로 받은 정확한 main SHA를 검사한다. 검사 job과 Render 비밀을 사용하는 job을 분리하며 비밀 job에서는 프로젝트 코드를 checkout하거나 실행하지 않는다. 배포 직전 GitHub main과 기존 Render 서비스의 저장소·branch·free plan을 확인한 뒤 해당 commitId로 한 번 요청한다. 환경 변수·데이터·자동 배포·플랜을 변경하지 않는다. 동일 배포의 Live와 commit을 확인하며 결과 불명확 시 POST를 재시도하지 않는다.

## 업데이트와 복구

11번은 runtime의 정확한 두 파일 해시와 유휴 상태를 먼저 확인한다. 운영자 실행 잠금 → 검증한 채팅 서버 종료 → 검증한 메인 supervisor 종료 → backend 검사/롤백 가능한 적용 → UI 검사/적용 → 제어 모듈 설치 순서다. 다른 프로그램·실행 중 업무·승인된 작업·알 수 없는 수정은 보존하고 중단한다. PIDFD로 정확한 프로세스만 SIGTERM하며 강제 종료는 없다. 실패하면 보존한 서버를 다시 시작하려고 시도한다. 전역 보안 규칙/인증/DB를 초기화하지 않는다.

개발 파일 백업은 `state/development-backups`, UI 백업은 `state/ui-backups`, 시작/업데이트 로그는 `state/launcher`에 개인 권한으로 보관한다. 로그 원문에 민감한 상태가 있을 수 있으므로 자동으로 공개하지 않는다. 새 실행은 0번 시작과 같은 잠금을 사용한다.

## 검증 기록

검증: runtime API262개, 기존 웹76개, 개발 제어25개, 업데이트11개, 검사 도구 준비8개를 통과했다. Python 전체99개 중98개 통과·선택적 기존 bwrap1개 미실행. 전체 Node160개 중159개 통과·선택적 실제 릴리스 격리1개는 별도 실행해 통과했다. 배포 ZIP9개의 CRC·내용·Mac 실행 권한·제어 모듈 해시와 기존 복구 bundle 불변을 확인했다. 실제 릴리스 격리 검사는 도구 내부의 중첩 uid-map 제한 오류를 확인한 뒤 승인된 호스트 경로에서 같은 임시 fixture로 통과했다. 호스트 비밀/loopback 접근 차단·원본 작업 사본 불변을 확인했다. 타입·Vite 빌드, HTTP 인증/CSRF, 데스크톱·390px 모바일 코드 흐름, 기존 채팅·팀장회의 회귀, YAML·배포 Python·PowerShell·bash 문법도 통과했다. 모든 모델/GitHub push/Render 버튼은 테스트에서는 fixture이며 실제 사용자 계정에 실행하지 않았다. 사용자 Mac/Windows의 최신 업데이트·실제 모델 코드 변경·GitHub 반영·실제 Render 배포는 이번 작업 환경의 모의 검사로 성공 처리하지 않는다. 휴대폰 연결 패키지는 별도 커밋으로 main에 저장했으며 실제 외부 폰 접속은 사용자 확인 대기다.

공개 `/project` HTML과 생성 소스도 갱신했다. 현재 환경에서 운영 페이지 읽기는 프록시 `Tunnel connection failed: 403 Forbidden`으로 확인하지 못했다. Render 자동 배포를 켜거나 실제 배포 요청을 보내지 않았으므로 새 문서의 공개 반영은 미확인이다. 최신 안내는 GitHub 문서를 사용한다.

[Mac 시작](ai-office-macos.md) · [휴대폰](ai-office-phone.md) · [승인 경계](ai-office-approval-gate.md) · [전체 인계](notion-handoff.md) · [GitHub 배포 실행 결과](https://github.com/thepmpo/donknow/actions/workflows/office-render-deploy.yml)
