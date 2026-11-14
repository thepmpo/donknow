# 채팅 시각·입력창 키보드 내리기·빠른 캘린더 구현

상태: 사용자 일반 iPhone·Duo 전체 적용 승인 / 구현·Expo 합성 검수 / 새 native 설치 검수 대기. 이전2번 키보드 바와640ms 달력 시트/페이지 모션 중 아래 항목을 대체한다.

## 확정한 기기별 흐름

일반 iPhone·Duo 접힘/펼침 모두 적용하라는 답변을 받았다. 채팅 말풍선 옆에 시각을 표시하고, 입력/입력창 높이/키보드 영역 변화 때 마지막 내용을 보여준다. 직접 과거 대화를 읽거나 실행 항목을 확인하는 스크롤은 보존한다. **키보드는 이전2번 OS 완료 바를 끄고 사용자가 고른1번 입력창 안 keyboard-close 버튼**으로 바꾼다. 다른 편집/입력(검색·붙여넣기·비서 설정·예약 포함)에는 시트 제목 옆 또는 공통 헤더의 작은 같은 버튼을 제공한다. 닫기는 내용 유지·저장/전송0이며 날짜 피커의 별도 완료와 다르다.

일정 제목 입력 중 배경 달력이 키보드 위에 드러나지 않도록 편집 시트를 채우고, 키보드가 열린 동안 저장 버튼을 숨긴다. 일반폰 하단 탭도 키보드 중에만 숨겼다가 같은 위치로 복원한다. Duo 카메라 열은 유지한다. 장소·메모 확장/초점은 해당 내용을 드러내고 입력은 달력 전체와 분리해 갱신한다. 월 전환은 요일을 고정하고 인접 월을 드래그 중에도 보여주며, 한 이동값으로 연결해240~320ms 안에 정착한다. 일정창의 겹친 확대는 제거하고 입장320/퇴장220ms로 정리했다. 연간 전환과 약한 메뉴220ms는 유지한다.

캘린더는 인증된 사용자에 한해 미리 읽고 마지막 표시를 유지하면서 백그라운드 갱신한다. 일반폰/Duo가 owner·서버·시간대/기간별 메모리 캐시를 공유하고, iPhone은 표시 필드만 기존 SecureStore에 보관해 재실행 때 복원한다. 원본 쓰기 권한/ETag·메모/링크·비밀은 디스크에 저장하지 않는다. 저장 성공한 새 일정은 재조회 전에 표시하며 페이지 중복/늦은 조회·계정 교체를 보호한다. 캐시가 없는 첫 조회와 실제 공급자 응답 지연은 없어지지 않는다.

**실제 최신 확인은 사용자 실행43592980231·d9db78b의1.0.0(33), Apple 업로드2026-11-14 12:11:17 UTC 성공**이다. 지금 변경은33 이후다. 새 native 빌드/업데이트와 실제 키보드/Keychain 재실행·한글/VoiceOver·FPS 검수는 필요하며 합성 웹 검수로 대신하지 않는다. 이번 UI 요청에서 새 native 빌드를 시작하지 않는다. 기존 데이터/인증/서명·무료/수동 정책·복구bundle·사무실/소개 사이트 보류는 유지한다.

## 실제 발견과 변경

