# 2026-11-25 — 고정 모바일 헤더, 제한 시간 새로고침, 안정적인 선택

## 요청과 영상 관찰
사용자는 29.47초 새로고침 녹화와 14.70초 선택 녹화를 제공하고, 새로고침은 3초를 넘기지 않고 기존 내용을 표시하며 느린 응답은 나중에 반영하라고 요청했다. 선택 버튼 숨김, 선택 모션 개선, 스크롤 중 고정 헤더, 모든 화면 왼쪽 docen. / 가운데 페이지명, 캘린더 월 선택은 다음 줄, 디자인 후 빌드 및 롤백 가능성을 요청했다. 뒤이어 UX/UI 관점과 필요한 스킬 사용을 강조했다. Product Design audit 지침으로 제공 영상에서 화면을 추출해 검토했다. 영상 전체/개인 할 일 텍스트는 공개 저장소에 추가하지 않았다.

1. 새로고침: 제목이 스크롤 내용 안에 있어 당길 때 같이 내려왔다. 로딩 모션은 네트워크 완료와 결합돼 느린 연결만큼 계속됐다.
2. 선택: 화면 좌표에 기반한 재배치 애니메이션과 선택 도구의 레이아웃 변화가 결합돼 행이 크게 벌어지는 모습이 있었다. 두 개의 체크 UI도 선택과 완료의 의미를 혼동시켰다.
3. 캘린더: Duo와 일반 화면의 헤더 구성이 달랐고 년월/보기/제목이 같은 줄의 공간을 경쟁했다.

