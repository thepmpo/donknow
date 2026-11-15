# Current Things-inspired Todo implementation QA

final result: passed

## Evidence and scope

- Source visual truth: `/tmp/codex-remote-attachments/01a1bf70-b7e9-73ac-8811-6a3ff28f80a5/96C23575-50D4-46E6-9E07-4A95B03970A2/1-사진-1.jpg`, the user's last Things3 Upcoming screenshot. Opened directly;862×1280px normalized0.5× to431×640.
- Rendered implementation: `artifacts/things-source-repair-2026-11-15/08-duo-upcoming-clean.png`,431×640 CSS/px, DSF1, dark, folded Duo synthetic geometry, idle future date16/17 list. Source has different user appointments and English copy; Duck uses synthetic Korean content and existing navigation/branding. This is a structure adaptation, not a brand/pixel clone.
- Full combined comparisons opened: `/tmp/duck-things-comparison-before.png` and `/tmp/duck-things-comparison-after.png`. Focused combined date/event/checkbox comparison: `/tmp/duck-things-comparison-focus-after.png`. Source and implementation were placed in the same image input. These private reference composites are not published.
- Actual Chromium/Expo captures include ordinary390×844/light and dark,320×740, folded431×640 and open960×740.9 latest screenshots; browser console errors0. Source chrome is not reimplemented. Public captures contain synthetic data only.

## Findings and iteration history

- [P2, fixed] Compact rows inherited a44pt body plus20pt vertical padding, creating64pt rows. Reduced compact padding to2pt for48pt rows while retaining44pt edit targets and44pt checkbox hit targets. Post-fix full/focus comparison shows the intended reading rhythm; long text/status/countdown can expand.
- [P2, fixed] An empty today preceded upcoming tasks and repeated a blank section absent from the reference. Removed empty dates when other tasks/events exist. A completely empty list retains today's entry point. Post-fix starts with16/내일.
- [P2, fixed] The new-task action followed existing checkboxes. Moved it between appointments and existing tasks to match the reference's entry order. Recaptured and reran inline creation with the correct date, completion/restore and source retry.

## Required fidelity surfaces

- Fonts/typography: Duck system font and Korean copy; bold34pt date,17pt weekday/row,15pt blue time. Similar number/weekday hierarchy and shared left alignment; native SF rendering remains separate from Chromium. Different language lengths are intentional. Two-line titles preserve readability.
- Spacing/layout: source's date/rule→appointments→new task→checkbox sequence is retained.48pt interactive rows satisfy touch targets. Native/brand top area and the five-tab camera rail are preserved, so the app's top offset differs from Things. Second-day grouping rhythm is comparable after the density fix. No horizontal overflow at tested widths.
- Colors/tokens: Duck black/white semantic backgrounds, muted weekday/rule, blue times/selection remain intentional product constraints. The Things charcoal/pink brand header is not copied. Source failure remains an explicit red status in the separate error capture.
- Image/assets: no decorative raster asset is required. Existing Duck brand mark and Ionicons are retained; Things's branded calendar icon, phone chrome and sample user content are not synthesized as images or traced UI.
- Copy/content: Korean date labels and synthetic appointments/tasks; no implementation/debug copy in the normal flow. Unsupported original-source edits explain the limitation rather than claiming success.

## Interactions and limits

Passed actual browser date grouping/appointment order, per-day add, source-time editor/retry,3-second completion→log→restore, first-run connected source selection, phone hidden/attachment retained, and December's separator starting on day1. Existing app, chat/error, calendar/cache and keyboard reveal regressions pass. Full unit/HTTP suite391:390pass,0fail,1existing optional skip. Native EventKit/iCloud, actual UIKit/IME/VoiceOver/push and real provider writes are unverified. Live AI has a separately confirmed credit-balance failure; it is not accepted as working model generation.

No actionable P0/P1/P2 remains in the requested structure adaptation. P3 follow-up: confirm native typography and touch rhythm on the next installed iPhone build.

---

# Current reliability regression — saved calendar and connection

[14 fresh synthetic captures and verification](docs/connection-stability-2026-11-15.md). Cold reload restores the selected calendars and saved display before held reads. Cache/error/partial-source/account-isolation, app/chat/calendar/input regressions pass. Native EventKit and real accounts remain unverified; native40 predates this repair.

---

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
