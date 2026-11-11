2026-11-11 시작 간소화: 최초 설치와 로그인 후부터는 0-open-office.cmd 하나만 실행합니다. 사무실·채팅을 자동으로 켜고 최소화합니다. 기본 이름·대사 확대150%, 상단에서 조절 가능합니다.

AI 사무실 — Windows 시작 패키지

처음 한 번 준비:
1. Microsoft 공식 안내에서 WSL2 + Ubuntu를 설치합니다.
   https://learn.microsoft.com/ko-kr/windows/wsl/install
2. Ubuntu 사용자 이름과 비밀번호를 정합니다. 기존 Ubuntu는 초기화하지 마세요.

이 폴더에서 순서대로 더블클릭:
1-install.cmd       사무실 설치 + 검사. Ubuntu 비밀번호를 묻는 경우 그 창에만 입력합니다.
2-start.cmd         서버를 켜고 PC 브라우저를 엽니다. 서버 창은 열어 둡니다.
3-login.cmd         본인 ChatGPT 계정을 공식 장치 로그인으로 연결합니다.
4-first-review.cmd  실제 모델 사용량을 소비하는 읽기 전용 첫 검토 1건을 승인/실행합니다.
6-characters.cmd    주술회전 직원 캐릭터 테마를 적용합니다. AI 모델/업무 설정은 바꾸지 않습니다.
5-handoff.cmd       실제 작업물·검증 결과·인계서 초안을 묶습니다. AI 작업자의 내용 보완이 필요합니다.

로그인 코드, 토큰, 비밀번호를 채팅에 보내지 마세요.
이 패키지는 Windows 실기기 설치 완료가 아니라 설치/시작 스크립트입니다.
현재 Linux에서 구문/호출/키 보존 검증을 수행했고, 실제 Windows 로그인·AI 응답은 PC에서 확인해야 합니다.
클라우드 로그인/업무/DB를 자동으로 복원하지 않습니다.

쉬운 전체 안내:
https://github.com/thepmpo/donknow/blob/main/docs/ai-office-local-install.md
인수인계 기준:
https://github.com/thepmpo/donknow/blob/main/docs/ai-office-handoff.md
소스:
https://github.com/thepmpo/donknow/tree/main/tools/ai-office/install

로그인 후 office_provider_home_not_fresh가 나오면 7-fix-login.cmd를 실행하세요. 인증은 그대로 두고 Codex 임시 폴더만 백업합니다.
