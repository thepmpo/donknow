# docen 소개 사이트만 공개

사용자 확정: docen.today는 우선 소개로 들어가고 웹서비스가 완성되면 소개 페이지에서 로그인해 내부로 진입한다. 지금 웹서비스 공개 오픈은 아니다.

## 최종 구현

공개 소개의 KR/EN 로그인/시작/무료 요금표/하단/모바일 메뉴는 오픈 준비로 안내한다. 공개 로그인은 비활성 표시, 나머지 준비 링크는 /coming-soon으로 간다. QR은 /app 대신 소개 메인을 가리킨다. FAQ·iPhone 안내의 지금 웹 사용 가능 표현을 내부 테스트·미오픈으로 수정했다. 가격과 예시 데모는 유지하고 신규 가입·결제·대기자 이메일 수집을 만들지 않았다.

server/public-launch.js의 정확한 도메인 판별을 gateway/runtime 양쪽에서 적용한다. docen.today/www와 대소문자·포트·후행점 변형, 해당 Origin 요청에 적용한다. 새 도메인에서는 소개·요금·약관·문의·사이트 자산과health/legal 조회만 허용한다. /app·/admin·/project·음성 화면·앱 번들 등은303 /coming-soon으로, 가입/로그인/비서/자료 등 API는503 SERVICE_NOT_LAUNCHED로 보내며 no-store다. HTML/HEAD·페이지 접근성을 유지한다.

기존 duckduck-test.onrender.com 앱·관리자·native API·provider callback/webhook은 유지한다. 기존 테스트 주소는 인터넷에서 접근 가능하고 초대/접근 허용 목록 인증을 추가한 것은 아니다. 새 도메인에는 내부 앱을 공개하지 않는다. 기존 회원/쿠키/암호화/동의·가격·원본 연동/키는 변경하지 않는다.

## 검사

전체465개 중464통과·기존1제외·실패0. 문법123개. 소개 사이트 실제 빌드·패키징, 사이트4개 테스트 통과. PC/390px/KR·EN·요금/예시 조작/QR/모바일메뉴 회귀 통과.

test/public-launch.test.js는 단일runtime·실제2lane 두 방식으로 새 Host/Origin의 내부 페이지·회원 API를 실제HTTP로 차단하고 기존 테스트 세션·Todo·앱 조회를 보존하는지 확인한다. Node fetch가 Host를 무시하는 것을 확인해 테스트 전송을node:http로 수정했다. 프로덕션 우회 플래그는 없다.

website/tests/public-launch.mjs는 production 사이트 빌드와 격리2lane서버에 실제docen Host를 전달하는 로컬프록시를 사용해 PC/390px 소개·로그인 준비 표시·/app 링크 제거·준비 안내·signup API차단·health200을 검증한다. /app의303/Location은 실제HTTP검사, 브라우저에서는manual redirect 응답과 안내 페이지를 확인한다. 리디렉션 뒤 외부DNS 터널을 타는 가상호스트 제약, 준비 페이지의 connect-src 차단, 모바일에서 숨겨진 데스크톱 로그인 문구를 구분해 테스트를 수정했다. 실제 DNS/TLS 성공을 가상Host검사로 가장하지 않는다. [화면](../artifacts/docen-introduction-2026-11-22/).

## 실제 이메일 확인

사용자가 새 Resend 팀 herryk153/docen.today의Verified·Forge Ready 화면을 제공했다. 사용자가 호스팅KR에4개 메일 레코드와 Render에MAIL_API_KEY/MAIL_FROM을 직접 입력했다. dep-dc1fbe9ksfps738ojumg/15a34d247694af4122bd9b87978f0c85515a373c가2026-11-22T14:02:24.829319Z live인 것을 도구로 확인했다. 키/환경변수 값을 읽지 않았다.

사용자가 실제 메일 수신→인증번호 확인→내부 진입까지 완료했다고 확인했다. 사용자의 받은편지함을 agent가 직접 읽은 것은 아니다. 이전 발신 도메인 미해결 기록은 이 확인으로 갱신한다. send-only키로 /domains를 조회한401 restricted-api-key는 발송 실패가 아니다.

## 남은 도메인 연결

사용자가 TinyFish 원격 화면 입력 문제로 수동 진행을 선택했다. 현재 Render도구에는 custom domain 등록/조회/검증 기능이 없으므로 재로그인 연결을 반복하지 않는다. Settings→Custom Domains→Add Custom Domain→docen.today→Save를 안내했고 완료 응답 대기다.

이후 호스팅KR에 사이트용 A @→216.24.57.1과 필요한www CNAME→duckduck-test.onrender.com을 추가하고 Render에서DNS/TLS를 검증한다. 기존 메일 레코드4건을 보존한다. 연결 성공 전 주소/메일/OAuth의 설정을 임의 교체하지 않는다. PUBLIC_ORIGIN은 기존 테스트·native·OAuth·서명검증을 유지하기 위해 그대로 둔다. 공개 웹 출시 때는 서버 진입 제한·사이트 CTA·원본Origin/OAuth 허용주소를 함께 준비/검증해야 한다. 도메인 연결만으로 서비스를 자동 오픈하지 않는다.
