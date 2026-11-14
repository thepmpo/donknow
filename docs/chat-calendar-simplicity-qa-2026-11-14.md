# 채팅·캘린더 단순화 검증 — 2026-11-14

[재현·구현 계약](chat-calendar-simplicity-2026-11-14.md). 실제 Expo 앱을 합성 계정/API로 실행했다. 개인 Google 자료를 읽거나 실제 일정·할 일을 삭제하지 않았다. 일반 iPhone과 Duo 접힘·펼침의 기존 배치를 유지하는 기본안을 알리고 진행했으며, 새 질문에 답변을 받았다고 기록하지 않는다.

## 확인한 결과

| 흐름 | 확인한 동작 | 현재 화면 |
| --- | --- | --- |
| 응답 대기 | 보낸 질문 즉시 표시, 실제 요청 중 말풍선, 다음 입력 보존, 실패 재시도 중복 방지 | [대기](../artifacts/chat-calendar-simplicity-2026-11-14/current/01-typing-in-conversation.png) |
| AI 자료 동의 | 같은 범위는 재실행 후에도 기억. 연결 계정/권한이 바뀌면 앱 재실행 없이도409로 차단하고 새 동의 요청. 자동 AI 재전송 없음 | [작은 자료 행](../artifacts/chat-calendar-simplicity-2026-11-14/current/03-compact-sources.png) |
| 체크리스트 | 채팅 안 완료 표시, 제외·되돌리기, 별도 확인 후 Todo 저장. 후속 답변·탭 이동에도 기존 체크 상태 보존 | [체크리스트](../artifacts/chat-calendar-simplicity-2026-11-14/current/02-checklist.png) |
| 일정 편집 | 제목/종일·날짜/캘린더/작은 알림 행, 접힌 장소·공통 메모, 아래 저장. 별도 덕 메모·대형 설명 제거 | [편집](../artifacts/chat-calendar-simplicity-2026-11-14/current/04-simple-editor.png) |
| 캘린더 선택 | 현재 연결 계정의 여러 캘린더, 읽기 전용 선택 차단, 원본·목적 목록 확인 후 이동 | [목록](../artifacts/chat-calendar-simplicity-2026-11-14/current/05-calendar-choice.png) |
| 일정 삭제 | 덕 알림 아래 삭제, 취소 시 요청0회, 확인 후 원본 DELETE1회,204 성공 처리, 오래된 ETag 거절 | [확인창](../artifacts/chat-calendar-simplicity-2026-11-14/current/06-delete-confirmation.png) |
| 2주 보기 | 제목2줄·말줄임, 작은 선행 아이콘 제거, 표시 슬롯 높이 반영 | [일반폰](../artifacts/chat-calendar-simplicity-2026-11-14/current/07-fortnight-two-lines.png) · [접힘](../artifacts/chat-calendar-simplicity-2026-11-14/current/08-folded-two-lines.png) · [펼침](../artifacts/chat-calendar-simplicity-2026-11-14/current/09-open-two-lines.png) |
| Duo 대화·편집 | 카메라 열과 반대쪽 고정 캘린더 보존, 펼칠 때 체크 상태 보존 | [대화](../artifacts/chat-calendar-simplicity-2026-11-14/current/10-folded-chat.png) · [펼침 편집](../artifacts/chat-calendar-simplicity-2026-11-14/current/14-open-editor.png) · [접힘 편집](../artifacts/chat-calendar-simplicity-2026-11-14/current/15-folded-editor.png) |
| 좁은 화면·다크 | 320폭에서도 본문 가로 넘침 없음, 스크롤·저장 접근 유지 | [다크 편집](../artifacts/chat-calendar-simplicity-2026-11-14/current/17-small-dark-editor.png) |
| 할 일↔log | 양방향 원래 목록에만3초,350ms fade 후 이동. 목적 목록 조기 중복 없음. 되돌림 취소·실패 복구·완료시각/순서 보존 | [할 일 대기](../artifacts/chat-calendar-simplicity-2026-11-14/current/12-todo-countdown.png) · [log 대기](../artifacts/chat-calendar-simplicity-2026-11-14/current/13-log-countdown.png) |

