# docen 소개 무료 정적 CDN 전환 — 2026-11-23

## 승인과 목적

무료 Docker 서버가 쉬었다가 깨어날 때 플랫폼 준비 화면을 보이는 문제를 피하기 위해 소개 페이지를 정적 CDN으로 분리한다. 사용자가 무료 방식을 승인했다. 기존 앱 서버는 유지하고 유료 플랜/PG/AI예산/로그인/메일/native API/OAuth/PUBLIC_ORIGIN/DB를 바꾸지 않는다.

## 빌드와 게시 범위

website/package.json build:static: build-pricing → VITE_STATIC_SITE=1 vite build → prepare-static-host.mjs. Vite base는 정적 빌드에서만 /, 기존 서버 빌드는 /site/ 유지. 출력 website/dist/static. 홈페이지 클라이언트와 브랜드 자산, public의 terms/privacy/ai-policy/cookies/support/coming-soon 및 기존 legal 버전4종을 디렉터리 index.html로 게시한다. 앱/관리자/프로젝트/통화 기존 링크는 준비 안내 HTML만 제공한다. 실제 기능/계정/서버 코드는 없다. 미정의 API 경로는404이고 backend rewrite를 두지 않는다. 기존 API 서버의 미오픈 guard도 그대로다.

공개 자산 복사는 allowlist이며 public 전체/모바일 web bundle/프로젝트 문서/관리자 스크립트/키/DB를 복사하지 않는다. static-release.json은 공개 커밋만 담고 사용자 자료는 없다. Render 정적 사이트로 200리라이트 없이 파일/폴더만 제공한다. 사이트 모바일/언어/요금/데모/QR/기존 우측 영상은 유지한다.

## 배포 설정

이름 docen-introduction, 저장소 https://github.com/thepmpo/donknow, main, autoDeploy=no. 빌드 npm --prefix website ci && npm --prefix website run build:static; publish website/dist/static. SKIP_INSTALL_DEPS=true 및 NODE_VERSION=24로 루트 전체 서버 의존성 자동 설치를 피한다. 공개 빌드에 MAIL/DB/API 자격증명을 주입하지 않는다.

## 검증

npm --prefix website run build:static 통과. node website/tests/static-host.mjs는 Node 정적 파일 서버 + 실제 Chromium에서 KR/EN homepage·실제 video currentTime 증가·모든 법률/지원/버전문서/준비경로200·service API/server/admin scripts404·pageerror 및 asset오류없음을 검사했다. 기존 서버 build명령도 보존한다. 정적 제공은 Render의 디렉터리 index/clean URL 동작을 실제 새 배포에서 별도 확인한다.

## 비용과 운영

2026-11-23 실제 Render static-sites/pricing 문서 조회 확인: 정적 사이트 free CDN, 워크스페이스 outbound/pipeline 사용량 공유, Hobby 도메인2개 포함·초과0.25USD/월/개라는 안내. 가격페이지 현재 텍스트에서5GB/월 및500분 표시가 있으나 계정 결제 설정은 직접 조회하지 않았다. 유료 업그레이드/한도 초과 무제한 허용을 하지 않는다. 자동 배포를 꺼 잦은 문서 push로 pipeline을 소비하지 않는다. 기존 root/www 두 도메인은 기존 서버에서 새 static으로 이동하되 중복 추가로 유료 도메인 수를 늘리지 않는다.

## 도메인 이전과 중단 경계

현재 docen.today/www는 기존 Docker 서비스에 연결돼 있다. 새 static을 먼저 live/공개URL검증한다. 연결 Render 도구에는 custom domain CRUD가 없어 dashboard 수동 이전이 필요하다. 기존 서버의 도메인만 제거하고 서비스 자체는 삭제/일시정지하지 않는다. 새 static Settings→Custom Domains에 docen.today를 추가하여 root/www를 이동한다. 호스팅KR A @216.24.57.1은 새 Render 안내와 같을 때 유지하고 www CNAME만 새호스트로 교체한다. Resend TXT/CNAME send/rsend/DMARC와 메일 설정은 건드리지 않는다. 동일 Render apex IP여도 도메인 서비스 매핑을 옮겨야 한다. 이 과정에는 짧은 DNS/TLS 전환 시간이 있을 수 있다. 기존서버/주소 유지로 rollback은 domain만 원래 서비스에 복원하고 www CNAME을 duckduck-test.onrender.com으로 복구한다.

새 hostname/서비스ID/live/공개검사 및 실제 custom domain 이전은 후속 영수증에 기록한다. 새 정적 기본URL 성공을 docen.today 이전 완료로 보고하지 않는다.

## 실제 배포 영수증과 남은 단계

새 static 사이트 srv-dc1qt4uc6qcc73bjpffg, https://docen-introduction.onrender.com, dashboard https://dashboard.render.com/static/srv-dc1qt4uc6qcc73bjpffg. deploy dep-dc1qt56c6qcc73bjpgdg, release eeeaf414de25e08cf97ea4a2b89e2389e75c679e, 2026-11-23 12:10:43 KST live. 공개 fetch에서 홈페이지 제목/실제 내용·terms clean URL·coming-soon·static-release 동일 커밋 확인. 가격/Render static-site 공식문서도 실제 조회했다. 무료 정적 배포는 완료, docen.today 도메인 전환은 미완료다. 도메인 CRUD 도구 부재로 사용자 대시보드 단계가 필요하다. 기존 app/API/DB/메일/origin/DNS는 변경하지 않았다.

사용자 실행 순서: 기존 duckduck-test Settings→Custom Domains에서 docen.today와www의 연결만 제거(서비스 삭제 금지) → 새 docen-introduction Settings→Custom Domains에서 docen.today 추가(루트/www 자동 생성 확인) → 호스팅KR의 www CNAME 값만 docen-introduction.onrender.com으로 수정, @ A216.24.57.1이 새 Render 안내와 같으면 유지 → 새 static의 Verify 실행, root/www Verified 및 Certificate Issued 후 실제주소 조회. 이 단계에서는 메일 TXT/CNAME/DMARC는 수정하지 않는다. 실패하면 기존 서비스를 보존했으므로 도메인 매핑만 원래 서비스로 복구한다.
