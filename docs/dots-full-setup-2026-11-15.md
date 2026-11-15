# 덕 비서 전체 기능 — 실제 연결과 운영 설정

구현 범위는 [현재 계약](dots-parity-2026-11-15.md), 검수 범위는 [실제 검사](dots-full-qa-2026-11-15.md)에 둔다. 서버·앱 코드가 있다는 것과 실제 사용자 연결이 켜졌다는 것은 다르다. 이 작업에서 새 유료 서비스·전화번호·worker·Apple App ID를 만들지 않았고 옛 ChatGPT Slack 워크스페이스를 사용하지 않았다. 비밀값은 운영 서비스의 비공개 설정에서만 입력한다.

## 기존 서버와 모델

기존 무료 Render `srv-dbgpc0ff3r2c73abc7e0`과 기존 영속 DB/암호화 키를 유지한다. `AI_ENABLED=true`, `OPENAI_API_KEY`, `OPENAI_MODEL`은 기존 관리자 설정을 사용한다. 비서 모델은 선택적으로 `OPENAI_AGENT_MODEL`, 의미 검색은 `OPENAI_EMBEDDING_MODEL`(기본 text-embedding-3-small)을 사용한다. 관리자/사용자 중지·자료 동의·작업 한도를 건너뛰지 않는다.

- `ASSISTANT_WEB_SEARCH_ENABLED=false`는 웹 검색을 끈다. 기본은 모델이 지원할 때 활성 가능이다.
- `ASSISTANT_HOSTED_CODE_ENABLED=true`는 별도의 OpenAI hosted code 경로다. 기본 off이며 이번에 켜지 않았다. 이용료/모델 권한을 확인한 운영자만 결정한다.
- `ASSISTANT_DAILY_MODEL_TURNS`는 계정별 배경 turn 제한(기본200,1–2000)이다.
- `ASSISTANT_VOICE_ENABLED=true`와 사용자 음성 opt-in이 모두 있어야 통화를 시작한다. `OPENAI_REALTIME_MODEL` 기본 gpt-realtime-2.1, 사용자 키 대신 서버 키로 SDP를 교환한다. 실제 모델 접근권·과금·마이크는 별도 검수한다.

공개 `/api/capabilities`의 준비 상태는 사용자의 실제 계정 연결/구독/기기 권한과 다르다. 기존 웹훅은 먼저 ACK하고 큐에서 처리한다. free 서비스가 잠들면 정각·즉시 처리가 늦을 수 있다.

## 새 Slack 워크스페이스

1. 사용자가 선택한 새 워크스페이스에서 https://api.slack.com/apps 의 덕 전용 앱을 등록한다. 기존 ChatGPT plugin 연결이나 토큰을 옮기지 않는다.
2. [manifest](../config/slack-app-manifest.json)는 workspace ID를 고정하지 않는다. 최초 등록은 event_subscriptions를 잠시 빼고 등록한다. 실제 서버의 비공개 환경에 `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`을 입력한 뒤 URL 검증과 전체 manifest를 적용한다. OAuth callback과 event URL은 기존 덕 도메인이다.
3. user scope는 실제 승인한 채널/메시지/검색을 읽기 위한 것이다. 봇 scope는 `chat:write`, `im:write`, `im:history`, `app_mentions:read`, `files:read`이며 bot event는 `message.im`, `app_mention`이다. 기존 user event도 유지한다. 사용자의 원본 메시지 쓰기 `chat:write`는 별도 선택이다.
4. 덕 ME→연결된 서비스→Slack→추가 권한에서 **Slack에서 덕과 대화**를 선택해 OAuth를 다시 승인한다. bot token은 사용자 읽기 토큰과 분리해 암호화 저장한다. token rotation도 각 토큰별로 갱신한다.
5. 덕 작업→연락→Slack에서 해당 소유자의 대화 연결을 확인한다. 그 뒤 설치한 덕 봇에 DM하거나 멘션한다. owner/team/bot installation 서명이 맞아야 요청으로 처리한다. 다른 사람의 채널 글은 주인 명령으로 처리하지 않는다.
6. 원본 읽기·새 DM·멘션·사진/문서·작업 결과 DM·disconnect·다른 계정 접근 거부까지 실제 워크스페이스에서 검수한다. 공개 채널 멘션의 개인 결과는 주인 DM에 전달한다.

이전에 연결했던 Slack workspace는 해제된 상태를 유지한다. 새 workspace 등록과 실제 수신은 이 구현 검사에서 실행하지 않았다. 옛 token의 search:read 부족은 재승인이 필요할 수 있다.

