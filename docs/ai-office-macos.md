# Mac용 AI 사무실 준비 패키지

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
