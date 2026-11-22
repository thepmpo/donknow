# docen 제작 매뉴얼 — 홈페이지·배경·웹앱·어드민을 다른 제품에 재사용하기

기준2026-11-22. [현재 제품 계약](DOCEN-START-HERE.md)이 선행한다. 이 문서는 실제 파일을 찾아 같은 방식으로 제작하기 위한 안내다. ‘금방 만들기’는 검증된 구조·공통 요소를 재사용해 중복 작업을 줄이는 뜻이며, 외부 OAuth/스토어 심사/법무/실제 결제까지 일정이 보장된다는 뜻은 아니다.

## 1. 먼저 복사할 것과 다시 결정할 것

| 재사용하기 좋은 구조 | 제품마다 반드시 다시 정의 |
|---|---|
| 소개→조작 가능한 합성 데모→문제 해결 흐름→기능→요금→신뢰/FAQ | 고객·핵심 문제·기능·약속하는 범위·브랜드 |
| 섹션 폭/공통 간격/반응형/읽기 쉬운 배경 | 문구 길이·이미지 사용권·지원 언어 |
| 로딩/빈 상태/부분 실패/재시도/초안 보존 | 원본 데이터 종류·권한·보관/삭제 정책 |
| 로그인 전 내부 미노출·서버 권한 검증 | 인증 방식·도메인·메일 서비스·회원 연령 |
| 어드민 검색→개인 상세→작업/감사 | 실제 운영 역할·이용권/상품/결제 상태 모델 |
| 멱등 요청·버전 충돌·unknown 쓰기 보호 | 공급자 API 계약·허용 대상·승인 범위 |
| 디자인/기능/배포 근거를 문서로 연결 | 실제 테스트 대상·배포 인프라·비용 |

오리·docen 이름·파란색·5개 탭·Duo 카메라 열·완료3초·가격은 docen 전용 선택이다. 다른 앱에 사용자 요청 없이 그대로 강제하지 않는다. 기존 앱 식별자/DB/키를 복사해 새로운 제품에 연결하지 않는다.

## 2. 현재 저장소 파일 지도

| 경로 | 책임 | 바꿀 때 함께 볼 곳 |
|---|---|---|
|website/src/main.jsx|React 진입·현재 styles.css import|App.jsx·실제 빌드|
|website/src/App.jsx|소개 섹션·KR/EN·합성 Demo·메뉴/QR/모달|styles.css·interaction 테스트|
|website/src/styles.css|현재 소개의 배경·폰트·그리드·반응형·모션|390px/PC·영문 줄바꿈|
|website/src/pricing-content.mjs|요금제/비교표/언어 문구 정본|pricing.css·build-pricing.mjs|
|website/src/Pricing.jsx|소개 안 요금 삽입|생성된 정본 요금 HTML|
|website/scripts/build-pricing.mjs|공유 요금 원본 빌드|public/pricing.html·소개 결과|
|website/scripts/prepare-sites-build.mjs|공유 빌드 패키징|dist/client·dist/server·Sites tests|
|website/scripts/prepare-download.mjs|별도 내려받기 패키지 제작|실제 포함 파일/비밀 제외|
|website/src/reference.css·decorations.json|과거 피클형 참고 스타일/장식 이력|현재 main에서 로딩하는지 먼저 확인|
|mobile/src/DesktopWorkspace.tsx|실제 웹 작업공간 골격|DesktopBriefing·DesktopPresentation|
|mobile/src/screens/AssistantChat.tsx|실제 앱 AI 대화와 제안|서버 assistant·체크 전환 tests|
|mobile/src/screens/TodosScreen.tsx·useTodos.ts|실제 Todo 목록·동작/상태|원본쓰기·reorder·초안/회귀|
|mobile/src/theme.ts·duo-layout.ts|앱 공통 토큰·기기 공간|navigation-geometry·각 tests|
|public/admin.html·admin.css|어드민 진입 shell·외형|인증 전 gate·390px|
|public/admin.js|어드민 상태/조회/로그인/렌더|admin-controls·server routes|
|public/admin-controls.js|운영자/이용권/회원 작업 UI|사유·requestID·version|
|server/admin-auth-*.js|별도 관리자 인증·계정/세션|제품 회원 인증과 분리|
|server/admin-routes.js·admin-store.js|조회·회원 메타·감사|owner/역할/노출 필드|
|server/admin-management-routes.js·admin-operations.js|관리 작업·점검/재시도|영수증·충돌·트랜잭션|
|server/public-launch.js|새 도메인 미오픈 제한|request-lanes·server-runtime|
|server/ai-budget.js|AI 원가 예산·예약/정산|공급자 요청 전후 계수|
|server/legal-policy.js·legal-content.js|약관 버전/본문 정본|build-legal-pages·고정 아카이브|
|scripts/build-handoff.py|문서/이미지 통합·Notion용ZIP·HTML|원본 md·asset manifest|