화면 전체는 [current](../artifacts/chat-calendar-simplicity-2026-11-14/current)에17장, 수정 전은 [before-calendar](../artifacts/chat-calendar-simplicity-2026-11-14/before-calendar)8장과 [before-chat](../artifacts/chat-calendar-simplicity-2026-11-14/before-chat)1장이다. 수정 전 채팅 캡처는 초기 화면으로, 반복 동의의 시각적 증거로 쓰지 않는다. 반복 동의 원인은 사용자 보고와 상태/저장 코드로 확인했다. 최신 [검증 결과 JSON](../artifacts/chat-calendar-simplicity-2026-11-14/current/verification.json)은 합성 chat3회·Todo쓰기1회·이동1회·삭제1회, 런타임 오류0건이다.

## 실행한 검사

- 전체 단위 검사 **284개:283통과·실패0·기존 선택1제외**. 동의 범위/토큰 갱신 안정성·바뀐 범위의 모델 호출 전 차단, HTTP409 보존, 원본 삭제·이동·부분 실패unknown·안전 GET1회 복구를 포함한다.
- `npm run check`: 서버·웹·도구49개 문법 검사 통과. `npm --prefix mobile run typecheck` 통과.
- `npm --prefix mobile run export:web`, `npm --prefix mobile run export:ios` 통과. iOS JS export는 서명 IPA 빌드가 아니다.
- `node mobile/e2e/chat-calendar-simplicity.mjs` 통과. 실제 Expo fixture·합성 API·일반폰/Duo 기하·밝게/어둡게·체크리스트·범위 변경·확인/취소·3초와 fade 중간 프레임을 검증한다. `verification.json`에 결과를 남겼다.
- 기존 전체 앱/API 흐름, Duo 레이아웃·상태 보존, AI 대화/긴 답변·명시 실행, AI403/502/timeout·입력/동의 보존, 캘린더 부분 저장·기간 전환·연간 rollback, 계정별 캐시·오류/페이지/늦은 응답, 연동 상태 복구, 세션 만료/계정 전환, 모션·되돌리기 회귀 검사를 통과했다.

## 검증의 범위와 남은 실제 기기 확인

웹 캡처의 날짜 컨트롤은 브라우저 기본 위젯이다. native 날짜 선택기·실제 키보드·VoiceOver·OS 알림 권한/발송·프레임률·실계정 Google 수정/이동/삭제·오프라인 복귀는 새 앱에서 별도로 확인한다. 웹에서 가로 넘침이 없었다는 사실을 native 전체 검수로 표현하지 않는다.

캘린더는 현재 Google 계정 안의 여러 목록이며, 여러 Google 계정이나 Apple/Outlook 인증을 새로 구현한 것이 아니다. 2주 제목은2줄이며 좁은 칸마다6글자씩을 보장하거나 글자를 무리하게 줄이지 않는다. 체크리스트의 완료는 채팅 표시이며 실제 Todo 자동 완료가 아니다. 전체 채팅/체크리스트의 앱 종료 후 복원은 이번 범위가 아니다.

Pickle 실사이트 재확인은 `ERR_TUNNEL_CONNECTION_FAILED`로 차단됐다. 새 라이브 비교를 완료했다고 주장하지 않고, 사용자 제공 화면과 현재 Duck의 확인된 흐름을 기준으로 단순화했다.

실제 기존 native 영수증은 [43567941097](https://github.com/thepmpo/donknow/actions/runs/43567941097), 소스 `bdc158a136035d7f612858c99e69b012e1221a28`, **1.0.0(31)**이다. 서명 IPA2026-11-14 06:53:52UTC, Apple 업로드06:54:24UTC 성공이다. **이 문서의 새 수정은31 이후이며 새 native 빌드와 TestFlight 업데이트가 필요하다.** 예전 실행을 다시 돌려 최신 코드가 들어간다고 안내하지 않는다. 새 빌드 요청 결과는 작업 최종 영수증에 별도로 기록한다.
