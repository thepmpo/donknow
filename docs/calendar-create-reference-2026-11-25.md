# 영상 기준 일정·할 일 추가 화면

작성일: 2026-11-25. 사용자가 제공한 34.57초 화면 녹화의 일정 추가 흐름을 확인한 뒤 실제 앱 컴포넌트에 구현했다. 단순 이미지 시안이 아니다.

## 요청과 확인한 참고 동작

사용자 요청은 “일정 추가가 없다. 날짜 포스터치로 추가하고, 내용과 UI/UX는 영상에 있다. 우리는 최상단을 일정/할 일로 둔다”이다. 영상은 상단 이벤트/미리 알림 전환, 제목, 시작/종료 날짜, 펼쳐지는 날짜/시간 선택, 종일, 반복, 위치/영상 통화, 초대 사람, 캘린더, 알림, 메모/첨부/URL 순서를 보여준다. 원본 녹화는 개인 자료이므로 저장소에 복사하지 않았다. 아래 캡처는 가짜 계정과 합성 일정으로 생성했다.

## 사용 방법

1. 월/주/일 보기에서 날짜를 500ms 길게 누른다. 별도의 “무엇을 만들까요” 중간 화면 없이 입력 화면으로 들어간다. 스크린리더 longpress 대체 동작도 제공한다.
2. 날짜 줄의 ＋, 날짜 상세의 추가, 기존 캘린더 메뉴의 추가도 같은 입력 화면을 연다. 월 선택은 기존 오른쪽 정렬을 유지하고 ＋는 그 앞에 둔다.
3. 상단 고정 탭은 `일정 | 할 일`이다. 기본은 일정이다. 탭을 전환해도 같은 창을 닫았다 다시 열지 않으며 두 종류의 작성 내용은 탭 전환 중 유지된다. 일정 저장 전 확인 상태에서는 종류 전환을 막는다.
4. 날짜로 열면 해당 날짜의 종일 일정이 기본이다. 주간 시간표의 빈 시간 칸을 누르면 그 날짜·시간의 시간 지정 일정과 1시간 뒤 종료값을 채운다. 23시는 23:59로 제한한다.
5. ＋와 날짜 상세에서도 위쪽 할 일 탭으로 바꿔 로컬 Todo를 바로 저장할 수 있다. 새 할 일은 기존 `beginSave` 즉시 표시·서버 반영·실패 처리 경로를 사용한다. 할 일 메모의 비동기 저장 준비 후 닫을 때 부모 busy 상태도 해제해 다음 추가 화면이 잠기지 않도록 한다.

## 입력 화면과 데이터의 의미

| 항목 | 동작 | 저장 위치 |
| --- | --- | --- |
| 제목 | 120자, 비어 있으면 미리보기에서 안내 | Google 일정 제목 |
| 위치/영상 통화 링크 | 자유 텍스트, 최대 1,000자 | Google location, 회의방 자동 생성은 아님 |
| 시작·종료 | 종일은 날짜, 시간 지정은 날짜+시각, 종료가 시작보다 빠르면 차단 | Google start/end |
| 날짜 선택 | iOS 일정 행에서는 inline 달력, 시각은 기존 spinner, 웹은 브라우저 날짜/시간 입력 | 입력 초안 |
| 시간대 | 기기 시간대/서울/UTC/뉴욕/런던/도쿄 중 선택 | 일정 원본 시간대 변환 |
| 하루 종일 | 토글, 날짜와 시간 입력을 전환해도 초안 값 보존 | Google all-day |
| 반복 | 안 함/매일/매주/매월/매년 | 새 일정에 제한된 RRULE 1개 |
| 초대받는 사람 | 이메일을 쉼표/세미콜론/줄바꿈으로 구분, 최대 20명, 중복 정리 | 새 Google 일정 참석자 + 확인 후 초대 메일 |
| 캘린더 | 연결된 목록에서 쓰기 가능한 대상 선택 | 기존 Google 계정 소유권 검사 |
| docen 알림 | 기존 상대 시간 선택·실제 시각 미리보기 | docen event-details/기기 알림 경로 |
| 메모 | 4,000자, 기존 긴 원본 notesPartial 보존 | Google description |
| URL | 자격증명/내부망 등이 없는 https 주소 | docen event-details |
| 첨부 | 파일명+https 파일 링크 최대 20개 | docen event-details |

