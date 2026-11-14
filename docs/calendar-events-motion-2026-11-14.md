# 캘린더 상세·편집·덕 알림·공통 전환 — 현재 계약

사용자가 일반 iPhone과 Duo에 각각 승인한 구현이다. 이전의 연간 스크롤바 숨김, 상세 96% 고정 높이, 알림은 Google에서만 관리한다는 규칙을 해당 범위에서 대체한다. [실제 QA](calendar-events-motion-qa-2026-11-14.md)와 함께 읽는다. AI 사무실·소개 사이트는 계속 보류한다.

## 기기별 적용

- 일반 iPhone: 기존 하단5탭/오늘 단축/상단2주·년월/더보기 위치 유지. 월간은 하단 내비게이션 보호 공간을 제외한 실측 가용 높이를 각 주에 똑같이 나눈다. 일정 상세/선택일/편집은 본문 안에서 열린다.
- Duo: 선택한 Calendar pane 안에만 적용한다. 다른 pane·고정 왼쪽 Calendar/오른쪽 최초 Todo·입력·월/연간·스크롤 노드를 보존한다. 물리 카메라 열의 **오늘 → 2주 보기 → 기존5탭** 좌표는 바꾸지 않는다. 접힘/세로는 선택한 단일 본문이다.
- Duo의 빈 하단 strip은 `duoSceneLayout.calendarBottomExtension`으로만 계산한다. body 바닥→window 바닥 간격이 실제 native safeArea.bottom 이내이고 active hinge/occlusion과 겹치지 않을 때 Calendar root의 음수 marginBottom으로 확장한다. 전역 body/다른 화면/내비게이션 frame은 늘리지 않는다. 월/2주 rowHeight의 bottom은0, 목록·연간·시트의 보호 inset은 extension+8이다. 다른 화면 아래 공간을 없애려고 하드웨어/키보드 구간을 덮지 않는다.
- 월의 날짜가 속한 주만28/35/42칸, 일요일빨강/토요일파랑/인접월옅게와 grid 세로스크롤·bounce 금지는 유지한다.

## 화면과 공통 동작 수치

일정 상세의 별도 빈 편집 행을 없애고 제목 옆44pt 이상 편집 버튼으로 합쳤다. 강제96% 높이를 없애 내용에 맞추고 max96% 안에서 긴 본문만 스크롤한다. 옵션 행 최소52pt·padding12·gap8·radius20, 제목 아래 gap16이다. 캘린더 라벨은 flexShrink0, 값은 flex1/minWidth0/한 줄 말줄임으로 긴 이메일도 라벨을 세로로 깨뜨리지 않는다. 원문 문자열 자체는 잘라 저장하지 않는다.

`MotionView`의 공통 화면 진입은 scale .96→1,420ms cubic(.22,1,.36,1)와 opacity다. tab key만 바꾸고 화면을 불필요하게 remount하지 않는다. ordinary는 root, Duo split은 오른쪽 active pane에서만 실행한다. `MotionAncestor`로 중복 mount zoom을 막는다. Calendar 기간 이동도 같은420ms scale과 약한 fade를 쓴다. DraggableSheet는 entry420/exit240ms .96→1, native modal은 fade이며 동작 줄이기는 즉시다. CalendarSheet는 기존 하단 slide entry420/exit260·dim220과 내용 zoom, 시트 내부 제목이 바뀌면 initial=false MotionView로 전환한다. 기존 배경/상단 탭·Duo원형close/back·Escape/초점·busy/미리보기 취소를 유지한다.

연간은 기존의 **실측 월 타일↔본문 matched zoom**을 유지한다. 일반 화면은 같은 방향/곡선의 작은 zoom이며 모든 화면의 원본 타일 좌표가 연결됐다는 뜻은 아니다. 위 수치는 Apple 공식 고정값이 아니라 덕의 구현값이다. `yearOverview=false`는 연간과 연간 줌만 복원하며 이번 공통 모션/알림을 되돌리지 않는다.

`ScrollArea`는 기존 RN ScrollView/ref를 그대로 유지한다. 본문·시간표·연간·편집·긴 시트의 각 오른쪽 끝2pt에3pt thumb를 그린다. track=viewport−8,길이=max18/viewport-content 비율,진행도=offset/(content−viewport)다. content 안 absolute thumb의 translateY에 offset을 더해 viewport edge에 고정하고 pointerEvents none/접근성 숨김이다. 스크롤 중 opacity .65,마지막 scroll/drag/momentum 시작 후1000ms 유지→240ms fade0,동작줄이기는1000ms후즉시0이다. 수평/overflow없음/월grid에는 thumb가 없다. 카메라열과 탭 스크롤은 바꾸지 않는다. native 렌더링/VoiceOver는 실기기 별도다.

## Google 원본과 덕 정보의 저장 계약

|항목|저장 위치/수정 경계|
|---|---|
|제목·시작/종료·종일·장소·원본 메모|기존 calendar.create/update 미리보기→명시적확인→Google 원본. update는 바뀐 항목만 PATCH|
|원본 반복·참석자·원본 알림·원본 첨부·conference/미지원 필드|read-only 표시/원본 링크. PATCH에 넣지 않아 원본 보존. 새로운 초대/반복 시리즈 수정 권한을 만들지 않음|
|덕 앱 알림 offset·덕 전용 메모·URL·첨부 링크|덕 서버 calendar_details에 계정별 암호화 저장. Google에 보내지 않음|
|첨부 링크|https 주소와 이름 저장. 파일 바이너리 업로드가 아님|

