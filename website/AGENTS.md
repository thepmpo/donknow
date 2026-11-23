## 2026-11-23 — 사용자 첨부 사업자 푸터·이용약관·환불정책

첨부 HTML3종을 content/legal/2026-11-23/에 원본 보존한다. 더피엠피오/김상현/480-30-01764/주소/전화/이메일/날짜2026년11월23일/신고번호 자리표시자와 법률 문구·금액을 임의 수정하지 않는다. 푸터는 기존 톤의 상세 정보 블록, /terms 및 /refund는 원문 article에 레이아웃만 추가한다. privacy 본문·기존 고정약관·과거 동의는 유지한다. 새 가입 terms2026-11-23/privacy2026-11-22.2를 각각 기록하며 새동의를 과거기록에 덮지 않는다. 서버/정적호스트 모두 refund 및 archive 허용, 내부서비스 미오픈 유지. 상세 docs/docen-business-legal-2026-11-23.md.

## 2026-11-23 — 소개 페이지 무료 정적 호스팅 분리 승인

사용자가 무료 정적 호스팅을 승인했다. 기존 free Docker 앱/API/DB/메일/인증/native 주소는 유지하고 소개만 별도 Render static CDN에 배포한다. 유료 compute/워크스페이스 업그레이드는 승인하지 않았다. 정적 홈페이지·약관/고정버전·지원·준비안내를 allowlist로만 게시하며 앱/어드민 소스·서버·비밀·사용자 자료를 복사하지 않는다. 도메인 이전 완료 여부는 별도로 검증한다. Render 도구는 static 생성은 지원하지만 custom domain 이동은 지원하지 않으므로 새 호스트 검증 전 기존 도메인을 제거하지 않는다. 무료는 워크스페이스 트래픽/빌드/도메인 포함 한도 내이며 무제한 무료 보장은 아니다. 상세 docs/docen-static-hosting-2026-11-23.md.

## 2026-11-23 — 하단 최종 승인·상단 구분선 제거·배포 요청

사용자가 작은 docen.(최대70px/모바일50px), 제목 간격36~48px 시안에서 위 얇은 선도 제거하고 배포하라고 요청했다. .closing border-top:0. 이전 미배포 표시보다 이 확정이 우선한다. Render 서비스는 free Docker이며 방문이 없으면 잠든 뒤 깨울 때 플랫폼 대기 화면이 나올 수 있다. 이 화면은 사이트 CSS로 제거할 수 없다. 무료 소개 전용 정적 호스팅 분리 또는 상시 실행 유료 서버가 대안이며 이번에 요금/호스팅/DNS를 임의 변경하지 않는다.

## 2026-11-23 — 하단 워드마크 시안 후속 조정 (미배포)

사용자가 docen.을 조금 더 작게, 아래 제목과 간격은 더 넓게 요청했다. 최대70px/모바일50px, 제목 위 여백36~48px로 조정. 시안 확인 중이며 실제 배포 전이다.

## 2026-11-23 — 마지막 소개 영역 큰 docen. 워드마크

사용자 요청으로 closing의 그림 로고를 제거하고 헤더의 소문자 docen + #2366e8 파란 점을 큰 글자로 배치한다. clamp(56px,5.5vw,80px) (첫 시안이 너무 크다는 사용자 정정 반영), weight800, line-height1.05. PC/모바일 웹 공통이며 헤더/법적 footer의 기존 로고는 유지. 앱 변경 없음. 빌드 및 390/1440px 실제 Chromium 화면·그림 제거·가로 넘침 검사 통과. 증거 artifacts/docen-closing-wordmark-2026-11-23/.

## 2026-11-23 — PC 소개 메인 1번 시안 확정·오른쪽 배경 영상

사용자가 중앙 문구 유지·오른쪽 큰 배경 로고의 공 튀기기(첫 시안)를 선택하고 실제 반영을 요청했다. 이전 영상 없는 소개 방침에 대한 이번 명시 예외다. PC 웹 1100px 이상에만 사용자 제공 docen-loading.mp4를 muted/loop/playsInline으로 재생한다. 모바일/앱은 변경하지 않는다. 동작 줄이기는 정지 로고, 화면 밖/비활성 탭은 pause, 재생 실패는 정지 이미지로 대체한다. 소개만 공개·가격·서버 guard는 유지한다. 상세: docs/docen-hero-bounce-2026-11-23.md.

## 2026-11-23 — 로고 두 배·파란 점·소개 준비 문구 정리

