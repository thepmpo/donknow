# 소개만 공개하는 웹 배포

- 구현96e3b48, 공개 인계/배포b5631cdb1320fcadf1d479bf3c9807fc465d9e09.
- 기존 무료 Render duckduck-test의dep-dc1fj8mc6qcc73anm4u0가2026-11-22T14:19:07.296071Z live. 새 유료 자원·서비스·도메인을 자동 생성하지 않았다.
- 전체465개 중464통과·기존1제외·실패0. 문법123개·사이트 빌드·사이트4개 테스트·실제 빌드 PC/390px/KR·EN/QR/가격/예시 회귀 통과. 실제가상 Host의gateway/runtime API·직접앱 차단과 기존 테스트 세션/자료/앱 보존 검증, 새 Host의PC/390px 준비 안내 흐름 통과.
- 운영 배포live와 정확한 커밋은 Render도구로 확인했다. 이 세션의공개URL 재조회는search도구접근오류·실행환경DNS EAI_AGAIN으로 확인되지 않았으므로 공개페이지를 직접 열어봤다고 주장하지 않는다. Render readiness와 로컬 실빌드 검증은 실제DNS/TLS 확인과 구분한다.
- docen.today Custom Domain 등록은Render설정화면에서 사용자가 추가하도록 안내했고 완료 응답 대기다. 새 도메인의 실제A/CNAME·Render검증/TLS·외부 접속 검증은 미완료. 메일DNS4건/Verified/Ready/사용자실제수신·인증완료는 별도 완료 상태다.
- 새 도메인에서서비스는 오픈하지 않는다. /app·내부 페이지→준비 안내,서비스API→503. 기존 테스트 주소 앱과native API/OAuth/관리자와PUBLIC_ORIGIN은 유지한다. 기존 테스트 주소가초대로그인으로보호된다고주장하지않는다. 웹서비스를공개할때서버제한·소개CTA·Origin/OAuth등록을별도전환/검증해야한다.
