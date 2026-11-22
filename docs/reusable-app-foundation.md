# 재사용 앱 공통 기반 — 핵심 기능 개발에 집중하기 위한 상세 설계서

기준2026-11-22. 사용자가 다른 앱을 만들 때 핵심 기능만 구현하면 대부분의 제품 구성이 갖춰지도록 앱 공통 사항을 모두 문서화하라고 요청했다. 이 문서는 실제 docen 코드에서 재사용할 구조·계약·화면·서버·검증과 새 제품에 맞춰야 할 부분을 설명한다.

**현재 저장소가 이미 독립형 범용 SDK/한 번 클릭 앱 생성기로 분리됐다는 뜻은 아니다.** docen의 useTodos·App Shell·서버 라우트에는 도메인 의존성이 있다. 아래 순서와 모듈 목록으로 공통 코드를 추출하고 새 앱의 데이터/정책을 연결한다. 구현하지 않은 PG·소셜 로그인·완전 오프라인·Android 실기기 지원을 공통 완성 기능으로 세지 않는다.

읽는 순서: [새 앱 시작 안내](REUSABLE-APP-START-HERE.md) → 이 문서 → [모듈 목록](app-foundation-module-map.md) → [출시 체크리스트](app-foundation-release-checklist.md). 기존 docen 상태는 [통합 기준](DOCEN-START-HERE.md)이 우선한다.

## 1. 목표: 제품마다 다시 만들지 않을 부분

공통 기반은 외형만이 아니다. 가입/인증/세션, 자료 소유권, 입력과 키보드, 내비게이션/복귀, 빠른 저장/오류 복구, 캐시/새로고침, 권한/알림, 설정/개인정보, 이용권/운영자, 테스트/배포/문서가 하나의 계약으로 맞아야 한다.

새 앱에서 집중할 부분은 ‘누구의 어떤 문제를 어떤 자료와 행동으로 해결하는가’다. 이 공통 설계와 이미 검증된 코드를 재사용하면 기본 운영 기능의 재설계를 줄일 수 있다. 실제 외부 인증·새 상품 결제·스토어 심사는 제품별 작업으로 남는다.

| 층 | 공통화할 책임 | 제품 고유 책임 |
|---|---|---|
|Foundation UI|토큰·문자·터치·상태·폼·시트·키보드|브랜드·주요 작업 화면·밀도|
|Application Shell|시작/세션 gate·화면 전환·설정·복귀|메뉴 이름·순서·대표 진입|
|Identity|계정·인증·세션·소유권·삭제|가입 정책·국가/연령·조직 모델|
|Data Runtime|repository·요청 취소·revision·캐시·멱등|핵심 entity/검증/편집 권한|
|Provider Ports|권한·읽기/쓰기·outbox·receipt|공급자별 필드·scope·원본 의미|
|Operations|역할·감사·상태·이용권·지원|운영 업무·요금·실제 PG|
|Delivery|환경 분리·검사·빌드·배포·기록|새 앱 ID/도메인·서명·공개 단계|

## 2. 새 앱과 기존 docen에서 이름 변경은 다르다

### 2.1 기존 docen 수정

기존 bundle·URL scheme·쿠키/SecureStore key·DB·암호화 seed·OAuth callback을 보존한다. 표시 이름 변경 때문에 계정/연결을 끊거나 DB를 초기화하지 않는다. 기존 문서의 이 규칙은 docen 업데이트용이다.

### 2.2 별개의 새 앱

새 저장소/제품 식별자와 새 서버/DB/암호화 키를 준비한다. docen 운영 DB·토큰·서명 계정·OAuth 앱·Resend 키를 무단 복사하지 않는다. 별개 앱에 docen 세션 key를 그대로 쓰면 같은 기기/host에서 세션을 섞을 수 있다.

새 제품별 교체 목록:

- 표시 이름·slug·package name·iOS bundle identifier·Android package(지원 시)·URL scheme·Universal Link/Associated Domains.
- Expo project ownership·push project ID·store listing·앱 아이콘/launch asset·permission 문구·privacy manifest/entitlements.
- API origin·도메인·CORS/CSRF origin·OAuth redirect/state owner·메일 발신 주소·지원 주소.
- 쿠키 이름/path·SecureStore namespace·AsyncStorage namespace·cache key·notification category/deep-link routing.
- DB/암호화 key·백업 prefix/서명키·외부 provider application·관리자 allowlist·법적 운영자·약관 버전.

