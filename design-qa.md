# Current QA — combined Todo date/source design

final result: passed

## Evidence and comparison

Selected truth is `artifacts/todo-organize-2026-11-16/reference/selected-combined.png`, with the displayed source-view and date-move alternatives in the same reference directory. These are generated synthetic design references. Actual implementation captures are `10-design-date.png`, `11-design-source.png`, and `12-design-date-drag.png` in `artifacts/todo-organize-2026-11-16/`. The source-view reference853×1844 and date-move reference852×1846 were normalized to390 CSS pixels wide, with at most1px height crop to844. Actual Expo/Chromium viewport390×844/deviceScaleFactor1. Full `comparison-source.png`/`comparison-date.png` and focused `comparison-*-detail.png` place reference and actual render together; both full boards and the final focused boards were opened. Date drag intentionally scrolls while holding two tasks; it is not an idle-page header comparison.

## Findings and corrections

- P2 fixed: compact rows hid required dates/provenance. Both views now show date and actual provider plus source-open action when a supported link exists.
- P2 fixed: source grouping did not follow the selected order. Explicit Slack, Google Tasks, Calendar/Gmail, Reminders and other-provider ordering is deterministic, with manual items retained.
- P2 fixed: multi-item dragging needed a stable measured list viewport and real write acknowledgement. Auto-scroll uses ScrollView bounds; both selected tasks reach the new date and partial failures retain failed selection without repeating successful writes.
- P2 fixed: the floating drag card obscured the insertion rule. Position now leaves the destination line visible. The focused final board shows an unobscured blue rule, and the browser asserts both viewport visibility and non-overlap with the preview.
- Existing regression selectors counted the new view tabs as Todo rows. Updated their IDs and scoped the navigation assertion to BottomNavigation; no task expectation was reduced. Full app regression passes again.

No actionable P0/P1/P2 remains in this agreed structure adaptation. P3: native typography/drag/touch rhythm still needs the installed iPhone build.

## Fidelity surfaces and intentional constraints

Typography uses the existing Korean system font,34pt date,21pt provider heading,readable16–17pt task titles and caption metadata. Source copy/language and sample tasks differ intentionally. Existing Duck spacing and44pt minimum touch areas take precedence over shrinking targets to match raster text. Source list includes dates/provenance, date layout includes event lines; selection actions clear the bottom navigation. Blue action/selection and semantic dark/light backgrounds retain Duck tokens. Actual Ionicons preserve existing product assets rather than fabricate Slack/Apple brand art. No new decorative image is needed. Existing Duck mascot,ordinary5tabs,Duo camera rail/opposite calendar and inline editor remain. Unknown channel names and unsupported Apple deep links are not invented.

## Functional verification

New actual browser suite:19 captures,0page errors,ordinary light/dark,320width,390phone,folded/open Duo geometry,date/source switch,source links,selection distinct from completion,single/multiple drag,date original-sync path,persistent order,free receive-only and exhausted-budget draft. Existing reference suite26 captures passed; ordinary full app and Duo geometry/navigation regressions passed. Server/unit/HTTP:406 total,405pass,0fail,1existing optional skip.103 syntax checks,typecheck,web and iOS JS exports,isolated iOS prebuild/provider/import check pass. The latest preview-position change was additionally recaptured and type/export checked.

These are actual compiled Expo UI with synthetic API/accounts/geometry. They do not prove native UIKit/IME/VoiceOver/EventKit/iCloud/push,physical Duo,real provider writes,successful paid model generation or live billing. Signed iOS archive/TestFlight and backend deployment are recorded separately in `docs/todo-build-status-2026-11-16.md`. The known API credit-balance issue is not accepted as fixed by cost protection.

---

Previous QA retained below:

# Current Things / Pickle reference-flow implementation QA

final result: passed

## Source and actual rendered evidence

The user selected the four unique supplied videos as design/interaction references, then explicitly requested implementation. This is an adaptation inside the existing native Duck product, not a branded pixel clone or a new web/mobile template. Product Design image-to-code and design-qa were used; no new asset or plugin installation was needed. Existing system fonts, semantic tokens and Ionicons are retained.

