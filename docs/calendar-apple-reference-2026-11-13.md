# Apple 캘린더 참고 수정 · 현재 계약 · 2026-11-13

이 문서는 같은 날의 [CA-01~20](calendar-workspace-2026-11-13.md) 이후 사용자 정정을 반영한다. 겹치는 시각 규칙은 이 문서를 우선한다. 기존 기능·데이터·인증·원본 확인 경계는 그대로다.

## 사용자 확정

- 첨부한 Apple 월 달력과 일정 상세의 정보 구조를 참고한다. 사용자의 캘린더 제목/개인 자료가 있는 참고 스크린샷 원본은 공개 저장소에 복사하지 않는다.
- 년·월 선택은 **캘린더 본문 오른쪽 위**다. 카메라/배터리 열에 올리지 않는다.
- **오늘은 물리 카메라 열에서 기존 세로5탭 바로 위의 별도 원형 버튼**이다. 접힘·펼침 모두 같다. 탭 바를 위로 끌어올리지 않는다.
- **시스템 설정에 따라 밝게·어둡게**다. 기존 light 고정 정책을 대체한다. 색상을 바꾸기 위해 현재 화면/입력/편집을 재생성하지 않는다.
- 월 경계의 이전/다음 달 날짜는 현재 달보다 옅게 한다. 오늘·선택일은 우선 강조한다. 사용자의 “저번달과 이번달”은 인접 월 경계 날짜로 해석했으며 현재 달 전체를 흐리게 만들지 않는다.

## 화면·흐름

| 영역 | 현재 구현 | 원본 |
| --- | --- | --- |
| 제목·날짜 | 공통 제목 기준선 유지, 년·월은 본문 우상단 44pt 조작부 | CalendarScreen / ScreenHeading |
| 보조 명령 | 이전/다음, 일반폰 오늘, 보기 전환·검색·추가. 큰 2단 Glass toolbar 제거 | CalendarScreen |
| 보기 | 보기 전환 버튼 → 월/주/일/목록. 같은 시트에서 보기 설정 진입 | CalendarScreen |
| 월 | 7열·42일 유지. 주 높이 최소92pt, 공간이 부족하면 달력 내부 세로 스크롤. 상시 아래 agenda 제거 | CalendarScreen |
| 일정 | 제목 chip 직접 탭 → 일정 상세. 날짜 숫자/빈 곳 → 해당일 일정·할 일 시트. 길게 누름 → 추가 | CalendarScreen |
| 상세 | 큰 제목/날짜·종일 또는 시간, 출처 색상 세로선, 캘린더/알림 그룹 행, 장소·메모·원본/회의 링크·Todo 가져오기 | CalendarScreen / CalendarSheet |
| 편집 | 편집 → 기존 초안 → 계정·대상·내용 미리보기 → 사용자 확인 → 한 번 저장 | CalendarEventEditor |
| 출처·권한 | 실제 본인 source 색상, 읽기/쓰기 라벨. 임의 색상으로 서로 다른 가짜 캘린더를 만들지 않음 | useCalendarData |
| 오류 | 기존 일정 보존·확인 실패·재시도, 상세 원인을 회색 설명으로 표시. 미확인을 빈 일정/가용 시간으로 표현하지 않음 | useCalendarData |

목록 보기의 날짜와 Todo는 왼쪽 정렬한다. 월/주/일 이동 단위, 원본 memo 보존, 날짜/시간대·DST, 완료 Todo 펼침, 검색과10개 source 선택은 유지한다.

**기능 경계:** 이번 상세 화면의 알림은 Google 원본에서 관리한다는 실제 상태를 표시한다. 조회하지 않은 알림을 “없음”으로 표시하지 않는다. Google 이벤트 삭제·알림 편집은 덕 안의 신규 쓰기로 추가하지 않았고 **Google 원본 열기**에서 할 수 있다. 작동하지 않는 삭제/알림 버튼을 그리지 않는다. 반복 일정은 현재 instance라는 안내를 보존한다.

## Duo Today·닫기