이는 체크리스트이며 기존 코드의 모든 문자열을 일괄 치환하라는 뜻은 아니다. 프로토콜/이력의 예전 이름은 호환성을 검토하고 변경한다.

## 3. 실제 현재 아키텍처와 추출 순서

mobile/App.tsx는 SafeArea·Motion·Keyboard·Duo/웹 presentation·인증/인증대기·주요 화면을 조합한다. 현재 useTodos는 회원 세션·서버 연결·목록·알림·원본 수정까지 함께 다루므로 다른 앱에서 Todo 이름만 바꿔 전체 공통 store라고 부르지 않는다.

추출 시 권장 책임(새 설계이며 현재 파일명이 아님):

1. AppConfig: 제품 식별·지원 기기·공개 단계·API 주소.
2. SessionController: 복원/인증/인증대기/정지/해제·계정 경계.
3. Transport: 보안 헤더·JSON 파싱·오류 분류·timeout·취소.
4. EntityRepository<T>: 자료 읽기/저장/receipt/revision의 경계.
5. AppShell: 위 상태에 맞는 화면과 navigation.
6. SettingsFeature: 계정/알림/자료·개인정보/지원/법적 문서.
7. DomainFeature: 새 앱의 고유 자료·규칙·화면.
8. OperatorConsole: 별도 운영자 인증/검색/관리/감사.

공통 추출은 원래 기능을 통과시키면서 작은 단위로 한다. ui.tsx에는 범용 Button/Page와 docen TodoRow/TodoEditor가 함께 있으므로 파일 전체를 곧바로 범용 UI 라이브러리로 배포하지 않는다.

## 4. 화면 기본 부품과 디자인 토큰

정본: mobile/src/theme.ts·ui.tsx·MeSettings.tsx·SurfaceInteraction.tsx·motion.tsx.

- 의미별 색: background/surface/grouped/text/secondary/muted/line/primary/danger. 색 이름만 바꾸는 대신 오류·선택·진행·읽기전용의 의미를 유지한다.
- 글꼴: OS 기본 글꼴·한글/영문 fallback·font scaling. 고정 높이 텍스트 박스로 큰 글자가 잘리지 않게 한다.
- 간격:4/8/12/16/24/32를 시작점으로, 페이지 inset·절 간격·행 gap을 토큰화한다.
- radius: 작은 입력/큰 그룹/시트/내비게이션을 구분한다. 모든 부품을 같은 pill로 만들지 않는다.
- 버튼: 기본/보조/파괴적·disabled·busy·pressed·focus·성공/실패. 로딩 표시 때문에 버튼 폭이 튀지 않도록 한다.
- 목록 행: leading icon/제목/보조/오른쪽 상태/chevron. 제목에 공간 우선권, 상태는 짧게, 길면 줄바꿈한다.
- 공통 상태: 최초 loading·empty·error·partial·refreshing·stale·pending·conflict·unknown. 문구와 재시도 경로를 각 화면에서 일관되게 쓴다.
- 의미 전달: 실패를 빨간색만으로, 선택을 색 변화만으로 표시하지 않는다. 라벨·아이콘·텍스트/접근성 상태를 함께 제공한다.

docen의 파랑/오리/5탭/3초 완료는 제품 선택이다. 새 앱은 자신의 작업 성격에 맞게 바꾸되 공통 상태를 삭제하지 않는다.

## 5. App Shell과 내비게이션

### 5.1 앱 시작 상태기계

| 상태 | 화면 | 금지 |
|---|---|---|
|boot/restoring|안정된 준비 화면/기본 공간|로그인 만료로 단정·개인자료 잠깐 노출|
|anonymous|로그인/가입|내부 메뉴/데이터 render|
|unverified|이메일 인증 화면|Todo/핵심 API 호출·내부 이동|
|authenticated|정상 shell|이전 계정 응답 적용|
|unavailable|연결 확인/재시도|토큰 삭제·로그인 폼 깜박임|
|suspended|정지 안내/지원·허용된 탈출|새 작업·외부 실행|
|signing-out|자료/요청 정리·gate 복귀|늦은 응답으로 shell 재노출|

### 5.2 화면 유지

탭 변경은 화면 상태를 버리는 재마운트와 구분한다. 작성 초안·선택 날짜·목록 위치는 가능한 범위에서 보존한다. 숨겨둔 화면의 불필요한 polling/뒤로가기 handler는 중지한다. 계정/서버 교체는 다른 경계이므로 개인 자료와 초안을 정리한다.