파일 이름을 찾지 못하면 rg --files로 현재 이름을 확인한다. 이 표만 믿고 새로운 중복 컴포넌트를 만들지 않는다.

## 3. 홈페이지 정보 구성 — 무엇을 어떤 순서로 보여주는가

현재 기준은 Any.do의 공개 섹션 흐름을 참고하되 내용은 docen, 영상은 제외다. 예전 피클 영상형 사이트와는 다르다. 타 서비스의 문구/비공개 디자인/로고 사용권을 복제하지 않는다.

1. **고정 헤더**: 브랜드·페이지 안 기능/이용 흐름/요금 이동·언어·현재 오픈 상태. 현재 docen은 시작/로그인 준비 안내다.
2. **Hero**: 고객이 얻는 변화 한 가지를 큰 제목으로 말한다. 짧은 설명→주요 행동→보조 안내→실제로 눌러보는 제품 예시. 설명을 읽지 않아도 형태가 전달되게 한다.
3. **Workflow(#how)**: 자료가 들어오고→정리되고→Todo/일정/대화 완료로 이어지는 짧은 순서. 모델·DB 같은 내부 기술을 고객의 필수 이해 항목으로 만들지 않는다.
4. **Features(#features)**: Todo/캘린더 등 핵심 결과를 보여준다. 기능 하나에 제목·설명·작은 실제 형태 예시. 카드만 계속 쌓지 않는다.
5. **AI(#ai)**: 외부 AI 연결 구상과 자체 AI 범위를 구분한다. 준비 중인 연결을 사용 가능하다고 쓰지 않는다.
6. **Connections(#connections)**: 지원되는 서비스와 권한/기기 제약을 짧게 보여준다. 아이콘 존재와 실제 연결 성공을 구분한다.
7. **Pricing**: 공유 원본의 요금 카드+기능 비교. 정상 월/베타 월/연간 환산·연간 총액을 섞지 않는다. 현재 PG 준비 중이다.
8. **Trust**: 사용자가 직접 고르는 처리/자료/보관/권한에 대해 실제 제공 범위만 설명한다. 검증 없는 보안 인증·완전 자동화는 쓰지 않는다.
9. **FAQ(#faq)**: 실제 고객의 의문을 답한다. 예: 웹 공개 여부·연결/원본 수정·AI제공/결제 준비. 상위 소개와 같은 정책을 사용한다.
10. **Closing+Footer**: 핵심 가치/다음 행동을 다시 한 번, 법적 문서·지원·요금·언어/QR 등 필수 링크. CTA가 운영 단계와 일치하는지 검사한다.

다른 앱에서는 섹션 제목만 바꾸지 말고 각 단계의 실제 고객 자료/결과 예시를 교체한다. 예를 들어 회계앱이면 ‘메일→분개 후보→확인→장부’로 데이터와 행동을 바꾸고 합성 예시도 같은 흐름으로 만든다.

## 4. 홈페이지 배경·레이어·색상 — 실제 구현 방식

### 4.1 배경은 영상/대형이미지가 아닌 CSS 표면

현재 main.jsx는 styles.css를 로딩한다. body는 **#fff**, 본문 **#17212b**다. 현재 styles.css에는 gradient 배경 선언이 없다. 큰 배경 비디오·Canvas·WebGL이 현재 효과를 만드는 것으로 설명하지 않는다. 여백/차분한 색 구분/선/작은 그림자로 구조를 만든다.

| 층 | 현재 값/방법 | 목적 |
|---|---|---|
|페이지 바탕|#FFFFFF|내용 대비·여백|
|헤더|rgba(255,255,255,.96), blur14px, 아래#f0f1f4 선|스크롤 중 독립된 조작 층|
|데모 바깥|흰색·#e1e6ec 1px·radius16px|제품 화면 하나로 묶기|
|데모 그림자|0 18px 65px -32px #61799f40|가벼운 떠 있음|
|데모 상단|#fbfcfe·아래#e9edf2 선|제목/예시 상태 분리|
|데모 메뉴|#f8fafc·오른쪽#e9edf2 선|영역 탐색|
|데모 오늘 영역|#fcfdfe·왼쪽#e9edf2 선|보조 정보의 약한 위계|
|AI 전체 폭 섹션|#f8faff|주제 전환. 흰 컨테이너와 구별|
|선/구획|#e9edf2 등 약한 1px|카드 밖도 구조 이해|
|링크/강조|#2366e8 계열|명확한 주요 행동|
|포커스|outline3px #286bff·offset4px|키보드 사용자 위치 표시|

reference.css의 footer-sky.webp·캐릭터 strip·glassPill 등은 과거 참고 구현이다. **파일에 남아 있다고 현재 소개가 그 하늘 배경/영상으로 작동한다고 말하지 않는다.** 새 배경 작업 시 실제 import와Network 요청을 먼저 본다.

### 4.2 레이아웃 수치

- 전체 box-sizing:border-box, body margin0. word-break:keep-all + overflow-wrap:anywhere로 한글 호흡과 긴영문/URL의 넘침을 함께 처리한다.
- .section-wrap max-width1200px·좌우36px·가운데. 프레임 내부폭은1200-72=1128px이다. 화면폭과 본문폭을 혼동하지 않는다.
- 헤더88px·sticky top0·z-index40. nav max1380px·좌우40px·기본gap64px. 메뉴각 최소44px터치.
- Hero 위74px, 제목기본 clamp(42px,4.6vw,66px)·line-height1.25·letter-spacing-2.8px·weight800. 다른 breakpoint override가 있으므로 기본값만으로최종화면을추정하지않는다.
- 설명문 margin-top24px·17px/1.85·#697582. 작은화면에서는13px·margin20px/1.9로조정된다.
- Demo hero아래56px, grid171px/minmax(0,1fr)/245px, 최소높이463px, topline54px. 중앙 minmax(0,1fr)가긴제목으로그리드를밀지않게한다.
- Workflow top128/bottom109px, Features45/120px, AI93/85px, Connections115/95px. 반복 블록을 같게 칠하기보다 섹션의 호흡을 다르게 준다.
- Trust grid1fr/1.2fr·gap110px·상하100px, FAQ1fr/1.6fr·gap90px·상40/하100px. Closing top65/bottom108px·위선. footer상48/하40px.
- 숫자는 현재 결과의 설명이다. 다른 제품의 글/그림 크기에 맞춰 조정하되 하나의 spacing scale을 지킨다.

### 4.3 글꼴·아이콘·이미지

DuckSans는 local Pretendard/Apple SD Gothic Neo 우선, -apple-system/BlinkMacSystemFont/Segoe UI/Noto Sans KR/Arial fallback, font-display:swap이다. 외부 폰트를 필수 다운로드하지 않는다. Lucide React아이콘은stroke1.8과vertical-align정렬. 오리assets/duck.png는장식alt빈문자열·고정크기로레이아웃흔들림을줄인다. 타제품의브랜드이미지·영상은허가없이가져오지않는다.

## 5. 홈페이지의 조작 가능한 데모

현재 App.jsx의Demo는 **합성 initialTasks+React useState**다. review/meeting/personal예시에 KR/EN제목·설명·출처·날짜·status가 있고, status는inbox/todo/calendar/done이다.

1. 메뉴를 누르면 같은 tasks에서 status필터한 결과를 표시한다.
2. Todo/대화에서완료는 해당 예시status를변경하고 안내를 보여준다.
3. 일정은 날짜/시간초안→확인 후 예시상태에scheduled를저장한다. 실제Google쓰기API가아니다.
4. 초기화버튼은initialTasks·view·notice·일정초안을되돌린다.
5. 화면상예시라는표시를남긴다. 실제원본/로그인자료를데모에넣지않는다. 무료데모조작이AI호출/외부쓰기/결제를발생시키면안된다.
6. 언어전환은배열의KR/EN문자열을선택한다. 화면본문만아니라버튼·상태·FAQ·가격·오류/빈목록·aria-label까지확인한다.

새앱의가장빠른시안은이처럼‘합성데이터와실제클릭’을먼저만드는것이다. 승인후실제웹앱에서동일시각구조를재사용하되**예시useState를운영저장으로오인하지않는다**. 실제앱은인증·owner·오류·저장·원본동기화가연결돼야한다.

## 6. 반응형·모션·접근성

### 6.1 소개 사이트와 실제 웹앱의 breakpoint는 다르다

소개styles.css에는min1600, max1100/900/600/360px및reduced-motion규칙이있다. Demo는좁아지며171/중앙/245→145/중앙/205→145/중앙→세로flex로전환한다. 모바일메뉴는가로행, 보조오늘영역은숨김, Demo모서리12px/위간격36px·상단47px등으로축소한다. 실제웹작업공간의760px메뉴전환과혼용하지않는다.

소개는PC와390px·320/360px·영문긴줄·가로넘침을확인한다. 모바일에서데스크톱의세열을그대로좁히지않는다. 차례가중요한주행동을남기고보조내용을접는다.

### 6.2 모션

현재효과는메뉴색변화·짧은transition·smooth anchor·상태변화중심이다. app의Things형완료3초/이동과홈페이지모션은별개다. 페이지전체의과한패럴랙스/영상스크롤을자동추가하지않는다. prefers-reduced-motion을지원한다. 모달닫기/비동기늦은응답이새화면을닫거나초안을없애지않아야한다.

### 6.3 상호작용 필수상태

모달은role=dialog·aria-modal·명확한title, 포커스진입·Escape·닫기·원래버튼복귀를확인한다. 모달max-height:calc(100dvh - 40px)·내부overflow-y:auto로모바일접근성을확보한다. 메뉴button/링크의의미를구별하고실행중disabled상태를보인다. FAQ는키보드로열수있어야한다. QR/언어메뉴/모바일메뉴를본문검사와별도로누른다.

## 7. 소개·웹앱·운영 API를 한 서비스에 배치하는 방법

현재는같은Render서비스에서소개/가격/법적페이지와기존테스트앱/API를제공한다. 별도Sites서비스로분리한것이아니다. /는소개, /app은웹앱, /admin은운영, /project는생성기술문서라는경로구분이있지만**새도메인은공개전용guard가우선**한다.

출시전서버guard는server/public-launch.js가정의하고gateway/runtime둘다검사한다. 새Host와같은Origin의서비스API를차단한다. 버튼만숨겨서는직접URL/API진입이가능하므로서버에서막아야한다. 기존테스트host를유지하고PUBLIC_ORIGIN/OAuth/native주소를동시에멋대로바꾸지않는다.

다른앱에도재사용할원칙: 공개소개/미리보기/내부기능의경계를먼저정의→서버에서허용경로/Host/Origin검증→합성데모와회원자료분리→유료기능/운영정보는서버권한으로검사. 새앱은새도메인/앱ID/저장소/키를발급하고기존서비스를재사용하는실수를막는다.

## 8. 실제 웹앱 — 소개에서 승인된 화면을 운영 화면으로

왼쪽5상위메뉴, 가운데실제브리핑·Todo·캘린더·기록·ME, 오른쪽오늘할일. DesktopWorkspace/Presentation/Briefing과기존화면을연결한다. 소개Demo의그림을그대로실데이터인것처럼내놓지않는다.

운영연결체크:

1. 진입:세션확인중→인증필요/이메일인증대기/정상/네트워크실패를구분.
2. 자료:owner조회·마지막캐시·loading·empty·partial·error·retry를마련.
3. 쓰기:사용자초안→필요한미리보기/확인→낙관적표시→서버영수증→확정/거절rollback/unknown조회.
4. 출처:실제연결/원본링크/날짜를표시. 계정이바뀌면오래된자료를버린다.
5. 내비게이션:탭전환/회전/다시열기에도가능한범위의초안·선택일/스크롤을보존.
6. 화면정리:브리핑상단날씨와ME하위상시바로가기숨김. 서버설정/저장자료삭제는하지않음.
7. 실제원본검수:fixture성공과다르게별도소유자테스트용원본을확인. API쓰기/메일을무단발생시키지않음.

## 9. 어드민 화면 — 상세한 구성과 외형

### 9.1 외형 토큰(현재 public/admin.css)

| 대상 | 값 |
|---|---|
|전체|배경#f7f9fc·본문#233042·system sans|
|레이아웃|.shell display:flex/min-height100vh|
|왼쪽|220px고정폭/flex-basis220px·sticky top0·height100vh·흰색·우선#e7ecf2|
|메뉴|45px최소높이·radius7px·글자13px·gap5px|
|활성메뉴|#edf3ff배경·#2468eb글자·weight650|
|오른쪽topbar|68px·흰색·좌우40px·아래선|
|본문|padding38px40px·max1520px·가운데·min-width0|
|화면제목|25px/700·letter-spacing-.6px|
|카드/패널|흰색·#e6ebf2 1px·radius9px|
|통계|기본4열·gap15px·패딩22px·숫자25px|
|테이블|가로scroll·nowrap·본문12px·head10px/#fafbfd·행선|
|상세필드|150px/나머지grid·라벨/값분리|
|상세탭|하단2px활성선·gap26px·모바일가로scroll|
|입력포커스|3px #a9c8ff·offset3px|
|로그인|내부workspace가아닌별도gate·카드max420px·입력최소44px|

1000px이하:sidebar180px·본문28/24px·통계2열·상세1열. 600px이하:sidebar136px·topbar58px·본문25/12px·통계1열·toolbar줄바꿈·상세필드세로·tab가로scroll. 1700px이상본문좌우60px. docen은모바일에서도좌메뉴를보존한구성이며다른앱이같은값을강제할필요는없다.

### 9.2 메뉴와회원상세

회원검색이운영의입구다. 목록은ID/이메일·가입일·현재이용권/모드·인증상태를보여주고25개단위페이지를제공한다. 상세는회원정보/이용권목록/결제내역/연결·동기화/AI사용량으로이동한다. 선택회원이없으면‘먼저회원찾기’를보여주며다른회원의마지막자료를잘못보이지않는다.

운영현황은가입·인증·연결메타·기록된사용을집계한다. ‘저장된연결수’는현재접속정상수와다르다. 운영자관리와조회/변경감사는별도화면이다. PG미연결에서는결제내역을미연결로표시하며수동이용권을거래로만들지않는다.

### 9.3 프런트 상태와실제조회

admin.js는state.view/query/offset/selected/member와조회세대version을관리한다. 화면전환때AbortController로이전조회를취소하고captured version이다르면늦은결과를버린다. 서버문자열은esc로escape한다. 로그인체크전에workspace를mount하지않는다. logout은controller취소+version증가+회원상태삭제+gate로복귀한다.

핵심조회경로는/api/admin/session, /overview, /members?q=&offset=, /members/:id, /operators, /audit이다. 실제라우트는server파일을정본으로한다. 화면의단순disabled만으로권한을지켰다고하지않는다.

### 9.4 별도인증과운영변경

관리자계정은admin_accounts/admin_operator_sessions/admin_setup_codes이다. 제품user행/세션과공유하지않는다. 관리자cookie는별도HttpOnly/Secure/Strict·8시간세션. 최초설정/재설정메일은10분코드/5회·60초재요청정책이고, 사용자지정초기비밀번호부트스트랩예외는소유자계정에1회+변경강제다. 일반회원의15분코드와혼동하지않는다.

운영변경은(인증→현재역할/계정상태검사→CSRF/Origin→입력검증→사유/requestID/version검사→단일트랜잭션변경+감사+멱등영수증→제한된응답)순서다. 권한변경후기존세션/다음요청에도반영한다. 감사에는전후메타·사유·주체/대상·시각만저장하고비밀번호/토큰은제외한다.

이용권발급으로PG거래/AI예산을만들지않는다. 계정정지는로그인/예약/에이전트/원본실행전에도검사한다. 실행중외부요청을소급취소한다고하지않는다. 재시도는알려진최신실패만, 성공/진행/unknown/충돌/더최신수정이있으면차단한다.

### 9.5 다른앱용최소어드민만드는순서

1. 합성회원3~5명으로좌메뉴→목록→개인상세의정보구조를승인받는다.
2. 별도인증gate와서버RBAC를먼저연결한다. 로그인전내부DOM/자료미노출검사.
3. 검색/페이징/개인상세의읽기API를owner/역할검사와함께구현한다.
4. 작업별서버permission을정의하고쓰기마다사유/멱등/버전/감사를붙인다.
5. UI버튼을실제API로교체하며빈값/실패/정지/만료상태를표시한다.
6. 다른회원ID·일반회원세션·조회전용쓰기·중복요청·오래된버전·로그아웃중늦은응답을시험한다.
7. 결제는PG영수증/웹훅검증/환불/권한회수까지별도작업으로다룬다. 미연결영역을가상성공으로채우지않는다.

## 10. 자료모델과저장규칙을화면보다먼저맞추기

가장작은공통모델은ownerId/id/revision/createdAt/updatedAt이다. 외부자료는connectionId/source/provider/nativeId/ETag/수정시각/허용필드/동기화상태가추가된다. 브리핑후보는안정key/ref/처리상태/Todo연결/actionID가필요하다. 이용권은상품/시작/종료/회수/발급주체/사유를결제거래와분리한다.

원본과화면snapshot·로컬초안·임시낙관적층을같은레코드로취급하지않는다. 계정전환/취소/서버실패/응답유실의결과를미리정의한다. 원본없는수동항목은외부ID를가짜생성하지않는다. 비용원장은호출전예약→후usage정산→불명보류로구분한다.

## 11. 새앱을빠르게만드는실행순서

### 단계A: 제품계약한페이지

고객/문제/대표시나리오/수신자료/사용자행동/원본변경/요금/지원기기/출시단계를쓴다. 확정과제안을나눈다. 기존계정/키/비공개데이터는별도보존범위로명시한다.

### 단계B: 실제내용으로한화면시안

Hero와주요작업화면을실제길이의합성내용으로만든다. 빈카드/로렘입숨으로정보밀도를승인받지않는다. PC+390px·긴글자·로딩/오류각1개를보여준다. 선택된시안을기준으로하고버린안은기록만남긴다.

### 단계C: 토큰과공통컴포넌트

배경/본문/보조/선/강조/실패·폰트·간격·radius·터치크기·motion을정의한다. Layout/Sidebar/Heading/ListRow/Status/Empty/Error/Form/Confirm를먼저만든다. 같은상태를화면마다다르게설명하지않는다.

### 단계D: 로그인과자료읽기

인증gate·회원owner·합성/실제경계·캐시/갱신·화면세대보호를연결한다. 로그인이느리다고공개내부화면을먼저그리지않는다.

### 단계E: 핵심쓰기와원본

한작업의최초입력→검증→확인→저장→중복/실패/재시도→원본결과조회까지완성한다. 다음기능을추가하기전에실패상태를같이완성한다. ‘모두연결’은버튼수보다실제왕복/권한이기준이다.

### 단계F: 어드민/요금/법적문서

사용자관리·권한·이용권·감사를연결한다. 가격정본하나로모든화면을만든다. 실제처리와맞는약관/동의/삭제/내보내기를붙인다. PG/세금/스토어정책은자동복사완료대상이아니다.

### 단계G: 검증과공개

관련테스트→PC/모바일실제클릭→오류/권한/계정경계→production빌드→배포SHA확인→DNS/TLS→공개단계guard까지확인한다. 새native설치가필요한내용은웹배포와분리한다.

### 단계H: 다음AI인계

요청·최종선택·변경이유·파일·명령·통과/실패·배포ID·실제미검수·다음순서를한페이지에쓴다. 과거정정을남기고현재기준을앞에둔다. 소스/증거/문서묶음에키/DB/사용자원문을넣지않는다.

## 12. 복사해서쓸프로젝트요청서

```text
제품명/표시이름:
고객/가장큰문제:
대표흐름(수신→정리→사용자행동→저장/실행):
지원범위(웹/앱/기기별):
참고화면과참고할부분(밀도/색/모션/정보구조):
반드시보존할기능/자료/계정/식별자:
홈페이지섹션/실제문구/CTA의현재목적:
배경방식(CSS단색/구획/필요한경우의이미지):
실제연결/API와합성데모의경계:
읽기/쓰기/확인/취소/재시도/unknown처리:
로그인/가입/인증/권한/어드민역할:
요금정본/사용량상한/미연결결제:
법적고지/수집/보관/내보내기/삭제:
확인할상태(로딩/빈값/오류/부분성공/복구):
검증대상과실계정/실기기미확인:
공개단계(소개만/초대테스트/일반오픈):
배포대상/비용범위/자동배포정책:
다음AI용문서/파일/증거저장위치:
```

## 13. 도구와검증명령

개발:rg/git/node24/npm-lock/React·Vite/ReactNative·Expo. UI증거:실제Chromium/Playwright흐름+PC/390px캡처. native:GitHub무료Mac/Xcode/EASlocal. 문서:Markdown원본+생성NotionZIP/HTML. 배포:기존Render와사용자DNS/Resend. Figma참고는가능하지만현재baseline정합성미완료이며작성/접근성검수성공으로대체하지않는다.

```sh
# 관련소스를찾고상태확인
rg --files website/src mobile/src server public test
git status --short
# 홈페이지의공유가격+production+패키징검사
npm --prefix website run build
npm --prefix website run test:sites
# 실제상호작용(환경에브라우저의존성필요)
node website/tests/interaction.mjs
node website/tests/public-launch.mjs
# 서버경계/앱관련검사
npm run check
node --test test/public-launch.test.js
npm --prefix mobile run typecheck
# 원본문서로전달물다시만들기
python3 scripts/build-handoff.py
```

각검사의환경변수/포트/합성계정은테스트파일을읽고그대로준비한다. 운영토큰/실계정으로fixture를바꾸지않는다. 새UI가없으면전체IPA/유료AI검사는불필요하다. 문서의명령은재현절차이지이번문서화에서모두실행했다는주장이아니다.

## 14. 자주생기는실수와예방

| 실수 | 예방 |
|---|---|
|소개데모가실제앱이라고생각|합성표시·실제API별도검사|
|마지막응답이항상최신이라고생각|revision/requestID/화면세대검사|
|timeout이면외부쓰기재전송|actionID조회·unknown보존|
|가격카드만바꾸고다른언어/비교표방치|단일pricing-content생성|
|로그인중내부shell먼저노출|인증gate에서mount차단|
|관리자버튼숨김이보안이라고생각|서버RBAC·CSRF·감사|
|메일키있으면실제수신성공|도메인Verified→발송→사용자수신확인|
|DNS레코드저장=TLS완료|공개조회→Render검증→certificate→HTTPS|
|배포live=앱설치업데이트|웹/native/Apple처리/설치분리|
|참고CSS/오래된지침을최신으로사용|실제import·최신사용자확정·통합입구우선|
|무료Pro=AI무제한|권한/정산/원가예산분리|
|완료후다음AI가처음부터재시작|현재기준+결정정정+미완료체크리스트|
