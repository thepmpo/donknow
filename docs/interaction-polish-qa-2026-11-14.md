# 모션·Duo 스크롤바·입력부 검수

[현재 계약](interaction-polish-2026-11-14.md). 사용자 사진/Apple영상은비공개참고,새캡처는실제Expo웹+합성API/명시적Duo기하다. 사용자원본프레임을공개하지않았다.

## 관찰→수정

1. 월은내용교체후4pt확대420ms급가속이라연속성이부족했다. 현재그리드의드래그위치를측정하고옛달/새달을동시에렌더해640ms연속이동으로고쳤다. [프레임영수증](../artifacts/interaction-polish-2026-11-14/calendar/verification.json)의monthFrames는실제gesture전후좌표다. 매프레임의native60fps를보장하는검사는아니다.
2. Duo본문끝스크롤바위치가요청과달랐다. [아이콘바깥실행화면](../artifacts/interaction-polish-2026-11-14/duo/24-pane-edge-scrollbar.png)에서본문thumb없음/캡슐right바깥x/안전track을확인한다. 다른pane은정지하고1초후fade0이다.
3. 입력부가상시도구행/안내/textarea기본두줄·아래24pt를소비했다. 명시한한줄높이와내용기반증가로[일반폰](../artifacts/interaction-polish-2026-11-14/chat/01-compact-phone-chat.png)·[Duo](../artifacts/interaction-polish-2026-11-14/duo/25-compact-duo-chat.png)를확인한다. [52pt실측](../artifacts/interaction-polish-2026-11-14/chat/composer.json).44pt터치/동의/긴문장/실패시입력유지/원하는자료선택은보존한다.
4. [상세](../artifacts/interaction-polish-2026-11-14/calendar/01-compact-long-source.png)에서표시한Google/Todo바로가기/안내를제거했다. 원본/덕정보부분저장·실패재시도·긴이름·수정권한회귀를유지한다.
5. 녹음은백로그,AI체크박스는가능성답변후결정대기다. 기능완료/권한활성화로표시하지않는다.

## 확인 항목과 실행 파일

- `mobile/e2e/calendar-event-refinement.mjs`: finger dx추종,옛/새월공존,300ms이후이동계속/최종snapshot해제,제목-onlyPATCH/덕-only저장/부분실패의원본재실행없음,일반폰스크롤바/연간.
- `mobile/e2e/duo-layout.mjs`: 접힘/가로/세로/하드웨어/년월·초안/키보드·카메라열보존,바깥scrollportal의진행도/1초뒤숨김,반대Calendar정지,실제인라인AI컴포저. 마지막클라우드상태는명시적인합성API/CORSfixture다.
- `mobile/e2e/assistant-chat*.mjs`:1줄입력52pt/44pt조작,도구안자료선택reveal,긴답변/후속맥락/초안/동의/재시도/상태경쟁/계정격리/모든기록보존.
- `mobile/e2e/app.mjs`·`motion.mjs`·`calendar-year.mjs`:전체앱/카운트다운·되돌리기/모션줄이기/연간단독동작. 없앤바로가기는존재하지않음을검사한다.
- `duo-layout.test.ts`:아이콘오른쪽track과본문/하드웨어/화면경계보호. 타입·web/iOS JS·전체단위·문법과공개문서는아래영수증으로구분한다.

## 경계

iOS실기기FPS·키보드/힌지/VoiceOver·광학Glass·새스크롤표시는새앱에서별도확인한다. 원본29업로드와이번JS검사를구분한다. 사용자계정의새OAuth/비밀값변경·native추가빌드·녹음/AI체크동작은실행하지않았다. 과거이미지는복원하고이폴더에새증거만보존한다.

### 수정 중 확인한 경합

짧은 drag 취소 뒤 Pressable이 날짜 탭으로 처리하던 문제를 실제 gesture 검사에서 발견했다. 소비한 스와이프는 뒤따르는 탭을 막고, 다음 새 touch에서 초기화하도록 고쳤다. 취소 뒤 날짜/네트워크 조회가 그대로이며 상세가 열리지 않는 것을 검사했다. 검수용 Duo의 demo 초기화/클라우드 CORS 설정, 640ms 전환이 끝나기 전 버튼을 측정하던 fixture도 바로잡았다. 제품에 테스트용 우회나 가짜 계정 경로를 넣지 않았다.

## 최종 로컬 영수증

전체272중271통과·실패0·기존선택1제외,문법49개·타입·Expo web/iOS JS번들 통과. 위의 Calendar스와이프/취소·원본/덕저장·Duo/컴포저·AI채팅/오류·전체앱/모션/연간/Calendar워크스페이스회귀가통과했다. [전체 영수증](../artifacts/interaction-polish-2026-11-14/checks.json). 서버 공개 기록/코드 검사 결과는 실제 배포 후 Notion 기록에 추가하며 native 추가빌드는 시작하지 않는다.