복귀는 modal→상세→목록→상위의 현재 층만 닫는다. 닫기 콜백에 identity/version을 연결해 오래된 콜백이 새 시트를 닫지 못하게 한다. 닫기 불가능한 busy 상태는 명확한 이유/상태를 보여준다.

### 5.3 기기별 배치

일반폰 하단 탭·데스크톱 좌메뉴/우보조·Duo 카메라 열은 각각 presentation adapter다. 비즈니스 자료 처리와 섞지 않는다. 새 앱이 Duo를 지원하지 않으면 그 분기를 제외하고 지원 기기 표를 다시 만든다. 넓은 화면이라는 이유로 Duo라고 판정하지 않는다.

## 6. 회원가입·비밀번호·동의

원본: AuthScreen.tsx·PasswordFields.tsx·SignupAgreements.tsx·password-policy.ts, 서버password-policy.js·store.js·legal-policy/content.

현재 docen 정책은 숫자/ASCII 특수문자를 포함한8~128자·두 번 입력이다. 첫 필드 아래 기준을 항상 안내하고 위반하면 테두리+outline+문구를 빨갛게, 확인 불일치는 두 번째 아래에도 표시한다. 복사/붙여넣기/비밀번호 관리자 사용을 막지 않는다. 입력값을 임의 trim/변환하지 않는다.

서버도 동일 정책/확인값/필수 동의를 검사한다. 버튼 비활성화만으로 검증을 끝내지 않는다. 가입 중 중복 클릭/네트워크 끊김/이메일 중복을 처리하고 비밀번호를 URL/로그/분석 이벤트에 넣지 않는다. 기존 비밀번호 로그인은 새 조합 규칙으로 막지 않는다.

약관/개인정보 버전·연령 확인은 서버에서 실제 저장한다. 선택 동의/마케팅·AI·외부 연결을 필수 가입 동의에 몰아넣지 않는다. 과거 동의를 허위 생성하지 않는다. 새 앱의 최소 연령·지역·법무 정책은 실제 조건에 맞춰 검토한다.

## 7. 이메일 인증·재설정

가입→제한 세션→자동 발송 요청→인증 화면→번호 확인→정상 API 허용. 인증 전에는 핵심 데이터 store를 초기화하거나 메뉴를 보여주지 않는다. UI뿐 아니라 모든 관련 서버 API에서 검증한다.

현재 회원6자리/15분/5회·재전송60초/시간당5건. 재발송 시 이전 코드 무효화. 재설정 성공은 세션 폐기. 관리자10분 초기 설정과 혼동하지 않는다. 고정 숫자는 보안/운영 정책값이지 모든 앱의 법적 의무는 아니다.

메일의 네 단계: queued→provider accepted→delivered/실제 수신→사용자 인증 성공.202응답은 큐 접수이지 수신이 아니다. 발신 도메인/DKIM/sending DNS/API key scope를 확인하고 영구 거절은 안전한 오류 분류만 남긴다. 비밀 key·인증코드·전체 수신 주소·provider 원문 로그를 남기지 않는다.

가입 주소 존재 여부의 불필요한 노출을 줄인다. 재설정 응답은 계정 존재를 직접 구분하지 않는 기존 경로를 따른다. 인증 우회를 ‘테스트 편의’로 제품에 넣지 않는다.

## 8. 로그인·세션·기기 저장

원본auth.ts·useTodos.ts·store.js. 웹 HttpOnly/Secure/SameSite Strict쿠키, native SecureStore의 origin별 token이다. 서버는 세션 token의 해시를 저장한다. 실제 token을 AsyncStorage/URL/localStorage/로그로 옮기지 않는다.

세션 복원 시401과네트워크실패를구분한다. 401확정은재로그인,503/timeout/비JSON은연결상태보존/재확인이다. 오래안켰다가켰을때로그인화면을잠깐보였다없애지않는다. 토큰복원과자료읽기완료를각각관리한다.

로그아웃/서버변경/회원전환에는 요청 세대 증가·AbortController 취소·owner별cache 삭제/분리·기기 알림 해제/재연결·화면초안 경계를 처리한다. 대기 전에 캡처한 이전 token과새계정의draft를섞지않는다. 만료/로그아웃중늦은응답은무시한다.

## 9. HTTP 통신·오류·서버 준비

원본auth.ts·http-response.ts·server-readiness.ts·server/http-json.js.

