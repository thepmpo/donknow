# 캘린더 정리·2주 보기·시트·연동 안정성 — 2026-11-13 현재 계약

## 사용자가 확정한 내용과 우선순위

이번 사용자는 소개 사이트를 보류하고 덕 앱 캘린더의 빨간 표시 영역 제거, Apple 캘린더 참고, 실제 월에 속한 주만 표시, 부드러운 시트·상단까지 이어지는 회색 배경·배경 탭 닫기, 주말 숫자 색, 오른쪽 Today 위의 2주 보기를 요청했다. 이 계약은 같은 날 [이전 Apple 참고 계약](calendar-apple-reference-2026-11-13.md)의 ‘42칸 고정·본문 도구/상태 줄’을 대체한다. 기존 데이터/인증/키/서명, 시스템 외형, Duo 카메라 열과 펼친 가로 왼쪽 Calendar/오른쪽 선택, 실제 쓰기 확인 경계는 보존한다. `website/` 소개 사이트는 수정하지 않았다.

첨부한 사용자의 실제 일정/Apple 원본 스크린샷은 공개 저장소에 복제하지 않는다. 저장한 결과는 실제 Expo 앱+합성 데이터/격리 API 또는 명시한 Duo 기하 fixture다.

## 사용자에게 쉬운 안내

- 달력 위 여러 줄 도구와 연결 문구를 치웠다. 오른쪽 위 년·월 아래에는24pt 여백만 있다.
- 검색·추가·이동·상세 보기·연결 확인은 **년·월 누르기**에서 찾는다. 조회 오류를 정상적인 빈 달력으로 바꾼 것이 아니다. 날짜 상세와 ‘캘린더 상태·새로고침’에서 확인/복구한다.
- 2026년11월·일요일 시작은 **11월1일–12월5일,5주**다.12월6–12일은11월 날짜가 없으므로 그리지 않는다. 해당 월에 따라4·5·6주가 된다.
- 일요일 숫자는 빨강, 토요일은 파랑. 인접 월 날짜는 연하게, 오늘은 강조, 선택 원 안 숫자는 흰색이다.
- 카메라 열의 Today 위 보기 버튼을 누르면 **선택한 주+다음 주,14일**이 넓게 보이고 다시 누르면 월 보기다. 화면을 두 줄로 넓히는 방식이며 기존7일 시간표와는 별도다.
- 날짜 시트는 부드럽게 올라오고 내려간다. 상단 흰 틈도 회색으로 이어지며 회색 본문/상단을 눌러도 닫힌다. 내용·입력·스크롤을 누르는 것으로 닫히지는 않는다.

## 화면/좌표/상태 계약

| 요소 | 구현 기준 | 원본 파일 |
| --- | --- | --- |
| 본문 | 기존 Calendar 제목·년월 본문 우상단. 명령/status/error 줄 제거, 여백24pt | screens/CalendarScreen.tsx |
| 월 범위 | 첫 날짜가 속한 시작 요일부터 마지막 날짜가 속한 주의 끝까지. 다른 월 날짜만 있는 주 없음 | calendar-model.visibleDays |
| 주 높이 | 실제 pane 높이/헤더/하단 여백/표시 주 수로 계산. min92pt·큰 글자 하한.2주는2로 나눠 확장, 가로는 실측width/7·shrink0 | monthCellHeight / CalendarScreen |
| 2주 상태 | fortnightAnchor와 selected를 분리. 두 번째 주 날짜를 눌러도 현재14일 창 유지. 이동14일·Today재정렬·년월 이동·탭/회전/접힘 보존 | CalendarScreen / periodShift |
| 주말/인접 월 | 일danger·토blueText. 인접 월 opacity.48, 선택 배경action+흰 숫자, 오늘의 요일 색/굵기 유지 | CalendarScreen |
| Duo 보기 버튼 |64×64·radius32·icon28, Today 위8pt. 기존64×272 세로5탭/52target/28icon 위치 불변 | duoCalendarViewFrame / DuoChrome |
| 안전 영역 | duoTabFrame/Today의 같은 검증된 segment. camera/back/힌지와 겹치면 생략. 모델명·폭으로 기기 추정 안 함 | duo-layout.ts |
| 좁은 공간/일반폰 | 보기 버튼은 Calendar 헤더에 제공, Today/명령은 년월 시트에서도 접근. 일반 iPhone 하단5탭 유지 | CalendarScreen |
| pane 우선 | 오른쪽 활성Calendar priority2, 왼쪽 고정Calendar1. 보기/Today는 선택된 등록에만 적용, 시트 중 등록 해제 | useDuoToday |

