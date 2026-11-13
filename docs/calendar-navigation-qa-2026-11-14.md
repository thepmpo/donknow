# 캘린더 단축 조작 검수 — 2026-11-14

final result: passed

통과 범위는 **사용자가 각각 승인한 일반 iPhone/Duo 탭 조작**의 Expo 웹·격리 API·명시적 Duo기하 fixture다. [기기별 계약](calendar-navigation-2026-11-14.md). **년월 탐색 UI는 별도 답변 대기/미변경**, native IPA·실제 진동·실계정 검수를 포함하지 않는다.

## 실제 화면과 비교

[변경 전 일반폰](../artifacts/calendar-navigation-2026-11-14/before/before-ordinary-month.png)과 [변경 후 Today 진입](../artifacts/calendar-navigation-2026-11-14/01-ordinary-enter-today.png)을 확인했다. 제목/요일 기준선, 주말색·옅은인접월, 기존상단보기 버튼·하단5탭을 보존한다. [길게누른2주](../artifacts/calendar-navigation-2026-11-14/02-ordinary-long-press-fortnight.png)는12월1일선택·14칸 두줄·가용높이채움이다. 손을 떼도11월Today로 다시 바뀌지 않는다. [Duo왼쪽2주/오른쪽Todo](../artifacts/calendar-navigation-2026-11-14/duo/15-long-press-left-calendar.png)를 열어 머리글/2행/옅은분리선·카메라열Today→보기→탭과오른쪽Todo유지를확인했다. [오른쪽2주](../artifacts/calendar-navigation-2026-11-14/duo/16-long-press-right-calendar.png)·[접힘](../artifacts/calendar-navigation-2026-11-14/duo/17-folded-long-press-calendar.png)도새로캡처했다. 화면은기기사진이아닌합성데이터다.

사용자영상은전체14.685초를확인했고월→연간→월전환과간결한년월표현을비교했다. 원본개인일정/이름은공개하지않았다. [영상해석·Apple/Fantastical공식근거](calendar-navigation-review-2026-11-14.md). Apple이500ms/탭Today/2주를강제한것으로표현하지않는다. Apple/Fantastical실앱을새로조작했다고하지않는다.

## 실행 결과

|검사|결과/실제 범위|
|---|---|
|npm run check|문법47개통과|
|npm test|254개중253통과·실패0·기존선택1제외|
|mobile typecheck|통과|
|export:web / export:ios|웹·iOS JS/Hermes번들통과,서명IPA아님|
|calendar-navigation.mjs|진입/재선택Today,500ms길게누름/손떼기중복0,다른탭에서진입,상단전환유지,Enter·취소·모션/동작줄이기통과|
|duo-layout.mjs|기존좌표/Glass/끌기/선택/overflow/회전/접힘/초안보존및왼쪽/오른쪽/접힘단축·시트열림무시통과|
|calendar-workspace.mjs|기존Calendar/검색/시트/쓰기미리보기/확인/취소/큰글자·테마회귀통과. 일반폰탭복귀기대값을Today로정정|
|calendar-cache.mjs|즉시캐시·출처별응답·실패보존·겹친기간·삭제/페이지완료·늦은계정응답격리통과|
|app.mjs|다섯탭/Todo/AI미리보기/동의·인증·세션·연동fixture등전체앱회귀통과|

[제스처영수증](../artifacts/calendar-navigation-2026-11-14/gesture-verification.json)과 새캡처 폴더의 workspace/cache/app/duo를 연결한다. 입력/시트열림때단축은소비하고무시해나중에실행되지않는다. 계정/서버scope와pane대상도분리한다. 데이터/인증파일을지우거나실계정원본쓰기를호출하지않았다.

웹tab역할검사를처음Space로실행했으나ReactNativeWeb은Enter로활성화한다. Enter로검사를정정했고불필요한제품코드변경은제외했다. native키보드전체지원까지확인했다고하지않는다.

## 남은 검수/선택

- 년월 선택: 일반폰/Duo별 질문답변이오기전기존UI보존. 연간줌/More정리는추천안이며구현완료아님.
- 새native빌드설치후일반iPhone길게누름·손떼기·햅틱·VoiceOver/큰글자·동작줄이기검수.
- 실제Duo에서좌/우타깃·접힘/펼침·회전·카메라열/안전영역·Glass광학검수.
- 실제Google계정연동/네트워크에서캐시/읽기/쓰기확인. fixture성공과구분.
- 공개문서 생성/링크/320px overflow 검사는소스커밋후생성물회귀로기록한다. 최신main코드·문서·Render영수증은개인Notion/인계문서에서확인한다.