1. **채팅**: 기존 turn.createdAt이 있었지만 일반 말풍선에는 그리지 않았다. AssistantChat에서 사용자 시간은 말풍선 왼쪽, 덕 시간은 오른쪽 아래에 작게 표시한다. 기기 현지 `ko-KR` 오전/오후 시각이며 서버 전달/읽음 확인을 뜻하지 않는다. 예약 메시지의 기존 날짜/시각은 유지한다.
2. **마지막 내용**: 기존 코드는 새 답변의 위쪽 anchor만 맞추고 키보드/입력 높이 변화에 다시 스크롤하지 않았다. focus/작성/전송에는 tail을 따르고 onLayout/content-size 변경 후 실제 scrollToEnd를 실행한다. 과거 읽기 drag와 명시 체크카드/실행 결과 reveal은 우선한다. 전송 시작 때 초안을 비우는 동작과 실패 복구/편집 재시도·자료 동의는 유지한다.
3. **키보드**: 사용자 사진에서 OS 완료가 큰 파란 pill로 변하고 입력창과 겹쳤다. 선택한1번 원본은 `artifacts/multi-google-clean-chat-2026-11-14/design-previews/keyboard-1-in-composer.png`다. 기존 UIKit 모듈의 설치를 끄는 `disableLegacyKeyboardAccessory`만 호출한다. native ABI/Swift 파일은 호환용으로 남기며 새 true 호출은 없다. 앱 컨트롤은 MaterialCommunityIcons의 keyboard-close,44×44pt, 전송 바로 앞이다. 같은 닫기는 Calendar/Todo 시트 제목과 나머지 입력용 공통 헤더에 둔다. 비밀번호/숫자 포함 내용·화면을 보존하고 `Keyboard.dismiss`만 한다. 웹은 실제 focus/blur이며 가짜 OS 키보드를 그리지 않는다. 외부 OAuth/OS 앱은 건드리지 않는다.
4. **일정 입력**: Shell의 실제 keyboard visibility/occlusion을 공유한다. 텍스트 입력 중 CalendarSheet의 bottom을0으로 하고 가용 본문 높이를 불투명한 sheet로 채운다. 키보드를 내리면 기존 크기/저장이 복원된다. 일반폰만 keyboard 중 하단 탭을 감추고 Duo 카메라 열의 원래 위치는 유지한다. 새 저장/전송이나 날짜 피커 완료와 혼동하지 않는다. 장소·메모/알림 펼침 뒤 scrollToEnd, 필드 초점 시 native keyboard scroll responder로 해당 필드를 드러낸다.
5. **입력 반응**: CalendarDraft를 작은 RetainedCalendarEditor에서 갱신하고 부모는 ref에 보관해 키 입력마다 달력 전체를 만들지 않는다. 숨겨진 초안/취소/원본 ETag는 보존한다. 채팅 timeline도 입력문과 독립적으로 memoize하며 체크리스트 revision/계정/자료·결과 변경에는 다시 그린다. 실제 native FPS/지연 수치를 측정했다는 뜻은 아니다.
6. **월 이동**: 영상의 요일 줄과 날짜가 함께 옆으로 움직이던 문제를 분리했다. 요일은 고정하고 날짜만 이동한다. 누르는 동안 다음/이전 기간을 같은 폭의 바로 옆에서 preview한다. preview/outgoing은 장식·접근성/탭 대상 제외다. 드래그 방향 반전/취소·연속 이동·폭 변경·동작 줄이기를 처리한다. 두 페이지의 간격은 항상 pane폭이며 한 Animated.Value를 공유한다. 남은 거리별240~320ms, cancel240ms. 기존 월의 실제 주 수/균등 높이·주/일/목록/2주·시간대·2주 시작 시각/선 처리를 유지한다.
7. **시트 모션**: CalendarSheet의 수직 입장320ms/퇴장220ms만 사용하고 내부 MotionView/DraggableSheet의 추가 zoom은 끈다. 다른 공통 DraggableSheet는280/200ms의 작은 scale 반응이다. 실제 입력/저장 동작을 모션 종료까지 대기시키지 않는다. 연간 matched zoom과 메뉴의 약한220ms fade는 유지한다.

새 일정 초안은 캘린더 쓰기 권한 확인 중에도 먼저 입력할 수 있다. 저장은 실제 권한을 확인할 때까지 비활성화한다. 기존 읽기 전용 원본의 필드를 편집 가능하게 푸는 변경은 아니다.

## 캘린더 표시·저장·경쟁 계약

`useCalendarData.ts`는 modern calendarWorkspace2 서버에서 인증 후 미리 읽는다. legacy/기능 미표시 서버는 숨은 상태에서 이벤트 API를 추정 호출하지 않는다. 탭을 숨겨도 같은 계정의 읽기를 버리지 않고 다음 진입 때 이미 받은 일정을 표시하며 갱신한다. key는 Duck 사용자+서버+시간대+선택 source+기간이다. 첫 연결/보지 않은 기간/저장 실패에는 실제 GET이 필요하다. 원격 Google/무료 서버의 네트워크 시간이0이 된다고 보장하지 않는다.

`calendar-snapshot-cache.ts`는 owner별 메모리 Map을 두 pane이 공유한다. source 응답은 도착대로 반영하고, 페이징 중에는 기존 항목을 보존하며 최종 페이지에서 삭제를 확정한다. ID 표현이 임시 확인값→실제 공급자 값으로 바뀌어도 connectionId/calendarId/eventId로 중복을 제거한다. 실제 connection 교체만 다른 계정으로 취급하고 정상 token rotation은 유지한다. 명시 수정/생성/삭제에는 owner read revision을 올려 다른 pane의 이전 GET도 무시하고 새로 확인한다. 새로 읽은 데이터도 다른 pane에 알려 이미 갱신된 제목을 예전 캐시로 되돌리지 않는다. 한 source의 실제 미연결은 그 source만 제거한다.