웹 로고 이미지 크기를 두 배로 키우고 로고형 docen 이름에는 #2366e8 파란 점을 통일한다. 중앙/최하단 주요 준비 CTA·중앙 소개만 공개 문장·상단 로그인 준비 중 문구를 KR/EN에서 삭제한다. 상단 준비 안내 버튼·footer 안내 링크·서버 미오픈 차단은 유지한다. [상세 계약](../docs/docen-brand-polish-2026-11-23.md). 설치 앱 반영은 다음 native 빌드가 필요하다.

## 2026-11-23 — 새 로고/로딩·FAQ 문항 삭제

사용자새로고를모든기존브랜드표식과favicon에사용한다. Dots자동가져오기FAQ문항은KR/EN모두삭제한다. 영상없는소개구조는유지하며이번첨부mp4는실제boot/loading에만짧게반복한다. 동작줄이기/재생실패는정지로고,React mount후즉시제거하고가짜대기시간을추가하지않는다. Vite실제publicDir는public-site이며public은가격정본생성경로다. 준비페이지/미오픈guard·기존계정/API/가격은유지한다. 상세는../docs/docen-identity-2026-11-23.md를읽는다.

## 2026-11-22 — 전체 인수인계 입구

현재 제품/출시/가격/이름 기준은 [통합 기준](../docs/DOCEN-START-HERE.md)과 [결정 원장](../docs/docen-decisions-register.md)을 먼저 읽는다. 홈페이지 섹션·배경·실제 CSS 수치·반응형·데모·어드민·다른 앱 제작 순서는 [제작 매뉴얼](../docs/docen-product-build-playbook.md)에 있다. 현재 main.jsx가 로딩하는 styles.css 기준으로 판단하며 과거 reference.css의 피클 하늘/영상 배경을 현재 구현으로 설명하지 않는다. 아래 과거 ‘최신’ 문구보다 통합 입구와 이후 사용자 확정이 우선한다.

## 2026-11-22 — 소개만 공개·웹서비스 미오픈

현재 공개는 소개 페이지만이다. KR/EN 로그인·시작·무료 요금제·하단·모바일 메뉴는 준비 안내로 이어지고 QR은 소개 메인을 연다. 지금 웹서비스를 사용할 수 있다는 문구를 없앤다. 예시 데모는 합성 UI로 유지한다. 새 도메인의 직접 /app/API 접근은 서버에서도 차단하며 기존 운영 테스트 주소는 유지한다. 오픈 날짜/가입·결제/대기자 수집을 임의로 시작하지 않는다.

## 2026-11-22 — 서비스명 docen 확정

웹·앱의 현재 표시 이름은 모두 소문자 docen이다. 한글/영문 소개·로고 문자·버튼·요금표·FAQ·metadata를 같이 변경한다. 기존 가격/기능/권한은 유지한다. 구매 도메인은 docen.today(호스팅KR)이나 실제 DNS/Render/TLS 확인 전 현재 origin과 /app 연결을 깨지 않는다. 과거 문서·증거는 원래 이름을 보존한다.

## 2026-11-19 — 정상 월요금·연간 할인·베타 월요금 확정

정상 월요금은 라이트19,900원/프로55,900원이다. 기존16,900원/49,900원은 **연간 결제 월환산**이며 연간총액202,800원/598,800원(연1회 결제)이다. 베타 동안 월 결제에도 같은 연간 할인가를 적용한다. 베타 종료일/갱신/기존회원 유지 정책은 미정이며 평생 할인·실제 자동 청구·즉시 인상을 만들지 않는다. [확정 가격과 손익 해석](../docs/billing-beta-annual-2026-11-19.md). 기존 사용량/직접 채팅 구분·연결계산 단위·비즈니스상담은 유지하고 실제 권한·결제·AI예산·서버 상한은 바꾸지 않는다. 기존 손익 수치는 할인 월환산 기준이며 연간 수령액 전부를 당월 순이익으로 보지 않는다.

## 2026-11-19 — 영문 하단·라이트16,900/프로49,900/비즈니스·문서 원가

사용자가 앞선 사이트 방향을 승인하고 영문 하단 번역·PC의 같은 시각 체계, 라이트16,900원/프로49,900원/비즈니스상담형과 문서 작성 포함 헤비 사용자 손익을 요청했다. 요금표/차감·제공 안내/FAQ/메타데이터를 모두 KR/EN으로 제공한다. 공유 pricing-content/pricing.css에서 두 정본HTML을 생성해 언어별 누락을 막는다. Free는 기본 직접 정리, 라이트/프로는 브리핑·지원 자료 정리·문서 초안·Todo/일정 전환을 공유하고 사용량을 차등한다. 사용자가 직접 AI채팅은 프로 전용이며 라이트는 브리핑·자료/문서 정리라고 명시 확정했다. 이전9,900/27,900은 이력이다. 비즈니스의 기능/보안/제공량은 상담 후 확정이며 미구현 팀 기능을 현재 제공으로 가장하지 않는다.

