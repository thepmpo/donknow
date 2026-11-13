# 캘린더 개선 구현 계약 — CA-01~20

문서 ID `CAL-WORKSPACE-20261113` · 2026-11-13. 승인 근거: 사용자의 **“지금 그거 전체 수정해”**. [직전 감사](calendar-ux-audit-2026-11-13.md)의 20개 항목 전체를 구현하는 요청이다. 감사 당시 제안/미승인 문구는 그때의 상태이며 이 요청으로 구현 보류를 해제했다. 전체 월 기본·브랜드·5탭·Duo 확정 배치·외부 쓰기 확인 계약은 유지한다.

## 사용자가 보게 되는 변화

월 전체를 보고 날짜를 누르면 그날의 일정과 할 일이 바로 열린다. 일정 제목을 누르면 시간·장소·메모와 원본을 확인한다. +에서 할 일과 일정을 구분하고, Google에 저장할 일정은 계정·캘린더·내용을 확인한 뒤 한 번 실행한다. 월/주/일/목록 보기, 현재 기간 검색, 표시할 캘린더·시간대·주 시작·정보량 설정을 제공한다.

월은 한 달, 주는 7일, 일은 하루씩 움직인다. 다른 탭에서 돌아오면 보던 날짜·보기·월·스크롤과 일정 초안이 유지된다. 읽는 중·일부만 조회·실패·미연결을 월 위에서 구분하며 실패를 빈 시간으로 표시하지 않는다.

## 20개 항목과 원본 코드

| ID | 구현 | 검증/한계 |
|---|---|---|
| CA-01 | 실제 pane onLayout 높이·헤더 실측·하단 보호 높이로 6주 행 계산 | 320×667/390×844/430×932, 최소44pt. 큰 글자/아주 짧은 창은 스크롤 우선 |
| CA-02 | 날짜 탭 → pane 안 선택일 시트. 닫기/드래그/실제 Duo 뒤로가기 | 선택·월·스크롤 보존, 웹 Escape/포커스 복귀 |
| CA-03 | 주/일의 24시간 축. 종일 행·시간 겹침 lane | 64pt/시간, 시간 눈금 고정·날짜/본문 가로 스크롤 동기화. 빈 시간 탭/길게 누르기 → 작성 |
| CA-04 | 월±1월/주±7일/일±1일. 화살표 이름·스와이프 일치 | 월말·년말 단위 검사, 월/주/일 실제 조작 |
| CA-05 | 일반 폰 Calendar도 유지 마운트, 비활성 접근성 숨김/요청 무효화 | 다른 탭 복귀 월/보기 보존. 계정/서버 변경 시 key로 상태 정리 |
| CA-06 | 일정 ●/◷·Todo □·완료 ✓, 요약 개수 분리 | 완료 Todo는 상세에서 접음. 긴 제목은 상세에서 전체 읽기 |
| CA-07 | 여러 날 기간·이어지는 월 표시, 종일 우선·시각 정렬·겹침 분리 | 종일 종료일 exclusive, 짧은 일정도 최소 터치 영역끼리 겹치지 않게 lane 확보 |
| CA-08 | 행 탭 → 상세·장소·메모·원본/회의 링크·Todo 가져오기 | 실제 받은 필드만. HTTPS/자격증명 포함 URL/로컬 IP 방어. 긴 메모 잘림 명시 |
| CA-09 | + → 할 일/일정. 시간/종일·시작/끝·출처·메모·장소, 일정 수정 | 기존 actions 미리보기→확인→한 번 선점, 역할/연결/ETag 재검사. 참석자/반복 규칙/삭제를 새로 제공하지 않음 |
| CA-10 | 상단 loading/partial/error/retry/readAt, 소스별 nextCursor | 동일 범위 오류 때 이미 받은 자료 보존, 범위/계정 변경 늦은 응답 무시 |
| CA-11 | 미연결·읽는 중·성공 빈 날·부분·실패 문구 분리 | 실패 시 빈 날로 판단 금지. 정상 빈 날에 재승인 요구 안 함 |
| CA-12 | 숫자 고정 높이/clip 제거, 글자/공간에 따라 제목→개수 | CSS160%는 웹 대체 검사. 실제 Dynamic Type는 기기 검사 필요 |
| CA-13 | 최소44pt, 보기 tab/selected·출처 checkbox·오늘 밑줄/라벨 | 웹 키보드/큰 글자·고대비/동작 줄이기. VoiceOver 실기기 별도 |
| CA-14 | 실제 본인 calendarList·이름/색/권한·표시 선택 | 한 번에10개까지, 소스 목록100개씩 페이지 조회. 이름/읽기 전용 표시로 색 외 구분 |
| CA-15 | 현재 표시 기간 검색: 일정 제목/메모/장소·Todo 제목/메모 | 전체 과거/서버 검색 아님. 기간·시간대·부분/실패 공개, 결과→일정 상세 |
| CA-16 | 기간/오늘/+·4보기/검색/설정 두 그룹 regular Glass 도구 | 월 칸/일정 본문은 일반 표면. 작은 폭은 짧은 년월, 큰 글자는 줄바꿈/스크롤 |
| CA-17 | native 년±/12개월 선택·명시 적용·취소, 웹 년월 select | 불필요한 날짜 spinner 제거. 일정 날짜/시간은 기존 native picker 사용 |
| CA-18 | IANA 표시 시간대·주 시작 설정, 해당 zone의 조회 자정 | DST/자정/종일 exclusive 단위 검사. 존재하지 않는 현지 시각 거절 |
| CA-19 | 실제 좌측 pane 실측·시트/스크롤도 그 pane 안 | Duo 고정 Calendar/오른쪽 탭·초안·회전/접힘·카메라 열·선·안전 여백 회귀 |
| CA-20 | 기간160ms/방향8pt, 선택/명시 성공의 iOS selection haptic | Reduce Motion은 이동/페이드/햅틱 생략. app.json의 light 정책 유지, 다크 화면 전체 추가 아님 |