새 Calendar create는 서버 action.succeeded와 보조 저장까지 성공한 뒤 확인된 실제 eventId로 현재 캘린더/해당 기간 캐시에 추가한다. 원본 미리보기/확인 없이 미리 성공 표시하지 않는다. 공급자 ETag가 새로 읽히기 전의 새 표시 항목은 읽기 전용이다. AI에서 확인된 calendar action도 즉시 background read를 시작한다. 기존 Calendar update/delete의 ETag/권한·unknown/running 재실행 금지와 보조 저장만 재시도하는 경계는 유지한다.

`calendar-snapshot-store.ts`는 native에서만 기존 Expo SecureStore(`WHEN_UNLOCKED_THIS_DEVICE_ONLY`)를 사용한다. JSON은 작은 immutable chunk를 먼저 쓰고 manifest 하나를 마지막에 바꾼다. 마지막 정상 snapshot은 chunk 실패에도 보존한다. key는 owner의 전체 UTF-16을 인코딩해 충돌을 피하고 manifest owner도 확인한다. 최근12기간/각250개 표시 항목/총250,000 UTF-16 단위 이하로 제한한다. chunk는440단위 이하라 한국어·emoji도1,800bytes 이하다. 크기 한도를 넘으면 오래된 기간부터 제외한다. 날짜·제목/식별·표시 정보만 남기고 메모·링크·권한·ETag·토큰은 저장하지 않는다. 저장에는250ms debounce를 쓰며 화면은 기다리지 않는다.

native 재실행은 인증된 같은 owner만 마지막 snapshot을 복원하고 신선한 GET이 도착하면 바꾼다. 디스크 snapshot은 읽기 전용이고 최신 성공 응답을 늦은 hydrate가 덮지 못한다. 명시 Google 연결 해제·로그아웃/서버·계정 전환/삭제 시 표시 캐시와 대기 저장을 무효화한다. 늦은 hydrate/queued write가 해제 후 되살릴 수 없게 revision/epoch로 검사한다. 사용자 원본/다른 서비스 연결/가져온 Todo는 이 캐시 정리로 삭제하지 않는다. 웹은 새 영구 일정 파일을 만들지 않고 세션 메모리만 사용한다. native Keychain IO/재실행은 실제 새 앱에서 별도 검수한다.

## 코드·재개·검증

- 입력: `KeyboardUX.tsx`, `keyboard-done.ts`, `App.tsx`, `AssistantChat.tsx`, `ui.tsx`, `CalendarSheet.tsx`.
- 대화/반응: `AssistantChat.tsx`, `useAssistant.ts`, `CalendarScreen.tsx`의 RetainedCalendarEditor.
- 캐시: `useCalendarData.ts`, `calendar-snapshot-cache.ts`, `calendar-snapshot-store.ts`, `useTodos.ts`와 개인정보 설명.
- 전환: `CalendarPeriodMotion.tsx`, `CalendarSheet.tsx`, `motion.tsx`.
- 회귀: `calendar-snapshot-store.test.ts`5개, `interaction-repair.mjs`와 실제 Expo fixture의 키보드 가림 주입. fixture 주입은 제품 경로/기기 추측이 아니고 실제 OS 키보드 렌더를 뜻하지 않는다.

[QA·참고와 화면](interaction-repair-qa-2026-11-14.md)을 먼저 읽는다. 전체311중310통과·실패0·기존 선택1제외, 타입·문법/web·iOS JS·관련 회귀를 확인한다. 실제 native의 화면·키보드/한국어·VoiceOver·Keychain 재실행·프레임 지연은 새 빌드 검수 전이다. 사용자 영상/사진은 비공개 원본이며 공개 갤러리는 합성 데이터만이다.

사용자 실행43592980231·d9db78b의 실제1.0.0(33)은 Mac/서명/Apple 업로드12:11:17UTC 성공이다. 이번 변경은33 이후이며 새 native 빌드와 설치가 필요하다. 번호를34로 미리 확정하지 않는다. 이번 UI 요청에서 새 빌드를 자동 실행하지 않는다. 이전 dispatch Forbidden을 새 실행 성공이나 권한 해결로 기록하지 않는다. 오늘 음영의 칸 전체/숫자 주변 선택은 이전 질문 답변 대기로 남기고 이 요청을 그 선택으로 해석하지 않는다. 무료 플랜·수동workflow·사용자 복구bundle·데이터/인증/서명·사무실/소개 사이트 보류를 유지한다.
