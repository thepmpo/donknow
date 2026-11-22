# 서비스명 docen 통일

사용자 최종 지시: 앱이든 웹이든 모든 표시 이름은 소문자 `docen`. 구매 도메인 `docen.today`, 구매처 호스팅KR. 처음 언급한 도슨/Dosen/Docen 표기는 현재 표시 이름이 아니다.

## 적용

- 소개 사이트 한글/영문·로고 문자·버튼·QR·metadata·FAQ·요금표, 앱/웹의 채팅·ME·가입·인증·설정·오류 안내, 관리자 로그인/내부 틀/초기 변경 화면·지원 페이지.
- Expo 앱 표시 이름·기기 권한 설명, 새 알림 제목·공유·개인 내보내기 파일명, 새 메일 제목, AI 지침·기본 비서 이름·생성 문서 기본 제목.
- 기존 저장된 기본 비서 이름은 읽기 시 표시만 정규화한다. 사용자 개인 이름·작성 자료·대화 원문을 일괄 수정하지 않는다.
- 새 약관2026-11-22.2에 이름 변경과 계정/자료/연결/이용권/요금 유지 사실을 안내한다.2026-11-22와2026-11-22.1 고정 문서와 과거 가입 동의는 변경하지 않는다. 법적 운영자·문의 주소는 그대로다.

기술 식별자는 표시 이름이 아니다. Apple bundleIdentifier/Expo projectId·slug/URL scheme·OAuth callback/HttpOnly 쿠키·SecureStore/DB 파일명·암호화 salt·알림 소유권 태그·백업 및 내보내기 protocol format을 유지한다. 파일 경로/컴포넌트 이름/과거 문서에 이전 이름이 남는 것은 기존 데이터와 연동 호환을 위한 것이다. 사용자에게 보이는 새 내보내기 파일 이름은docen이다. 오리 마스코트는 이름 변경만으로 바꾸지 않았다.

## 검사

전체 `npm test`:463개 중462통과,기존1제외,실패0. `npm run check`:122개. TypeScript·Expo 웹 export·소개 사이트 build/packaging·사이트4개 테스트 통과.

기존 저장 프로필의 기본 이름을docen으로 표시해도 암호화 payload·세션·작성 원문·기존 동의가 바뀌지 않는지 테스트했다. 개인 비서 이름의 재시작 보존도 확인했다. 서버/관리자 회귀10개도 통과했다.

실제 production Expo 번들+격리 Node/SQLite로 자동 합성 인증메일·미인증 내부/API 차단·잘못된/올바른 코드·로그인/새로고침 복원·390px·비밀번호·초기HTML 가입/계정 분리 회귀를 통과했다. 메일은 테스트 outbox이며 실제 수신 성공이 아니다.

소개 사이트는 실제 빌드 파일을 같은 origin의 실제 앱 서버에 올려 PC/390px,KR/EN,브리핑→Todo/일정/완료 예시·가격/기능표·QR/모바일 내비게이션을 검증했다. 페이지 오류·외부 요청·영상 요청0. 첫 Vite preview는 사용 중인 포트와/site base 때문에 확인에 실패했고, 실제 운영형 경로로 전환해 통과했다. [화면과 결과](../artifacts/docen-brand-2026-11-22/).

## 도메인·인증메일 남은 단계

공개 DNS Google resolver에서 docen.today의 NS 조회가NXDOMAIN이었다. 구매 실패를 뜻한다고 단정하지 않는다. 호스팅KR 등록 완료·네임서버/전파 상태를 확인해야 한다.

Resend/호스팅KR에 로그인된 도구 세션이나 서버 설정용 자격증명이 없다. 사용자가 Resend 로그인 연결 또는 DNS 값 전달 방식을 선택하도록 질문했다. 비밀번호/메일 키를 채팅으로 요구하지 않았다. 현재 Render 플러그인에는 custom domain 등록 기능이 없어 DNS/서비스 도메인 등록을 했다고 주장하지 않는다.

1. Resend Domains에docen.today 또는전용발신하위도메인을등록한다. 추적 기능은 임의로 켜지 않는다.
2. 실제 발급된 DKIM/TXT·발신용 SPF/MX 값을 호스팅KR의 해당 DNS 영역에 정확히 입력한다. DKIM 공개키를 추측해 넣지 않는다. 기존 메일 수신MX를 덮어쓰지 않는다.
3. Resend의verified 확인 후 발신자를docen 이름의 인증된 주소로 변경한다. 예시 `docen <no-reply@docen.today>`는 도메인 검증 전 적용하지 않는다.
4. 사이트 도메인은 기존 Render 서비스 Custom Domains에등록 후 호스팅KR에 A `@`→216.24.57.1, CNAME `www`→duckduck-test.onrender.com을 설정한다. 이 값은 현재 공식 Render 안내의 IPv4 대상이며, 실제 서비스 등록/상태 확인이 먼저다. 레코드 충돌/기존AAAA는 확인 후 처리한다.
5. DNS/Render검증/TLS/메일 실제 수신이 확인된 뒤에만 공개origin·OAuth 허용 주소·앱 API 주소를 전환한다. 현재 주소를 먼저 끊거나 로그인 쿠키가 도메인 사이에 자동 공유된다고 가정하지 않는다. 새 도메인은 재로그인이 필요할 수 있다.

실제 도메인·Resend 인증·일반 가입자 수신은 아직 미완료다. 이번 작업은 이름 변경 소스/웹 반영이며 새 TestFlight는 빌드하지 않았다.

근거: https://resend.com/docs/dashboard/domains/introduction · https://render.com/docs/configure-other-dns (이번 작업에서 본문 조회). DNS 확인: https://dns.google/resolve?name=docen.today&type=NS.
