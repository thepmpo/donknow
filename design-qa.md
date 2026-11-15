# Current flow audit — chat, writing and ME

final result: passed

[Current five-step audit and33 fresh captures](docs/assistant-ux-repair-audit-2026-11-15.md) · [current behavior contract](docs/assistant-ux-repair-2026-11-15.md). The user's four new screenshots and current compiled app ground this fix. Tests cover AI-loading/no-Todo conversion, phone/folded/open keyboard occlusion, late Todo reads after new writes, calendar draft/permission refresh, and consistent ME pages with failed-save recovery. Actual UIKit/IME/VoiceOver/physical Duo and the original upstream error cause remain unverified. Native39 succeeds for the previous source, and these UI fixes require a new installation build.

---

# Design QA — ME grouped settings

final result: passed

Source visual truth: `/tmp/codex-remote-attachments/01a1bf70-b7e9-73ac-8811-6a3ff28f80a5/0C284FBF-20F0-45DC-AC01-468A74ADE418/1-사진-1.jpg` (862×1280) and the accompanying provider-list/detail references. User requested the simple structure adapted to Duck, rather than a copy of ChatGPT branding or unimplemented services. Reference source remains private.

Implementation: [dark overview](artifacts/me-simple-2026-11-15/01d-me-dark.png) (390×844), [ordinary overview](artifacts/me-simple-2026-11-15/01-me-overview.png), [service list](artifacts/me-simple-2026-11-15/01c-services-list.png), [Duo open](artifacts/me-simple-2026-11-15/14-open-overview.png). Actual compiled Expo/Chromium with synthetic account/API/geometry; not native captures.

Full-view comparison evidence: `/tmp/duck-me-source-comparison.png` places the source and rendered implementation together in one browser-rendered board. Source normalized at0.5 (431×640), implementation at1× (390×844 CSS/deviceScaleFactor1). Original Duo/ordinary navigation and different product content explain the unequal content area/height; no claim of pixel cloning. Focused comparison: the first three rows on this same board are legible, including title/status/chevron alignment and inset rules, so an extra crop is unnecessary.

Comparison history:

1. Before: [old overview](artifacts/me-simple-2026-11-15/00-before-overview.png). P2 structure/density: repeated section labels and long subtitles conflict with the requested compact grouped settings. Fixed by three groups of simple rows, short trailing statuses, and clear detail routes.
2. After: combined board above plus22 dated captures. No remaining actionable P0/P1/P2 differences within the agreed ME scope. Source-specific health/finance/password categories and external promotion art are intentionally excluded because Duck does not provide them. Colors/icons retain Duck's design system; the standard Ionicons library is used rather than drawn logos.

Required fidelity surfaces:

- Typography: existing system body16pt, readable caption/detail weights and line heights; title wraps at two lines, status at up to three. Existing native font scaling remains enabled. Native Dynamic Type/VoiceOver needs device testing.
- Spacing/layout: rows at least60pt with44pt touch affordances,24pt group radius,20pt group gaps, inset separators, fixed trailing chevron; narrow320px has no horizontal overflow.
- Colors/tokens: existing black/dark-surface/line/muted/blue semantic colors, with matching light mode. Source rainbow provider styling is intentionally adapted to Duck's palette.
- Image quality/assets: standard vector Ionicons render sharply; existing Duck mascot remains. No reference marketing art or logos have been fabricated. Original user screenshots are not copied into the public gallery.
- Copy/content: real provider configuration/connection states only. Unknown/failed status stays unknown/recheck. Settings remain in Korean, ME naming and existing navigation are preserved.

Primary interactions: direct behavior settings without permission mutation; service/provider scopes/import/disconnect confirmations; account/name/delete; privacy/export/advanced; return scroll100→100 and focus; ordinary bottom tabs; folded/open Duo camera alignment and unchanged opposite pane. Browser page errors0. Agent regression11 screenshots also passed. Typecheck/web export passed.

The user chose web-only ordinary-mode testing. No in-app device override was added. Safari web does not validate native keyboard, notifications, IME, permissions or hardware. The build-38 Swift fix and Apple SDK preflight are separate; their next Mac archive/signing/submission is still unverified. Earlier editor-native QA remains preserved in [the previous report](docs/design-qa-editor-viewport-history-2026-11-15.md).

Implementation checklist: grouped root and provider status rows complete; details/permissions preserved; dated capture/interaction evidence complete; source comparison complete. P3: optional per-provider artwork can be evaluated later if a suitable authorized asset is supplied; no blocker.
