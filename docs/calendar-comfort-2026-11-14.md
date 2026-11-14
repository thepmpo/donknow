# 날짜·알림·캘린더 가독성 구현 계약

상태: 일반 iPhone·Duo 접힘/펼침 승인 범위 구현. **오늘 음영 범위는 사용자 답변 대기**, 실제 native 시각/수신 검수 대기. 이 문서가 아래 해당 항목의 과거 규칙보다 우선한다.

## 요청과 기기별 보존

사용자가 일반 iPhone·Duo 접힘/펼침 모두 적용을 승인했다. 내용이 화면에 들어가면 공통 ScrollArea의 세로 스크롤/bounce를 막고, 긴 내용·키보드에 따른 높이 변화에는 다시 허용한다. 날짜·시간은 명시적인 완료 버튼으로 선택기를 닫고 폼 저장과 구분한다. Todo 알림은 예정일과 독립된 날짜·시간을 고르며 실제 울릴 연월일·요일·시각을 표시한다. 시작/종료는 날짜·시간을 한 행에 두고 하나의 선택기만 펼친다.

덕 일정 알림은 없음/이벤트 시간/5·10·15·30분/1·2시간/1·2일/1주 전과 실제 알림 시각을 함께 표시한다. 종일은 오전9시 기준이며 날짜 경계와 DST를 계산한다. 2주는 시작 시각만 표시하고 종일에는 임의00:00을 붙이지 않는다. 요일 아래 선과 당월 날짜 구간의 주 경계선만 남긴다. dark는 검정 본문/회색 sheet/더 밝은 popup을 구분한다. 카메라 열·오늘→2주→탭·반대 pane·원본 쓰기 확인·기존 캐시/3초 Todo 이동은 유지한다.

**오늘 칸 전체 음영인지 숫자 주변 음영인지 두 번째 질문은 답변 대기다. 현재 오늘/선택 표시를 임의 확정하지 않았다.** AI 지침은 일상부터 업무·일반 대화까지 돕고 모든 대화를 Todo로 바꾸지 않도록 보완했다. 새 기능의 실모델 품질·실제 알림 수신·iOS wheel/VoiceOver 검수와 현재32 이후 새 native 빌드/업데이트는 별도다. 이번 작업에서 native 빌드를 시작하지 않는다.

## 재현 가능한 구현

| 항목 | 파일과 동작 |
| --- | --- |
| 짧은 화면 | `mobile/src/ScrollArea.tsx`: content > viewport +1일 때 세로 스크롤. 측정 후 fit이면 scrollEnabled/bounces=false, Android overScrollMode=never, alwaysBounceVertical=false. 같은 ref/node 유지. 크기/내용 변경 때 재측정, 긴 화면/가로 스크롤·refresh는 보존. 기존1초 뒤240ms indicator fade 및 Duo 바깥 indicator는 유지. |
| 날짜·시간 | `DateTimeField.tsx`: UIKit/community iOS spinner216pt와 별도44pt 이상 완료 toolbar. spinner 변화는 폼 초안을 바꾸고 완료는 선택기만 닫는다. 저장/전송/뒤로가기 없음. 읽기 전용 disabled, 해제·Android dismiss/set·시스템 themeVariant/textColor. 웹은 실제 date/time input이며 native wheel 그림을 만들지 않는다. |
| Todo 알림 | `ui.tsx`: 예정일과 별도 alarmDay/alarmTime. 기존 reminderAt의 현지 날짜/시각을 복원. 첫 활성화만 현재 예정일/오늘로 초기화, 끄고 켜도 초안 보존. 날짜 선택과 시각 선택은 한 번에 하나. dueDate가 없어도 알림 가능. 선택 결과의 정확한 연월일/요일/오전·오후/시각, 과거 시각 경고·기기 권한/웹 지원 설명 유지. |
| 일정 편집 | `CalendarEventEditor.tsx`: 시작/종료 label+날짜/시간 chip, 한 row/mode만 펼침. 종일에는 시간 chip 숨김. 선택 중 미리보기 비활성화. 웹320px에서는 실제 입력이 잘리지 않도록 자연스럽게 줄바꿈. 알림 메뉴를 펼치면 outer scroll로 드러내고 내부 목록은 최대300pt 스크롤. |
| 알림 계산 | `calendar-display.ts`: 일정 분 전은 event zone의 벽시각→실제 instant에서 뺀다. 원래 시작/알림이 같은 벽시각이면 DST 겹친 시간의 두 번째 occurrence도 보존. 없는 DST 시각 거절. 종일9시. 실제 날짜 미리보기와 서버 notificationFromDetails 계산을 비교한다. 옵션0/5/10/15/30/60/120/1440/2880/10080, 없음null. |
| 2주 | `CalendarScreen.tsx`: 제목2줄+… 유지, localTime(startAt)만 작은 행. 종일은 없음, 앞날부터 계속이면 계속, 시각 없는 예외는 시간 미정. endAt을 시각행에 붙이지 않는다. 칩 높이 예약58pt. |
| 구분선 | weekday 아래 hairline, 2행 이후 day.slice(0,7)===표시월인 cell의 위쪽 hairline만. 아래 선 제거. 12/27–31까지만 선,1/1–2는 없음. 인접월 옅은 숫자·토요일파랑/일요일빨강 유지. |
| 어두운 층 | `theme.ts`: sheet light#fff/dark#1c1c1e, popup#fff/#323234, popupLine#d1d6db/#5b5b60, scrim#00000055/#00000099. `CalendarSheet`, `SheetBackdrop`, TodoEditor에 적용해 상단 strip과 dim을 잇는다. Glass navigation의 material/좌표는 변경하지 않는다. |
| AI 비서 | `server/assistant.js`: 일상 계획·습관·아이디어·글쓰기·업무·일반 질문을 직접 돕고 실행이 있는 경우만 후보. 기존 소스 동의/범위·한 번 확인·unknown 자동 재실행 금지·비밀 제외 유지. 새 자동 외부 실행이나 ChatGPT 기억 연결을 추가하지 않는다. |

공통 원본 필드는 기존 source/connectionId·권한·ETag·미리보기/확인으로 저장한다. 덕 알림만 바꿀 때는 기존 암호화 세부자료 PATCH 한 번이며 Google 원본 쓰기를 하지 않는다. 사용자 데이터/인증/DB/서명과 무료 플랜·수동 TestFlight·사무실/소개 사이트 보류는 유지한다. recovery bundle은 수정하지 않는다.

## 검증과 이어받기

[QA·현재 화면](calendar-comfort-qa-2026-11-14.md), `mobile/e2e/calendar-comfort.mjs`, `mobile/src/calendar-display.test.ts`가 근거다. 전체306개 중305통과·실패0·기존 선택1제외, 문법50·타입·web/iOS JS 생성 통과. 브라우저 capture는 실제 Expo+합성 API·Duo 기하이며 native iOS wheel/물리 bounce·알림 수신·VoiceOver/실계정 원본 변경을 증명하지 않는다.

현재 확인된 native1.0.0(32)은 이전 버전이며 이번 UI는 새 수동 build/TestFlight 업데이트가 필요하다. 이번 task에서 새 IPA를 만들지 않는다. 오늘 음영 질문의 답변 후 해당 부분만 구현/기기별 재검수하고, native 빌드가 요청되면 최신 소스로 한 번 실행한다. 무응답을 오늘 칸 전체 승인으로 기록하지 않는다. GitHub 저장·Render Live·TestFlight 설치는 각 실제 결과로 구분한다.
