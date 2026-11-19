## 2026-11-19 — 영문 하단·라이트16,900/프로49,900/비즈니스·문서 원가

사용자가 앞선 사이트 방향을 승인하고 영문 하단 번역·PC의 같은 시각 체계, 라이트16,900원/프로49,900원/비즈니스상담형과 문서 작성 포함 헤비 사용자 손익을 요청했다. 요금표/차감·제공 안내/FAQ/메타데이터를 모두 KR/EN으로 제공한다. 공유 pricing-content/pricing.css에서 두 정본HTML을 생성해 언어별 누락을 막는다. Free는 기본 직접 정리, 라이트/프로는 브리핑·지원 자료 정리·문서 초안·Todo/일정 전환을 공유하고 사용량을 차등한다. ‘프로는 AI챗 가능’이라는 문장으로 직접 AI채팅은 프로 전용으로 해석했으며 두 가능성을 물었다. 답변이 오면 이 차이만 맞춘다. 이전9,900/27,900은 이력이다. 비즈니스의 기능/보안/제공량은 상담 후 확정이며 미구현 팀 기능을 현재 제공으로 가장하지 않는다.

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
