AI 사무실 — Mac용 (Intel / Apple Silicon)

이미 설치와 채팅 연결을 마쳤나요?
새 폴더에 압축을 풀고 0-open-office.command 하나를 더블클릭하세요.
다음부터도 이 파일만 열면 사무실과 전체 대화 화면을 사용할 수 있습니다.
폴더 안의 다른 파일도 함께 보관하세요.

0번은 꺼진 기존 Lima VM과 설치된 서버를 켜고, 켜진 서버는 그대로 씁니다.
매번 설치하거나 로그인·직원 연결을 반복할 필요가 없습니다.
로그인이 만료됐을 때만 공식 로그인을 다시 진행하세요.
0번은 화면 업데이트나 새로운 AI 업무를 자동 실행하지 않습니다.

0번이 새로 켠 서버는 백그라운드에서 실행됩니다. 완료 후 0번 창은 닫아도 됩니다.
기존 2번·9번 창에서 실행 중인 서버는 그대로 사용하므로 그 창은 닫지 마세요.
진행 중인 업무가 있을 때 창을 전부 닫으면 안 됩니다.
Mac을 종료하거나 잠자기로 두면 AI 업무가 계속 실행된다고 보장하지 않습니다.

처음 설치하는 경우에만:
1. https://brew.sh 에서 Homebrew를 설치합니다.
2. Mac 터미널에서 brew install lima 를 실행합니다.
   공식 안내: https://lima-vm.io/docs/installation/
3. 전체 Mac 설치 ZIP의 1-install.command를 엽니다.
4. 설치가 끝나면 2-start.command를 열고 켜둡니다.
5. 3-login.command에서 공식 ChatGPT 안내에 따라 본인 계정으로 로그인합니다.
6. 9-office-chat.command를 열어 채팅 연결을 마칩니다. 이 서버 창도 켜두세요.
7. 다음부터는 0-open-office.command 하나만 사용합니다.
전체 대화에서 요청 → 내용 확인 → 실행 순서입니다.
현재는 읽기 전용 검토·조사·제안이 가능하고 개발·배포는 잠겨 있습니다.

한 번에 열기 ZIP에는 0번과 시작에 필요한 파일만 들어 있습니다.
처음 설치할 때는 전체 Mac ZIP을 사용하세요.
전체 설치 파일: https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-macos.zip

파일 열기가 차단되면 시스템 보안을 전체 해제하지 마세요.
공식 Mac 안내: https://support.apple.com/guide/mac-help/mh40616/mac
터미널에서 bash 를 입력하고 공백을 넣은 뒤 원하는 .command 파일을 끌어놓고 Enter를 눌러도 됩니다.
파일·폴더 이름에 공백이 있어도 동작하도록 준비했습니다.

전체 Mac 설치 폴더의 추가 도구:
6-doctor.command: 준비 상태 확인
7-check-sandbox.command: 설치 중 bwrap 오류의 실행 환경만 진단
7-resume-install.command: 진단한 Ubuntu24.04 격리 오류 수정 후 기존 설치 이어하기
5-handoff.command: 인수인계 생성 (VM 안 /workspace/ai-office/handoffs)
8-characters.command: 캐릭터 설정
9-office-chat.command: 채팅 최초 설정 및 명시적 업데이트

기존 VM·데이터·로그인은 초기화하지 않습니다. 0번은 VM이 없으면 새로 만들지 않습니다.
Windows 업무·문서·로그인은 Mac에 자동 복사되지 않습니다. 이전이 필요하면 인수인계를 요청하세요.
Lima VM의 8790,8791,8810은 같은 Mac에서만 여는 주소입니다.
외부·휴대폰 연결은 이 패키지에 포함하지 않습니다.
비밀번호·토큰·로그인 코드는 채팅에 보내지 마세요.

설치·화면·로그인 단계 완료는 사용자 보고가 있습니다.
이번 0번의 실제 Mac 실행과 실모델 답변은 아직 확인 전입니다.
사용법·검증·최신 상태: https://github.com/thepmpo/donknow/blob/main/docs/ai-office-macos.md
