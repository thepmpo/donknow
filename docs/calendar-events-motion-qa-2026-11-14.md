# 캘린더 상세·편집·덕 알림·공통 전환 QA

실제 Expo 웹/합성 API/명시적 native Duo기하 fixture로 검수했다. 사용자 스크린샷은 문제를 파악하는 비공개 참고이며 사진의 개인일정/이메일을 공개 자산에 복사하지 않았다. [구현 계약](calendar-events-motion-2026-11-14.md).

## 변경 전후 증거

- 변경전 [일정 상세](../artifacts/calendar-event-review-2026-11-14/before/03-event-detail.png) / [읽기전용](../artifacts/calendar-event-review-2026-11-14/before/09-read-only-event.png): 별도 빈 편집행·24pt gap·96%높이의 누적,긴 이름 flex경쟁이 사용자 사진과 같은 원인을 만들었다.
- 변경후 [긴 가상계정 이름](../artifacts/calendar-event-review-2026-11-14/focused/01-compact-long-source.png): 라벨 한 줄/우측값 말줄임,내용 맞춤 상세/동일행 편집.
- [덕-only 미리보기](../artifacts/calendar-event-review-2026-11-14/focused/02-local-only-preview.png) / [Google 성공·덕만 재시도](../artifacts/calendar-event-review-2026-11-14/focused/03-partial-save-retry-only-duck.png) / [편집 스크롤바](../artifacts/calendar-event-review-2026-11-14/focused/04-editor-scrollbar-visible.png).
- [월간](../artifacts/calendar-event-review-2026-11-14/after/01-clean-adaptive-month.png), [선택일](../artifacts/calendar-event-review-2026-11-14/after/02-day-detail.png), [편집](../artifacts/calendar-event-review-2026-11-14/after/05-all-day-editor.png), [어두운 상세](../artifacts/calendar-event-review-2026-11-14/after/17-dark-event-reference.png).
- [Duo 월간+Todo](../artifacts/calendar-event-review-2026-11-14/duo/01-open-calendar-todo.png), [pane 상세](../artifacts/calendar-event-review-2026-11-14/duo/08-pane-local-day-detail.png), [pane 오른쪽 스크롤바](../artifacts/calendar-event-review-2026-11-14/duo/24-pane-edge-scrollbar.png).
- [동작 프레임·저장 횟수](../artifacts/calendar-event-review-2026-11-14/focused/verification.json), [일정 흐름](../artifacts/calendar-event-review-2026-11-14/after/verification.json), [시트 모션 프레임](../artifacts/calendar-event-review-2026-11-14/motion/sheet-motion-verification.json), [시트 녹화](../artifacts/calendar-event-review-2026-11-14/motion/sheet-motion.webm).

## 확인한 항목

|범위|실제 검사|
|---|---|
|여백/월간|월35칸/14칸,실측 가용높이,동일한 주 높이,grid스크롤없음. Duo빈safefooter만 확장·active하드웨어 겹침은0확장|
|상세/편집|long fictional email 단일행,줄바꿈라벨없음,내용높이/44pt조작,시트/편집·초안·미리보기취소·읽기전용/합성부분실패|
|저장|제목-onlyPATCH에시각/원본미지원필드없음,ETag/읽기전용,덕-only쓰기0회,Google성공후덕실패→닫고다시열어덕만재시도|
|알림|기기플래너Todo+일정공유60개,제목/시각변경·취소/중복/다른앱보존,재시작실패fallback/owner격리,종일9시/DST,과거65개보다미래우선,원본삭제410/partial|
|영속성|암호화/계정격리/동일계정regrant·token회전보존/다른계정분리/oldconnection409/revision409/동일patch응답유실재시도/개인export/계정삭제|
|모션|420ms중간scale/최종1,동작줄이기,시트중간위치·배경퇴장·상단같은dim,연간기존줌/키보드/월직접선택보존|
|스크롤바|본문/연간/편집viewport우측안·비대화형·1초이전표시/그후fade0,월nooverflow에는없음,Duo좌측스크롤이우측에thumb를만들지않음|
|Duo|물리카메라중앙선·오늘/2주/5탭·오른쪽전환·반대Calendar정지·접힘/가로/세로·month/draft/scrollnode보존·짧은높이/하드웨어|
|회귀|기존cached일정/말formedGET1회복구/쓰기는재시도안함/앱기본흐름/서비스연동경쟁/공개문서|

## 자동 검수 영수증

최종 명령 결과·서버배포 영수증은 아래에 이어 기록한다. source와 문서 commit을 분리하고 main 일반push,공개서버의 정확한release를 확인한다. native새빌드는 자동실행하지 않는다.

## 실기기에서 남은 검사

- 실제 iPhone/Duo의 네이티브 ScrollView indicator 위치/시트·화면 모션/큰글자/VoiceOver/키보드·힌지·Glass.
- Google 실계정의 읽기/수정·외부에서수정한원본의재읽기,실제iOS알림권한/수신·OS상한/앱닫힘시변경.
- 원본반복·참석자·원본첨부/알림은Google에서관리하며새로운공급자쓰기·binary첨부upload·지속backgroundpush로구현됐다고하지않는다.
- 마지막확인native28과이번추가개선은다르다. 실제IPA/Apple업로드성공을JS번들검사로대체하지않는다.

### 최종 로컬 영수증

- 전체271개 중270통과·실패0·기존 선택1제외. 신규 backend7·편집모델3·플래너추가2와기하1 검사를 포함한다.
- 문법49개·TypeScript·Expo web export·iOS JS/Hermes export 통과. native Xcode/서명 IPA 검사가 아니다.
- 실제 Expo calendar-event-refinement/기존 calendar-workspace/annual navigation/calendar-sheet-motion/duo-layout/전체 app/integration-stability 회귀 통과. Duo의 추가 pane scrollbar/오른쪽만zoom·safefooter 분배 assertion도 실행했다.
- 초기 focused fixture의button/radio역할,editor닫기후detail유지,Date.now고정으로모션이멈추던테스트를수정했다. 제품에테스트우회타이머를넣지않았다.
- native앱28의사진을이번구현검증이라고하지않는다. 과거캡처는복원하고새합성화면은새폴더에저장했다.

- 추가 공통 motion 회귀도 통과했다.420ms 시트가 정착한 뒤44pt 버튼을 측정하도록 테스트를 맞췄다. [전체 영수증](../artifacts/calendar-event-review-2026-11-14/checks.json).