- JSON Content-Type·실제 파싱·상태/에러코드를 검사한다. HTML 에러페이지를 정상 데이터로 전달하지 않는다.
- 요청별 timeout과AbortController를쓴다. 현재 auth.ts는 일부연결/로그인/쓰기60초, 일반15초이며서버준비probe10초/전체45초등의경로가있다. 새서비스는측정해조정하고 무조건 길게 늘리지 않는다.
- 알려진읽기전용GET의한정된끊김/비JSON응답만1회복구할수있다. 로그인·OAuthconfirm·메일발송·POST/PATCH외부쓰기를자동반복하지않는다.
- Free cold start워밍업은health GET만반복한뒤사용자쓰기를한번보낸다. health200도모든provider가정상이라는뜻은아니다.
- API 결과는 실행/화면세대와owner를확인한뒤적용한다. 화면을떠난요청이새화면의오류를덮지않는다.

오류표준 권장: 사용자 메시지, 안정 code, 재시도 가능 여부, action/request ID, 처리 결과 확실성. 현재 모든endpoint가이형식의단일라이브러리를쓴다고가정하지않고추출때서버응답adapter로정규화한다. raw stack/token/provider본문은고객메시지에싣지않는다.

## 10. 입력·키보드·시트

원본KeyboardUX.tsx·keyboard-done.ts·useFocusedField.ts·scroll-reveal.ts·MeSettings.tsx·NotesField.tsx·SheetBackdrop.tsx·motion.tsx.

키보드표시/실제가림을한곳에서읽고실제screenY와편집frame겹침만예약한다. 단순히화면전체에keyboard높이를더해서내용을두번밀지않는다. 편집frame을유지하고기존내부스크롤로focused필드를드러낸다. 입력중한글조합/커서/여러줄높이변화를보존한다.

키보드내리기와저장/닫기는별개다. 내리기버튼이초안을저장/전송하지않는다. 현재KeyboardDismiss 컴포넌트는중복헤더버튼을추가하지않고native accessory/Duo surface가해당조작을담당한다. null반환을미구현으로오해해버튼을중복추가하지않는다.

시트는 X와충분한터치영역, 제목, 본문스크롤, 하단행동을분리한다. 배경은dim/disabled/접근성숨김. 닫히면한겹만복구한다. 활성입력에서저장버튼을가리거나키보드가실제작성영역을덮는경우기기별계약을따른다. iOS accessory·웹focus·Android입력은동일하다고가정하지않는다.

## 11. 목록·상세·편집의 공통 계약

목록: 제목→보조자료→상태→진입. 행전체편집/체크/스와이프/링크가경쟁하지않게한다. 세로스크롤과가로제스처를구분하고다중선택때다른제스처를중지한다. 길게누르기이후tap오작동을막는다. 키보드/스크린리더용대체버튼도제공한다.

상세는실제자료와초안을분리한다. 새로고침이입력중폼을덮지않는다. 취소는초안을버리되서버에보낸불확실한외부작업을미전송으로단정하지않는다. 저장버튼은변경/유효성/권한/busy를따르고부분실패를보존한다.

빈목록은다음행동을제시한다. 권한없음/자료없음/조회실패를같은‘없어요’로합치지않는다. 당김새로고침표시는사용자제스처때, 배경갱신은내용을막지않는작은상태로구분한다.

## 12. 자료 모델·repository·계정 소유권

원본domain.ts·repository.ts·store.js·database.js. Todo도메인과공통저장을분리한다. generic repository의자료타입/검증/endpoint는새앱이정의한다.

기본자료: id, ownerId, revision, createdAt/updatedAt, 지원되는필드. 외부자료는connectionId/provider/nativeId/ETag/원본수정시각. 임시UI상태와원본저장레코드는분리한다.

서버는인증된session에서owner를정하고본문의userId를신뢰하지않는다. 조회/수정/삭제/첨부/검색/내보내기/receipt/원본작업까지같은검사를한다. 다른계정ID로접근했을때자료가없는것처럼안전하게거부하고원문을노출하지않는다.

현재cloudrepository는list/create/get/update/remove/reorder/receipt와capability확인을쓴다. demo는AsyncStorage의합성목록으로별도다. 서버capability가없으면메모/순서필드를조용히버리지않고업데이트안내를준다.

## 13. 빠른 저장·멱등·응답 유실