`domain.monthDays`의 과거42일 유틸리티는 호환용으로 남지만 현재 Calendar UI는 `calendar-model.visibleDays`를 사용한다. 유틸리티 테스트의42를 보고 화면을 다시6주 고정으로 돌리지 않는다.

## 시트: 모션·회색 연속성·닫기

`CalendarSheet`는 pane 안의 overlay를 유지한다. native Modal로 전체 두 pane을 덮지 않는다. `SheetBackdropProvider`가 실제 `measureInWindow` 좌표를 기준으로 해당 pane 위의 앱 헤더/안전 여백 strip만 추가로 덮는다. 다른 pane·물리 카메라 열은 덮지 않고 기기 상태 표시를 가짜로 그리지 않는다.

- 입장: 실제 측정한 card 높이+20pt에서0까지 **360ms cubic(.22,1,.36,1)**. dim은220ms.
- 닫기: 높이+20pt까지 **260ms ease-in cubic**, dim은220ms. 종료 후 overlay를 제거한다. 수치는 덕의 구현값이며 Apple 공식 고정값이 아니다.
- 같은 `#00000055` dim과 같은 Animated opacity를 본문/상단에 사용한다. 상단만 흰 박스가 남거나 다른 시점에 밝아지지 않는다.
- 본문 배경·상단 배경·Close·Duo Back·손잡이·Escape는 동일한 닫기 동작을 사용한다. card 내용은 배경과 분리해 입력/스크롤 탭을 닫기로 해석하지 않는다.
- 저장 중/busy는 배경·손잡이/닫기 차단을 유지한다. 편집 중 실행 초안 취소는 기존 비동기 취소/실패 보존을 우선해 일반 day 시트의 지연 닫기를 강제하지 않는다.
- OS 동작 줄이기는 이동/지연 없이 즉시 열린다/닫힌다. overlay 제목 전환 때 초점을 새 내용으로 보내고, 닫힌 메뉴의 opener가 사라졌으면 같은 pane의 년월 버튼으로 복귀한다. 계정/화면 해제 시 오래된 callback이나 다른 pane으로 초점을 옮기지 않는다.
- viewport 변화는 같은 상태/노드를 유지하고 상단 dim 실측 좌표만 다시 측정한다. 화면 높이를 모델명으로 하드코딩하지 않는다.

## 연동 안정성: 확인한 코드 원인과 수정

**실제 사용자 계정의 특정 해제 사건은 독립 재현하지 못했다.** 다음 코드는 재현 테스트로 문제/수정을 확인했다. 이 검증을 모든 Google·Notion·Slack 실계정 토큰/권한이 정상이라는 뜻으로 확대하지 않는다.

1. **정상 access token 교체와 계정 교체 혼동:** Calendar 읽기 완료 시 raw accessToken이 달라지면 기존 코드는 연결 변경으로409를 냈다. 동시 정상 갱신은 connectionId/accountId가 같은 한 허용하고, 실제 해제·재연결·계정 교체·calendar 권한 제거는 계속 거절한다. legacy 연결ID가 없는 자료에는 보수적인 token 비교를 유지한다. refresh 저장도 connectionId/accountId를 확인해 새 연결을 덮어쓰지 않는다.
2. **상태 응답 역전:** IntegrationsScreen·ProfileScreen 상태 조회에 증가하는 read 번호를 둔다. 늦은 옛 ‘미연결’ 응답이 새 연결 결과를 덮지 못한다. 임시 조회 실패 때 최근 연결 정보를 삭제하지 않는다. 로그아웃/계정·서버 전환의 generation 검사도 유지한다.
3. **불필요한 재조회:** useTodos.featureRequest를 연결·generation이 바뀔 때만 갱신하는 callback으로 만들어 일반 재렌더가 Calendar load effect를 다시 시작하지 않도록 했다. user가 있는 초기 Calendar phase는 loading이며 읽기 전 unconnected를 사실처럼 표시하지 않는다.
4. **무료 서버 기동/네이티브 취소:** Todo/연동 상태/capabilities/Calendar GET은 전체60초. 네이티브 ‘Fetch request has been canceled’는 안전한 GET만 최대1회 복구하며 raw 문구를 노출하지 않는다. JSON401·OAuth·저장/PATCH/DELETE/발송·실행 확인은 자동 반복하지 않는다. 실패가 실제 로그아웃이라는 근거 없이 인증 파일/DB/키를 지우지 않는다.

