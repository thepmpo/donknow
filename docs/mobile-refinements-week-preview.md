# 2026-11-25 — 모바일 후속 1~6번 반영 및 1주 뷰 시안

## 요청별 상태
1. 앱 헤더의 docen. 워드마크를 확대: 기본26px(기존20px), 좁은 내부 폭240pt 미만20px(기존16px). 56pt 헤더 높이는 유지. 좁은 화면은 글자 간격/중앙 제목 폭도 함께 조정해 겹침을 줄인다. 그림 내비게이션/OS 앱아이콘/홈페이지 로고 크기 변경으로 확장하지 않는다.
2. 캘린더 일간 목록은 좌우24pt, 위16pt 여백. 날짜 스트립에만 붙어 있던 좌우 제스처를 일간 본문 표면 전체로 넓혔다. 수평20pt/수직비율1.6 조건, 55pt 이상 release로 이전/다음 하루 이동, 작은 움직임은 복귀한다. 본문 세로 스크롤과 행 편집은 보존한다. periodShift의 기존 월/연 경계 계산과 캐시/계정 보호를 사용한다. 옆 날짜를 보이는 모션도 일간 목록에 적용했다.
3. 월 선택은 두 번째 줄 왼쪽. 옆의 ellipsis 버튼은 제거. 년월 누르면 년간 보기, 길게 누르면 기존 캘린더 메뉴(설정/검색/원본 선택 등)를 연다. 힌트 및 접근성 longpress 동작도 제공한다. 기능을 무단 삭제하거나 서버권한을 바꾸지 않는다.
4. 할 일의 날짜별/출처별/추가 줄은 PagePinned 보조 헤더. Page에서 본문 ScrollView 밖으로 옮겨 당김/세로 스크롤 중 좌표가 유지된다. 편집/선택/이동 기능은 보존한다.
5. AI 화면 왼쪽 브랜드에 ai를 붙여 docen.ai로 표시하고 가운데 중복 제목은 렌더링하지 않는다. 채팅 발신자/원본 브랜드/기술 ID는 바꾸지 않는다.
6. log의 ‘완료한 기록’ 소제목만 삭제. 전체/남은/완료 수치 및 ‘docen에서 완료한 일을 모아두었어요.’를 PagePinned에 넣어 고정한다. 실제 완료 목록만 스크롤된다.
7. 기존2주뷰를1주뷰로 바꾸는 작업은 **시안 단계만 진행**. 실제 CalendarView/주기/조회범위/기기별 보기 전환/2주 UI는 아직 바꾸지 않는다. 사용자가 손그림을 참고해 먼저 시안을 보라고 명시했다.

## 1주 시안의 해석과 경계
- 월~금은 5개의 동일한 세로 열. 오른쪽 여섯 번째 열은 위 토요일/아래 일요일로 반씩 나눈다.
- 물리 카메라와 기존 내비게이션은 더 오른쪽 별도 예약 열에 둬 일정 내용과 겹치지 않게 제안했다. 카메라 위치를 소프트웨어로 옮기거나 그 위에 내용을 그리는 구현이 아니다.
- 선택일은 파란 원/옅은 배경, 토요일 파랑/일요일 빨강. 일정은 시간+짧은 제목, 할 일은 체크박스로 구분한다. 주간 이동/항목 상세 같은 문구는 제안 UI다.
- 가로에서는 상세 제목을 읽기 편하게, 세로에서는 6개 열이 좁아 짧은 요약+눌러 상세를 제안한다. 세로 화면의 좁은 열은 확정된 해법이 아니므로 시안 확인 뒤 결정해야 한다.
- design-previews/docen-one-week/index.html은 서비스와 분리된 HTML 시안이다. 합성 일정이며 실제 계정/API를 연결하지 않았다. 이전/다음 주 버튼은 시안 날짜만 바꾼다. 홈페이지 배포 경로에 복사하지 않았다.
- PNG: artifacts/mobile-refinements-week-preview/06-week-landscape-proposal.png 및 07-week-portrait-proposal.png. 사용자 스케치/개인 영상 원본은 공개 저장소에 넣지 않는다.

## 구조 및 파일
- ScreenHeading: 더 큰 워드마크/AI 중복 제거.
- ui PagePinned: 모바일에서 고정할 직접 자식 슬롯. 제목과 묶어 실제 높이를 측정하고 새로고침 공의 시작 위치도 그 아래로 맞춘다. 데스크톱 Page에서는 기존 본문 흐름을 유지한다.
- TodosScreen/LogScreen: 보조 컨트롤과 안내를 고정 슬롯으로 전달.
- CalendarScreen: 월 컨트롤 순서/메뉴 버튼 제거, 일간 본문 여백과 제스처 범위, 날짜별 agenda 인자 및 캐시 기반 인접 일자 미리보기.
- fixed-header-refresh.mjs: 이전 회귀검사를 확장했다. HEADER_CAPTURE_DIR로 이번 증거를 별도 폴더에 기록해 이전 증거를 덮지 않는다.

