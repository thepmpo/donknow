# 2026-11-22 — 웹사이트 상단 포맷 정정 QA

source visual truth: `artifacts/web-format-correction-2026-11-22/landing-source.png`
implementation screenshot: `artifacts/web-format-correction-2026-11-22/format-matched-content.png`
viewport:1440×1000 CSSpx for app; source1440×1400 to expose full example. deviceScaleFactor1.
source pixels:1128×699;implementation1128×952. Both frames1128 CSSpx. No density scaling. Top699px crops compared; source landing marketing copy is outside frame and intentionally excluded.
state:light,브리핑,three equivalent synthetic items, same frontend source branch. No production account/model calls.
full-view evidence:`comparison.png`;focused typography/row/spacing evidence:`focused-comparison.png` in same directory. Both combined inputs were opened and visually compared.

## Findings and iteration history

- P1 earlier:3-column shell surrounded the existing mobile message body. Large duplicated title/group/hint and oversized item actions changed the reading hierarchy. Replaced with web-specific compact checklist rows and kept original action handlers/confirmation boundaries.
- P2 earlier:frame expanded1392px at1440 instead of source1128. Capped to1128 and retained171/245 tracks and30px content padding.
- P2 comparison iteration1:source links appeared again below metadata, increasing row height and pushing the third item below source fold. Merged source/date into one metadata line, eliminated duplicate labels, reduced card gaps/padding, captured again. Final focused comparison aligns the first3 titles/row divisions closely; all3 rows are visible within the same upper region.
- P2 earlier:small browser fell back to mobile app bottom tabs. Web now keeps its own workspace at320–1920px, with top horizontal navigation below760 and hidden aside below1100. Tested no horizontal overflow after responsive layout settles.

## Required fidelity surfaces

- Fonts/typography:system sans stack consistent with site's fallback;25px heading,13px task title,10px metadata,11px description. Native typography unchanged. Actual dynamic dates/strings differ from fixed landing copy.
- Spacing/layout rhythm:54px header,171px menu,245px aside,1128px frame,30px content,16px outer corner;compact row hierarchy matches source. Actual app uses available height and has extra service/ME controls, so screenshot height differs intentionally.
- Colors/tokens:scoped website light palette/#eaf1ff selection/#e9edf2 divider, corresponding readable dark palette. No global native color replacement.
- Image/asset fidelity:same existing duck PNG reused at source size. Standard Ionicons provide semantic icons;no new placeholder logo/custom illustration. Icon-family/checkbox-corner differences are P3 polish, not a new design direction.
- Copy/content:source-aligned synthetic titles/notes compare row layout. Real account mode uses actual messages and provenance, with clickable sources, separate Todo states, actual day/tasks and unread count;no fake scheduled agenda. Original briefing text remains expandable. Todo/Calendar/chat/service/settings actions retain existing API/permission behavior.

## Primary interactions and console

Actual exported web in headless Chromium:briefing refresh failure retains messages;Todo transfer;Calendar preview without write thenone explicit confirmation;completion PATCH;new editor;chat draft preservation andsend/reply fixture;5 menus;320/390/760/900/1024/1100/1280/1440/1920 overflow;dark/empty/401. Browser pageerrors=[]. Actual isolated Node/SQLite server validates signup/session/Todo CRUD/reload/log/restore/behavior/upload/export/logout/account isolation. No shared cloud desktop tool was exposed;these are project browser-runner captures and interactions, not a claimed visible shared desktop session.

## Implementation checklist

- [x] Source and rendered target opened in combined full/focused images.
- [x] P1/P2 fixes recaptured and compared.
- [x] Core working behavior preserved/tested.
- [x] Pricing/native/Duo/backend budgets unchanged.

Follow-up P3:source-style icon family and subtle checkbox corner refinement. Actual additional product controls/data/height are intentional.

final result: passed

---

## Earlier QA retained for history

# Current QA — approved fortnight and daily calendar

final result: passed

## Evidence

