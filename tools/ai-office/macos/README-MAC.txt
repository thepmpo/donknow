AI 사무실 — Mac용 준비 패키지 (Intel / Apple Silicon)

현재 Windows 사무실과 별도로 새 사무실을 설치합니다.
Windows 업무·문서·로그인은 자동 복사되지 않습니다. 기존 Windows 데이터는 그대로 둡니다.
이전이 필요하면 먼저 인수인계와 백업을 요청하세요. 인증 파일을 직접 복사하지 마세요.

1. https://brew.sh 에서 Homebrew를 설치합니다.
2. Mac 터미널에서 brew install lima 를 실행합니다.
   공식 안내: https://lima-vm.io/docs/installation/
3. 압축을 푼 폴더에서 1-install.command를 엽니다.
4. 설치가 끝나면 2-start.command를 열고 켜둡니다.
5. 3-login.command를 열고 공식 ChatGPT 안내에 따라 본인 계정으로 로그인합니다.
6. 9-office-chat.command를 열어 사무실과 채팅·내 지시를 사용합니다.
   이 입력 서버 창도 켜두세요. 요청 → 내용 확인 → 실행 순서입니다.
   현재는 읽기 전용 검토·조사·제안만 가능하고 개발·배포는 잠겨 있습니다.

파일 열기가 차단되면 시스템 보안을 전체 해제하지 마세요.
공식 Mac 안내: https://support.apple.com/guide/mac-help/mh40616/mac
직접 터미널에서 bash 를 입력하고 공백을 넣은 뒤 원하는 .command 파일을 끌어놓고 Enter를 눌러도 됩니다.
파일·폴더 이름에 공백이 있어도 동작하도록 준비했습니다.

6-doctor.command: 준비 상태 확인
7-check-sandbox.command: 설치 중 bwrap 오류가 나면 실행 환경만 진단. 설정·인증 변경 없음.
5-handoff.command: 인수인계 생성 (VM 안 /workspace/ai-office/handoffs)
8-characters.command: 캐릭터 설정

Lima 전용 Ubuntu VM: duckduck-office / 4 CPU / 메모리 6GiB / 디스크 30GiB
Mac 폴더를 VM에 마운트하지 않습니다. 8790,8791,8810은 Mac localhost 전용입니다.
기존 같은 이름 VM은 삭제·초기화하지 않습니다. 오래된 VM은 8810 전달 여부를 별도로 확인해야 합니다.
외부·휴대폰 연결은 이 패키지에 포함하지 않습니다. Mac 설치와 별도입니다.
설치에 인터넷과 최초 Ubuntu 패키지 설치 권한이 필요합니다. VM/앱을 닫거나 Mac이 절전이면 업무가 중단됩니다.
비밀번호·토큰·로그인 코드는 채팅에 보내지 마세요.

검증: bash 구문, 모의 Lima 경로·인수 전달, 아카이브 실행 권한, 공통 입력 모듈 자동 테스트.
미확인: 실제 Mac/가상화/포트 전달/기기 로그인/실모델 응답. 실기기 통과로 주장하지 않습니다.
https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md