- `duoTodayFrame(scene,backVisible)`는 이미 검증된 `duoTabFrame`의 마지막 안전 segment를 사용한다.
- 탭 바 자체는64×272pt·52pt target·28pt icon·기존 하단8pt 여백 그대로다. Today는64×64pt, radius32, 바 위8pt 간격, 요일12/16·날짜25/30이다.
- 좌표식: `today.bottom = safeSegment.bottom - min(segment.height,272) - 8`. x/폭은 탭 frame과 같다. back/camera/힌지/가림과 겹치는 자리에는 배치하지 않는다.
- 짧은 높이에서 별도 Today가 들어가지 않으면 탭 크기를 줄이거나 겹치지 않고 본문 명령줄의 오늘로 복귀한다.
- 등록은 pane별 id로 관리한다. 오른쪽 활성 Calendar 우선순위2, 고정 왼쪽 Calendar1. 오른쪽이 다른 탭이면 왼쪽의 Today가 동작한다. inactive/시트에서는 해당 등록을 해제한다.
- 닫기 경로는 실제 onClose를 등록한 원형 ×, 돌아가기 경로는 원형 ‹다. 빈 이력이나 일반 탭 선택에 임의 복귀 버튼을 만들지 않는다.
- 펼친 가로 왼쪽 Calendar/오른쪽 최초 Todo, 세로·접힘 현재 화면, 월·초안·스크롤 노드 보존은 유지한다. 기기 폭/모델 추정 분기나 가짜 배터리·카메라·시간 표시를 제품에 넣지 않는다. 증거의 파란 열/검은 점은 **fixture 기하 표식**이다.

## 시스템 색상과 수치

`mobile/app.json userInterfaceStyle=automatic`, `StatusBar=auto`. iOS는 `DynamicColorIOS`로 이미 생성된 StyleSheet까지 OS 외형에 맞춰 변경한다. 웹은 같은 semantic color의 CSS 변수와 `prefers-color-scheme`이다. 화면/폼을 remount하지 않는다. Android 색상은 이 iPhone 작업의 실기기 검수 범위가 아니다.

| 토큰 | Light | Dark |
| --- | --- | --- |
| bg | #FFFFFF | #000000 |
| surface / 상세 | #F9FAFB | #1C1C1E |
| grouped / 옵션 | #F2F4F6 | #2C2C2E |
| text | #191F28 | #F5F5F7 |
| secondary | #4E5968 | #D1D1D6 |
| muted | #6B7684 | #98989D |
| outsideMonth | #9299A3 | #77777E |
| line | #E5E8EB | #38383A |
| pale | #E8F3FF | #10243E |
| blueText | #1B64DA | #64A8FF |
| action / white foreground | #1B64DA / #FFFFFF | #1B64DA / #FFFFFF |

옅은 인접 월 날짜는 iOS 고대비/web prefers-contrast에서 muted 수준으로 보강한다. 선택일 원36pt·날짜20/26·현재월 secondary·오늘 강조. 일반 명령은44pt, 달력의 조밀한 제목 chip은20pt 이상이며 해당 날짜 전체와 날짜 상세에도 같은 일정에 접근할 수 있다. 작은 chip 전체가44pt라고 기록하지 않는다. 큰 글자에서 개수 요약/날짜 상세로 접근하며 글자 scaling을 끄지 않는다.

상세 제목28/36·700, 날짜17/25.5, accent5pt·radius3, 그룹행 min58pt·padding16·radius28, 상세 모서리28·외부8·높이96%(현재 pane 및 하단 탭 보호), 일반 시트 max94%. 수치는 덕의 구현값이며 Apple 공식 강제 치수가 아니다.

Glass는 기존 조작층만 사용한다. native Glass/Blur가 시스템 color scheme을 받고 불투명 대체도 semantic grouped/line을 사용한다. 선택 이동·press/drag/cancel·250ms·reduced motion/transparency·forced colors는 유지한다. 본문을 유리화하거나 어두운 배경 위에 흰 sheet를 남기지 않는다.

## 서버 응답 보강·확인 범위

첨부의 “서버 응답을 읽지 못했어요”는 앱→서버 JSON 본문 파싱 경로의 일반 오류다. 공개 health/capabilities는 응답했고, 로그인 없는 Calendar API는401이다. Render의 Calendar 경로/오류 필터 결과는 빈 목록이었다. **인증된 실제 사용자 요청은 재현하지 못했으므로 해당 캡처의 정확한 운영 원인은 확정하지 않는다.** 빈 로그를 정상 증거로 쓰지 않는다.

