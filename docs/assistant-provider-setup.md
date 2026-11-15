# 덕 공급자 수신 설정 — 운영자 절차

현재 전체 설정은 [Dots 전체 활성화 절차](dots-full-setup-2026-11-15.md)를 우선한다. 아래 절차는 기존 수신 setup 상세이며 이번 버전은 독립 agent 이벤트·여러 Calendar watch·Gmail history 이어 읽기·Slack bot 연락을 포함한다.

기존의 개인 자료/자동 발송/유료 인프라를 대신 켜는 절차가 아니다. 인증 값은 서비스의 비공개 설정 화면에서만 다룬다. 채팅·Git·공개 문서에 실제 값을 넣지 않는다. ChatGPT 연결과 덕 자체 OAuth 앱은 별개다.

## 다른 Slack 워크스페이스

1. https://api.slack.com/apps 에서 원하는 워크스페이스를 직접 선택하여 덕 앱을 만든다. [manifest](../config/slack-app-manifest.json)는 워크스페이스 ID를 고정하지 않는다. 최초 생성 시에는 `settings.event_subscriptions`를 잠시 제외한다. 아직 서명 키를 모르는 서버에 URL 검증부터 시도하지 않도록 하기 위해서다.
2. 기존 무료 Render 서비스의 비공개 환경 설정에 `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, 선택적으로 `SLACK_APP_ID`를 입력한다. `PUBLIC_ORIGIN`은 서비스의 실제 HTTPS origin을 쓴다. 기존 암호화 키/서명 키를 교체하지 않는다. 이 단계의 실제 값은 사용자/운영자만 입력한다.
3. 서버 갱신 뒤 전체 manifest의 event_subscriptions를 적용한다. `/api/webhooks/slack`의 서명된 URL challenge가 성공하는지 Slack 화면에서 확인한다. user_events는 message.channels/groups/im/mpim, bot_events는 message.im/app_mention이다.
4. 덕 ME → 연결된 서비스 → Slack에서 다시 승인한다. OAuth의 워크스페이스를 확인하고 사용자 읽기·검색 권한을 승인하고, Slack에서 덕과 대화는 별도 선택한다. ChatGPT의 다른 워크스페이스 연결만으로 이 단계가 완료되지는 않는다.
5. 브리핑 중요 변화 또는 비서 설정의 먼저 확인할 자료/지속 책임에서 Slack·AI 동의를 선택해야 조사하며, 봇 연락은 별도 소유자 연결을 확인한다. 실제 멘션/DM 확인 요청을 보내 앱 수신함과 해당 기기의 push를 검사한다. 이벤트의 authorization이 설치자와 다르면 안전하게 제외한다.
6. 쓰기가 필요할 때만 별도로 chat:write를 앱의 사용자 scope에 추가하고 덕에서 쓰기 권한을 재승인한다. 사용자 원본 쓰기는 기본 선택하지 않으며 봇 연락 scope와 구분한다. 전달/수정에는 항상 실행 확인이 있다.

실제 다른 워크스페이스/덕 앱 등록은 아직 확인되지 않았다. 이 문서가 설치 완료 증거는 아니다.

## Notion — 초기 검증도 비공개로 수신

연결된 자기 Notion과 이메일 인증이 필요하다. 관리자는 자신의 인증된 덕 세션으로 `POST /api/assistant/events/notion/setup`에 `{ "confirmation": true }`를 보낸다. 소유자 전용으로 `id`와 충분히 긴 비밀 경로를 포함한 `requestUrl`을 받는다. 이것은 비공개 관리자 설정 값이며 공개하거나 채팅으로 보내지 않는다.

Notion 연결의 webhook 구독에 그 URL과 필요한 page.content_updated / page.properties_updated / page.created를 설정한다. 최초 verification_token은 해당 비공개 경로에서만 받아 암호화 저장하며 이미 받은 코드를 다른 코드로 덮어쓰지 않는다. 소유자는 `GET /api/assistant/events/notion/setup?id=…`에서 코드를 확인해 Notion 검증 화면에 입력한다. 다른 계정의 id로는 조회할 수 없다. 준비 URL은24시간, 검증 뒤 로컬 수신 허용은1년이며 다시 설정할 수 있다. 동시 최대5개다.

해제는 `DELETE` 같은 경로에 `{ "id": "…", "confirmation": true }`를 보낸다. Notion 자체의 구독도 운영자가 제거한다. Notion OAuth 해제/변경·새 계정/워크스페이스는 기존 경로를 사용할 수 없다. 기존 글로벌 방식은 `NOTION_WEBHOOK_VERIFICATION_TOKEN`을 비공개로 설정한 경우에만 기본 `/api/webhooks/notion`에서 허용한다. 실제 구독/서명/읽기/push까지 점검하기 전 활성화 완료라고 하지 않는다.

## Google

Calendar는 기존 읽기 OAuth와 중요 변화/agent 동의로 접근 가능한 달력 목록을 페이지로 읽고 watch를 나눠 등록·갱신한다. syncToken/취소/만료 재기준 설정을 처리한다. 임의 Resource URI를 가져오지 않고 등록한 채널만 검증한다. 갱신 실패는 기존 주기 조회로 보완한다.

Gmail은 **이미 승인·준비된** Google Cloud 프로젝트의 topic/구독이 필요하다. 새 Cloud 자원을 자동 생성하지 않는다. topic에 `gmail-api-push@system.gserviceaccount.com`의 게시 권한, 인증된 push 구독의 OIDC 서비스 계정, 덕 receiver URL을 운영자가 설정한다. 필요한 비공개 환경 이름:

- `GOOGLE_GMAIL_PUBSUB_TOPIC` — projects/프로젝트/topics/토픽
- `GOOGLE_GMAIL_PUBSUB_SUBSCRIPTION` — 수신 허용할 정확한 구독 이름
- `GOOGLE_PUSH_SERVICE_ACCOUNT` — 구독의 실제 OIDC 이메일
- `GOOGLE_PUSH_AUDIENCE` — 기본값은 PUBLIC_ORIGIN + /api/webhooks/gmail

Google의 서명된 토큰과 위 값들이 정확히 일치해야 한다. 기존 설정 여부/비용은 Cloud 담당자가 확인한다. 설정이 없으면 Gmail push는 미준비 상태이며 주기 확인만 한다. history 페이지와 추가/삭제/label 변화를 이어 읽고 체크포인트를 보관한다. history가 만료되면 누락 가능성을 표시하고 재기준 설정한다.

## 운영 확인

공개 `/api/capabilities`의 receiver 준비 상태와 개인 OAuth 연결·실제 등록·전달 결과는 서로 다르다. 웹훅은 먼저 ACK하고 durable queue에서 처리한다. 중요 변화 해제/연결 변경은 생성 중 결과도 취소한다. 모델이 지정 요청을 확인하지 못한 경우 알림을 만들어내지 않는다. 무료 서버 지연과 공급자 재전송/유실 가능성은 남는다. 외부 이벤트가 준비되지 않아도 기존 정시 브리핑·최근 자료의 주기 조회는 유지한다.