화면은즉시업데이트하되서버확정전pending표시를한다. 한자료에여러변경이있으면순서/개정을보존한다. 오래된실패응답으로더최신성공을되돌리지않는다.

| 결과 | UI | 다음 동작 |
|---|---|---|
|확정성공|확정값/서버ID로교체|새로고침/알림등후속처리|
|확정4xx거절|마지막확정값으로복원·입력보존|이유/권한/입력수정|
|queued|앱저장됨·원본반영중|작업ID상태조회|
|conflict|새자료/충돌안내|다시읽고선택,자동덮어쓰기금지|
|timeout/응답유실|결과확인중|receipt/해당자료읽기|
|unknown|불확실표시·중복실행차단|원본확인·안전한지원경로|

새자료의clientRequestKey는owner에묶고같은key는같은결과를돌려준다. update는기존revision/필드비교,외부작업은prepare/confirm/actionID/receipt. 확정전새로컬알림을예약하지않거나기존확정예약을유지한다. 이구조가‘완전오프라인앱’또는프로세스종료전미전송변경의영구보관을자동보장하지는않는다.

## 14. 캐시·새로고침·오프라인 경계

마지막확인자료를먼저보이고배경갱신한다. age/마지막성공시간을표시할수있어야한다. 실패가빈목록으로덮지않게한다. 부분소스는성공한것부터반영하고전체성공으로표시하지않는다.

cache key에는제품/owner/origin/범위/시간대/연결버전을포함한다. sensitive본문/ETag/쓰기권한까지무작정영구저장하지않는다. snapshot과쓰기권한정본을분리한다. native SecureStore와웹tab sessionStorage등현재구현의보관위치를추출때재검토한다.

오프라인에서읽을수있는자료와수정가능범위를명시한다. 현재in-memory낙관적층은앱종료후보존을보장하지않는다. durableoutbox는서버접수후의재시작을견딘다. 진짜offlinequeue가필요한새앱은암호화·충돌·용량·재시도/취소·OS백그라운드까지별도설계한다.

## 15. 원본 동기화·작업 대기열

원본변경은owner/연결/권한/동의/최신revision/ETag를실행직전에확인한다. 로컬저장+원본outbox는같은transaction. 대기중변경은합칠수있으나running/unknown기록을지우지않는다.

worker는lease/actionID를먼저기록하고실행한다. 재시작때새로운외부쓰기를재전송하지말고기존receipt를조회한다. 충돌/unknown은후속쓰기를막고사용자에게이유와대안을알린다. 복원시대기작업을자동재생하지않는다.

공급자adapter의capability는canRead/canCreate/canUpdate/지원필드/완료/삭제/첨부/재시도가능성이다. GoogleCalendar의‘완료’를삭제로대체하지않는등의미를보존한다. iPhone원본은기기EventKit이필요하며웹/서버가대신행사하지않는다.

## 16. OS 권한·외부 OAuth

권한상태는unknown/requesting/allowed/limited/denied/unavailable과운영설정대기를구분한다. 설명→OS/OAuth요청→실제결과읽기→관련자료조회. 제품의기본ON은OS허용이아니다. 거부후무한popup을열지않고설정으로가는방법과대안을준다.

OAuth는state/PKCE/redirect정확일치·소유계정·scope최소화·token암호화·해제/만료/재연결을연결한다. 같은Google계정의여러서비스권한과제품로그인OAuth는별개다. 새앱은자신의provider등록을해야한다. callback문자열만복사해docen의연결을공유하지않는다.

권한수준이바뀌면진행중미리보기와확인된실행규칙을재검사한다. 해제후오래된작업/캐시가원본을수정하지못하게한다. 테스트용provider와실계정증거를분리한다.

## 17. 날짜·시간·지역화

날짜전용값 YYYY-MM-DD와실제시점 ISO/UTC, 사용자가고른local시간·IANA timezone을구별한다. 자정변환으로기한이하루밀리지않게한다. DST/월말/윤년/주첫날/기한없음/지난기한/반복의의미를테스트한다.

Intl표시와저장값을분리하고기기locale에따라표시한다. 날짜문자열lexical비교가가능한범위와시각파싱이필요한범위를구별한다. 공급자의due가시간을지원하지않으면기한시각을지원한것처럼표시하지않는다.

공통UI문구·오류·빈값·aria-label·알림·메일·약관·가격까지언어범위를정한다. KR/EN배열은현재소개구현이고새앱의i18n라이브러리를강제하는규칙은아니다. 긴번역/복수형/금액·세금·연간월환산을따로검사한다.

