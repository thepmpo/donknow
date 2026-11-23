# Selected hero design QA

source visual truth: artifacts/docen-hero-bounce-2026-11-23/selected-reference.jpg (first displayed ImageGen result exec-562ef641).
implementation screenshot: artifacts/docen-hero-bounce-2026-11-23/desktop-ko.png; desktop-en.png, mobile-unchanged.png, reduced-motion.png.
viewport: 1440×1024 CSS, deviceScaleFactor 1. Original source1487×1058 normalized to1440×1024; screenshot1440×1024. State: top hero, Korean, playing video.
full-view comparison evidence: artifacts/docen-hero-bounce-2026-11-23/comparison.jpg, reference left / actual right, inspected together. No focused crop needed: headline, silhouette, asset edges and nav are legible in full-resolution originals and combined image.

Findings / history: first screenshot had P2 visible hard lower video rectangle and low artwork. Moved top from -45 to -90 and intersected bottom fade mask; recaptured and compared. Boundary resolved. Fonts/typography preserve existing Korean family/66px centered headline, no wrapping drift. Spacing/layout: centered title and product demo align with reference. Colors: existing #2366e8 family, decorative .42 opacity makes actual softer than generated blue base (accepted to prioritize readability). Image fidelity: exact user video layered base/orb, no recreated drawing. Copy: existing real text retained; generated reference November23 mock date vs existing November19 is intentionally unchanged demonstration data, outside requested animation change. Moving frame ball position naturally varies.

Primary interactions tested: real video currentTime advances, muted loop inline, see-how anchor, offscreen pause/resume, reduced-motion image, media error image, mobile hidden, no horizontal overflow across seven widths, no pageerror. Public launch regression passed. No P0/P1/P2 remain. P3: Safari real-device playback not independently exercised; standard muted inline H264 and existing range service used.

Implementation checklist: completed source asset, responsive gating, motion preference, failure fallback, visibility handling, local production build/browser verification. Public deployment is separate.

final result: passed
