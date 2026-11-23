# 새 docen 로고·로딩 영상·FAQ 문항 삭제 — 2026-11-23

## 사용자 요청과 최신 기준

사용자가 홈페이지 FAQ의 Dots 관련 문항을 아예 삭제하고, 새 로고를 앱/웹 등 모든 로고 위치에 적용하며 첨부 로딩 영상을 활용하라고 요청했다. 새 표식은 파란 받침·반투명 사각층·은은한 구로 이루어진 사용자 제공 이미지다. 이전 오리 마스코트를 현재 로고로 유지하자는 시각 규칙은 이번 요청으로 대체한다. 서비스명/계정/Bundle ID/URL scheme/가격/원본 권한/공개 단계는 바꾸지 않는다. Dots 지향 제품 기능이나 과거 작업 이력을 삭제하는 요청이 아니다.

사용자가 앞서 제공한 Render 화면에서 docen.today/www.docen.today 모두 Verified/Certificate Issued를 확인했다. 이는 이전 DNS/TLS 대기 기록보다 최신이다. www는root로redirect설정이다. 이 환경의 curl은CONNECT proxy403으로 차단됐으므로 실제 새 도메인 페이지를 curl로 검증한 것으로 말하지 않는다. 새 도메인은 계속 소개만 공개하며 서비스/관리자 직접 진입은 차단한다.

## 원본 자산과 가공 범위

첨부1/2 JPG는 각각1280px 정사각 로고이며 원본을 mobile/assets/brand의 original파일로 보존한다. 첨부3은 docen-loading-bounce-2.mp4,1080×1080/H.264/60fps/3초/353,802bytes이며 오디오 stream이 없다. 영상/로고를 AI로 재생성하지 않았다. PNG변환·아이콘 크기 조정만 하고 구도/색/움직임을 재디자인하지 않았다.

- mobile/assets/brand/docen-logo-original.jpg: 흰 배경 원본.
- mobile/assets/brand/docen-logo-shadow-original.jpg: 그림자 배경 원본.
- mobile/assets/brand/docen-logo.png:512px 공통 표식.
- mobile/assets/brand/docen-loading.mp4: 사용자 원본 영상.
- mobile/assets/icon.png:1024px 앱 아이콘.
- mobile/assets/favicon.png:64px, splash-icon/duck-mark/Android foreground도 새 이미지로 교체.
- website/public-site/assets/brand 및 public/assets/brand: 실제 소개/Vite와 서버 공통 고정 공개 경로. 두 복사본은 동일한 파일이다.
- 기존 duck.png/duck-mark.png 같은 호환 파일명은 유지하되 이미지 내용은 새 로고다. 과거 QA 캡처/약관 고정 아카이브/기술 식별자는 보존한다.

## 적용 위치

### 홈페이지·웹 정적 화면

홈페이지 header/제품예시/기능구획/footer 등 기존 Duck컴포넌트의 모든 표식과 favicon을 교체했다. KR/EN FAQ의 ChatGPT/Dots 자동가져오기 질문/답변 배열 항목을 통째로 삭제했다. 가격·기능표의 다른 문구/외부AI준비상태는 임의 변경하지 않는다.

Vite의 실제 publicDir는 public-site다. public폴더는 별도 가격 생성 경로이므로 이 둘을 혼동하지 않는다. index의 준비용 로딩은 React가 mount되면 바로 제거되고 인위적인 대기 시간은 없다. 기존 영상 없는 소개 원칙의 예외는 이번에 요청한 **로딩 중 브랜드 영상만**이며 hero/마케팅 배경 영상은 추가하지 않았다.

어드민 로그인·초기설정·강제비밀번호변경·인증후sidebar의 브랜드에도 새 이미지를 적용했다. 실제조회대기에는 영상+문구를 표시한다. 로그인 전 내부메뉴/회원자료는 계속 노출하지 않는다. 초기HTML로그인/채팅/탭·서비스준비안내·숨겨진통화페이지 표식도 교체했다. 텍스트공유에서는 이전오리이모지를제거하고docen이름을쓴다.

### React Native/Expo 앱

BrandMark.tsx가공통Image,BrandLoading.tsx가native영상,BrandLoading.web.tsx가실제webvideo를담당한다. 초기준비/세션확인/비서답변대기/웹브리핑초기조회에서사용한다. 로그인/연결/인증/채팅웰컴/일반폰헤더/5탭의비서아이콘/웹작업공간표식은BrandMark를사용한다. 작은버튼/행의일반작업spinner는그기능상태용으로유지한다.

