# Mac용 AI 사무실 준비 패키지

## 2026-11-11 설치 재개 v2 — 중첩 검사 오류 수정

첫 재개 파일에서 사용자에게 `office_sandbox_repair_nested_probe_failed`가 발생했다. 검사기가 `/`를 읽기 전용으로 묶으면서 `/proc` 전용 마운트를 빠뜨린 결함을 별도 Linux에서 재현했다. 바깥 검사는 통과하지만 내부 bwrap가 uid_map을 만들지 못해 `Read-only file system`으로 실패했다. 실제 사무실 실행기는 이미 `--proc /proc`를 사용한다. 검사기도 동일하게 맞추니 중첩 실행과 읽기 전용 canary가 모두 통과했다. AppArmor 권한/전역 보안 설정을 추가로 완화한 수정이 아니다.

최신 [설치 이어하기 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-resume.zip)을 **새 폴더**에 풀고7-resume-install.command를 실행한다. 이미 설치한 Node는 재사용하며 이전 시도의 새 규칙은 실패 복구 절차를 거쳤다. 같은 이름의 다른 프로필은 여전히 보존 후 중단한다. 이제 실패하면 프로필 연결/외부 격리/중첩 격리/쓰기 차단 중 어떤 단계인지 안전한 오류 코드로 구분한다.

기존13개 모의 테스트만으로 실제 중첩 마운트 결함을 잡지 못했음을 기록한다. `OFFICE_TEST_REAL_SANDBOX=1` 회귀로 실제 bwrap를 실행하고, 공개 저장소의 별도 Ubuntu24.04 CI에서도 앱별 AppArmor 연결·중첩/읽기 전용/네트워크 차단·일반 bwrap 차단 유지를 검증하도록 추가했다. CI와 Linux 검증은 사용자 Mac arm64 설치 성공을 의미하지 않는다. Mac의 최신 파일 실행 결과는 아직 대기다.

## 2026-11-11 진단 확인 후 설치 재개

사용자 진단에서 Ubuntu24.04, AppArmor 활성화, userns 제한1, 사용자 namespace clone1, 관련 bwrap 프로필 없음, userns/bwrap/net_admin 거부가 함께 확인됐다. [설치 이어하기 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-resume.zip)을 새 폴더에 풀고 **7-resume-install.command 하나**를 실행한다. 기존 `duckduck-office` VM이 없으면 새로 만들지 않고 멈춘다. 설치에 성공하면 원래 폴더의2-start→3-login→9-office-chat 순서로 진행한다.

수정은 [Ubuntu의 앱별 namespace 허용 방식](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces)에 따라 사무실 전용 `/workspace/ai-office/toolchain/node/bin/node`에만 `duckduck-office-node` 프로필을 연결한다. 일반 bwrap/bash/시스템 Node, 전역 sysctl, 방화벽이나 macOS 보안은 변경하지 않는다. Node는 범용 실행기이므로 같은 사용자 권한으로 이 전용 Node를 호출하는 다른 코드도 해당 namespace 허용을 사용할 수 있다. 이 규칙 자체가 승인된 업무만 식별하는 것은 아니며 업무 승인·파일/네트워크 격리는 별도로 계속 적용한다.

설치기는 SHA 검증한 Node를 먼저 준비하고 그 Node에서 격리 검사를 실행한다. 같은 이름의 다른 프로필·기존 bwrap 프로필은 덮지 않는다. 새 프로필 적용/검사가 실패하면 자신이 추가한 규칙만 복구하며 기존 파일/인증/DB는 그대로 둔다. 공식 Codex를 설치한 다음 실제 CLI sandbox에서 임시 자료의 읽기 허용, 쓰기 차단, 다른 프로젝트/사무실 비밀 접근 차단, 호스트 loopback 네트워크 차단을 확인한다. 이 검사는 로그인·모델 요청·실제 업무 없이 수행한다. 이후 검사에서 실패하면 설치를 중단하며 이미 검증한 앱별 규칙이 남을 수 있다.

최신 설치기는 ZIP 안에 Linux 설치기와 검사기를 함께 넣어 기존 VM으로 전달하므로, 첫 시도에서 받은 오래된 Git checkout을 덮거나 pull하지 않아도 재개한다. AppArmor가 없거나 기존 격리가 작동하는 Linux/WSL에서는 규칙을 추가하지 않는다. 재실행이 기존 편집 소스/서버/다른 정책과 충돌하면 보존 후 중단한다. `7-check-sandbox.command`의 일반 셸 bwrap 차단은 수정 후에도 정상적으로 남을 수 있으며 전용 Node 검사 결과를 별도로 본다.

자동 회귀와 이 작업 환경에서 실제 Codex sandbox 검사를 수행했다. **사용자 Mac에서 프로필 적용·설치 완료·로그인·실모델 응답은 아직 확인 대기**다. GitHub 파일 갱신과 Render 공개 배포는 별개다.

## 2026-11-11 실제 Mac 설치 중단 — 확인 대기

사용자 Apple Silicon Mac에서 Homebrew/Lima 2.3.0, 기존 duckduck-office Ubuntu VM 생성·SSH 연결·Ubuntu 패키지 설치까지 진행했다. 이후 `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`로 linux.sh의 첫 격리 검사에서 중단했다. 이 로그로 사무실 설치·로그인·실모델 실행 완료를 주장하지 않는다.