확인 가능한 코드 문제와 방어를 수정했다.

1. HTTP 헤더 수신 후 body JSON 읽기 중 AbortError가 일반 파싱 오류로 바뀌었다. AbortError를 보존해 시간 초과로 안내한다.
2. Calendar events/calendars GET은 무료 서버 기동도 고려해 전체 요청60초다. 그 외 기존 짧은15초/로그인·AI60초 경계는 유지한다.
3. Calendar GET의 비정상 JSON/HTML/잘린 body만 한 번 재조회한다. 선택한 source당 최대2회이며 대기 없는 무한 retry가 아니다. JSON으로 받은 권한 오류·401·저장/수정/confirm/OAuth 요청은 자동 반복하지 않는다.
4. 성공200이라도 items 배열/id/title·cursor 형식이 틀리면 조회 실패다. 빈 일정 성공으로 바꾸지 않는다.
5. 일부 source 실패 시 같은 owner/범위의 기존 해당 source 이벤트는 보존한다. owner/범위 변경 자료는 재사용하지 않는다. source metadata도 owner 변경 시 초기화하고 늦은 응답을 버린다.
6. 서버 `sendJson`은 JSON 직렬화 **후** 성공 헤더를 쓴다. 직렬화 실패라도 정상 JSON500 응답을 보낼 수 있다. 사용자 body/인증/HTML을 로그/오류에 복사하지 않는다.
7. 공개 health의 `release`는 Render가 제공한 유효한40자 공개 commit SHA만 표시한다. `calendarWorkspace:2`와 함께 배포판을 대조한다. 비밀 설정은 노출하지 않는다.

실제 Google 인증 상태/해당 일정의 오류 원인·실계정 저장 성공은 위 코드/fixture 검사와 별도다. 사용자 비밀번호/API 토큰/세션을 채팅으로 요구하지 않는다.

## 검증·증거와 재개

`artifacts/calendar-apple-reference-2026-11-13/`의 before4장, after·duo는 실제 Expo 컴포넌트의 합성 데이터/격리 API 웹 캡처다. 첨부 Apple 원본을 소유/게시했다고 하거나 실제 native Glass·Duo API·실계정 화면이라고 부르지 않는다. [검수 기록](../design-qa.md).

검사 명령:

```bash
npm run check
npm test
npm --prefix mobile run typecheck
CI=1 EXPO_NO_TELEMETRY=1 npm --prefix mobile run export:web
CALENDAR_CAPTURE_DIR="$PWD/artifacts/calendar-apple-reference-2026-11-13/after" npm --prefix mobile run test:calendar
DUO_CAPTURE_DIR="$PWD/artifacts/calendar-apple-reference-2026-11-13/duo" npm --prefix mobile run test:duo
npm --prefix mobile run test:e2e
npm --prefix mobile run test:web-auth
npm --prefix mobile run test:motion
npm --prefix mobile run test:automations
CI=1 EXPO_NO_TELEMETRY=1 npm --prefix mobile run export:ios
npm --prefix mobile run test:project
```

마지막 영수증은 아래에 덧붙인다. 단위247개 중246 통과·실패0·기존 선택1 제외를 확인했다. 새 테스트는 body-abort/non-JSON 상태·조회만 복구 가능·malformed200·직렬화 헤더 순서·Today 기하다. Calendar E2E는 한 번 회복/지속 실패 source별2회·기존 자료·원문 HTML 미노출·쓰기 재발송 없음도 확인한다. 실기기 native/실계정·Figma와 새 IPA는 별도다.

아이폰의25번(1643e0c)에는 이 수정이 없다. 이번 작업에서 새 iPhone 빌드/제출을 자동 실행하지 않는다. 최신main의 새 무료 native 빌드와 TestFlight 설치 이후에 폰이 바뀐다. [현재 빌드/공식 경로](testflight-automation.md). 사무실 보류·무료 플랜·데이터/인증/서명·원본 복구 bundle은 보존한다.
