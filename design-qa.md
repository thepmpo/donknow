# Selected hero design QA

source visual truth: artifacts/docen-hero-bounce-2026-11-23/selected-reference.jpg (first displayed ImageGen result exec-562ef641).
implementation screenshot: artifacts/docen-hero-bounce-2026-11-23/desktop-ko.png; desktop-en.png, mobile-unchanged.png, reduced-motion.png.
viewport: 1440×1024 CSS, deviceScaleFactor 1. Original source1487×1058 normalized to1440×1024; screenshot1440×1024. State: top hero, Korean, playing video.
full-view comparison evidence: artifacts/docen-hero-bounce-2026-11-23/comparison.jpg, reference left / actual right, inspected together. No focused crop needed: headline, silhouette, asset edges and nav are legible in full-resolution originals and combined image.

Findings / history: first screenshot had P2 visible hard lower video rectangle and low artwork. Moved top from -45 to -90 and intersected bottom fade mask; recaptured and compared. Boundary resolved. Fonts/typography preserve existing Korean family/66px centered headline, no wrapping drift. Spacing/layout: centered title and product demo align with reference. Colors: existing #2366e8 family, decorative .42 opacity makes actual softer than generated blue base (accepted to prioritize readability). Image fidelity: exact user video layered base/orb, no recreated drawing. Copy: existing real text retained; generated reference November23 mock date vs existing November19 is intentionally unchanged demonstration data, outside requested animation change. Moving frame ball position naturally varies.

Primary interactions tested: real video currentTime advances, muted loop inline, see-how anchor, offscreen pause/resume, reduced-motion image, media error image, mobile hidden, no horizontal overflow across seven widths, no pageerror. Public launch regression passed. No P0/P1/P2 remain. P3: Safari real-device playback not independently exercised; standard muted inline H264 and existing range service used.

Implementation checklist: completed source asset, responsive gating, motion preference, failure fallback, visibility handling, local production build/browser verification. Public deployment is separate.

final result: passed


## 2026-11-26 — 캘린더 목록 버튼

승인 시안은 Duo `exec-8bc56034`, 일반 iPhone `exec-43874647`, 웹 `exec-600e0de3`이다. 같은 닫힌 상태의 상단을 비교했다. 브라우저 구현은 각각 430×844, 390×844, 1360×960이며 시안은 같은 뷰포트 크기로 조정했다. 비교 캡처는 실행 환경의 `/tmp/docen-calendar-list-button-qa/header-comparison.png`이다.

배경과 글자는 기존 도슨 색상을 적용했고, 목록 필터 아이콘, 짧은 버튼 라벨, 오른쪽 정렬 및 기존 레이아웃을 확인했다. 생성 시안의 캘린더 본문 예시와 구현의 일정 데이터는 다를 수 있다. 세 화면에서 표시 패널 열기, 44px 이상 터치 영역, 표시 선택과 재진입을 확인했다. 실제 iPhone 설치 화면은 이번 브라우저 검증 범위 밖이다.

final result: passed
