# Design QA — Chat / keyboard option 1 / responsive calendar

**final result: blocked** — new native keyboard/IME, device FPS, VoiceOver and Keychain restart validation remain pending. Actual Expo web/synthetic API, supplied geometry/keyboard occlusion, retained data and transition checks pass. [Contract](docs/interaction-repair-2026-11-14.md) · [current evidence and source comparison](docs/interaction-repair-qa-2026-11-14.md). User build33 succeeded before this change. No new native build is claimed.

---

# Design QA — Calendar comfort / 2026-11-14

**final result: blocked** — user choice of Today background scope and actual native wheel/bounce/notification/VoiceOver verification remain pending. Implemented Expo web/synthetic API and ordinary/folded/open geometry checks pass. [Contract](docs/calendar-comfort-2026-11-14.md) · [reference comparison, evidence and limitations](docs/calendar-comfort-qa-2026-11-14.md). No new native build was requested.

---

# Design QA — Chat checklist / 2026-11-14

**Result: passed for actual Expo web / synthetic API and device geometry; native touch, VoiceOver and TestFlight verification remain pending.** Ten new screenshots verify the compact checked/X/saved states, ordinary/folded/open layout, actual log navigation and unchanged camera column/fixed Calendar. No reference-image pixel fidelity or native device result is claimed.

[Contract](docs/chat-checklist-2026-11-14.md) · [Evidence and remaining device checks](docs/chat-checklist-qa-2026-11-14.md). Earlier keyboard native validation remains blocked until a new build is installed.

---

# Design QA — Keyboard accessory option 2 / 2026-11-14

**final result: blocked** — native visual/runtime QA needs an Xcode build and actual iPhone/Duo keyboard. The approved option is implemented in the shared UIKit accessory. TypeScript, Apple autolinking, web/iOS JS export, full app and Duo web regressions pass; none proves Swift compilation or native fidelity. No synthetic keyboard screenshot is presented as actual implementation evidence.

Reference: [selected option 2](artifacts/multi-google-clean-chat-2026-11-14/design-previews/keyboard-2-accessory-done.png). [Implementation contract](docs/keyboard-done-2026-11-14.md) and [receipts / pending device matrix](docs/keyboard-done-qa-2026-11-14.md). Existing native 1.0.0(32) predates this change; a new build is required. No new native build was requested in this task.

---

# Design QA — Apple Calendar reference / 2026-11-13

**Result: passed for implemented Expo-web/isolated-API scope. Native device and real-account verification remain blocked on a new installed binary and authenticated user reproduction.**

Current contract: [calendar-apple-reference-2026-11-13.md](docs/calendar-apple-reference-2026-11-13.md). The user's three screenshots and confirmed picker/theme choices define the reference. Their original files are not available locally and were not republished. No pixel-difference score or exact Apple clone is claimed.

## Evidence

Before captures were taken before edits, using synthetic data: [month](artifacts/calendar-apple-reference-2026-11-13/before/01-month-adaptive-and-toolbar.png), [day](artifacts/calendar-apple-reference-2026-11-13/before/02-day-detail.png), [event](artifacts/calendar-apple-reference-2026-11-13/before/03-event-detail.png), [read failure](artifacts/calendar-apple-reference-2026-11-13/before/04-server-error-before.png).

After: [dark month](artifacts/calendar-apple-reference-2026-11-13/after/16-dark-month-reference.png), [dark detail](artifacts/calendar-apple-reference-2026-11-13/after/17-dark-event-reference.png), [light month](artifacts/calendar-apple-reference-2026-11-13/after/18-light-month-reference.png), [non-JSON failure/cache](artifacts/calendar-apple-reference-2026-11-13/after/19-non-json-error-keeps-events.png), [folded camera-column layout](artifacts/calendar-apple-reference-2026-11-13/duo/10-folded-calendar-dark.png), [open dark layout](artifacts/calendar-apple-reference-2026-11-13/duo/12-open-calendar-dark.png).

Month/detail reference captures use431×640 logical pixels, DPR2 (862×1280 output, matching attachment dimensions). Ordinary phone before/after390×844 and small320/large430 are also captured. Browser keyboard-focus rings are real accessibility states. Fixture blue camera columns/black dots are geometry markers, not application artwork or native OS screenshots.

## Resolved findings

| Finding | Resolution | Check |
| --- | --- | --- |
| Oversized two-row capsule dominated Calendar | Heading + top-right month, compact command row, view/settings sheet | Before/after inspection; common heading baseline regression |
| Monthly content collapsed to counts on short displays | Minimum92pt weeks and internal scrolling, title chips and +N | 320/390/430,431×640, date-detail access |
| Agenda below month competed with calendar | Remove permanent month agenda; date opens the existing day sheet | Day/Todo memo edit integration |
| Event required an indirect route | Tap real title chip to open detail | Direct-event click, close to correct parent |
| Detail had weak hierarchy |28/36 title, source accent, actual date/time, grouped source/alert metadata | Light/dark event captures, edit preview/cancel/confirm |
| Previous/next month visually too strong | outsideMonth semantic color, selected/today precedence | Month boundary captures; contrast fallback in tokens |
| Today mixed into oversized toolbar | Separate64pt circular accessory exactly above existing Duo tabs | Pure geometry + Playwright camera centerline/8pt gap/priority/rotation |
| Sheets/glass assumed light appearance | DynamicColorIOS + web CSS variables, automatic status bar and Glass scheme | Live light/dark switch preserves month; dark screenshots |
| Header baseline moved when adding44pt picker | Position normal-size picker independently of heading height | All5 header coordinates in motion regression |
| Body timeout was misreported as malformed response | Preserve AbortError; Calendar GET60s | Unit test plus existing AI timeout regressions |
| Truncated/HTML reads were unrecoverable | One read-only recovery per source; persistent failure stops | E2E5 malformed reads across1 transient +2 failing sources, no write replay |
| Partial failure could erase a source's known events | Keep same-owner/range cache, clear source metadata on owner switch | Error/cache and existing tenant-generation guards |
| JSON headers preceded serialization | Serialize before headers; clean error path remains available | BigInt serialization failure regression |

## Limits that must remain explicit

- Calendar delete and reminder editing continue through Google original. The options row does not invent a false “none” reminder or a working delete button. This is an intentional functional difference from the Apple screenshot.
- Dense event chips are20pt+; the enclosing day and day-detail list provide alternate access. We do not claim every dense chip is44pt.
- The exact authenticated operational Calendar failure in the user's screenshot was not reproduced. Public health/capabilities and expected anonymous401 are separate evidence. Transport hardening does not prove their Google connection works.
- Web blur is a fallback, not native Liquid Glass. iOS JS export/type checking do not prove IPA compilation, Apple acceptance, VoiceOver, native Dynamic Type, actual Duo APIs, hinge clearance or installed behavior.
- TestFlight25 remains the earlier1643e0c binary. No new native build was launched for this UI change; installation needs a fresh manual main build. Figma has not been rewritten.

## Verification receipts

Unit247 total /246 pass /0 fail /1 pre-existing optional skip. TypeScript, syntax, web and iOS JS exports; Calendar interactions/permissions/unknown-save lock; Duo geometry and priority; complete app/signup/tenant/notes/undo; login; motion/keyboard; scheduled messages; AI chat and errors. Public-document regression and generated image hashes are run after generation; main/deployment receipts are appended to the contract.

Historical screenshots are restored after regression runs; new evidence lives in its own directory. Existing data/auth/signing/free plan/recovery bundle are preserved.