[진단 파일 다운로드](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-check.zip)를 풀고 `7-check-sandbox.command` 하나를 실행한다. 기존 실행 중인 VM에만 접속하며 없거나 꺼져 있으면 중단한다. 배포판/보안 제한 값/관련 패키지/공식 프로필 존재/일반·중첩 bwrap 검사/최근 관련 거부 여부만 출력한다. 로그 원문·사용자 경로·키·인증/DB는 읽어 출력하지 않는다. journalctl은 `sudo -n`으로 비대화형 읽기만 시도하고 접근 불가는 미확인으로 표시한다. 설치·VM 생성/삭제·프로필 변경·모델 호출은 없다.

동일 증상은 [Ubuntu 공식 이슈2069526](https://bugs.launchpad.net/bugs/2069526)와 [opam5968의 보안 담당자 설명](https://github.com/ocaml/opam/issues/5968)에 보고돼 있다. AppArmor 사용자 namespace 제한이 유력하나 사용자 VM의 진단 결과 전에는 확정하지 않는다. 공식 `bwrap-userns-restrict`는 자식의 capability를 제한하므로 첫 검사만 복구해도 중첩 Codex sandbox가 실패할 수 있다. 전역 sysctl/AppArmor 비활성화, bwrap 무제한 프로필, 검사 제거, VM 삭제를 안내하지 않는다. 최신 upstream 프로필은 ABI 차이도 있어 그대로 설치하지 않는다.

다음 담당자는 사용자 진단 결과를 먼저 확인하고, 배포판 공식 제한 프로필 등 적용 범위를 검토한 뒤 실제 runner의 읽기 허용·쓰기 차단·네트워크 차단까지 검증한다. 첫 검사의 성공과 AI 실행 준비 완료를 구분한다. 이번 진단 도구는 모의 차단/중첩 실패/도구 없음·로그 비노출 및 bash 문법 검증을 통과했으며 사용자 Mac에서의 실행 결과는 대기다.

2026-11-11 한국 시간. 사용자 요청: 나중에 “맥용 줘”라고 하면 즉시 전달할 설치 묶음을 미리 보관한다.

[Mac ZIP 다운로드](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-macos.zip) · [패키지 안내](../tools/ai-office/macos/README-MAC.txt) · [기존 설치·구조](ai-office-local-install.md) · [사무실 채팅·내 지시](ai-office-control.md)

## 사용자가 받을 안내

1. [Homebrew](https://brew.sh)와 [Lima](https://lima-vm.io/docs/installation/)를 설치한다. Lima 설치 명령은 `brew install lima`다.
2. 압축을 풀고 `1-install.command`로 설치한다.
3. `2-start.command`를 열어 유지하고, `3-login.command`에서 본인 ChatGPT 계정으로 로그인한다.
4. `9-office-chat.command`를 열어 사무실 안의 **사무실 채팅·내 지시**를 사용한다. 이 서버 창도 유지한다.

열기 차단 시 [Apple 공식 안내](https://support.apple.com/guide/mac-help/mh40616/mac)를 따른다. 운영체제 보안을 전체 해제하지 않는다. 터미널에서 `bash ` 다음 해당 파일을 끌어놓아 직접 실행할 수도 있다. 로그인 코드·토큰·비밀번호는 채팅으로 받지 않는다.

## 구현과 보존 기준

- Intel x86_64 / Apple Silicon aarch64 Ubuntu 이미지를 나눈 기존 Lima 설치기를 사용한다. Linux bubblewrap 격리는 VM 안에서 유지한다. macOS 네이티브 bubblewrap으로 대체하지 않는다.
- 새 VM은 4 CPU, 메모리6GiB, 디스크30GiB이며 Mac 폴더 마운트를 하지 않는다.8790/8791/8810은 localhost로 전달한다. 공용 바인딩이나 외부 휴대폰 연결은 포함하지 않는다.
- 같은 이름의 기존 VM은 삭제·재생성하지 않는다. 기존 오래된 VM에8810 전달이 없으면 중단하고 별도로 확인한다. 다른 VM이나 Mac/Windows 설정을 변경하지 않는다.
- 공통 입력 모듈은 ZIP manifest SHA 검증 후 버전 디렉터리에 설치한다. 로그인 후 기존 검증된 repair-auth.py를 사용하고 인증파일을 삭제하지 않는다. 이 복구는 실행 중 인증 프로세스/잠금이 있으면 중단한다.
- 키는 VM 개인 상태에 보관하고 브라우저 연결 fragment로만 전달한다. 로그에 출력하지 않는다. 열려 있는 다른 버전/다른8810 서버는 덮거나 종료하지 않는다.
- Windows 업무/문서/인증을 자동 이전하거나 양쪽 DB를 합치지 않는다. 새 Mac 설치는 별도 사무실이다. 기존 작업을 이어가려면 먼저 [인수인계](ai-office-handoff.md)와 안전한 이전 절차가 필요하다. 인증 파일을 ZIP에 넣지 않는다.
- ZIP은 `node scripts/build-ai-office-control.mjs`로 공통 코드와 함께 갱신한다. macos/ 안의 .sh/.py/ZIP/version은 생성 복사본이고 원본은 install/ 및 control/이다. .command와 README는 수동 관리한다.

## 검증과 남은 확인

bash 구문, 공백이 있는 폴더의 모의 Lima copy/shell·브라우저 열기·로그인/doctor 경로, 키 비출력, ZIP 실행 권한을 자동 검사한다. 공통 채팅·권한 경계는 별도 Node/HTTP/SQLite 및 모바일 크기 모의 브라우저 테스트를 통과한다.

실제 Mac·Lima·가상화·Ubuntu 다운로드·호스트 포트 전달·공식 기기 로그인·실모델 응답은 확인하지 않았다. 패키지 준비/모의 검증을 실기기 설치 성공으로 보고하면 안 된다. 사용자 Mac에서 해당 순서로 확인한 결과를 이 문서와 일일 기록에 추가한다.