Duo장식헤더는이전승인대로숨기며새로고라고다시넣지않는다. 카메라열·5탭위치·반대pane·일반폰하단탭·세션/초안을보존한다. 선택형Widget소스도새이미지와docen표시로갱신하고plugin이assetcatalog를연결하도록했다. enabled=false를켜거나새extension서명을실행하지않았다.

expo-video~58.0.14와expo-asset~58.0.21을현재SDK58의bundledNativeModules기준으로설치/lock에기록했다. 새프로젝트/서명/Bundle ID는없다. 앱icon/splash설정은새정지이미지, OS초기splash에서동영상을재생한다고가장하지않는다. native영상은JS앱이시작된후실제대기상태에표시된다.

## 로딩·접근성·실패 계약

- 영상은muted/loop/inline이며controls/PiP/새전화진입없음. 3초반복은실제대기중에만표시한다.
- OS/브라우저동작줄이기에서는정지로고만, 웹에서는video요소자체미생성또는src미설정으로불필요한재생/다운로드를피한다.
- video준비전에는정지로고, autoplay거절/재생오류에도정지로고. 오류를추가서버실패로표시하지않고기존로딩상태/재시도를유지한다.
- 앱background/브라우저hidden에서는pause. 준비/조회완료와unmount시중지한다. video끝을기다린뒤결과를보여주는인위적지연은없다.
- progressbar/busy와기존상태문구로의미를전달하고영상프레임을접근성읽기대상으로만들지않는다.
- 자료쓰기/AI요청/권한/로그인/상태갱신속도를영상이대신해결했다고하지않는다.

## HTTP·보안·Safari 재생

고정공개경로는docen-logo.png/docen-loading.mp4/loading.js/brand.css뿐이다. server/site와public-launch의허용목록에해당이름만추가하고실제소스는public/의고정root에서읽는다. 임의brand파일/환경파일/서비스API가열리지않게한다. 기존site경로의realpath/숨김파일/탈출방지·GET/HEAD·byte range검사를유지한다.

mp4는video/mp4·Accept-Ranges·유효한206/Content-Range·범위오류416를지원한다. Expo web번들의해시mp4도범위읽기를지원해Safari의미디어요청을처리한다. 서비스준비페이지의CSP에는같은origin이미지/스타일만추가허용한다. API CORS/인증·기존미오픈guard는변경하지않는다.

## 실제 검사와 근거

- 최종전체467개중466통과·실패0·기존1skip. 새brandingroute테스트포함.
- 고정brand자산·영상GET/HEAD/byte-range·공개Host의/app/API차단:single-runtime/two-lane모두통과. 기존site테스트에Expo형mp4부분읽기도추가했다.
- 문법123개·TypeScript·소개production빌드·Sites4검사·Expo web/iOS JSexport통과.
- 실제격리iOSprebuild/autolinking·AppIntents/bridge검사통과. 검사기가옛ios/duckduck경로를고정한문제를찾아실제생성된단일.xcodeproj이름으로조회하도록수정했다. expo-video가실제autolinking목록에있는지검사한다. Swift실제SDK컴파일/서명IPA/Apple업로드는이번검사의뜻이아니다.
- website/tests/brand-identity.mjs:실제소개/Expo production웹+격리Node HTTP서버. PC/390px홈페이지브랜드·FAQ삭제·boot재생/reduced·세션확인재생/reduced/영상실패fallback·관리자로그인gate를실제조작했다.
- website/tests/interaction.mjs:KR/EN·제품예시/Todo/Calendar/가격/FAQ/QR/모바일메뉴·외부쓰기0/외부요청0회귀통과. 로딩mp4요청만허용하며마케팅영상/iframe은추가하지않는다.
- website/tests/public-launch.mjs:가상HTTPS docenHost의소개/준비안내·직접앱/API차단·기존테스트계정보존통과.
- 증거:artifacts/docen-identity-2026-11-23/browser와site. 합성계정/실제웹이며실기기native캡처·실제모델·운영원본쓰기검수가아니다. HTTP origin을production앱세션으로넣으면기존HTTPS검증이거부하므로검사는가상HTTPS를로컬서버로proxy했다. 그보안검사를약화하지않았다.

## 배포·남은 경계

기존무료Render/자동배포off·같은서비스/DB/키/Origin을유지하고최신소스를한번수동배포한다. 배포ID/소스SHA/live/공개접속의실제결과는별도배포영수증에기록한다. trigger접수만으로live라고하지않는다.

설치iPhone앱의아이콘/영상모듈은새서명native빌드·Apple처리·설치가필요하다. 이번요청에서수동TestFlightworkflow/유료runner/새widget서명을실행하지않는다. 실기기영상/OSsplash/푸시/접근성은그후별도확인한다. 이전GitHub자동일일문서커밋57b08c4는ff로보존했으며그기록을덮거나force push하지않았다.
