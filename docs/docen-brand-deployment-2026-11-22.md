# docen 이름 변경 웹 배포

- 구현460a5ef, 배포9517a948e79e6d9cf1391597ff2e2443148a99b2.
- 기존 무료 Render duckduck-test,dep-dc1ef7vf3r2c73cg6h7g가2026-11-22T13:02:32.615958Z live.
- live 이후 cache-busting 공개 조회로 /api/health ok=true와 소스 해시, /api/legal serviceName=docen·약관2026-11-22.2, 메인docen 안내, /admin의docen 로그인 잠금 화면, /terms의 이름 변경 고지를 확인했다. 반영 중의 이전 버전 조회와 최종 live 조회를 구분했다.
- 전체463중462통과·기존1제외·실패0. 사이트4개·가입/인증/비밀번호/초기HTML 브라우저·실제 사이트 빌드 PC/390px/KR·EN 조작 통과. 문법122개·TypeScript·Expo 웹/소개 사이트 빌드 통과.
- 현재 확인 주소 https://duckduck-test.onrender.com/ 와 /app. docen.today(호스팅KR)의 DNS·Render custom domain·TLS·Resend 발신 인증은 아직 미완료. 새 주소/발신값으로 먼저 바꾸지 않았다. Resend 로그인 연결 선택은 답변 대기다. 실제 메일 수신 성공을 주장하지 않는다.
- 앱 display name과 권한/화면 문구는 소스에docen 적용, 설치 iPhone 앱은 별도 새 빌드가 필요하다. App Store Connect 표시 이름을 원격 수정하거나 TestFlight를 빌드했다고 주장하지 않는다.
- 이전 약관/가입 동의/계정/자료/외부 연결/기술 식별자·비밀/요금·PG·AI 예산을 변경하지 않았다. 실제 회원이나 외부 원본을 대신 수정하지 않았다.
