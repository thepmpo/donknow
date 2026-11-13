# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 사용자 확정 — 2026-11-13

사용자는 https://pickle.com/ko 의 디자인뿐 아니라 영상/스크롤 전환/기능 선택과 영상 연동/메뉴·QR·FAQ 동작까지 유지하고 내용만 덕으로 바꾸길 원합니다. 정적인 캡처·목업으로 완료하지 마세요. 현 구현의 시각/모션 수치는 docs/duck-website-brief-2026-11-13.md와 design-qa.md가 기준입니다. 기존 앱 UI·인증·데이터·TestFlight는 이 사이트 요청으로 바꾸지 않습니다. 원본 참고 미디어와 실제 덕의 합성 데이터 녹화, 공개 제품 출시 상태를 구분합니다.