Selected visual truth is `artifacts/calendar-week-day-2026-11-16/source-fortnight.png` (first displayed generated result) and `source-daily.png` (third displayed result). The user explicitly changed the third reference from a multi-day agenda into a selected-day view and deferred the second reference. Actual Expo/Chromium captures are `10-final-fortnight.png` and `11-final-daily.png` in the same folder. Both reference images are1122×1402px; implementation is431×820 CSS/pixels, deviceScaleFactor1, dark theme, Asia/Seoul, Monday2026-11-16. References are normalized to431px wide without stretching; their shorter aspect ratio remains visible. This is a responsive adaptation to the existing device geometry, not a claim of equal whole-frame dimensions.

`comparison-fortnight.png`, `comparison-daily.png` and their `-detail.png` boards put the actual reference and implementation in one comparison input. Full boards and focused header/date/event regions were opened. OS camera/status indicators are outside app ownership and are not recreated. Test data is synthetic. Real iPhone rendering, IME, EventKit and native glass are not verified here.

## Findings and corrections

- P2 fixed: initial fortnight pills consumed too much height. `qa-before-10-final-fortnight.png` and `qa-before-comparison-fortnight.png` preserve the first comparison. Final pills retain a44pt target with tighter title/time rhythm; both normal week rows fit the actual scroll viewport. Measured calendar workspace y20/h800, calendar scroll y87/h733; week rows y118.5 and469, both350.5px. Scroll content is733px, with no low-density overflow. Busy-date stress data deliberately grows rows and remains reachable in the same outer scroll.
- P2 fixed during implementation: daily rows repeated the date and a generic “event” label. Final rows group start time, a colored calendar marker, title and source; the date appears once in the section heading. Detail views retain full times and source metadata.
- No actionable P0/P1/P2 remains in the selected structure. Existing app title “캘린더”, native safe area, camera rail/today controls and ordinary phone bottom navigation intentionally take precedence over generated decorative details. The generated reference's concept title is not copied into the product.

## Required fidelity surfaces

- Typography: existing Korean system font and theme hierarchy; title/time chips use12px/15px and10px/13px rhythm, readable daily body text and full accessible names. Long week titles use at most two lines; detail/daily views provide full titles. Touch targets remain at least44px.
- Spacing/layout: two minimum half-height week rows grow with content; no `+N` replacement, nested scrolling, floating date editor or extra footer. Daily date selection stays above the selected day's flat list. Duo decorative top band is removed; the ordinary phone band remains.
- Colors/tokens: existing dark base, semantic Sunday/Saturday colors, blue selection/today tint and real source colors. A fixture with one selected source correctly has one source color rather than invented different services.
- Assets/icons: existing Ionicons and supplied app navigation identity are reused. No new raster assets, fake system status chrome or custom icon drawings were introduced. The remaining duck navigation tab is distinct from the removed decorative header.
- Copy/content: Korean dates have correct weekday pairing. Only the selected day is listed, as the user's latest instruction requires; unavailable original state and pending saves are never labeled successful.

## Interactions and validation

`mobile/e2e/calendar-week-day.mjs` verifies11 flows: all12 events and24 todos without hidden-count replacement; week→day/date selection; Todo reselection to top; optimistic create before a held response; create reply loss recovered by owned receipt; definite edit rollback; blocked chat explanation without model call; a consented funded synthetic chat sends once; optimistic calendar edit/failed-action rollback; lost confirmation reply settled by reading the action rather than repeating POST; ordinary phone header/navigation preserved. Browser console errors: none. `verification.json` includes measurements.

Existing `assistant-ux-repair.mjs` also passes after updating its old disabled-arrow expectation to the newly explicit gate response. Ordinary/folded/unfolded composer and last-reply visibility, notes scroll reveal, no automatic Todo conversion and stale background read protection remain verified with synthetic keyboard/geometry.

P3 follow-up: installed iPhone/Duo typography and touch/keyboard motion need the new native build. The separate single-week column view remains deferred, not silently introduced.