첨부는 **파일 링크 방식**이다. 파일 바이너리 업로드, 기기 파일 선택, Google Drive 파일 업로드/권한 변경은 구현했다고 보고하지 않는다. URL/첨부 링크는 화면에서 docen 보관임을 명시한다. Google 원본의 별도 첨부 컬렉션을 덮지 않는다. 반복 종료일/맞춤 반복, 기존 반복 시리즈 전체 변경, 기존 참석자 수정은 추가하지 않았다. 기존 반복 일정 편집은 이번 항목 경로를 유지하며 전체 규칙 변경은 원본에서 하도록 안내한다.

## 구현 파일

- `mobile/src/screens/CalendarScreen.tsx`: 모든 추가 진입점을 기존 CalendarEventEditor에 직접 연결. top tabs, TodoEditorForm inline, 상단 ＋, 날짜별 `new:YYYY-MM-DD` 초안 키. 다른 날짜를 눌렀을 때 이전 날짜의 새 초안이 잘못 열리지 않는다. 기존 일정 편집은 id@etag 키를 유지한다. 월 경계의 날짜로 열면 헤더 년월도 해당 날짜에 맞춘다. Todo 폼은 자체 ScrollRevealContext로 키보드와 펼친 입력 영역을 따라 스크롤한다.
- `mobile/src/CalendarWeekWorkspace.tsx`: 주간 평일/주말 날짜 longpress 및 접근성 대체 동작. 기존 시간 칸의 onCreate, 고정 여러 날 스택, 주말 오른쪽 배치는 유지한다.
- `mobile/src/CalendarSheet.tsx`: 헤더에 탭을 받을 수 있는 headerContent, 웹 최대 640px. 키보드가 없으면 전달받은 하단 여백을 보존해 저장 버튼이 하단 nav에 가리지 않는다. 키보드가 가리면 기존 키보드 겹침 계산을 적용한다. Duo의 기존 카메라 열 닫기 버튼을 차단하지 않는다.
- `mobile/src/CalendarEventEditor.tsx`: 영상의 그룹형 폼, 접을 수 있는 세부사항, 반복/초대·시간대·링크·첨부 링크. 세부사항은 처음 열 때 자동으로 아래로 스크롤시키지 않는다. 기존 prepare/confirm/check/cancel, 권한/ETag, backgroundSave 경로를 유지한다.
- `mobile/src/DateTimeField.tsx`: DateTimePickerPanel에 calendar opt-in만 추가한다. 일정 행의 iOS 날짜에 inline을 쓰며 다른 앱 폼의 날짜 spinner 기본값은 유지한다.
- `mobile/src/ui.tsx`: 숨겨진 inline Todo 폼이 autoFocus로 키보드를 열지 않도록 visible을 반영한다.
- `mobile/src/calendar-edit-model.ts`: 새 일정만 recurrence/attendees를 출력한다. 기존 일정 제목 수정에서 참석자/반복을 새로 쓰지 않는다. 종일 종료일 UI는 포함, Google API는 익일 exclusive 계약을 유지한다. 시간 종료<=시작은 로컬에서 안내한다.

## 서버·원본 쓰기 경계

`server/feature-routes.js`의 capability `calendarCreateOptions:1`이 있을 때만 새 반복/초대 입력이 활성화된다. `useCalendarData`가 기존 capability 조회/계정 generation 보호 안에서 확인한다. 아직 지원하지 않는 서버에는 기존 기본 일정 작성만 사용하고 원본에서 설정할 수 있다는 안내를 표시한다. 새 필드를 구서버로 보내 실패시키지 않는다.

`server/provider-actions.js`는 calendar.create에만 다음을 추가했다.