원본: `mobile/src/screens/CalendarScreen.tsx`, `CalendarSheet.tsx`, `CalendarEventEditor.tsx`, `CalendarTimeline.tsx`, `calendar-model.ts`, `useCalendarData.ts`, `mobile/App.tsx`; 서버 `calendar-workspace.js`, `calendar-time.js`, `integrations.js`, `feature-routes.js`, `provider-actions.js`. 공통 색/글자/여백은 기존 theme과 NavigationGlass를 재사용한다. 이 문서의 수치는 덕 구현값이며 Apple/Fantastical의 비공개 규격을 복제한 값이 아니다.

## 배치·수치·상태 전이

- 월 행: `max(44, min(112, floor((paneHeight−headerHeight−bottomProtection−80)/6)), ceil(30×fontScale+12))`. 80은 요일/선택일 요약 여유다. 공간이 모자라도 터치/글자를 억지로 줄이지 않는다.
- 기본 날짜 숫자16/24, 상자 min32·패딩4. 일 행 min44, 정보 밀도 자동 compact는 fontScale>1.3 또는 row<92. row<56/큰 글자에서는 작은 칩을 생략한다. 선택일 요약/상세에서 개수와 전체 제목을 읽는다.
- 도구 좌우12·radius24·내부4, 조작 min44. 제목18/26·700, 본문은 기존17/25.5. 360pt 미만은 `2026.11⌄`로 짧게 표기한다.
- 시트: 현재 pane 안 absolute, 하단은 일반 하단 탭 보호 높이/실제 Duo 여백 위, max94%, radius28·padding20/상단16. 닫기44, busy 중 드래그/닫기 제한. 웹 Escape·Tab 순환·복귀 포커스, 배경 콘텐츠 접근성 숨김. native 키보드 보호는 기존 Shell KeyboardAvoidingView를 사용한다.
- 시간표:64pt/시간·24시간, 주 컬럼 min88pt 및 lane당64pt, 일정 min44pt. 겹침이 많으면 가로로 넓혀 글자/터치 축소를 피한다. 최소 시각 높이는 실제 일정 길이보다 길 수 있어 정확한 시각을 라벨로 표시한다. 날짜/종일 헤더와 본문 가로 스크롤 동기화, 시간 눈금은 고정. 초기 선택일 근처·08:00에서 시작한다.
- 기간 전환은160ms fade/8pt 방향 이동. 동작 줄이기에서는 즉시/이동0. `expo-haptics ~58.0.7`의 selectionAsync는 iOS·동작 줄이기 꺼짐에서만 호출하고 지원 실패는 화면/저장을 막지 않는다.
- 날짜 선택→선택일 시트→일정 상세→편집. 편집 닫기→원래 상세, 상세 닫기→선택일, 선택일 닫기→월. 다른 앱 탭 이동은 시트를 닫되 탐색/작성/실행 대기 상태를 보존한다. 보기 설정은 적용 전 취소 가능하다.
- 같은 계정/세션의 상태를 유지한다. 이 개선의 보기 설정·선택 캘린더·일정 초안은 기기 영구 동기화 설정이 아니며 앱 재시작 후 복원까지 보장하지 않는다. 계정 변경 시 이전 초안/자료를 이어받지 않는다.

