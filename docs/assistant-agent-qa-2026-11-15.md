# 대화·기억·수신과 배경 컨트롤 — 검수

합성 계정/자료만 사용했다. 실제 Slack/Notion/Gmail/Google 사용자 연결·모델 품질·iOS push/키보드·VoiceOver 검수를 대신하지 않는다.

## 서버 검사

`npm test`: 전체334개 중333통과, 실패0, 기존 선택1제외. `npm run check`:61개 문법 검사. 타입 검사와 web/iOS JavaScript export 통과. 서명 IPA/Swift 빌드는 실행하지 않았다.

- 기억 기본off/명시on, 실제 사용자 quote 검증, 계정 격리, 수정/잊기/내보내기/전체 삭제, 암호화된 DB 원문 검사, 재시작 복원, 설정 변경 중 생성 취소.
- 저장된 요청 응답 재사용/모델 중복 방지, 체크 항목 동일 Todo ID 유지, 외부 쓰기0. HTTP 인증·타계정 접근 거부·삭제 확인 및 Todo 보존.
- Slack raw-body HMAC/오래된·변조·유니코드 서명 거부, 먼저 ACK/나중 분류, team+설치자 관점, 타회원 배제, 중복·재시작·동의 해제 중 늦은 결과 취소.
- 사용자 OAuth 읽기·DM scopes, 새 workspace/installer 바인딩, 부분 승인에서 쓰기 제외. 실제 Slack 앱 설치는 아님.
- Notion workspace 일치·해당 문서 재조회·부분 경고·실패 재시도. 비공개 준비 URL의 초기 토큰 수신·암호화·교체/다른 소유자 조회 거부·연결 해제 이후 거부.
- Calendar 기본 캘린더 watch 등록/갱신 억제, token/resource/번호 증가·중복·만료/취소 검증. sync 초기 알림 및 source scope 검사는 구현되어 있으며 실제 Google watch 등록은 fixture다.
- Gmail RSA/고정 Google JWKS/issuer/audience/서비스 계정/이메일·만료 검증, 키 캐시. 미설정 Gmail watch 미생성. 실제 Pub/Sub 전달은 미확인이다.
- 앱 CSRF 헤더 없는 정당한 signed webhook만 통과, 다른 API의 CSRF 보호 유지.
- 새 빈 복구 대상에서 기억/대화 보존·이벤트/구독/진행 중 대화 취소, 예약 자동 재개 금지. 기존 로컬/원격 백업 검사 통과.

## 화면 직접 조작

`mobile/e2e/assistant-memory.mjs`: 실제 Expo Shell/ME에서 켜기→기억 추가→수정→잊기→전체 삭제, 채팅 복원/체크→log와 새로고침 뒤 동일 Todo ID, 삭제 후 Todo 보존을 확인했다. 일반폰/접힘/펼침의 합성 root 기하, 밝은/어두운 화면5장이다. native Modal 내부 기하와 실제 키보드를 에뮬레이션한 것은 아니다.

`mobile/e2e/background-controls.mjs`: 실제 TodoEditorForm과 각 modal을 독립 Duo 기하로 감쌌다. 일반폰/접힘/펼침/dark·중첩 시트에서 뒤의 오늘/2주/탭/이전 X를 어둡게·disable·접근성 숨김, 앞의 X/별도 키보드 닫기 활성, 한 겹씩 복원, 배경 프레임 동일/메모 유지/쓰기0을 확인했다. 합성8장.

기존 전체 앱 E2E·채팅 E2E·채팅 오류/일반·모션 줄이기 회귀도 통과했다. 상태 조회 실패에 이전 status가 남던 문제를 고쳐 전송을 막고, 기록 조회만 실패하면 정상 전송을 유지했다. 이 테스트의 과거24장 출력은 테스트 직후 명시된 파일만 원래대로 복원했다.

새 화면은 아래에 있다. 사용자 원본 사진/개인 문서/계정은 공개하지 않았다.

- `artifacts/assistant-agent-2026-11-15/current/` — 5장 + verification.json
- `artifacts/background-controls-2026-11-15/current/` — 8장 + verification.json

## 남은 실사용 검증

다른 Slack 워크스페이스와 덕 개발자 앱 등록, 실제 공급자 서명·이벤트/push 전송, 새 iOS 빌드와 실제 Duo 접힘·펼침/키보드·화면 읽기 검수. native 최신 확인은1.0.0(35)이며 이번 코드가 포함되지 않는다. 실제 사용자 자동 발송·유료 리소스·키 변경·원본 변경은 수행하지 않았다. 기존 ChatGPT Slack 연결 해제와 새 연결 요청은 덕 앱 설치 완료와 다르다.
