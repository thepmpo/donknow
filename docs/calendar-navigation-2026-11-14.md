# 캘린더 재선택·길게 누르기 — 기기별 현재 구현 계약

2026-11-14 사용자의 기기별 답변에 따른다. [비교·영상·미정 선택](calendar-navigation-review-2026-11-14.md) 중 **탭 조작 두 항목만 승인**됐으며 **년월 선택 UI는 답변 대기, 변경하지 않았다**. [viewport·캐시](calendar-viewport-2026-11-13.md), Glass·카메라 열·원본 쓰기/인증 계약은 유지한다.

## 사용자에게 쉬운 안내

| 조작 | 일반 iPhone | Duo 접힘/세로 단일 본문 | Duo 펼친 가로 |
| --- | --- | --- | --- |
| 다른 탭에서 캘린더 누르기 | 오늘로 이동 | 보던 날짜로 진입 | 오른쪽에 보던 캘린더 표시 |
| 이미 선택된 캘린더 다시 누르기 | 오늘로 이동 | 오늘로 이동 | 오른쪽 캘린더만 오늘로 이동 |
| 캘린더 길게 누르기 |2주 보기. 다른 탭에서 들어오면 오늘 기준 |보던 날짜의2주 보기로 진입 |오른쪽이캘린더면 오른쪽2주,다른화면이면 왼쪽고정캘린더2주. 오른쪽화면은 유지 |
| 기존 보기 버튼 |제목 옆 버튼 유지,월↔2주 전환 |오른쪽Today 아래의 보기 버튼 유지 |같은배치·오른쪽캘린더 우선/아니면 왼쪽 |

Duo의 물리 카메라 열 순서는 여전히 **Today →2주 보기→기존5탭**이다. Today 동작은 현재 월/2주/주/일/목록 모드를 바꾸지 않고 날짜만 오늘로 맞춘다. 길게 누르기는2주로 **설정**하며 이미2주라고 월간으로 되돌리지 않는다. 상단/전용 보기 버튼은 기존처럼 월↔2주를 전환한다.

일반폰 진입Today는 명시적인 탭 선택에만 적용한다. 앱 복귀·기기 회전·접힘/펼침을 새 탭 선택으로 오판해 보고 있던 날짜/입력/스크롤을 초기화하지 않는다.

## 용어와 근거

- Force Touch/3D Touch: 누르는 압력 감지. 이번 구현은 압력을 읽지 않는다.
- Haptic Touch: 길게 누르는 조작. 코드에서는React Native `onLongPress`, **500ms**(덕 선택값)다.
- 햅틱: 손끝 진동 피드백. iOS에서는 기존 `expo-haptics.selectionAsync` 경로로 보조 피드백, 동작 줄이기/지원 실패 시 조용히 생략한다.
- 모션: 화면 이동/확대 등 시간에 따른 변화. 탭의 기존 Glass 눌림/끌기/250ms 이동과 캘린더160ms 전환·동작 줄이기를 유지한다.
- Liquid Glass: 재질 표현. 길게누르기500ms나2주 조작을 Apple의 공식 고정규격이라고 하지 않는다. 실제 진동·압력 감지는 영상/웹 검사로 확인했다고 하지 않는다.

Apple [Context menus](https://developer.apple.com/design/human-interface-guidelines/context-menus)는 숨겨진 동작의 기본화면 경로 유지, [Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)는 최상위 탐색/상태 보존을 안내한다. 요청한 날짜 단축은 덕의 선택이고, Apple이 탭에서 동일 단축을 요구했다는 뜻은 아니다.

## 구현 수치·파일·가드

| 요소 | 기준 | 파일 |
| --- | --- | --- |
| 탭 진입/재선택 |일반폰모든 Calendar선택→Today,Duo현재tab이Calendar일때만Today | mobile/App.tsx.selectTab |
| 길게 누르기 대상 |duo+split+다른탭이면fixed,그외active. 일반폰다른탭진입만 resetToToday=true | App.tsx.longPressCalendar |
| 제스처 |calendar에만onLongPress500ms. drag중/suppress중 실행 금지,길게누른후onPress중복 차단 | AppNavigation.tsx |
| 명령 |id/action/resetToToday/scope를지닌메모리요청. target별pane에만 전달 | CalendarScreen.CalendarNavigationRequest / App |
| scope |현재서버주소+Duck사용자ID,체험은demo. 세션변경때요청폐기 | App / CalendarScreen |
| 적용 |현재scope와미처리id만. 비활성/열린시트에서는 요청을소비하고 무시해 나중에 튀어나오지 않음 | CalendarScreen.useEffect |
| 상태 |모드·날짜변경만. 정상캐시/연동/원본쓰기/초안/선택출처/시간대/인증을 지우지 않음 | CalendarScreen / 기존useCalendarData |

긴 입력/편집/저장 미리보기 시트가 열려 있으면 단축을 실행하지 않는다. 닫힌 뒤 과거 단축을 뒤늦게 실행하지도 않는다. 계정·서버 변경 후 이전 요청을 새 사용자 화면에 적용하지 않는다. 원본 저장·발송을 호출하거나 자동 반복하지 않는다.

## 검수와 증거

- [일반폰 진입Today](../artifacts/calendar-navigation-2026-11-14/01-ordinary-enter-today.png)
- [일반폰 길게누른후2주](../artifacts/calendar-navigation-2026-11-14/02-ordinary-long-press-fortnight.png)
- [다른탭에서길게누르기](../artifacts/calendar-navigation-2026-11-14/03-ordinary-long-press-from-other-tab.png)
- [Duo 오른쪽이Todo일때왼쪽2주](../artifacts/calendar-navigation-2026-11-14/duo/15-long-press-left-calendar.png)
- [Duo 오른쪽캘린더2주](../artifacts/calendar-navigation-2026-11-14/duo/16-long-press-right-calendar.png)
- [접힌Duo2주](../artifacts/calendar-navigation-2026-11-14/duo/17-folded-long-press-calendar.png)

실제 Expo UI+합성 API/기하 fixture다. 사용자의 Apple 원본영상/개인일정 캡처는 공개하지 않았다. 현재 날짜는 고정 테스트 시각/기하 fixture 시각이며 기기사진이라고 하지 않는다.

```bash
npm run check
npm test
npm --prefix mobile run typecheck
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:web -- --max-workers 2
node mobile/e2e/calendar-navigation.mjs
DUO_CAPTURE_DIR=/tmp/duo-navigation node mobile/e2e/duo-layout.mjs
CALENDAR_CAPTURE_DIR=/tmp/calendar-workspace node mobile/e2e/calendar-workspace.mjs
CALENDAR_CAPTURE_DIR=/tmp/calendar-cache node mobile/e2e/calendar-cache.mjs
EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2
```

새 탭조작·같은탭재선택·다른탭긴누름·손을뗄때중복0·상단경로·취소·Enter키·동작줄이기/일반모션·Duo좌/우/접힘·열린시트보존을 검사한다. 웹에서tab역할의 Space는 React Native Web이 지원하지 않아 Enter로 검사한다. 이를 제품 오류나 native키보드 전체 지원 검증으로 과장하지 않는다.

실제 iPhone에서 길게누르기/손떼기·진동·VoiceOver·회전/접힘·Glass 광학효과를 새빌드 설치 후 확인해야 한다. iOS JS 번들은 IPA/Apple업로드가 아니다. 기존 무료/수동 TestFlight 정책과 복구bundle·데이터/인증을 보존한다. 년월 탐색/Apple 연간줌은 아직 구현 완료로 표시하지 않는다.