## 서버 계약과 원본 보호

1. `/api/capabilities.calendarWorkspace=2`. 인증된 `/api/calendar/calendars?cursor=`와 `/api/calendar/events?v=2&month=&start=&end=&timeZone=&calendarId=&cursor=`. Google 고정 HTTPS host, 인코딩된 본인 접근 소스 ID, 범위 최대370일·한 페이지50개. 오래된 클라이언트의 기존 월 기본 조회/AI 자료 locator는 유지한다. v2를 지원하지 않는 서버는 명시적 capability 기반 기존 기본 캘린더 조회만 사용한다.
2. 요청 전 본인 연결/읽기 feature, 응답 후 connectionId·accessToken 동일 여부를 검사한다. 캘린더 source role owner/writer와 **기존** calendarWrite feature가 모두 있어야 UI에 쓸 수 있다고 표시한다. 읽기 전용을 자동 승격하거나 OAuth/키를 바꾸지 않는다.
3. 원본 ID는 기본 캘린더 기존 namespace 유지, 다른 소스는 calendar ID의 SHA-256 일부를 namespace로 사용해 같은 eventId가 충돌하지 않는다. 캐시는 사용자+공급자+리소스 ID로 소유권을 검사하며 Todo 가져오기는 사용자 직접 선택이다.
4. 시간 일정은 원본 start/end와 IANA 표시 zone으로 날짜를 계산. 종일은 date만 보존하고 종료는 exclusive. 조회는 zone 현지 자정의 UTC instant를 사용한다. 없는 현지 시각은 저장하지 않는다. DST 가을 중복 시각은 현재 변환이 선택한 offset을 미리보기/원본에서 확인하며 두 occurrence 선택 전용 UI는 범위 밖이다.
5. 일정 create/update는 기존 assistant action 기능이다. AI 호출 없이 수동 작성 가능하며 `AI_ENABLED`가 수동 실행의 필수 조건은 아니다. 고정 필드 검증·10분 미리보기·계정 소유 확인·한 번 선점·연결/쓰기 역할 재검사·ETag/If-Match를 유지한다. 편집 전 ETag가 바뀌면 원본을 다시 읽도록 거절한다. 편집 초안은 eventId+ETag 별로 보존하므로 새 원본에 과거 메모/시각 초안을 조용히 덮어쓰지 않는다.
6. create는 결정적 provider event ID, `sendUpdates=none`; 종일/시간 인자 혼합·역전 거절. 참석자·초대 발송·반복 규칙 편집·삭제·첨부/지도·이동시간 UI는 추가하지 않았다. 반복 instance 편집은 그 한 건이며 series 전체 수정 버튼이 아니다.
7. 미리보기 취소/닫기는 실행 없이 DELETE. 확인 후 결과 불확실/통신 실패면 잠금 상태를 부모에 보존하며 닫았다 다시 열어도 재작성/재확인하지 않고 **저장 결과 확인** GET만 제공한다. 새 초안으로 폐기 버튼도 잠금 동안 숨긴다. 성공이면 초안 제거·일정 재조회. 원본 변경은 실제 사용자 확인 전 실행하지 않는다.
8. description이4,000자를 넘으면 상세에 더 있음 표시, 편집 시 메모 변경 인자를 보내지 않아 긴 원문을 잘라 덮지 않는다. 원본 링크는 실제 제공된 안전한 HTTPS만 열며 자료의 HTML/명령을 실행하지 않는다.

## 검증 명령과 증거 수준