재현 검사: 같은 계정의 정상 token 회전 중 다른 calendarList가 끝나도 성공, 같은 token 문자열이어도 connectionId/accountId 교체 시 폐기, 늦은 미연결 응답 무시, 취소된 Todo/연동 GET 각1회 복구,503 후 최근 연결/로그인 유지, 실제401·이전 계정의 늦은401 격리를 확인한다.

## 구현 파일 지도와 검증 재현

- UI: `mobile/src/screens/CalendarScreen.tsx`, `CalendarSheet.tsx`, `SheetBackdrop.tsx`, `DuoChrome.tsx`, `duo-layout.ts`, `App.tsx`.
- 범위/상태: `calendar-model.ts`, `useCalendarData.ts`, `useTodos.ts`, `screens/IntegrationsScreen.tsx`, `screens/ProfileScreen.tsx`.
- 통신/서버: `auth.ts`, `http-response.ts`, `server/calendar-workspace.js`, `server/integrations.js`.
- 회귀: `calendar-model.test.ts`, `duo-layout.test.ts`, `http-response.test.ts`, `test/calendar-workspace.test.js`.
- 실제 화면/조작: `mobile/e2e/calendar-workspace.mjs`, `calendar-sheet-motion.mjs`, `integration-stability.mjs`, `duo-layout.mjs`, `app.mjs`, `session-isolation.mjs`, `web-auth.mjs`.

```bash
npm run check
npm test
npm --prefix mobile run typecheck
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:web -- --max-workers 2
node mobile/e2e/calendar-workspace.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/duck-browser-cache node mobile/e2e/calendar-sheet-motion.mjs
node mobile/e2e/integration-stability.mjs
node mobile/e2e/duo-layout.mjs
npm --prefix mobile run test:e2e
node mobile/e2e/session-isolation.mjs
npm --prefix mobile run test:web-auth
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2
```

`PLAYWRIGHT_BROWSERS_PATH`는 이 작업 환경에 이미 준비된 FFmpeg 경로다. 다른 환경은 공식 Playwright FFmpeg 설치 경로를 사용한다. 모션 검사는 Date.now가 흐르는 `clock.install`을 사용한다. `clock.setFixedTime`은 RN JS Animated의 시간을 멈추므로 모션 검사에 쓰지 않는다. session-isolation의 모의 asset은 안전한 로컬 파일을 직접 읽고, localhost를 외부 proxy에 보내지 않는다.

[실제 QA와 증거](calendar-refinement-qa-2026-11-13.md), [새 캡처·시트 동작 영상·JSON](../artifacts/calendar-refinement-2026-11-13/), [선택한 개인 Notion](https://app.notion.com/p/41718ee8299181389c27f3f68549c4d3).

## 반영·남은 실제 확인

기존 main은26번 iPhone 빌드가 올라간 뒤 소개 사이트 기록이 더해진 상태였다. 이번은 그 뒤의 새 앱 코드다. **TestFlight26에는 이번 수정이 없다.** iOS JS export는 native IPA/서명/Apple 업로드가 아니다. 새 native 빌드는 사용자의 다음 수동 빌드 요청 때만 시작하며 push 자동 빌드/유료 전환은 켜지 않는다.

실제 iPhone/Duo에서 모션/터치/VoiceOver·저전력·안전영역, 실제 Google/Notion/Slack의 유지/복귀 상태는 새 설치 후 확인해야 한다. 저장된 권한·키/DB를 초기화하지 않으며, 실제 공급자가 재승인을 요구할 때만 계정 소유자의 공식 권한 화면이 필요하다. 비밀값은 채팅으로 받지 않는다.
