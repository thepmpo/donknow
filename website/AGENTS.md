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
