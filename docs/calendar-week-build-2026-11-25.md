# 2026-11-25 — 승인 주간 시안의 실제 구현·빌드 준비

## 승인과 범위
사용자가 최신 Duo/논 Duo 모바일 년월 한 줄 시안을 확인한 뒤 ‘빌드 진행’이라고 지시했다. 이전에 시안으로만 남겨둔 주간 시간표를 실제 앱 코드에 연결한다. 단순히 예전 앱을 재빌드하는 것으로 처리하지 않는다. 그동안 확정된 헤더/선택/로딩 변경도 현재 main에 유지한다.

## 실제 동작
- 캘린더는 새 1주 보기로 열린다. 월~금은 시간표, 오른쪽 같은 열에 토요일 위/일요일 아래 시간순 목록. 월~일 정확한7일을 조회하며 주간은 월요일 시작으로 고정한다. 월간 보기의 사용자 지정 시작 요일은 그대로 유지한다.
- 모바일의 제목 아래 기간/오른쪽 년월을 한 줄로 배치한다. 별도‹›와 뷰 변경 버튼, Duo의 떠 있는 뷰 버튼은 표시하지 않는다. 년월 누르기는 년간 보기, 년월 길게 누르기는 기존 메뉴. 월/주간/일간/목록 보기와 설정/검색/연결 상태/추가 기능은 메뉴에서 이용한다. 논 Duo 내비게이션의 캘린더 길게 누르기는 주간↔일간, Duo에는 길게 누르기를 새로 추가하지 않는다.
- 웹은 기존 DesktopWorkspace 안에 새 주간 본문을 연결한다. 년월과 뷰 변경은 헤더 오른쪽에 나란히 둔다. 공개 소개 페이지나 인증 차단은 변경하지 않는다.
- 논 Duo AI탭은 기존 그림 아이콘을 유지하고 docen.ai 글자를 제거한다. 접근성 탭 이름/탭 선택/내비게이션 모션은 유지한다.

### 여러 날·종일 일정
- all-day endDate는 종료일 제외(exclusive)로 계산한다. 11/24~11/26 exclusive는 화~수2칸이다. 시간 일정도 끝 시각에서1ms를 뺀 현지 종료일로 계산해 자정에 끝나는 일정이 다음 날에 잘못 이어지지 않게 한다.
- 종일/여러 날/종료 시각 미상 일정은 위의 고정 영역에 둔다. 날짜가 겹치는 막대는 다른 행으로 쌓고 날짜가 겹치지 않는 막대는 행을 재사용한다. 주 밖으로 이어지는 일정은 잘라 표시하되 계속 화살표와 접근성 설명을 붙인다.
- 여러 날 행은 실제 레이아웃 높이를 차지하므로 늘면 시간표 시작점이 아래로 이동한다. 시간표를 스크롤해도 날짜와 막대는 같은 위치에 있다.
- 매우 많은 행이 상단 전체를 덮지 않도록 상단 영역을 가용 높이의40%까지 둔다. 이 한도를 넘은 막대도 삭제/+N축약하지 않고 그 고정 영역 안에서 따로 스크롤해 볼 수 있다. 일반 행 수에서는 시안처럼 그대로 쌓이고 아래를 민다.
- 주말에만 걸친 일정은 평일 영역에 잘못 그리지 않고 주말 목록에서 표시한다. 금~토 등 연결 일정은 평일 막대의 계속 표시와 해당 주말 목록에서 확인한다.