- recurrence: `RRULE:FREQ=DAILY|WEEKLY|MONTHLY|YEARLY` 한 개만 허용. 임의 RRULE/RDATE/개행은 거절한다.
- attendees: 유효한 이메일 1~20개, 대소문자 중복 거절. client에서는 중복을 먼저 제거한다.
- 참석자가 있는 새 일정만 `sendUpdates=all`을 사용한다. 기존 일정 수정·삭제·참석자 없는 생성의 `sendUpdates=none` 계약은 유지한다.
- 새 일정 ID는 기존 action UUID에서 파생한다. 미리보기는 읽기뿐이고 사용자 최종 확인 시 한 번 선점해 실행한다. 타임아웃 결과는 unknown으로 보존하며 초대 메일/일정 생성을 무조건 재전송하지 않는다.

`server/agent-policy.js`는 기존 calendar.create 자동 실행 허용 규칙이 있어도 attendees가 있으면 ask로 돌린다. 캘린더 자동 작성 허용을 새 초대 메일 발송 동의로 확대하지 않는다. 제한/handoff 규칙은 이 판단보다 우선한다. 일반 채팅 미리보기도 참석자 필드를 한국어로 표시한다.

## 검증

- TypeScript 검사 통과.
- 전체 기존 테스트 실행: 479 passed, 1 skipped, 0 failed. 이후 참석자 자동화 방어 테스트 추가 후 agent-engine 6/6 통과.
- 원본 일정 액션 테스트: 미리보기 전 외부 쓰기 0회, 명시 확인 후 반복/참석자 payload, sendUpdates=all, 재확인해도 중복 발송 없음. 참석자 없는 경우 none 확인. 잘못된 반복·주소·인원·중복 차단.
- 모델 테스트: 반복, 주소 중복 정리, 잘못된 주소, 역전 시간, 기존 일정 편집의 참석자/반복 미출력 확인.
- 실제 컴포넌트 E2E: Duo/논 Duo/웹에서 longpress, 최상단 탭, 양쪽 초안 유지, 종일 여러 날의 exclusive 종료, 반복/초대 미리보기, 확인 전 쓰기 없음, 원본 한 번 생성, docen 링크/첨부 metadata, Todo 저장, Duo 카메라 열 닫기, 시간 칸에서 날짜/시각 전달 검증.
- 기존 주간 캘린더 Duo/논 Duo/웹 3종 통합 검증과 iOS JS export도 통과했다. 별도 일반 모바일 검증으로 월/일간 날짜 longpress, 320px 화면, 키보드 크기 변경 상태의 Todo 필드 노출, 메모 포함 Todo 저장 후 다음 창 닫기까지 통과했다.

실행 명령: `npm run check`, `npm test`, `npm --prefix mobile run typecheck`, `node mobile/e2e/calendar-create.mjs`, `cd mobile && CALENDAR_WEEK_CAPTURE_DIR=/tmp/calendar-week-check node e2e/calendar-week.mjs`, `EXPO_NO_TELEMETRY=1 EXPO_HOME=/tmp/docen-expo-state CI=1 npm --prefix mobile run export:ios`.

캡처: `artifacts/calendar-create-reference/{duo,standard,web}-{event,todo,confirmation}.png`. 개인 원본 녹화 대신 합성 예시만 포함한다. 테스트는 가짜 API로 외부 Google 계정에 실제 일정을 만들거나 이메일을 보내지 않았다.

## 반영 상태와 다음 실행

이번 작업은 코드 구현·로컬 검증·GitHub 반영이다. 서버 배포/TestFlight 업로드를 완료했다고 보고하지 않는다. 새 반복/초대 기능을 실서비스에서 쓰려면 API 서버의 이 코드 반영이 선행되어야 한다. 구서버에서는 capability에 따라 해당 옵션을 숨기고 기본 일정/할 일 생성 경로를 유지한다. iOS 설치 앱에는 새 native 빌드가 필요하다. 기존 GitHub dispatch 연결의 Forbidden 문제와 별개이며 이를 임의 push trigger/유료 빌드로 우회하지 않는다.

롤백 기준은 `b874b0f`이며 이번 변경 커밋을 revert해 되돌릴 수 있다. 기존 주간 레이아웃·AI 첫 화면 모션 제거·브랜드 변경은 되돌리지 않는다. 개인정보/계정/결제/약관/서명 ID/기존 OAuth 권한은 변경하지 않았다.