```bash
npm run check
npm test
npm --prefix mobile run typecheck
CI=1 EXPO_NO_TELEMETRY=1 npm --prefix mobile run export:web
node mobile/e2e/calendar-workspace.mjs
npm --prefix mobile run test:e2e
npm --prefix mobile run test:motion
npm --prefix mobile run test:web-auth
npm --prefix mobile run test:automations
npm --prefix mobile run test:duo
CI=1 EXPO_NO_TELEMETRY=1 npm --prefix mobile run export:ios -- --max-workers 2
python3 scripts/build-handoff.py
npm --prefix mobile run test:project
```

단위 검사는 DST/자정/종일 끝·보기 단위·최소 터치/겹침과 소스 역할·본인 연결 변경·미리보기 무쓰기·한 번 확인·stale ETag를 다룬다. `calendar-workspace.mjs`는 월/상세/편집/종일/초안/주·일/탭복귀/검색/소스/부분/실패/로딩/불확실 쓰기 재발송 방지/키보드/폭/글자 확대를 실행한다. 실제 Google 원본은 쓰지 않고 fixture만 사용한다.

[새 캡처/관찰](../artifacts/calendar-workspace-2026-11-13/)은 감사 before 폴더를 덮지 않는다. 웹 대체 재질·격리 API이며 native Liquid Glass/실제 Duo 사진이 아니다. Duo 회귀도 이 폴더의 duo/에 새로 저장한다. 기존 감사·승인 그림과 일반 캡처는 보존한다. 실제 통과 수·커밋·배포는 아래 운영 기록에 추가한다.

## 다음 작업자와 실기기 검수

- [ ] 최신 main 새 **수동** 무료 빌드에서 native 컴파일·서명·Apple 처리·설치 번호 확인. 이번 작업에서 자동 TestFlight를 시작하지 않는다.
- [ ] 일반 iPhone/Duo 접힘·가로 분할·세로 단일에서 실측 월·우측 카메라 열·원형 복귀·키보드·초안/스크롤 확인.
- [ ] iOS 도구 regular Glass·투명도 줄이기/고대비·Dynamic Type 최대 크기·VoiceOver 순서·실제 picker·햅틱·빠른 전환/성능 확인. 현재 앱은 light 선언이므로 OS 다크 선택을 전체 dark UI 구현 성공으로 보고하지 않는다.
- [ ] 본인 Google 테스트 캘린더에서 read-only·쓰기 재승인·calendarList 페이지·종일/시간·시간대·ETag 충돌·한 번 저장·결과 확인. OAuth 동의는 사용자가 내정보→Google에서 직접 수행한다.
- [ ] Figma의 Current baseline 교정/Proposed 분리는 미완료. 이번 코드를 Figma에 이미 반영했다고 기록하지 않는다. 이 계약과 새 실제 코드 캡처를 기준으로 후속 교정한다.

다른 서비스는 실제 가용 높이·보기와 이동 단위 일치·선택/상세 맥락·읽기 상태·안전한 명시적 쓰기·접근성/증거 구분을 재사용한다. 덕의 오리/파랑/5탭/Duo 좌표와 수치를 브랜드 공통 규격으로 강제하지 않는다. [공통 원칙 v1.1](reusable-product-design-principles.md)을 따른다.

## 실제 로컬 검증 결과

전체241개 중240통과·실패0·기존 선택1개 제외. 문법46개·타입·최신 웹/iOS JS export·새 Calendar 브라우저 흐름·전체 앱/로그인/모션·예약·AI 채팅/오류·Duo 기하 회귀를 통과했다. 새 캡처27개와 checks.json/verification.json을 보존한다. 모의 저장 시도3건(성공2·결과불확실1), 불확실 이후 재발송0·운영 Google 쓰기0·페이지 JS 오류0이다. 단위/API 검사에서 실제 공개 응답의 accountLabel/calendarName/targetTitle을 확인했다.

테스트 보완: 유지 마운트된 비활성 Calendar 때문에 기존 전역 텍스트/목록 선택자가 중복됐으므로 화면에 실제 보이는 노드/내비게이션 범위로 좁혔다. 만료 세션 검사는 새 계정의 Todo 화면이 실제 준비된 후 서버 세션만 만료시켜 작성 시트 정리까지 검증한다. 기존 before/승인 캡처는 회귀 도구의 임시 출력으로 교체하지 않는다.

[실제 main 저장·CI·Render 공개 반영 확인](calendar-workspace-deployment-2026-11-13.md). 마지막 운영 기록 전용 커밋은 배포된 앱/서버/공개 HTML과 기능 차이가 없다.