## Google·Notion·Naver 변경 수신

Google 여러 계정의 실제 읽기/쓰기 동의를 유지한다. Drive 제목 검색만 승인한 계정은 본문을 읽지 못하며 `driveContent`를 따로 승인해야 한다. Calendar는 접근 가능한 달력 목록을 페이지로 확인하고 watch 등록을 나눠 갱신한다. syncToken/취소와 재기준 설정을 처리한다. Gmail은 전체 history 페이지·삭제/label 변화를 이어 읽는다. history 만료/Calendar410은 누락 가능성을 알리고 재기준 설정한다.

Gmail push는 이미 준비된 Google 프로젝트의 topic/인증 push 구독이 필요하다. `GOOGLE_GMAIL_PUBSUB_TOPIC`, `GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION`, `GOOGLE_PUSH_SERVICE_ACCOUNT`, `GOOGLE_PUSH_AUDIENCE`를 기존 [수신 절차](assistant-provider-setup.md)에 따라 설정한다. 새 Cloud 자원은 자동 개설하지 않는다.

Notion webhook 초기 비밀 URL/토큰은 같은 수신 절차의 소유자 전용 setup 경로로 설정한다. 실제 통합에 공유한 페이지/DB/자식/첨부만 읽는다. 외부 임베드·원본 권한 거절은 건너뛰었다고 표시한다. Naver는 기존 IMAP/SMTP 본인 연결을 쓰고 webhook 대신 주기 확인으로 보완한다.

사용자 자료 설정과 “필요한 변화 먼저 확인”을 켜야 선택 원본의 읽기 전용 조사가 동작한다. 별도의 시간 브리핑 없이도 이벤트가 깨울 수 있다. 기존 평일09–18시 브리핑 프리셋은 유지한다. 사용자별 동의와 예약은 이 배포에서 새로 켜지 않는다.

## Teams·문자·RCS

Teams는 별도 Bot Framework/Azure bot 앱, Teams 개인 대화·멘션 권한, 수신 URL `/api/webhooks/teams`, `MICROSOFT_BOT_APP_ID`, `MICROSOFT_BOT_APP_SECRET`과 필요시 `MICROSOFT_BOT_TENANT_ID`가 필요하다. 서명은 Microsoft JWKS/issuer/audience/만료/service URL로 검증한다. 작업→연락에서 만든10분 코드 `duck-connect …`를 **개인 대화**에 보내 본인 계정과 묶는다. 그룹에서는 덕 멘션만 받고 개인 결과는 기존 개인 대화로 보낸다.

SMS는 Twilio의 승인된 발신 번호, `/api/webhooks/sms`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, 정확한 `PUBLIC_ORIGIN`이 필요하다. 서명·Account SID·수신 번호가 모두 맞아야 처리한다. 앱의10분 코드를 본인 번호에서 전송해 연결한다.

RCS는 같은 Messages API의 `rcs:+번호`와 `TWILIO_RCS_SENDER_ID` 또는 `TWILIO_MESSAGING_SERVICE_SID`를 사용한다. 실제 지역·브랜드·sender 승인과 요금 확인이 필요하다. 수신 To를 확인할 RCS sender ID도 준비해야 한다. 준비되지 않은 상태를 iMessage/RCS 기본 지원으로 표시하지 않는다.

이 채널들은 전송 결과가 불확실할 때 같은 메시지를 자동 중복 발송하지 않는다. 처리 완료/실패/불확실 임시 메시지는24시간 뒤 정리하며 opt-in 장기 대화와 구분한다. 사진·음성·문서 media는 서명된 공급자의 허용 호스트만 가져온다.

## 컴퓨터 연결기

사용자 PC 또는 사용자가 선택한 cloud Linux host에 Node24, Docker가 필요하다. Windows는 Docker Desktop의 Linux containers/WSL2가 필요하다. 이 연결기가 사용자 프로세스로 실행되는 호스트를 앱이 원격으로 새로 설치하거나 개설하지 않는다.

저장소에서 서버/모바일 의존성을 먼저 설치한다. 브라우저 이미지는 `node companion/build-browser.mjs`, 분석 이미지는 `python3 companion/build-code.py`로 만든다. 분석 이미지는 x86_64용으로 검수했으며 다른 아키텍처는 Python wheel/image 검수가 필요하다. browser build는 설치된 playwright-core를 정확히 pack해 임시 build context에만 넣는다. 데이터·토큰·사용자 bundle을 이미지에 넣거나 TLS 검증을 끄지 않는다.