### 시간표와 할 일
- 시간표는24시간/1시간72pt의 가로선이며 본문만 세로로 스크롤한다. 같은 시간대 이벤트는 겹침 그룹별lane으로 나눠 좌우로 배치한다. 실제 시작/종료 시각은 유지한다.
- 짧은 카드와 시간 있는 할 일은 읽을 공간을 위해 최소30분의 **표시 슬롯**을 사용한다. 할 일에 새 종료시각을 저장하는 것이 아니다. 할 일은 원래 dueTime만 표시하고 기존 onTodo 편집으로 연결한다. 당일 자정을 넘겨 카드가 그려지지 않게 표시 높이는 자른다.
- 시간이 없는 할 일/유효하지 않은 DST 로컬시각 등은 임의의 시각으로 강제 변환하지 않는다. 날짜 헤더의 할 일 수와 그 날짜 상세에서 확인한다. 완료한 할 일은 미완료 목록에서 제외한다.
- 날짜 선택은 기존 일간 상세, 막대/시간카드/주말 일정은 기존 provider event 상세, 할 일은 기존 편집으로 연결한다. 원래 CalendarEvent/Todo 객체를 전달하므로 eventId/calendarId/connectionId/ETag/원본 수정·쓰기 확인 동작을 새로 만들거나 우회하지 않는다.
- 주간 좌우 스와이프는7일 이동, 세로 스크롤은시간표. 캘린더 탭을 다시 눌러 오늘로 돌아갈 때 같은 주를 이미 보던 경우에도 시간표를 현재 시간 근처로 다시 맞춘다. API 응답이나30초 시계 갱신은 사용자가 보고 있는 스크롤 위치를 되돌리지 않는다.

### 현재 시각과 상태
- 캘린더 표시 timezone의 현재 분으로 빨간 선과HH:mm을 계산한다. 해당 주의 평일에 오늘이 포함될 때만 표시한다. 주말은 시간 비례 칸이 아니므로 주말 목록 위로 선을 연장하지 않는다.
-30초마다 갱신, 앱 백그라운드에서는 타이머 중지, 복귀 시 즉시 재계산. 화면 비활성화/모달 상태에서도 타이머를 불필요하게 계속 돌리지 않는다.
- 기존 useCalendarData의 캐시·출처별 도착 즉시 반영·계정/조회 generation 보호를 그대로 사용한다. 조회 실패 시 이미 받아둔 일정은 남고 연결 상태 안내로 재확인할 수 있다. 오류/부분 응답 상태를 빈 시간 확정으로 표현하지 않는다. 로그아웃 때 이전 계정 일정이 지워지는 것을 확인했다.

## 파일 지도
- mobile/src/calendar-week-model.ts: 월~일7일, 날짜 범위/상단 막대 lane, timed Todo 표시 모델, 주말 시간순 목록. 원본 객체를 변경하지 않는다.
- mobile/src/CalendarWeekWorkspace.tsx: 실제 RN 고정 날짜/막대, 시간표, 오른쪽 주말, 시계,스크롤 복귀.
- mobile/src/screens/CalendarScreen.tsx: 새week보기 통합,7일 API기간,모바일/웹헤더,메뉴·상세·편집 연결. 기존2주 화면 경로 제거.
- mobile/src/calendar-model.ts: 논 Duo 길게 누르기week/day. 순수 모델의옛fortnight타입/함수는호환용유지. 기술 navigation action 'fortnight'가 들어와도week로해석한다.
- mobile/src/AppNavigation.tsx: 논 Duo AI그림만 표시.
- mobile/src/calendar-week-model.test.ts:9개새기간/lane/종료일/주말/할일/DST검사.
- mobile/e2e/fixtures/calendar-week.tsx 및 mobile/e2e/calendar-week.mjs: 실제 useTodos/useCalendarData/CalendarScreen/Navigation/DesktopWorkspace를 합성API와 연결한3기기통합검사.
- mobile/e2e/fixed-header-refresh.mjs: 새 숨김뷰메뉴 진입/오른쪽년월 기준 회귀수정.
- mobile/e2e/navigation-motion.mjs: NAVIGATION_CAPTURE_DIR 출력분리만 추가. 이전증거를 덮지 않고 새 결과를 보관한다.
- mobile/package.json: test:calendar-week 명령 추가, 의존성/서명 변경 없음.