## 최종 디자인과 구현
### 헤더
- 모바일 ScreenHeading: 56pt 고정 높이, 왼쪽 docen. 워드마크(파란 점 #2366e8), 가운데 18px/26px/700 페이지명. 브랜드는 20px/28px/800. 좁은 내부 폭 240pt 미만에서는 각각 16px/14px로 줄이고 실제 중앙 정렬은 유지한다.
- Page는 직접 자식 ScreenHeading을 ScrollView 밖의 고정 영역으로 분리한다. 본문만 당기거나 스크롤되고 제목은 제자리에 남는다. 추가 고정 영역을 만들었으므로 본문 위 여백은 4pt로 조정한다.
- Chat의 ScreenHeading은 원래 ScrollView 밖에 있으므로 같은 공통 디자인을 사용한다. 캘린더도 같은 헤더 다음 별도 44pt 날짜 조작 줄을 둔다. 날짜 줄 우측은 년월 선택/더보기이며 기존 년간 보기, 더보기, 보기 전환 기능은 보존한다.
- App의 기존 독립 그림 헤더는 주 서비스 화면에서 중복 렌더링하지 않는다. 인증/연결 화면의 기존 처리와 데스크톱 ScreenHeading 디자인은 유지한다. 이번 명시 요청으로 이전 Duo 제목 축약/숨김 규칙보다 모바일 공통 docen. 헤더를 우선한다.

### 새로고침
- useRefreshIndicator는 실제 요청과 별개의 표시 상태만 관리한다. 2800ms 상한으로 RefreshControl의 refreshing과 브랜드 공 표시를 종료한다. 빠른 완료는 즉시 종료하고 최소 대기 시간을 만들지 않는다.
- 타임아웃은 요청 취소/성공 처리/빈 목록 전환이 아니다. 기존 Todo/캘린더 캐시를 그대로 보여주며 실제 응답은 기존 저장소의 계정/세션/쓰기 revision 검사 뒤 도착 즉시 반영한다.
- Todo refresh는 저장소와 캘린더 조회를 병렬 실행한다. 느린 캘린더 때문에 먼저 온 Todo 응답의 반영을 막지 않는다. 동일 화면에서 요청이 진행 중이면 추가 pull은 중복 요청을 시작하지 않는다.
- 네트워크 지연 자체를 3초 내 해결한다는 약속은 아니다. UI가 기다리는 표시를 3초 이하로 제한하는 계약이다.

### 선택과 이동
- 기본 ‘선택’ 진입 버튼은 숨겼다. 항목을 길게 눌러 선택하며 상단 ‘완료’로 선택 모드만 종료한다. 하단 도구의 ‘완료’는 선택한 할 일을 실제 완료하는 별개 동작이다.
- 선택 상태는 기존 앞 체크박스를 사용하고 행 오른쪽의 별도 선택 원은 제거한다. 링크가 원래 있던 항목은 그 자리 폭을 보존해 글자가 다시 줄바꿈하며 높이가 바뀌지 않게 한다. 체크박스의 접근성 checked/라벨도 선택 상태로 전환한다. 길게 누르기 설명 및 접근성 동작을 제공한다.
- 하단 선택 도구는 absolute overlay로 배치해 ScrollView 높이를 줄이지 않는다. 선택 중 본문 아래 공간만 추가해 마지막 항목이 가려지지 않게 한다. 날짜 그룹의 추가 버튼 자리도 선택 중 같은 높이를 유지한다.
- 선택/편집/드래그 중 ReorderItem의 재배치 offset을 0으로 초기화하고 과거 화면 좌표를 버린다. 단순 선택에서 이전 스크롤 좌표와 현재 좌표 사이를 이동하는 애니메이션을 만들지 않는다.
- 길게 누른 뒤 6pt 이상 움직여야 실제 drag를 시작한다. 가만히 놓으면 선택만 된다. drag preview는 고정 y=100 대신 원래 행을 측정한 위치에서 시작한다. release/cancel/화면 전환 시 후보·preview 상태를 정리한다. 기존 계정 경계/원본 수정/저장 실패 복구를 보존한다.

## 파일 지도
- mobile/src/ScreenHeading.tsx: 공통 모바일 헤더 디자인.
- mobile/src/ui.tsx: 고정 Page 헤더, 제한된 RefreshControl, 선택 체크박스/접근성.
- mobile/src/useRefreshIndicator.ts: 표시 전용 2800ms 타이머와 cleanup.
- mobile/src/screens/TodosScreen.tsx: 숨긴 선택 진입, 선택·드래그 분리, floating 도구.
- mobile/src/screens/LogScreen.tsx: 중복 pull 방지.
- mobile/src/screens/CalendarScreen.tsx: 공통 제목 다음 날짜 조작 줄.
- mobile/src/motion.tsx: 선택 중 불필요한 과거 offset 제거.
- mobile/App.tsx: 서비스 화면 중복 그림 헤더 제거.
- mobile/e2e/fixtures/fixed-header-refresh.tsx: 실제 Shell + 제어 가능한 느린 refresh의 합성 fixture.
- mobile/e2e/fixed-header-refresh.mjs: 실제 브라우저 입력/스크롤/지연 완료 검증 및 캡처.

## 검증
- `npm --prefix mobile run typecheck`: 통과.
- `npm --prefix mobile run check:native`: 격리 iOS prebuild/로컬 native 모듈 연결 검사 통과(실제 Swift 컴파일은 Mac 빌드 필요).
- `node --test mobile/src/navigation-geometry.test.ts mobile/src/duo-layout.test.ts`: 21개 통과.
- `node mobile/e2e/fixed-header-refresh.mjs`: 실제 Shell에서 고정 헤더 위치, 숨긴 진입 버튼, 길게 누른 선택/이동 preview/해제, 캘린더 날짜 줄 및 년간 보기 복귀, 페이지별 56pt 높이, 3초 미만 표시 종료, 기존 내용 유지, 늦은 완료 반영, 빠른 완료, 320px 폭 넘침을 검사한다.
- `EXPO_NO_TELEMETRY=1 CI=1 npm --prefix mobile run export:ios -- --max-workers 2`: Hermes iOS JS bundle 생성 통과.
- iOS JS export와 서명된 IPA/TestFlight 업로드는 별개다. 실행 결과는 아래 영수증에 기록한다. 브라우저 검사는 native iOS pull 제스처/광학 glass/촉감의 실기기 검증을 대체하지 않는다.
- 합성 데이터 캡처: artifacts/fixed-headers-refresh/. 외부 계정/원문 영상은 포함하지 않는다.

## 롤백
- 수정 전 기준 커밋: `6ca14d5`.
- 보존 브랜치: `codex/rollback-before-fixed-headers-20261125`.
- 이전 버전 전체 소스가 필요하면 해당 브랜치를 별도 checkout한다. 배포 이후 취소할 때는 main을 force push/reset하지 말고 이 기능 커밋을 `git revert <기능 커밋>`으로 되돌려 정상 forward history를 만든다. 이후 이전 UI를 담은 새 native 빌드를 제출해야 설치 앱에서도 돌아간다.
- DB/schema/계정/가격/Bundle ID/서명키/약관은 변경하지 않아 별도 데이터 롤백은 없다.

## 빌드 영수증
최종 실행 결과 기록 예정.
