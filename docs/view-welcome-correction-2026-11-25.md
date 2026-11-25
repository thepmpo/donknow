# 캘린더 뷰 접근 복구 및 AI 첫 화면 중앙 정렬

작성일: 2026-11-25

## 요청과 최종 동작

사용자가 Duo 뷰 전환 버튼이 사라진 점을 지적하고 논 Duo 더블탭 전환을 확인했다. 이어 AI를 처음 열 때 로고와 “무엇을 도와드릴까요?”를 중앙에 배치하도록 요청했다.

- Duo: 카메라 예약 열의 기존 떠 있는 보기 버튼을 복구한다. 버튼으로 주간 → 일간 → 월간 → 주간을 순환한다. 캘린더 탭은 오늘 복귀이며 길게 누르기/더블탭 뷰 전환을 추가하지 않는다.
- 논 Duo: 캘린더 탭을 한 번 누르면 오늘로 복귀한다. 두 탭 사이 320ms 이내이면 주간·일간 전환을 한 번 실행한다. 기존 길게 누르기와 스크린리더 대체 액션도 유지한다.
- 웹: 오른쪽 년월 옆 보기 전환을 유지한다.
- AI: 빈 대화에서 애니메이션 로고, 질문, 설명을 하나의 묶음으로 대화 영역 가로·세로 중앙에 둔다. 화면 전체가 아니라 고정 헤더 아래부터 입력창 위까지가 기준이다. 로그인/데모 공통이며 기존 대화가 있으면 환영 화면을 표시하지 않는다. 직접 채팅 불가 상태는 기존 안내 문구를 유지한다.

## 구현 위치와 경계

`mobile/src/AppNavigation.tsx`의 `activate`가 캘린더 연속 탭을 판별한다. 원래 한 번 탭 동작은 즉시 실행해 Today 동작을 지연하지 않는다. 웹 터치 종료 뒤 합성 클릭의 중복 억제는 유지한다. 드래그 선택은 더블탭 판별을 통과하지 않으며 길게 누르기, 모달 차단, 기기 모드 변경, 앱 백그라운드에서 탭 누적을 초기화한다. `mobile/App.tsx`는 기존 범위 지정 calendar cycle 요청을 논 Duo 콜백에 연결한다.

`mobile/src/screens/CalendarScreen.tsx`는 `useDuoToday`에 뷰 메타데이터를 다시 전달한다. 원본 데이터 쓰기, 조회 범위, 주말 오른쪽 배치, 고정 여러 날 일정, 시간표 스크롤은 변경하지 않는다.

`mobile/src/ChatWelcome.tsx`가 브랜드 모션과 문구를 공유한다. flexGrow와 가운데 정렬을 사용해 절대 좌표나 기기별 상단 여백에 의존하지 않는다. `AssistantChat.tsx`의 빈 대화 ScrollView에는 대칭 패딩을 적용하고 `DuckScreen.tsx` 데모 빈 화면에도 채울 수 있는 ScrollView를 사용한다. 높이가 부족하면 스크롤할 수 있다. 실제 메시지 화면, 전송/원본 동기화/사용량 정책은 유지한다.

## 검증 및 재현

- `cd mobile && npm run typecheck`
- `cd mobile && npm test`
- `cd mobile && node e2e/view-welcome.mjs`
- `cd mobile && CALENDAR_WEEK_CAPTURE_DIR=/tmp/docen-week-check node e2e/calendar-week.mjs`
- `cd mobile && NAVIGATION_CAPTURE_DIR=/tmp/docen-nav-check node e2e/navigation-motion.mjs`
- `cd mobile && npm run export:ios`

새 E2E는 실제 컴포넌트를 사용하고 API만 가짜 계정/자료로 대체한다. Duo/논 Duo 로그인·데모 및 웹 로그인 총 다섯 경우의 중앙 좌표, 작은 화면 높이, 전송 후 환영 화면 제거를 확인한다. 논 Duo 첫 전환은 실제 브라우저 터치 두 번, 다음 전환은 마우스 더블클릭을 사용하고 한 번 탭에서 전환이 추가되지 않는지 확인한다. Duo 버튼 표시와 일간 전환도 확인한다. 주간 기존 E2E는 Duo 버튼 존재가 최신 동작임을 반영했다.

증거 화면은 `artifacts/view-welcome-correction/`, 기존 주간/모션 회귀 결과는 `artifacts/view-welcome-week-regression/`, `artifacts/view-welcome-nav-regression/`에 별도 저장한다. 모두 합성 자료이며 사용자 원본 영상은 포함하지 않는다.

실제 결과: TypeScript 검사 통과, 단위 테스트 127/127 통과, 환영/전환 E2E 5개 통과, 주간 통합 Duo·논 Duo·웹 3개 통과, 내비게이션 모션 회귀 통과, iOS JS export 통과. Duo 및 논 Duo 로그인 화면 PNG도 직접 확인했다. 실기기 터치/서명 IPA 설치는 이번 검증에 포함하지 않았다.

## 빌드 및 배포 구분

iOS JavaScript export는 서명된 IPA나 TestFlight 업로드가 아니다. 이 변경은 native 의존성/권한/서명을 바꾸지 않는다. 설치된 iPhone에서 확인하려면 새 native 빌드가 필요하다. 앞선 TestFlight workflow dispatch는 연결 권한의 Forbidden으로 차단되어 있으며 이번 소스 검증을 배포 성공으로 보고하지 않는다. 공개 소개 사이트 및 서버 배포는 이 작업의 변경 대상이 아니다.

## 되돌리기

이번 변경 전 기준 커밋은 `62ec56c`다. 이번 커밋을 revert하면 AI 중앙 정렬과 뷰 접근 복구만 되돌릴 수 있다. 이전 사용자 확정 주간 레이아웃을 통째로 되돌리지 않는다.