## 검증 결과
- npm --prefix mobile run typecheck: 통과.
- node --test mobile/src/calendar-model.test.ts mobile/src/navigation-geometry.test.ts mobile/src/duo-layout.test.ts: 29개 통과(기간/연말 이동/geometry 포함).
- HEADER_CAPTURE_DIR=artifacts/mobile-refinements-week-preview node mobile/e2e/fixed-header-refresh.mjs: 통과. 실제 Shell에서 제목과 보조 컨트롤이 ScrollView 밖임을 확인. 로고 확대·왼쪽 AI 단일 표시·log 소제목 제거·월 선택 왼쪽/ellipsis 부재·년간 보기 및 길게 눌러 메뉴 열기·일간24pt 여백·CDP 터치로 목록 좌/우 스와이프해 다음날 및 원래 날짜 복귀·선택/드래그·3초 미만 새로고침과 늦은 응답 반영·320px 넘침 검사.
- EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2: iOS Hermes JS export 성공. 서명된 IPA/TestFlight 빌드 업로드를 뜻하지 않는다.
- `node design-previews/docen-one-week/capture.mjs`: HTML 시안 Chromium 가로1160×920/세로500×1030 캡처, 이전/다음 주 날짜 변경 확인. 시안 이미지는 검사 후 수락했다.
- 실제 iPhone touch/OS Dynamic Type/유리 광학 효과는 브라우저 검사가 대체하지 못한다. 사용자 기기 확인은 다음 native 빌드가 필요하다.

## 롤백 및 공개 범위
수정 전 커밋82b550c를 codex/rollback-before-week-preview-20261125에 보존한다. main 강제 덮기보다 해당 기능 커밋을 revert한 새 커밋/새 빌드를 사용한다. 기존 codex/rollback-before-fixed-headers-20261125도 유지한다. API/DB/가격/계정/앱Bundle/도메인/약관/로그인 공개 제한은 변경하지 않는다. 1주 시안은 앱이나 공개 소개 홈페이지에 자동 적용하지 않는다.


## 후속 확정 — 시간순과 화~수 여러 날 일정, 논 Duo 시안
사용자가 1주 레이아웃 방향을 ‘맞아’로 확인하고 시간순 정렬, 화요일부터 수요일까지 이어지는 일정 예시, 논 Duo 시안을 추가로 요청했다. 이 후속 요청도 시안을 그리는 범위다. 앱의 기존2주뷰는 아직 변경하지 않는다.

### 공통 정보 표현
- 여러 날에 걸친 일정은 날짜 제목 아래 별도 띠에서 연속 막대로 연결한다. 예시는 팀 워크숍, 2026-11-24(화)~25(수). 막대의 시작/끝은 두 날짜의 열과 일치한다. 가로에서는 제목 옆 날짜 범위, 세로에서는 짧은 제목과 아래 설명으로 범위를 확인한다. 접근성 라벨에는 전체 시작/종료 날짜를 넣었다.
- 각 날짜의 당일 일정은 시작 시각으로 오름차순 정렬한다. 예시 수요일9:00메일확인→10:00제품미팅→15:30초안검토. 입력 예시 배열 자체는 의도적으로 뒤섞어 실제 정렬하는 코드를 검증했다.
- 시간이 없는 할 일은 시간 일정 아래 체크박스 항목으로 표시한다. 여러 날 일정과 단일 날짜 일정이 같은 항목처럼 반복되지 않게 제안했다.

### 기기별 시안
- Duo: 기존에 방향을 확인한 월~금5열 + 오른쪽 토/일 상하 배치, 별도의 카메라/내비게이션 예약 열 유지.
- 논 Duo: 카메라용 오른쪽 열이 없으므로 월~일7열을 나란히 배치하고, 표준 하단5탭 내비게이션과 상단 안전영역을 둔다. 토/일은 파랑/빨강으로 구분한다. 상태표시용 노치는 시안 장식이며 실제 하드웨어 geometry를 흉내내서 앱에 적용한 것이 아니다.
- 좁은 화면에서 긴 제목이 줄바꿈되는 시각 한계는 시안에서 보이는 그대로다. 원본 제목/일정을 삭제하거나 데이터 길이를 제한한 구현은 없다.

### 파일과 재현
- design-previews/docen-one-week/multi-day.html: 앞 시안을 보존한 별도 후속 파일. `?mode=standard`로 논 Duo 레이아웃 전환, 기본은Duo. 실제API/계정/앱페이지와 연결하지 않는다.
- design-previews/docen-one-week/capture-multi-day.mjs: `node design-previews/docen-one-week/capture-multi-day.mjs` 실행. 로컬 Chromium으로 합성 시안을 캡처한다.
- artifacts/week-multiday-preview/01-duo-landscape.png: Duo 가로1160×920.
- artifacts/week-multiday-preview/02-duo-portrait.png: Duo 세로500×1060.
- artifacts/week-multiday-preview/03-non-duo.png: 논Duo500×1060.
- 세 화면을 직접 열어 확인했다. 화요일열에서 수요일열끝까지 span좌표 일치,7개날짜,각날짜시간오름차순,Duo주말상하/카메라겹침없음,논Duo주말같은행/넓은하단탭,가로넘침없음,이전/다음주조작,JS오류없음 검사가 통과했다.
- 앱 코드/새 native빌드/홈페이지 배포는 이 시안 후속에서 진행하지 않았다.