덕 작업→컴퓨터→이름/허용 기능 확인→연결 코드를 만든 뒤 **자기 컴퓨터 터미널에서만** 다음 인자를 넣는다. 예시의 실제 코드/ID는 공개하지 않는다.

```sh
node companion/connect.mjs --server https://duckduck-test.onrender.com --id 컴퓨터ID --pair 일회용코드
```

코드는10분,한 번만 사용한다. 기본 저장 폴더는 `~/.duck-companion`, 소유자 전용 권한이며 `--directory`로 별도 경로를 정할 수 있다. 이후에는 같은 디렉터리로 코드 없이 실행한다. 로컬/cloud 종류는 실행 위치를 표시하며 같은 승인 절차를 사용한다. Ctrl+C는 현재 격리 실행도 중단한다.

컴퓨터는 온라인 heartbeat가 있을 때만 사용할 수 있다. 코드의 `/input`은 선택 파일과 실행 코드, `/output`은 해당 작업 전용 지속 공간이다. host env·사용자 홈·Docker socket은 실행 컨테이너에 넘기지 않는다. browser profile은 해당 연결기 전용이다. browser는 host egress proxy를 통해 공개 HTTP(S)만 접근하며 private IP/metadata/localhost를 거절한다. 인증·2FA는 사용자 직접 제어로 인계한다. 화면 입력은 별도 승인 또는 정확한 computer ID/기간의 허용 규칙을 따른다.

작업이 삭제되면 다음 poll에서 그 컴퓨터의 작업 폴더를 정리한다. 연결 해제는 토큰·서버 최근 화면을 폐기하고 연결기가 해제를 받으면 전용 profile/작업 폴더/config도 지운다. 오프라인 기기의 실제 파일 삭제는 다시 연결돼 해제를 인지한 뒤 이뤄진다.

Desktop 전체 화면은 기기 생성 시 별도 opt-in이다. macOS14+의 Screen Recording/Accessibility, Windows 해당 사용자 desktop session, Linux X11의 scrot/xdotool이 필요하다. Mac Swift helper/Windows PowerShell/X11의 실제 화면 조작은 이 Linux 환경에서 OS 실검수하지 못했다. Docker 브라우저와 분석은 실제 실행했다.

## iMessage·iPhone 진입·음성

Mac iMessage는 `node companion/imessage.mjs --directory 연결기폴더 --owner 본인전화번호또는이메일`의 user-run bridge다. Mac Messages DB 읽기/AppleScript 전송에 필요한 본인 OS 권한이 필요하다. **peer 하나만** 처리하며 앱에서 만든 코드로 동일 계정에 연결한다. 새 텍스트만 읽고 attributed/encrypted body가 지원되지 않으면 본문을 확인하지 못했다고 표시한다. Mac 실기기·SMS/RCS와의 전달 품질까지 검수한 것은 아니다.

새 iPhone 소스에는 AppIntents/Siri/Shortcuts의 “덕에게 부탁하기”가 포함된다. 전달 자료는 잠긴 임시 파일+일회용 Keychain nonce로 전달한다. 일반 외부 `duckduck://assistant?message=…`는 초안만 열고 임의 자동 전송하지 않는다. 사용자 Shortcut의 일회용 검증이 성공한 요청만 자동 전송한다. 알림 응답은 기존 경로를 유지한다.

Widget 소스와 config plugin은 준비했으나 기본 disabled다. `DUCK_ENABLE_WIDGET=1`은 **별도** `com.sjfieni.duckduck.widget` App ID/provisioning profile과 실제 extension 빌드 검수 뒤에만 선택한다. 주 앱의 기존 Bundle ID·서명·프로필을 바꾸지 않는다.

음성은 관리자 설정과 사용자 opt-in 뒤 통화 화면의 시작을 눌러 마이크를 사용한다. native WebView 마이크/오디오·실제 OpenAI 모델·background/종료 동작은 Apple 기기에서 별도 확인한다. 서버 primary API key를 앱에 넣지 않는다. 통화 중 타이핑과 배경 작업은 같은 비서 도구를 쓰며 녹음 파일은 자동 보관하지 않는다.

최신 설치본1.0.0(35)에는 이번 새 소스가 없다. web/iOS JS export·prebuild 연결 검사는 Apple native 컴파일/TestFlight 업로드 성공이 아니다. 이번 요청에서 native workflow를 실행하지 않았다.
