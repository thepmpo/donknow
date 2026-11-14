# 채팅 정리·Google 여러 계정 검증 — 2026-11-14

[현재 계약](multi-google-clean-chat-2026-11-14.md). 실제 Expo 앱과 실제 격리 DB를 합성 Google/OAuth/AI API에 연결해 확인했다. 실제 Google 계정을 추가하거나 원본을 삭제하거나 실제 모델/예약 과금을 실행하지 않았다.

| 흐름 | 확인한 결과 | 화면 |
| --- | --- | --- |
| 전송 | 응답 전 입력창 비움, 실제 말풍선과 대기 표시 | [입력 비움](../artifacts/multi-google-clean-chat-2026-11-14/current/01-sent-input-empty.png) |
| 다음 초안·실패 | 응답/실패/원래 요청 재시도가 다음 초안을 덮어쓰지 않음 | [다음 초안](../artifacts/multi-google-clean-chat-2026-11-14/current/02-next-draft-preserved.png) · [재시도](../artifacts/multi-google-clean-chat-2026-11-14/current/03-retry-preserves-new-draft.png) |
| 간결한 본문 | 과거 기록·자료 footer·＋ 없음, 확인/오류 유지 | [이전](../artifacts/multi-google-clean-chat-2026-11-14/before/folded-chat-with-tools-and-metadata.png) · [현재 Duo](../artifacts/multi-google-clean-chat-2026-11-14/current/09-folded-clean-chat.png) |
| 계정 선택 | 개인/업무 계정을 함께 표시, 선택 계정의 자료·동기화에 connectionId 전달 | [목록](../artifacts/multi-google-clean-chat-2026-11-14/current/04-multiple-google-accounts.png) · [자료](../artifacts/multi-google-clean-chat-2026-11-14/current/05-selected-account-resources.png) |
| 추가·해제 | 추가 승인 시작이 기존 계정을 바꾸지 않음. 선택 계정 해제 확인 전 삭제하지 않음 | [추가 권한](../artifacts/multi-google-clean-chat-2026-11-14/current/06-add-account-permissions.png) · [해제 확인](../artifacts/multi-google-clean-chat-2026-11-14/current/07-account-disconnect-confirmation.png) |
| 브리핑 | 선호 요청/반복 동의 저장, 받은 브리핑이 질문보다 먼저 표시되고 후속 문맥에 포함 | [설정](../artifacts/multi-google-clean-chat-2026-11-14/current/08-personal-briefing-settings.png) · [동의](../artifacts/multi-google-clean-chat-2026-11-14/current/08-personal-briefing-consent.png) |
| Duo 펼침·좁은 화면 | 실제 기하 형식으로 왼쪽 고정 Calendar/선택 채팅과 카메라 중심선 일치, 가로 넘침 없음 | [펼침](../artifacts/multi-google-clean-chat-2026-11-14/current/10-open-clean-chat.png) · [320 다크](../artifacts/multi-google-clean-chat-2026-11-14/current/11-small-dark-clean-chat.png) |

수정한 합성 기하는 `apiAvailable/hasHinge/hingeStatus/active region`을 모두 제공한다. 초기 잘못된 기하 캡처는 최종 증거로 쓰지 않고 재생성했다. 키보드3장은 design-previews의 **선택 전 합성 시안**이며 위 현재 앱 캡처12장과 구분한다.

## 실제 검사

- 전체 단위292개: **291통과·실패0·기존 선택1제외**. 새8개는 OAuth 여러 계정/중복 재승인/다른 계정 승인 거절/암호화·소유권/동일 이벤트 ID/확인 삭제1회/계정별 보조 메모·미래 알림/계정 간 이동 차단/기본 승격 시 기존 선택 키/계정별 병렬 갱신/부분 실패/선택 해제/AI 범위 지문·신규 계정 자동 전송 차단/Tasks 동기화/예약 재동의·개인화를 검증한다.
- `npm run check`50파일, 모바일 타입, web/iOS JS export 통과. 초기 Expo export는 샌드박스 밖 telemetry 폴더 생성 실패였고 `CI=1 EXPO_NO_TELEMETRY=1`로 보호 범위를 바꾸지 않고 다시 실행했다.
- `node mobile/e2e/multi-google-clean-chat.mjs`: 실제 Expo Shell, 합성 API/OAuth, 현재12장, chat4회, 런타임오류0. 새 키보드 버튼은 없음을 검사한다. 계정 추가 시작/선택/권한·자료·해제와 서버의 실제 OAuth/원본 라우팅 검사를 구분한다.
- 기존 전체 앱/API, AI 긴 답변·제안 편집/명시 실행·경합/계정 격리·수동 fallback, 403/502/서버·클라이언트 timeout·편집 후 보내기·상태 복구, Duo 전환/분할/카메라/초안·월 유지, 연결 상태 일시 실패·복구 회귀 통과. 삭제된＋/footer 접근 기대는 새 ME 접근과 부재 검사로 수정했다. 별도 붙여넣기 도구의 채팅 진입은 기획 전 숨김이므로 이전＋ 경로를 현재 정상 경로로 주장하지 않는다.

[기계 검증 결과](../artifacts/multi-google-clean-chat-2026-11-14/current/verification.json). 이전 회귀가 재생성한 역사 이미지들은 원본을 복구하고 최종 새 증거만 별도 폴더에 남긴다. 전체 이미지 manifest와 공개 문서 검사는 생성 후 최종 작업 영수증에 기록한다.

## 실제 기기에서 남은 확인

여러 실제 Google 계정의 OAuth 앱 접근/재승인·원본 읽기/수정/삭제와 기기 알림 권한/푸시·키보드/VoiceOver/FPS는 새 앱에서 별도 확인한다. 합성 OAuth 화면을 Google 실계정 승인 성공으로 표시하지 않는다. 계정당 Google 승인 범위나 Google의 운영/테스트 사용자 제한을 우회하지 않는다.

현재 native32는60462e2의 이전 변경이며 이번 수정이 없다. 키보드 선택은 미완료, 버튼/새 제스처도 미구현이다. 새 빌드/Apple 처리/설치와 서버 배포는 각각 실제 영수증으로 기록한다. 브리핑은 허용한 덕 자료와 선호를 바탕으로 하는 예약 요약이며 ChatGPT 계정의 대화/기억이나 야간 웹 심층조사를 자동 연결한 것이 아니다.
