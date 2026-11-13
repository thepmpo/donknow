# Calendar year navigation QA

final result: passed

[Current year overview and isolated rollback contract](../docs/calendar-year-overview-2026-11-14.md) · [Detailed QA](../docs/calendar-year-qa-2026-11-14.md).

Selected source: [annual concept board](../artifacts/calendar-year-2026-11-14/proposals/selected-year-overview.png). Rendered evidence: [ordinary390×844@2x](../artifacts/calendar-year-2026-11-14/01-ordinary-year.png), [Duo960×740](../artifacts/calendar-year-2026-11-14/duo/23-year-design-comparison-state.png), [combined comparison input](../artifacts/calendar-year-2026-11-14/design-comparison.png), [actual Expo motion recording](../artifacts/calendar-year-2026-11-14/year-month-motion.mp4).

Source is an illustrative1568×1003 responsive board; source duplicate tools/incorrect dates are corrected under the existing application contract. Ordinary780×1688 pixels normalize to390×844 CSS; Duo is1x. State: light year2026 nearNovember, fixed left month/right year on Duo. Focused originals of month grids, header and camera column were opened as well as the combined board. Five fidelity surfaces and P2 fixes (clipped initial month title, lost browsed year/hidden-pane scroll) are recorded in the QA. No actionable P0/P1/P2 remains. Smaller viewports intentionally scroll the year; monthly/fortnight views retain viewport fit.

Actual browser interactions, console-error checks, reduced/full motion, theme/widths, pane/folding/rotation, OFF-build restoration, core calendar/cache/navigation/full-app regressions passed. Native IPA/real device motion/VoiceOver/live accounts remain separate; no TestFlight build was started. Website/AI office remain paused.