- Source visual truth: the attached `23-53-47`, `23-54-23`, `23-58-55`, and `00-11-48` recordings. The two copies of `00-11-48` are byte-identical. Extracted/inspected in `/tmp/duck-ux-video-review/`; original1398×2034px. Sources were scaled to431px width (~0.3083), yielding627px height. This density normalization is for layout/flow comparison, not a claim about original CSS points. The source footage is visibly dimmed; its overlay tint is not treated as the palette to copy.
- Actual browser implementation: `artifacts/reference-flows-2026-11-15/08-duo-upcoming-clean.png` (431×640 CSS/px,DSF1,dark,folded,upcoming list); `12-inline-note-keyboard.png` (390×844,DSF1,dark,inline memo editing with synthetic keyboard top450); `10-selection.png`, `13-me-overview.png`, `15-google-overview.png`, `20-apple-intro.png`, and `07-chat-defaults-phone-hidden.png`.
- Full combined comparison actually opened: `/tmp/duck-reference-comparison-full.jpg`; focus combined comparison actually opened: `/tmp/duck-reference-comparison-focus.jpg`. Source and implementation were placed in the same image inputs. Private user reference composites are not published. Both editor regions remain in their original list. The source shows a real keyboard; the browser fixture deliberately shows only the tested occlusion boundary, with no fake keyboard. Source editor date16 versus synthetic edited task date15, Korean sample text, source labels and navigation differences are explicit content/state differences, not a pixel-fidelity assertion.
- ME/services actual captures were separately opened in `/tmp/duck-reference-current-board.jpg`, including ordinary/light-dark,small,folded/open. Source ME includes private account data; none was copied into public captures.

## Findings and comparison history

The first combined visual comparison of the completed changes found no remaining actionable P0/P1/P2 issue in the requested structure adaptation. The following implementation changes preceded that final comparison and were verified by browser flow checks:48→44pt base rows, a single inline editor using the existing save implementation,72–160pt compact memo with native/browser caret scrolling, toolbar clearance above the ordinary navigation, explicit batch dates/completion with partial failure, consistent service detail pages and an Apple permission introduction. A subsequent functional check caught draft loss when changing tabs; keeping the existing Todo screen mounted while hidden fixed it, and the added tab-return assertion passed. The active/inactive state does not change the compared visible layout.

An additional zero-selection state check found that disabled batch actions still looked active [P2]. Explicit0.4 opacity was added to those actions and the editor-disabled selection entry. The reference flow was recaptured (`10a-selection-empty.png`) and asserts both the disabled state and dimmed appearance. The final26-capture run passed; the post-fix full comparison was reopened as `/tmp/duck-reference-comparison-final.jpg`.

## Required fidelity surfaces

- Fonts/typography: system Korean font/React Native fallback;34pt bold date,16pt row,15pt appointment time,shared17pt setting title. Native SF/IME rendering needs device verification. Source English labels, large title spacing and sample data differ intentionally.
- Spacing/layout: date/rule→appointments→new item→checkbox sequence;44pt minimum edit/selection targets,with title wrapping/status expansion.16pt inline card padding; notes and tools stay in that card. Ordinary bottom tabs, Duo camera rail/opposite pane and existing page insets remain. Selection toolbar clears the bottom tabs; the date picker uses the original scrolling list. No horizontal overflow at tested320/390/431/960 widths.
- Colors/tokens: existing light/dark semantic backgrounds,blue actions,muted metadata and danger statuses. Source dimming,charcoal brand and theme swatches are not duplicated as product settings. Public photos are synthetic fixture content.
- Assets/icons: supplied Duck brand remains; actual Ionicons calendar,notification,checkbox,selection,plus,send and external-link glyphs. No traced screenshot UI,unrequested brand mascot or fake tags/flag controls. Focus rings are browser accessibility indicators rather than native frame styling.
- Copy/content: concise Korean rows and service descriptions. Actual connection readiness determines CTA state. No invented subscription prices,usage percentages,tickets,successful permission grant or model success. Source speaker repetition is reduced for user messages while time remains visible.

## Functional evidence and limits

The26-capture reference suite passed with0page errors: inline creation/source retry,3-second completion/log/restore,selection without writes,date batch,partial batch without replay,tab-persistent drafts,long memo caret,keyboard reveal,ME Back,provider readiness,Apple native-only state,phone hidden,attachments and source links. ME permission/import/disconnect/behavior/memory recovery,chat long-answer/action/owner and chat failure/retry regressions passed.391 unit/HTTP tests:390pass/0fail/1existing optional skip;100syntax checks,typecheck,web/iOS JS exports passed. Follow the final evidence record in `docs/reference-flows-qa-2026-11-15.md` for the later full-app/calendar/Duo/keyboard reruns.

Intentional scope: no fake tag/checklist/flag persistence, no price/ticket implementation from an absent price page, no phone reintroduction, no real-source writes during testing. Native keyboard/IME/VoiceOver/EventKit/iCloud/push and live model quality remain unverified. No new native build was dispatched. P3 follow-up: inspect typography and touch rhythm on the next installed iPhone build.

---

Previous QA, retained as history:

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
