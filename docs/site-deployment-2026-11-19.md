# 소개 사이트와 베타 요금 공개 배포 — 2026-11-19

사용자가 공개 배포를 승인했다. My Workspace의 기존 무료 duckduck-test를 재사용했다. 새 서비스·유료 자원·실제 결제·native 빌드는 만들지 않았다.

- 공개 주소: https://duckduck-test.onrender.com/ (소개), https://duckduck-test.onrender.com/#pricing (요금), https://duckduck-test.onrender.com/app (앱).
- 배포: dep-dbv6kidg1s2s73ebtan0, 소스9d1204325dcf20ed79c0f7f97bbdc83a75f540c2, live 완료2026-11-19 12:18:32 KST. 자동 배포는 off를 유지한다.
- 외부 TinyFish의 인증 없는 읽기로 새 소개 제목·정상 월19,900/55,900·베타 월16,900/49,900·연202,800/598,800과 베타 월 결제 안내를 확인했다. /api/health의 ok=true와 release 일치도 확인했다. 배포 전환 도중503은 있었고 live 이후 재조회는 성공했다.
- 소개와 요금은 공개 열람 가능하며 개인 앱 자료는 기존 인증을 따른다. 로그인·실제 사용자 자료/연결·결제는 조작하지 않았다. 무료 서버의 휴면 후 첫 접속 지연은 발생할 수 있다.
- 로컬 production build·Sites4·다운로드2·사이트/앱 경계1·110파일 문법 검사 통과. KR/EN PC·모바일 조작은 기존 로컬 Chromium 검수이며, 외부 언어 버튼 조작/실제 iPhone 검수로 대신하지 않는다.

[기계 검증 영수증](../artifacts/duck-beta-annual-2026-11-19/deploy-receipt.json). 이 기록을 추가하는 문서 커밋은 배포 소스와 별개이며, 문서만을 위해 추가 배포하지 않는다.
