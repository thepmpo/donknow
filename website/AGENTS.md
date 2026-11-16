## 사용자 확정 — 2026-11-16 통합 웹

대표 / 는 이 소개 메인과 같은 문서의 #pricing 기능표를 제공한다. ‘덕 열기’는 같은 origin·같은 탭의 /app, 기존 /pricing은 /#pricing으로 이어진다. 웹앱 ME에서 소개·요금제로 돌아온다. 기존 영상/모션/기능 전환/QR/모바일 메뉴·KR-EN 소개를 유지한다. 요금표 본문은 public/pricing.html의 한국어 정본을 빌드 시 추출·스타일 격리하며 무료/프로27,900원/맥스준비중, 라이트 삭제·결제 준비중 안내를 유지한다. 계정/데이터/API/저장소 키를 바꾸지 않는다. Render의 같은 기존 무료 서비스에 소개와 앱을 함께 배포하며 Sites 별도 프로젝트로 나누지 않는다.

# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 사용자 확정 — 2026-11-13

사용자는 https://pickle.com/ko 의 디자인뿐 아니라 영상/스크롤 전환/기능 선택과 영상 연동/메뉴·QR·FAQ 동작까지 유지하고 내용만 덕으로 바꾸길 원합니다. 정적인 캡처·목업으로 완료하지 마세요. 현 구현의 시각/모션 수치는 docs/duck-website-brief-2026-11-13.md와 design-qa.md가 기준입니다. 기존 앱 UI·인증·데이터·TestFlight는 이 사이트 요청으로 바꾸지 않습니다. 원본 참고 미디어와 실제 덕의 합성 데이터 녹화, 공개 제품 출시 상태를 구분합니다.