## 검증 결과
- npm --prefix mobile run typecheck: 통과.
- npm --prefix mobile test:127개 통과. 그중 새주간/기존calendar/geometry대상38개도별도통과.
- npm --prefix mobile run check:native: 격리 iOSprebuild/로컬모듈접근검사통과. 실제 Xcode Swift컴파일은 Mac빌드에서 수행해야 한다.
- npm --prefix mobile run test:calendar-week: Duo430×844/논Duo390×844/웹1360×960 통과. 실제7일API쿼리,오른쪽주말상하,고정막대·이동하는시간표,겹친시간카드좌우분리,년월우측/모바일뷰UI없음/웹뷰인접,종일상세·시간없는할일일간상세·시간있는할일원본편집연결,주간→일간→주간,현재시간30분진행시36px이동,같은주오늘복귀시현재시간대로스크롤,조회503시캐시유지,로그아웃시이전일정제거,가로넘침/JS오류없음을검사했다.
- HEADER_CAPTURE_DIR=artifacts/calendar-week-build/header-regression node mobile/e2e/fixed-header-refresh.mjs: 통과. 기존 고정헤더/보조헤더/선택모션/3초이하refresh/늦은결과반영 유지.
- node mobile/e2e/navigation-motion.mjs: 세로/가로 내비게이션 렌즈/드래그/취소/연속탭/중복선택방지/차단/reduced motion통과. 결과는 artifacts/calendar-week-build/navigation-regression으로보관하고과거캡처는복원했다. 이후 NAVIGATION_CAPTURE_DIR로직접지정가능.
- EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2: Hermes iOS JS bundle export통과. 서명 IPA/TestFlight업로드와 구분한다.
- 실제화면증거 artifacts/calendar-week-build/{duo,standard,web}-week.png. 합성자료만포함,사용자개인영상/실제외부계정자료없음. 직접열어시각확인했다.

## 제한과 롤백
- 좁은 화면에서 겹침 lane이 많으면 카드 제목이 짧게 표시된다. 전체 제목/시각은 접근성라벨과일간/이벤트상세에서확인한다. 실제 iPhone터치감/OS글자확대/유리광학효과는 브라우저 검사가 대신하지 못한다.
- 변경전 기준7326318af0ddea7ee5ff1e014bc0c5c3645a24b7 및 codex/rollback-before-week-build-20261125 보존. 취소할 경우 기능커밋을 revert한 새커밋과 새native빌드로 되돌린다. main강제reset/기존DB복구는필요없다.
- BundleID com.sjfieni.duckduck/계정/DB/API/가격/약관/기존 서명/무료표준Macworkflow 유지. 유료EAS클라우드나유료러너로우회하지않는다.
- 홈페이지/Render배포/DNS변경을이번빌드작업으로확대하지않는다. 공용RN웹코드는변경됐으나실제웹호스트배포여부는별도다.

## 빌드 영수증
- 기능 커밋 `4d16226`, main과 codex/desktop-day-workspace에 push 완료. 롤백 브랜치 codex/rollback-before-week-build-20261125도 origin에 push 완료.
- 최신 소스로 typecheck/모바일127개/3기기주간통합/고정헤더·로딩회귀/내비게이션회귀/native prebuild/iOS Hermes export가 통과했다.
- `gh api --method POST repos/thepmpo/donknow/actions/workflows/ios-testflight.yml/dispatches -f ref=main` 요청은 현재 연결에서 `Forbidden`으로 거절됐다. 이 응답을 자동 승인 심사 거부라고 판정할 근거는 없다. 서명된 IPA/TestFlight workflow는 시작되지 않았다.
- 수동 실행: https://github.com/thepmpo/donknow/actions/workflows/ios-testflight.yml → Run workflow → main → Run workflow. 최신 main으로 실행해야 하며 예전 run의 재실행은 최신 기능 소스의 빌드가 아니다.
- 이번에 workflow 트리거/서명/요금/배포 타겟을 바꾸거나 유료 클라우드 빌드로 우회하지 않았다. 설치 iPhone 반영은 위 native build-and-submit 성공 및 새 빌드 설치 후 가능하다.