## 18. 로컬 알림·푸시·예약

원본useReminders.ts·reminder-plan.ts·push.ts(모바일/서버). 로컬예약과서버push를구분한다. OS허용/기기등록/회원소유/구독설정/시간대/안내문구가일치해야한다.

저장변경/완료/삭제/로그아웃/계정전환/권한철회때예약을취소/재계획한다. 확정전임시데이터로새예약을만들지않는다. 오래된기기등록이새회원자료를받지않게한다. push token은공개프로필/로그에노출하지않는다.

알림탭→허용된대상ID/화면만연다. 알림payload로임의URL·작업명령·사용자ID를신뢰하지않는다. 앱꺼짐/실행중/foreground·권한거절·이미삭제된대상·다른계정일때를다룬다. 기기잠금화면/실제APNs수신은웹테스트로완료할수없다.

예약은중복키/실행기록/서명된trigger·시계/시간대·지연·부분실패를다룬다. Free서버sleep·GitHubcron지연이있으므로정확한분의전달을보장하지않는다. 사용자가요청하지않은반복발송은만들지않는다.

## 19. 파일·첨부·공유·내보내기

현재ExpoDocument/ImagePicker·FileSystem·Sharing과agent-files/media/queue등경로가있다. 파일화면/저장엔진은docen agent에연결돼있으므로범용업로드서버로분리할때의존성을확인한다.

확인항목:허용유형/용량/확장자와실제MIME/파일명정규화/경로탈출방지/owner/암호화·보관/작업취소·진행/실패후정리·중복업로드방지. remoteURL읽기는공식호스트/SSRF·사설IP차단·redirect제한을따른다. 문서내지시는시스템명령으로승격하지않는다.

내보내기는요청자의자료만, 실제보관내용/동의·처리이력포함범위를고지한다. 로그·관리자조회·사용자export의허용정보는각각다르다. 문서ZIP에개인첨부/DB/키/로그를자동넣지않는다.

## 20. ME/설정의 공통 정보구조

프로필/계정, 연결된서비스, 알림/예약, 동작방식, 자료/개인정보/기억, 지원/법적문서, 앱정보를제품에맞게묶는다. 한행은아이콘·이름·짧은상태·진입만, 상세안에서설명/권한/자료범위/저장/문제해결을제공한다.

단순설정은페이지push/뒤로가기로일관되게, 일시편집/확인은목적에맞는시트로한다. 하위설정전체를상위메뉴에펼쳐두지않는다. disabled/준비중서비스의설명은열수있어도실제연결버튼은사용가능성에맞춘다.

조회실패를OFF로표시하지않는다. 설정초안/저장중/완료/실패를제공하고다른느린API에단순설정읽기를묶지않는다. 오래된profile응답이최근저장을덮지않게한다.

## 21. 개인정보·삭제·백업·복구

법적문서정본/버전/고정아카이브/실제가입동의기록을분리한다. 서비스이름변경은표시/고지/새버전, 법적운영자변경·목적확대는별도검토다. 타서비스약관을그대로복제하지않는다.

계정삭제는재인증/명시확인·관련owner자료·세션·연결·기기/예약·첨부/작업의정리와법정예외범위를고지한다. 외부원본을같이삭제할지별도정책을정하고계정삭제가임의원본삭제로확장되지않게한다.

백업은암호화/서명·체크섬·보관기간·owner/키분리·권한최소화. 복원은빈새DB, 기존키검사, 손상/잘못된키거부. 복원한메일/세션/예약/작업을외부에재생하지않는다. 운영DB를지우는방식으로복원검사를하지않는다.

## 22. 운영 어드민 공통 기반

별도admin계정/쿠키/세션, login전gate, RBAC, 회원검색/상세, 이용권/상태/연결점검/감사를재사용한다. 정확한CSS·파일/API순서는[제작매뉴얼](docen-product-build-playbook.md)9절이다.

역할은서버매요청검사. 조회전용쓰기거부, 총관리자보호, 모든변경에사유/requestID/version/전후감사. 수동이용권과실제거래를분리한다. 관리자에게원본대화/토큰/비밀번호를보여주지않는다. 지원점검은범위가정해진읽기만, 임의URL/코드실행을운영버튼으로열지않는다.

새제품에서운영역할/회원자료/허용관리작업을다시정의한다. docenallowlist/임시비밀번호/가입자를새제품에복사하지않는다.