[손익·문서·한도 근거](../docs/pricing-heavy-users-2026-11-19.md)·[계산JSON/엑셀/PDF](../artifacts/pricing-2026-11-19/). mini/nano 표준 단가와3단계/5단계 문서 비용·무료 계정·PG가정·환불·CS·자료 예비비·유지 마케팅·서버/운영25만원·인건비300만원을 구분한다. 내부 AI 원가4천/1만8천원은 **검토안**이다. 실제 서버의4천원/정산25% 상한·accountAccess·무료Pro·결제·정산·키·funding은 바꾸지 않는다. 상한 적용은 일부 헤비 요청의 중단을 전제한다. 무제한/절대손실없음/실현순이익을 주장하지 않는다. 공개사이트 교체와 문서 검수·GitHub 저장은 별도다.

## 2026-11-19 — Any.do 구성 참고 소개 사이트·외부 AI 라이트 개편안

사용자가 영상은 빼고 Any.do의 페이지 뼈대에 덕 내용을 넣는 새 소개 사이트를 요청했다. 큰 제목/직접 조작하는 예시→사용 흐름→Todo/캘린더→외부 AI와 덕 AI→연결→인라인 요금표→개인정보→FAQ/시작으로 구성한다. 예시는 합성 자료의 화면 내 상태만 변경하며 실제 사용자·원본에 저장하지 않는다. 기존 /app·인증·쿠키·API·계정·native·수동 무료 운영은 바꾸지 않는다. 기존 영상·피클 자산을 새 번들에서 제외하며 원본 파일/이력은 보존한다. 기존 KR/EN·모바일 메뉴·QR·iPhone 준비 안내·외부 문서 링크는 유지한다.

이 요청이 예전 라이트 삭제와 영상 유지보다 우선한다. 공개 요금 구성은 **무료 / 라이트(외부 AI 연결 준비 중) / 프로27,900원** 개편안이다. 라이트9,900원은 작업자 **제안 가격**이며 확정/결제를 주장하지 않는다. Max는 이번 비교에서 보류한다. 서버의 실제 complimentary Pro·사용권한·AI원가 상한·결제 상태는 변경하지 않는다. 외부 AI 연결은 미구현이며 제공 예정으로 표시한다. ChatGPT 로그인/plan usage는 기존 대화/기억/Dots 결과 접근을 주지 않는다. Dots 자동 수출 API를 확인하지 못했으므로 자동 가져오기/제휴/지원 승인을 가장하지 않는다. 덕 MCP/플러그인으로 선택한 일을 보내는 연결과 상용 Sign in with ChatGPT 등록은 후속 과제다. [구현·근거·검수](../docs/duck-anydo-site-2026-11-19.md).

## 사용자 확정 — 2026-11-16 통합 웹

대표 / 는 이 소개 메인과 같은 문서의 #pricing 기능표를 제공한다. ‘덕 열기’는 같은 origin·같은 탭의 /app, 기존 /pricing은 /#pricing으로 이어진다. 웹앱 ME에서 소개·요금제로 돌아온다. 기존 영상/모션/기능 전환/QR/모바일 메뉴·KR-EN 소개를 유지한다. 요금표 본문은 public/pricing.html의 한국어 정본을 빌드 시 추출·스타일 격리하며 무료/프로27,900원/맥스준비중, 라이트 삭제·결제 준비중 안내를 유지한다. 계정/데이터/API/저장소 키를 바꾸지 않는다. Render의 같은 기존 무료 서비스에 소개와 앱을 함께 배포하며 Sites 별도 프로젝트로 나누지 않는다.

# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 사용자 확정 — 2026-11-13

사용자는 https://pickle.com/ko 의 디자인뿐 아니라 영상/스크롤 전환/기능 선택과 영상 연동/메뉴·QR·FAQ 동작까지 유지하고 내용만 덕으로 바꾸길 원합니다. 정적인 캡처·목업으로 완료하지 마세요. 현 구현의 시각/모션 수치는 docs/duck-website-brief-2026-11-13.md와 design-qa.md가 기준입니다. 기존 앱 UI·인증·데이터·TestFlight는 이 사이트 요청으로 바꾸지 않습니다. 원본 참고 미디어와 실제 덕의 합성 데이터 녹화, 공개 제품 출시 상태를 구분합니다.
