# Plan 08 - Technical Quality Audit Fixes

**Severity:** High · **Source:** Technical Quality Audit (all renderer pages, layout, shared components, UI primitives)

## Scope

34 issues across Accessibility (13), Performance (8), Responsive Design (5),
Design System (5), and Keyboard Navigation (3). Organized by priority
(P0 Critical to P2 Minor).

De-duplicated where categories overlap (e.g. K33 = A3, K34 is part of A4). Actual
unique fixes: ~28.

---

## P0 - Critical (9 unique fixes)

| ID | Category | File | Fix |
|----|----------|------|-----|
| A1 | A11y | Sidebar.tsx:62-79 | Add `focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none` to nav buttons |
| A2 | A11y | NewPrescription.tsx:108-122 | Add `aria-label` to each EditableSelectCell input (Dosage, Frequency, Duration) |
| A3 | A11y + KB | NewPrescription.tsx:180 | Change MedRow button visibility to `opacity-0 group-hover:opacity-100 focus-visible:opacity-100` |
| A4 | A11y + KB | NewPrescription.tsx:300-368 | Track highlighted index; set `aria-selected` on MedSearch options, or switch to combobox pattern |
| A5 | A11y | Prescriptions.tsx:321-334 | Wrap date filters in `<fieldset>` with `<legend>Filter prescriptions</legend>` |
| P14 | Perf | Dashboard.tsx:36-47 | Add `api.prescriptions.recent(limit)` or add limit/offset params to list endpoint |
| P15 | Perf | NewPrescription.tsx:520-522 | Wrap `patchUi` in `useCallback` or use ref-based state updater |
| R22 | Resp | App.tsx / Sidebar.tsx:42 | Auto-collapse sidebar at `md` breakpoint via `useMediaQuery` hook |
| D28 | Design | NewPrescription.tsx:1193 | Replace `font-serif` on Rx heading with system font (`text-4xl font-bold`) |

---

## P1 - Important (13 unique fixes)

| ID | Category | File | Fix |
|----|----------|------|-----|
| A6 | A11y | NewPrescription.tsx:910-916 | Add focus-visible classes to weight input |
| A7 | A11y | main.tsx / App.tsx | Wrap app root in `<TooltipProvider delayDuration={0}>` |
| A8 | A11y | App.tsx:116 | Add visually-hidden "Skip to main content" link |
| A9 | A11y | Sidebar.tsx:41 | Add `motion-reduce:transition-none` to sidebar collapse transition |
| A10 | A11y | Dashboard.tsx:160 | Gate `animationDelay` on `!prefersReducedMotion` |
| P16 | Perf | NewPrescription.tsx:1199-1210 | Memoize `MedRow` with `React.memo`, stabilize callbacks via `useCallback` |
| P17 | Perf | SearchMultiSelect.tsx:31-33 | Wrap `filtered` in `useMemo` keyed on `[items, selected, query]` |
| P18 | Perf | NewPrescription.tsx:940 | Replace fragile scroll container class-matching with `useRef` or `IntersectionObserver` |
| P19 | Perf | MedicinesManager.tsx:82 | Change `max-h-[28rem]` to `max-h-[min(28rem,60vh)]` |
| R23 | Resp | NewPrescription.tsx:832 | Change `lg:grid-cols-5` to `xl:grid-cols-5` or stack Gender/Weight at `lg` |
| K34 | KB | NewPrescription.tsx:270-371 | Add `aria-activedescendant` tracking with unique IDs per option |
| K36 | KB | PresetsManager.tsx:381-400 | Add `role="tab"`, `role="tablist"`, `aria-selected` to tab buttons |

---

## P2 - Minor (6 actionable fixes)

| ID | Category | File | Fix |
|----|----------|------|-----|
| A12 | A11y | SearchMultiSelect.tsx:99 | Add `aria-label="Remove ${item}"` to chip remove button |
| A13 | A11y | Settings.tsx:306-314 | Wrap theme buttons in `<fieldset>` with `<legend>Theme</legend>` or use `role="radiogroup"` |
| P20 | Perf | Settings.tsx:121-211 | Extract async functions to named callbacks |
| D30 | Design | SearchMultiSelect.tsx:96 | Consider `bg-muted text-foreground border-border` for chips instead of `bg-primary/10` |
| D32 | Design | Sidebar.tsx:69 | Use `text-foreground` instead of `text-accent-foreground` (semantically cleaner, functionally identical) |
| R24 | Resp | Prescriptions.tsx:298-334 | Optional: collapse filter bar into "Filters" button on small screens |

### No Action Needed

| ID | Category | File | Reason |
|----|----------|------|--------|
| A11 | A11y | NewPrescription.tsx:960-965 | Confirmed correct - htmlFor/id bindings are proper |
| P21 | Perf | NewPrescription.tsx:247-253 | Debounce is fine for local SQLite backend |
| D29 | Design | Dashboard.tsx:104 | Stat values at design ceiling (24px/700) - acceptable |
| D31 | Design | NewPrescription.tsx:798 | Single eyebrow heading - acceptable |

---

## Recommended Execution Order

### Batch 1 - Quick Wins (all P0, ~1-2 hours)

These are mostly CSS class additions and ARIA attribute fixes with zero risk
of regressions:

1. **A1** - Sidebar focus rings (add 3 CSS classes)
2. **A2** - Add `aria-label` to 3 inputs
3. **A3** - Add `focus-visible:opacity-100` to MedRow buttons
4. **A5** - Wrap date filters in fieldset
5. **D28** - Remove `font-serif` from Rx heading
6. **A6** - Add focus-visible to weight input
7. **A9** - Add `motion-reduce:transition-none` to sidebar
8. **A12** - Add aria-label to chip remove buttons
9. **A13** - Add radiogroup/fieldset to theme buttons

### Batch 2 - Structural Accessibility (~2-3 hours)

10. **A4** - Refactor MedSearch to track highlighted index + aria-selected
11. **A7** - Add TooltipProvider at app root
12. **A8** - Add skip-navigation link
13. **A10** - Gate animationDelay on reduced-motion preference
14. **K34** - Add aria-activedescendant to MedSearch dropdown
15. **K36** - Add tab ARIA roles to PresetsManager

### Batch 3 - Performance (~3-4 hours)

16. **P14** - Add `recent(limit)` endpoint (Rust command + api.ts + Dashboard)
17. **P15** - Wrap `patchUi` in `useCallback`
18. **P16** - Memoize `MedRow` + stabilize callbacks
19. **P17** - useMemo for SearchMultiSelect filtered array
20. **P18** - Fix scroll container detection
21. **P19** - Viewport-relative max-height
22. **P20** - Extract Settings async functions

### Batch 4 - Responsive + Design Polish (~1 hour)

23. **R22** - Sidebar auto-collapse at `md`
24. **R23** - Patient info grid responsive breakpoint
25. **D30** - Chip color consistency
26. **D32** - Sidebar active text color

---

## Verification

After each batch, run:

1. `bun run typecheck` - TypeScript compilation
2. `bun run lint` - Biome checks
3. `bun run dev` - Manual testing (keyboard nav, screen reader, responsive)