## 23. 요금·권한·PG·원가

권한(account policy), 상품/노출가격, 결제거래, AI원가예산은분리한다. 수동Pro발급은매출도모델예산도아니다. 프런트요금표와서버한도는단일정책에맞춰야하지만현재docen은공개표/운영정책의출시전정리사항이있다.

PG는현재미연결이다. 재사용가능한것은권한/수동이용권/감사/예산상한이며결제완성모듈이아니다. 새PG는서명된웹훅검증·고유거래ID·멱등적용·환불/취소·구독갱신/실패·권한회수·정산대조·청구고지/영수증을별도구현/시험한다.

원가가발생하는AI/검색/이미지/컴퓨터는요청전보수적예약·동시성중복차감방지·확정usage정산·불명보류. 모르는모델/도구가격을무제한허용하지않는다. 자료변경없으면유료분석을재실행하지않는다. 무료인프라와고객별상한이사업전체무손실을보장하지는않는다.

## 24. 모션·접근성·체감 품질

현재motion.tsx기본pressIn90/pressOut140/navigation180/page200/feedback180/sheet200ms. 앱은초기OS동작줄이기설정을확인하기전모션을줄이는안전한상태로시작한다. 설정확정때이미보인화면의모션을재생하지않는다.

리스트순서이동은이전위치에서새위치로보간하고페이지전체확대/튀는전환을쓰지않는다. 탭/회전이저장소를다시만들어초안을없애면안된다. docen완료3초후350ms는도메인동작이므로다른앱의삭제/결제를같은방식으로자동실행하지않는다.

공통검수:44pt이상주요터치영역·보이는포커스·label/hint/state·스크린리더순서·배경modal접근차단·큰글자·색외의의미·모션감소·키보드전용조작·긴번역. nativeGlass질감·VoiceOver·실기기한글IME는브라우저화면비교와별도다.

## 25. 관측·성능·실패 복구

사용자에게보일오류와운영로그를분리한다. 로그는request/actionID·경로분류·duration·고정에러code·성공/실패상태위주로, 토큰/비밀번호/본문/메일코드/전체원본을제외한다. 권한오류를성능문제로, 개발환경접근차단을서비스장애로오해하지않는다.

마지막자료유지·readcache·불필요한metadata조회축소·동의된이벤트·모델중복호출억제·공개gateway/core/providerlane분리를참고한다. 다른앱에서동기DB때문에loop가막히는지측정하고사용량에맞는구조를선택한다. 기존workerthread를복사했다고모든API가병렬/무지연이되는것은아니다.

과부하/한도에는새수집을멈추고이유/다시시도/마지막확인자료를보여준다. 무한재시도·강제재로그인·확인되지않은성공으로덮지않는다.

## 26. 테스트의 공통 층

1. 순수정책/파서/시간/알림계획/unit: 빠르게경계값을검사.
2. 실제HTTP+격리SQLite/API:가입·권한·owner·동의·원본receipt·관리자.
3. libSQLHTTP호환:로컬만통과하는SQL/매개변수차이를검사.
4. provider통제fixture:권한부족·만료·충돌·부분실패·응답유실·usage없음.
5. 실제production웹번들:로그인/인증/초안/모바일/PC/키보드가림/빠른저장.
6. nativeexport/prebuild/SDK검사:설정/타입/번들호환. IPA서명과별개.
7. 무료MacIPA/Apple제출/기기설치:실행별SHA/번호/성공단계기록.
8. 실제기기/실계정:OS권한·원본readback·푸시·IME·VoiceOver·연결해제/만료.

합성계정의성공을실계정성공으로쓰지않는다. 운영원본을테스트데이터로변경하지않는다. 기존조건부skip은이유를기록하고실패를숨기려고테스트삭제/skip하지않는다. 문서수정만했으면무관한모델/IPA비용을발생시키지않는다.

## 27. 빌드·환경·출시 공통 절차

의존성lock·Node24/Expo현재버전·native모듈호환을보존하고한번에업그레이드하지않는다. 루트·mobile·website각각npm ci. 개발API/실계정운영API를구분하며예시환경파일만Git에넣는다.

환경변수는서버secret/앱공개config를분리한다. OPENAI/DB/Resend/OAuthsecret을EXPO_PUBLIC변수에넣지않는다. nativebundle의URL은공개될수있는값이라는전제로한다.

