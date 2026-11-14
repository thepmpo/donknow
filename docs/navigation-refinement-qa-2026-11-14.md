# 메뉴·월 스와이프·2주·키보드·실행 기록 검수

[현재 계약](navigation-refinement-2026-11-14.md). 사용자가 일반 iPhone도 함께 적용하고 주간은 ‘2주 보기’라고 확정했다. [내정보 점검](profile-flow-audit-2026-11-14.md)은 구현 완료와 구분한다.

## 자동으로 확인한 것

- `navigation-refinement.mjs`: 실제 Expo 앱+합성 API/힌지 기하. 일반 iPhone·Duo 접힘430×640·펼침960×740에서 2주14일 전환과 제목 자동 초점 없음/직접 탭 초점 확인. 작은 카메라 열에서는 44pt 이상 축소 슬롯, 두 슬롯도 안 되면 본문 제목의2주 버튼으로 전환한다. 실제 기기의 누락 원인은 확정하지 않았다.
- 월 swipe의 손을 놓기 직전 offset과 이어지는 프레임, 옛/새 페이지 간격이 항상 pane폭인 것, 옛 페이지의 역방향 떨림 없음, 640ms 후 outgoing제거/current0을 검사한다. 데이터 새로고침으로 내용을 비우지 않는다.
- 메뉴 전환은 scale1/translate0·opacity≥.98, 마무리 opacity1을 프레임별 검사한다. 연간 zoom과 sheet는 별도 유지하며 reduced motion·급탭·초안 보존은 기존 motion 회귀로 확인한다.
- 실행 완료·취소는 한 줄 기록에 접히고, 펼친 목록 행≤84pt, 행 안 세부 내용까지 접근 가능하다. unknown은 계속 보인다. 새 확인 후 결과로 이동/한 번 확인·계정 격리·재시도는 실제 inline chat 회귀를 사용한다.
- `duo-layout.test.ts`: 축소 슬롯의 카메라 중심선·8pt 간격·44pt 하한·하드웨어 회피·기존 탭 위치 보존. 내비게이션 바깥 scrollbar/1초후fade·반대pane정지·회전/접힘/초안은 Duo 전체 회귀다.
- Calendar 상세·덕 전용 정보/원본 부분 수정·Google 성공 후 덕 실패 재시도에 원본 재실행 없음·스크롤바 fade를 재검사한다. 메뉴의 확대 기대치는 사용자 변경에 맞춰 약한 fade/크기 고정으로 바꿨다.

최종 명령 결과는 [checks.json](../artifacts/navigation-refinement-2026-11-14/checks.json)에 기록한다. 새 화면/프레임 측정은 [current](../artifacts/navigation-refinement-2026-11-14/current/)이고 [before](../artifacts/navigation-refinement-2026-11-14/before/)는382ad90의 별도 변경전 합성 화면이다. 사용자 첨부 원본은 저장소에 넣지 않았다.

## 검수 중 바로잡은 것

새 연결 fixture에서 Google task-sync를 잘못된 형태로 응답해 빈 화면이 생긴 것은 fixture 오류였다. 실제 계약의 enabled/canEnable/jobs 응답으로 고친 뒤 전체 흐름을 다시 캡처했다. 이 빈 화면을 사용자 버그로 보고하지 않는다. 웹 export가 출력을 바꾸는 동안 실행한 오류 회귀도 최종 export 완료 뒤 다시 실행한다. 변경 전 zoom을 강제하던 기존 테스트는 새로운 약한 메뉴 전환 요구를 검사하도록 바꿨다. 과거에 저장된 화면을 새 검수 결과로 덮어쓰지 않는다.

## 확인하지 않은 것

브라우저의 초점 검사는 native 키보드의 높이/실제 기기 수신/FPS/VoiceOver 확인이 아니다. 실제 folded native geometry와 TestFlight 업데이트 후 동작은 별도다. API 실계정·새 인증/서명·유료플랜 변경·녹음/AI 체크박스·native 추가 빌드는 실행하지 않았다. 새앱이 필요하다는 점을 사용자에게 알린다. 최신30 업로드 성공과 이번30이후 수정/로컬 번들/서버 공개 문서는 각각 구분한다.

## 최종 로컬 결과

전체273중272통과·실패0·기존 선택1제외. 타입·문법49개·web/iOS JS export, 기기별 새검사/월 프레임·2주/키보드 초점·기록, Duo 전체, Calendar 부분 저장, AI채팅과 오류, 전체앱, motion 회귀가 통과했다. 공개 문서 생성 후 manifest/HTML/320px·인증·댓글 회귀는 별도 수행한다.