`calendar-edit-model`의 변경 비교로 제목만 수정할 때 시각을 다시 계산하지 않는다. DST 중복시각 원본/긴 원본 메모를 보존한다. UI 종일 종료일은 포함,Google 전송 종료일은 다음날 exclusive다. 시간형 전환 PATCH는 반대 date/dateTime을 null로 정리한다. provider-only 필드를 Google에서 바꾸면 다음 정상 읽기에서 표시하며 덕 메타데이터는 유지한다. 현재 연결된 원본 adapter는 Google이며 아직 연결하지 않은 공급자에도 쓰기가 됐다고 말하지 않는다.

기존 `/api/assistant/actions`의 현재 Duck 계정/원본 connectionId/ETag·10분 미리보기·한 번 선점·unknown 금지 규칙 유지. 쓰기 성공 후 덕 저장만 실패하면 editorActions.remoteDone과 savedEventId를 보존하고 **덕 정보 저장만 재시도**한다. 시트 닫고 다시 열어도 provider confirm을 반복하지 않는다. 결과 unknown은 조회만 허용한다. 덕-only 편집은 로컬 미리보기→확인만 하고 provider action을 만들지 않는다. 읽기 전용 Google 일정도 덕-only 필드는 저장 가능하다.

`calendarDetails:1` capability 없으면 새 덕 필드를 숨기고 기존 complete common-field 경로를 사용한다. 서버 먼저 배포 후 클라이언트 업데이트한다.

## API·영속성·알림

- PATCH `/api/calendar/event-details`: 로그인/율 제한. connectionId/calendarId/eventId/expectedRevision/patch/timeZone만 받는다. 원본 GET으로 현재 접근과 삭제 상태를 확인한 뒤 저장한다. revision 충돌409,직전 revision의 동일 patch 재전송은 이미 저장한 값을 반환한다. 최신 다른 수정은 덮지 않는다.
- `calendar_details`: Duck user+Google accountId(없으면 connectionId)+calendarId+eventId 복합키. 기존 secretBox 키를 그대로 쓴다. 정상 token회전/동일Google계정 재승인은 보존,다른Duck/Google계정에는 안 섞는다. 오래된 연결의 저장은409다. 원본 조회 cache에는 duckDetails를 제외해 암호화 덕 메모의 평문 복사본을 만들지 않는다.
- 내보내기 `/api/account/export`에 본인 calendarDetails를 포함하고 계정삭제 FK cascade/전체DB 암호화백업으로 보존·삭제한다. 토큰·비밀번호·원본 DB를 문서에 복사하지 않는다.
- GET `/api/calendar/reminders`: 읽기 전용. 원본 상태/시각을 재확인하고 가까운 미래 후보60개를 선택,최대6개 병렬 GET/60초 snapshot 재사용. 오래된 과거 알림이 미래60개를 밀지 않게 한다. 삭제404/410·cancelled는 취소,실패는partial로 표시한다.
- 종일 덕 알림은 **원본 시간대 오전9시**에서 선택 분을 뺀다. DST 포함. 시간 일정은 원본 startAt 기준이다. 없음을 고르면null이다.
- 기존 단일 useReminders coordinator에서 Todo+일정을 합쳐 가까운60개만 기기에 예약한다. 권한/기기 설정 opt-in이 필요하다. Google 알림과 별개이며 기존 Todo나 다른 앱 알림을 지우지 않는다. 재예약은 변경된 제목/시각/취소만 반영하고중복하지 않는다.
- 앱 복귀·일정 새조회·덕 저장 후 갱신한다. partial/네트워크 실패는 이전 calendar 계획을 유지한다. 재시작 후에는 기기의 기존 본인 calendar 예약을 복구해 읽기 실패 때문에 지우지 않는다. logout/계정변경/연결해제·알림off의 기존 정리는 유지한다.
- **원본을 다른 앱에서 바꾼 뒤 덕을 전혀 열지 않으면 이미 예약한 로컬 알림은 즉시 갱신되지 않는다.** iOS가 앱을 계속 실행해 준다고 가정하거나 서버push 실시간동기화가 됐다고 주장하지 않는다. 과거 날짜/상한 이후는 새 동기화 때 재선택한다. 실제 iPhone 권한/배너수신·OS 제한·중복 원본알림은 실기기 확인 대상이다.

## 파일 지도·적용 상태

`mobile/src/CalendarEventEditor.tsx`, `calendar-edit-model.ts`, `screens/CalendarScreen.tsx`, `CalendarSheet.tsx`, `ScrollArea.tsx`, `motion.tsx`, `duo-layout.ts`, `App.tsx`, `useCalendarData.ts`, `useReminders.ts`, `reminder-plan.ts`; `server/calendar-details*.js`, `calendar-workspace.js`, `provider-actions.js`, `calendar-time.js`, `feature-routes.js`.

기존 무료 Render/수동 TestFlight/인증·데이터·서명·원본복구bundle은 유지한다. 실제 최신 native는 [43536270733](https://github.com/thepmpo/donknow/actions/runs/43536270733)·f008503의 **1.0.0(28)**,서명IPA00:52:04 UTC/Apple 업로드00:52:32 UTC 성공이다. 연간/viewport/탭단축은28에 포함된다. **이 문서의 추가 개선은28 이후이며 새 앱 빌드·설치가 필요하다. 이번 작업으로 native빌드를 자동 실행하지 않는다.** 실계정/iPhone/Apple처리와 JS/fixture 검사·서버배포를 분리한다.