빌드체계:check/test/typecheck→web/iOSexport→native설정/실제Swift지원버전검사→사용자가승인한새수동main무료Mac빌드→동일IPA제출. Apple계약/서명문제는소유자화면에서해결한다. 옛run재실행/유료EAS/runner를자동우회로쓰지않는다.

웹:productionbuild→정확SHA배포→live/health→실제DNS/TLS→로그인/guard/언어/주요행동확인. 소개만공개단계는CTA와서버Host/Origin둘다막는다. 웹배포가설치native업데이트는아니다.

스토어준비:실제권한문구·privacy/data수집표·계정삭제/지원/약관·기기/접근성·스크린샷·연령·상품/외부결제정책·검토계정. 현재docen의최종스토어검토미완료/PG미연결을다른앱의완료로복사하지않는다.

## 28. 새 앱에서 핵심 기능을 붙이는 순서

1. [프로젝트 계약 양식](templates/new-app-project-contract.md)을 채운다. 누가·어떤자료·무슨행동·원본변경·지원기기·공개단계부터 정한다.
2. 새제품의이름/ID/도메인/DB/키/외부앱/서명을분리한다. 기존docen운영값은복사하지않는다.
3. 모듈목록에서필수foundation을고르고Todo/Calendar/Duo/AI는필요한경우만선택한다.
4. SessionController/Transport/공통Shell/UI/Settings를기존도메인에서분리한다. 기존회귀를통과시킨뒤복사한다.
5. 합성대표자료3개로목록→상세→편집과로딩/빈값/오류/저장중을확인받는다.
6. 새Domain모델/검증/repository/API·DB테이블/owner/revision/receipt를붙인다.
7. 핵심자료하나의완전한왕복을먼저완성한다. 새기능수보다실패/취소/복구까지가완료기준이다.
8. 공통계정/설정/알림/법적문서/어드민이새자료에맞게동작하는지연결한다.
9. 관련테스트·productionUI·실제기기를분리검증하고[출시체크리스트](app-foundation-release-checklist.md)에증거를기록한다.
10. [다음AI인계양식](templates/new-app-ai-handoff.md)을작성하고소스/문서/검증을같은commit에연결한다.

이것은핵심기능만새로기획하도록반복되는제품기반을고정하는방법이다. 각각의정책과검증을생략하고완료시간을보장하는방법은아니다.

## 29. 빠른 완료를 위한 승인/완료 기준

디자인승인:실제길이합성내용·PC/폰·주요상태·시안선택이명확함. 기능완료:읽기/쓰기/권한/취소/실패/재조회가서버와왕복함. 운영완료:실제설정/키/도메인/백업·권한이연결됨. 출시완료:스토어/웹공개단계·실제접속/설치/주요기능이확인됨.

다음AI에게‘다완성’만전달하지않고모듈별위수준을구분한다. 미지원/준비중/보류된기능은설명과대안을남기고버튼을가짜성공으로채우지않는다.

## 30. 관련 원본과 전달물

- [연결 계약 예시](reusable-app-integration-contracts.md): 설정/세션/repository/원본/권한의 정확한 추출 경계와 설계용 TypeScript.


- [모듈 파일 지도](app-foundation-module-map.md) · [모듈 JSON](app-foundation-modules.json): 실제source/test경로·의존·교체항목·재사용범위.
- [필수 검수표](app-foundation-release-checklist.md): 상태/증거/담당/남은 일 기록.
- [제작 매뉴얼](docen-product-build-playbook.md): 소개CSS/웹/어드민상세.
- [공통 디자인 원칙](reusable-product-design-principles.md): 이전정리의공통언어/원칙.
- [문서 지도](docen-document-map.md): 기존계약/QA전체.
- deliverables/docen-ai-handoff.zip: 작은전체문서묶음.
- deliverables/docen-complete-handoff.zip: 별도생성된Git추적소스/문서/테스트/자산전체+읽는순서/manifest. 환경파일·실DB·개인키·node_modules·Git내부·실제토큰은제외한다.

## 31. 재사용 자산·라이선스

소스/문서/합성 QA자산의 전달과 외부 브랜드·참고 영상·글꼴·이미지의 새 제품 상용 사용 권한은 다르다. LICENSE/패키지 라이선스/글꼴 OFL·각 출처를 확인하고 새 앱의 로고/아이콘/마케팅 이미지는 자체 자산으로 교체한다. 참고 서비스의 스크린샷/영상이 ZIP에 있다고 새 앱에 그대로 배포 가능한 것으로 간주하지 않는다.
