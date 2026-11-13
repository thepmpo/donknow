# 연간 보기·확대 전환 QA

final result: passed

통과 범위는 실제 Expo 웹·합성 API·명시적 Duo 기하 fixture다. native IPA/Apple 제출·실제 iPhone 모션/VoiceOver/실계정은 별도다. [전체 계약·연간만 되돌리기](calendar-year-overview-2026-11-14.md).

## 비교 대상과 증거

- 선택 시안: [첫 생성 이미지](../artifacts/calendar-year-2026-11-14/proposals/selected-year-overview.png),1568×1003의설명용보드. 달력형 방향을선택한것이며오류난숫자/중복Duo도구/외곽그림자는기존계약에따라정정한다.
- 일반폰 실제 [연간](../artifacts/calendar-year-2026-11-14/01-ordinary-year.png):390×844 CSS,deviceScaleFactor2,780×1688 PNG. 비교에서는390×844로밀도정규화했다.
- Duo 실제 [동일한 연간 상태](../artifacts/calendar-year-2026-11-14/duo/23-year-design-comparison-state.png):960×740 CSS/PNG,deviceScaleFactor1. 고정왼쪽월간/오른쪽연간,카메라열별도다.
- [원본 시안+실제 두 화면을 함께 둔 비교 입력](../artifacts/calendar-year-2026-11-14/design-comparison.png)을열어비교했다. 시안은앱기기실측사진이아니므로보드외곽을기준으로픽셀동일이라고주장하지않는다. 실제버튼/미니그리드/카메라열은개별원본캡처도열어확인했다.
- [실제420ms전환 녹화](../artifacts/calendar-year-2026-11-14/year-month-motion.mp4),5.08초·390×844. 합성계정의웹실행영상이며생성영상이나Apple/iPhone실기기영상이아니다.

일반폰은고정테스트시각의11/14,기존Duo기하fixture는11/13을사용한다. 날짜를같게한실기기사진으로오해하지않는다. 월/년구조·순서·주말색·분할·기존제목/탭기준을비교하며하루차이의일정내용은시각결함으로판정하지않는다. 사용자영상/개인일정프레임을공개하지않았다.

## 시각 검수와 수정 이력

1. 처음에는 타일실측보다진입콜백이먼저실행되면연초에서시작했다. 레이아웃준비를기다리고현재월근처로이동하도록고쳤다.
2. [P2] 초기자동스크롤이위쪽월제목중간에서멈췄다. 실측헤더/타일높이와행시작좌표를사용하고,웹접근성초점은preventScroll로주어올바른위치를다시밀지않도록고쳤다. 최종일반폰/Duo캡처에서5월·6월제목이완전히보인다.
3. [P2] 숨겨지는왼쪽Duo연간pane의스크롤과탐색중해가접힘/회전에초기화될수있었다. 연간첫진입과크기/활성상태변화를구분하고비활성스크롤스냅샷/레이아웃후복원을추가했다. 최종Duo회귀는100px스크롤복원과현재월이속한해와다른2028년탐색을접힘/세로회전후보존하는지확인했다.
4. 최종비교에서추가P0/P1/P2는없다. 작은Duo본문에서는연간의아랫달일부가아래로이어지며스크롤로접근한다. 이는강제로폰트를줄여끼우지않는허용된연간스크롤설계다. 월/2주에는새세로스크롤을추가하지않았다.

|필수 시각 항목|최종 확인|
|---|---|
|글꼴/위계|기존system서체/공통제목26·35,월이름17·25.5/700,미니날짜10·15. 선택시안과같은2열위계이며가짜래스터텍스트가아님|
|간격/배치|공통제목기준선·24pt여백·2열그룹·부드러운hairline. 일반하단/Duo물리카메라열은기존계약. 시안의중복2주도구/외곽그림자는의도적으로복제하지않음|
|색상/토큰|기존semantic light/dark,blueText·danger·muted·line사용. 오늘밑줄/선택월파랑. 별도팔레트도입없음|
|이미지/아이콘|기존덕마크/Ionicons재사용. 새장식/가짜OS상태/가짜Glass이미지생성없음. 검수Duo의검은점/바탕은기존fixture전용이며제품코드가그리지않음|
|문구/내용|실제그레고리력/윤년/시작요일,월버튼은한개의접근대상. 새날짜확인/취소행없음,더보기분리|

## 실행한 검사

|검사|결과|
|---|---|
|문법/타입|npm run check47개, mobile typecheck 통과|
|단위|258개중257통과·실패0·기존선택1제외. 윤년1900/2000·요일·경계·균일pane좌표포함|
|웹/iOS JS|두export통과. iOS JS/Hermes는서명IPA아님|
|calendar-year.mjs|12개월·확인버튼없음·월즉시이동·해이동/취소/Escape·초점복귀·더보기후해보존·320/390/430·dark·실제열림/닫힘transform·줄인모션scale1·12개월API fanout/쓰기없음통과|
|duo-layout.mjs|기존Glass/내비/좌표/구분선/편집/초안/접힘회귀와새왼쪽/오른쪽연간범위·반대pane보존·숨긴왼쪽연간스크롤복원·탐색해보존·세로/접힘·원형Back·모션카메라열비침범통과|
|OFF별도번들|scripts/check-calendar-year-rollback.py:이전년월select/이동버튼복원·실제월이동·기존탭Today통과. finally로ON소스복원|
|기존캘린더|calendar-workspace/cache/viewport/navigation통과:쓰기미리보기/확인/취소·캐시/출처별응답/실패보존·4/5/6주화면맞춤·오늘/2주단축유지|
|전체앱/모션|app.mjs와motion.mjs통과. 인증/세션·Todo/AI미리보기·연동fixture·press/drag/취소/동작줄이기등기존회귀|

고정Date.now만멈춘테스트는RNAnimated의시간도멈추므로흐르는고정시각(page.clock.install)으로정정했다. 제품에애니메이션우회타이머를넣지않았다. OFF소스빌드는다른Metro빌드와동시에실행하지않는다. 예전스크린샷을덮어쓴모션fixture는원본으로복원했다. 원본영상·실계정API호출·비밀값출력은없다.

## 남은 실제 기기 검사

새native빌드설치후iPhone/Duo의420ms프레임/터치·VoiceOver·큰글자·동작줄이기·Glass광학효과와실Google계정을확인한다. 기존TestFlight27에는이번변경이없다. 공개문서생성/회귀·main/Render/Notion게시영수증은인계기록에별도로남긴다. 이번에는native빌드를시작하지않았다.
