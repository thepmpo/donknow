# 맥 사무실을 휴대폰에서 열기

**2026-11-12 사용자 확인:** Tailscale Serve 허용 완료 화면을 제공했고, 이어서 휴대폰에서 사무실이 열린다고 확인했다. 모바일에서 작게 보인다는 피드백도 받았다. Wi-Fi를 끈 외부 모바일 데이터 접속, 다른 컴퓨터 접속, 11번 개발 업데이트·12번 GitHub 로그인·실제 코드 게시/배포 성공은 아직 별도 확인이다. 다음의 이전 미확인 기록은 당시 기준이다. 평소에는 Mac 0번 시작과 양쪽 Tailscale 연결을 유지하고 휴대폰 홈 화면에 추가한 같은 주소를 연다. 원래 Mac이 꺼지거나 잠들면 접속할 수 없다.

2026-11-11. 사용자가 휴대폰 연결을 요청했다. 이미 실행한 Mac 사무실의 업무·로그인·직원 설정을 보존하고 같은 화면에 비공개로 접속한다. 새 사무실이나 클라우드 복사본을 만들지 않는다.

## 사용자가 할 일

1. 맥에는 [Tailscale 공식 Mac 앱](https://tailscale.com/download/mac), 휴대폰에는 [아이폰 앱](https://tailscale.com/download/ios) 또는 [안드로이드 앱](https://tailscale.com/download/android)을 설치한다. 두 기기에서 **같은 계정**으로 로그인하고 연결을 켠다. Mac에 기존 앱이 있으면 재사용하며 Standalone/App Store 버전을 동시에 설치하지 않는다.
2. [맥 휴대폰 연결 ZIP](https://github.com/thepmpo/donknow/raw/refs/heads/main/tools/ai-office/ai-office-mac-phone.zip)을 새 폴더에 풀고 **10-phone-connect.command**를 연다. 기존 사무실은 시작하거나 재사용한다.
3. Tailscale이 HTTPS 활성화 링크를 제시하면 본인 브라우저의 공식 화면에서 확인한다. 이후 10번을 다시 실행한다. 로그인 코드·토큰·비밀번호를 채팅으로 보내지 않는다.
4. 표시된 **https://기기이름.…ts.net/** 주소를 휴대폰 브라우저에서 연다. `전체 대화`에서 요청하고 진행·보고서를 확인한다. Wi-Fi를 끈 휴대폰에서 같은 주소를 열어 외부 접속을 확인한다.

평소에는 맥에서 0번 파일로 사무실을 켜면 된다. 맥·사무실·Tailscale·인터넷이 유지돼야 하며 잠자기/종료 중 업무 지속을 보장하지 않는다. 현재 ChatGPT 대화의 지시는 사무실로 자동 전달되지 않는다.

## 구현과 보존

- `connect-phone-mac.sh`는 PATH의 CLI 또는 `/Applications/Tailscale.app/Contents/MacOS/Tailscale`을 쓰며 `TAILSCALE_BE_CLI=1`을 지정한다. macOS의 별도 Python/Node 설치를 요구하지 않고 JSON 검증은 기존 Lima VM의 Python에서 한다.
- `phone-config.py`는 실행 중인 개인 계정, `.ts.net` HTTPS 호스트, 최소 지원 버전을 확인한다. 태그 기기는 제외한다. VM의 `state/private-access.json`을0600 권한으로 원자적으로 생성하며 기존 다른 소유자/주소를 덮지 않는다. DB·인증 파일·로컬 브라우저 키는 초기화하거나 전달하지 않는다.
- 허용 경로는 Tailscale Serve HTTPS443 → Mac127.0.0.1:8810 하나다. 다른 TCP/Web 경로·Services·Foreground 구성·공개 Funnel을 발견하면 보존하고 중단한다. Serve reset/Funnel 활성화/전체 포트 공개는 하지 않는다.
- gateway는 매 요청마다 소유자 설정을 읽으므로 기존 업무나 서버를 재시작하지 않아도 연결할 수 있다. 실제 HTTP/웹소켓은 정확한 Host와 Tailscale 사용자 식별 헤더를 검증한다. 다른 계정과 Funnel 요청은 거부하며 변경 요청에는 세션/CSRF 검사를 유지한다.
- 설정 전과 후의 Tailscale 구성을 확인한다. 주소 설정 성공과 실제 휴대폰 접속 성공은 별도다. 기존 모델 권한/코드 실행 권한을 확대하지 않는다.

## 검증과 남은 확인

설정·Mac 실행 모의 검사15개를 통과했다. 본인 계정/주소 검증, 기존 소유자·DB·키 보존, 심볼릭 링크/권한 거부, 공개 경로 차단, 설정 순서, 공백 경로, CLI 모드, 개인 임시 파일 정리, 실패 시 성공 주소를 표시하지 않는 것을 확인했다. ZIP의 파일 일치·CRC도 확인했다. 실제 Mac Tailscale 로그인·HTTPS 동의·외부 휴대폰 접속은 사용자가 확인해야 한다.

2026-11-11 사용자 보고로 0번 시작이 정상 진행된 것으로 이해했다. 이 보고를 실모델 응답이나 휴대폰 접속 성공으로 확대하지 않는다. 코드 수정·GitHub 반영·배포는 [별도 개발 연결](ai-office-development.md)의 정확한 작업/변경 승인과 계정 연결을 따른다. 휴대폰 파일만 실행해서 이 권한이 생기지는 않는다.

[Mac 설치·시작](ai-office-macos.md) · [사무실 입력·권한](ai-office-control.md) · [전체 인계](notion-handoff.md)
