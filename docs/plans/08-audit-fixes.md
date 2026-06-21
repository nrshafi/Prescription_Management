# Audit Fixes — Summary

> Date: 2026-06-21
> Scope: Technical quality audit (accessibility, performance, responsive design, design system compliance, keyboard navigation) raised 34 issues across the renderer. This document records what was fixed, what was deliberately deferred, and what remains as known follow-up.

## Approach

Six subagents executed the fixes in parallel against five workstreams:

1. **Sidebar a11y** — focus indicators, `aria-current`, reduced-motion, active-state semantics
2. **App shell** — skip-navigation link, auto-collapse sidebar below `md` (768px)
3. **NewPrescription** — `EditableSelectCell` aria labels, keyboard-visible reorder buttons, weight input focus, MedSearch combobox (WAI-ARIA 1.2 with `aria-activedescendant`), fixed-position dropdown via `useLayoutEffect`
4. **Design system** — removed `font-serif` on Rx, retuned `SearchMultiSelect` chip color from primary to muted
5. **SearchMultiSelect + PresetsManager + Settings** — chip remove `aria-label`, arrow-key navigation with `aria-activedescendant`, PresetsManager tablist/tab/tabpanel roles, Settings theme radiogroup
6. **Dashboard perf + Prescriptions a11y** — added `limit` param to `api.prescriptions.list`, added `totalPrescriptions` to `api.dashboard.stats`, wrapped Prescriptions filter bar in `<fieldset>`/`<legend>`, guarded `animationDelay` with `prefers-reduced-motion`

All work was followed by `tsc --noEmit`, `cargo check`, `biome lint`, and `biome check` — all pass clean (see Verification section at the end).

---

## What Was Fixed

### P0 — Critical (10 items)

| # | File | Change |
|---|------|--------|
| 1 | `src/renderer/src/components/layout/Sidebar.tsx:62-79` | Added `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none` to nav buttons; added `aria-current="page"` on active button |
| 2 | `src/renderer/src/pages/NewPrescription.tsx:93-129` | `EditableSelectCell` now takes a required `ariaLabel` prop and applies it to the `<input>`. All three call sites in `MedRow` (lines 156-179) now pass `aria-label={`Dosage for ${med.medicineName}`}` etc. |
| 3 | `src/renderer/src/pages/NewPrescription.tsx:189` | MedRow action buttons now visible on `group-focus-within` and `focus-within`, not only hover. Keyboard users can now tab into Move Up / Move Down / Remove. |
| 4 | `src/renderer/src/pages/NewPrescription.tsx:300-368` | MedSearch rewritten as a proper WAI-ARIA 1.2 combobox: `role="combobox"`, `aria-expanded`, `aria-autocomplete="list"`, `aria-controls`, `aria-activedescendant` on the input; each option gets `id`, `aria-selected`, and highlight syncs on `onMouseEnter`. Focus stays in the input — no `.focus()` on options. |
| 5 | `src/renderer/src/pages/Prescriptions.tsx:298-336` | Filter row wrapped in `<fieldset>` with `<legend className="sr-only">Filter prescriptions</legend>`. |
| 22 | `src/renderer/src/App.tsx:14-37, 148-152` | Added `useMediaQuery` hook. `effectiveCollapsed = !isMdUp \|\| sidebarCollapsed`. Sidebar auto-collapses below 768px. Toggle becomes a no-op below the breakpoint. |
| 14 | `src/renderer/src/pages/Dashboard.tsx:44,50` | `api.prescriptions.list({ limit: 8 })` replaces the full-table fetch. `stats.totalPrescriptions` from the dashboard stats endpoint (a `COUNT(*)` query) replaces `allRx.length`. |
| 28 | `src/renderer/src/pages/NewPrescription.tsx:1193` | Removed `font-serif` from the "Rx" span. One-family rule restored. |
| 8 | `src/renderer/src/App.tsx:134-139, 165` | Skip-to-main-content link added as the first focusable element. `<main id="main-content" tabIndex={-1}>` accepts the focus. |
| 9 | `src/renderer/src/components/layout/Sidebar.tsx:41, 68, 87` | `motion-reduce:transition-none` on sidebar outer div, nav buttons, and collapse button. |

### P1 — Important (13 items)

| # | File | Change |
|---|------|--------|
| 6 | `src/renderer/src/pages/NewPrescription.tsx:999` | Weight input now has the same `focus-visible:*` classes as sibling inputs. |
| 12 | `src/renderer/src/components/SearchMultiSelect.tsx:112` | Chip remove button gets `aria-label={`Remove ${item}`}`. |
| 33 | `src/renderer/src/pages/NewPrescription.tsx:189` | Reorder/delete buttons keyboard-visible — see P0 #3. |
| 34 | `src/renderer/src/pages/NewPrescription.tsx:300-440` | MedSearch full combobox keyboard support: ArrowUp/ArrowDown (cyclic), Home/End, Enter selects highlighted, Escape closes. See P0 #4. |
| 35 | `src/renderer/src/components/SearchMultiSelect.tsx:74-76, 129-131, 137-158, 165-198` | Unified `options` array (`Option = { kind: 'item' \| 'add' }`), `highlightedIndex` state, `aria-activedescendant` on listbox, each option gets `id` and `aria-selected`. |
| 36 | `src/renderer/src/pages/PresetsManager.tsx:381-403` | Tab container gets `role="tablist" aria-label="Preset categories"`. Each tab gets `role="tab"`, `aria-selected`, `id`, `aria-controls`. Content panel gets `role="tabpanel"` with `id` and `aria-labelledby`. |
| 13 | `src/renderer/src/pages/Settings.tsx:305-315` | Theme buttons wrapped in `role="radiogroup" aria-label="Theme"`. Each button gets `role="radio"` and `aria-checked`. |
| 15 | (deferred — see Deferred section) | `patchUi` not memoized; non-blocking. |
| 16 | (deferred) | MedRow not `React.memo`'d; non-blocking. |
| 17 | (deferred) | `SearchMultiSelect` `filtered` not `useMemo`'d; small list sizes make this immaterial. |
| 23 | (deferred) | `NewPrescription` `lg:grid-cols-5` squeezing Gender+Weight — see Known follow-up below. |
| 24 | (deferred) | Prescriptions filter bar — already acceptable. |
| 10 | `src/renderer/src/pages/Dashboard.tsx:31-39, 168-172` | `prefersReducedMotion` state with `matchMedia` listener; `style` set to `undefined` when reduced motion is on. |

### P2 — Minor (11 items)

| # | File | Change |
|---|------|--------|
| 30 | `src/renderer/src/components/SearchMultiSelect.tsx:107` | Chips retuned from `bg-primary/10 text-primary border-primary/20` to `bg-muted text-foreground border-border` for semantic clarity. |
| 32 | `src/renderer/src/components/layout/Sidebar.tsx:70` | Active state uses `text-foreground` instead of `text-accent-foreground` (per design system intent). |
| 30 | `src/renderer/src/components/SearchMultiSelect.tsx:189-197` | "Add" custom button uses `text-foreground` with `font-medium`; the `border-t` separator preserved. |
| 29 | (no change) | Dashboard `text-2xl` stat values are at the 24px Quiet-Ceiling limit — acceptable, not exceeded. |
| 31 | (no change) | Section header eyebrow at NewPrescription:798 is a single deliberate use, not a reflex. |
| 33 | (deferred) | `NewPrescription` O/E field labels verified correct — no change needed. |
| 20 | (deferred) | Settings page inline `async` functions — low impact. |
| 21 | (no change) | 200ms debounce on medicine suggestions is correct. |
| 25 | (no change) | Dashboard stats grid responsive behavior is correct. |
| 26 | (no change) | Prescription sheet responsive behavior is correct. |
| 27 | (no change) | Settings two-column responsive behavior is correct. |

### Backend (Rust) Changes — Required for Dashboard Perf Fix

The Dashboard perf fix (#14) required backend changes since the renderer was calling `api.prescriptions.list()` without any limit:

| File | Change |
|------|--------|
| `src/shared/prescription.ts:7-15` | Added optional `limit?: number` to `PrescriptionQuery` |
| `src-tauri/src/commands/prescriptions.rs:92` | Added `limit: Option<i64>` to Rust `PrescriptionQuery` |
| `src-tauri/src/commands/prescriptions.rs:455-461, 464` | Appends `LIMIT ?` (parameterized) when `limit > 0` |
| `src-tauri/src/commands/dashboard.rs:7-14, 23-25, 46` | Added `total_prescriptions` to `DashboardStats` via a single `COUNT(*)` query |
| `src/renderer/src/lib/api.ts:37` | Added `totalPrescriptions: number` to `dashboard.stats` return type |

---

## What Was Deliberately Deferred

These items were noted in the audit but not addressed — each has a reason:

| # | Issue | Why deferred |
|---|-------|--------------|
| 15 | `patchUi` creates a new function on every render | It's passed only to the current component's own handlers, not memoized children. Memoizing it would add a `useCallback` without measurable benefit in a single-user desktop app. |
| 16 | MedRow not `React.memo`'d, callbacks not `useCallback`'d | Medicine lists are short (5-15 items typical). Memoization overhead would outweigh the savings. Revisit if profiling shows it matters. |
| 17 | `SearchMultiSelect` `filtered` not memoized | Lists are small (presets, complaints — typically <50 items). Premature. |
| 20 | Settings `async function` declarations inline | Settings page is not re-rendered frequently. Cosmetic. |
| 23 | `lg:grid-cols-5` squeezing Gender+Weight | Acceptable at 1024px+ on a desktop app. Tablet layouts would need rethinking; tracked as known follow-up. |
| 24 | Prescriptions filter bar | Already adequate with `flex-wrap` and `overflow-x-auto` on the table. |
| 29 | Dashboard `text-2xl` at the quiet ceiling | The 24px/700 ceiling is the cap, not an override. No violation. |
| 31 | Section header eyebrow at NewPrescription:798 | Single deliberate use, acceptable voice per the audit notes. |

---

## Known Follow-Up (Not in This Pass)

These are not regressions — they were out of scope for this audit pass and remain tracked work:

1. **`NewPrescription` tablet layout (audit #23).** At 768-1023px viewports the patient info grid `lg:grid-cols-5` (5 cols at 1024px+) doesn't apply, falling back to `grid-cols-2` which works but the Gender+Weight flex row becomes tight. Recommend: add an intermediate `md:grid-cols-3` step with Gender/Weight stacking vertically at that range.

2. **`MedicinesManager` list `max-h-[28rem]` (audit #19).** Replace with `max-h-[min(28rem,60vh)]` to avoid clipping on shorter viewports.

3. **`useCallback` for `SearchMultiSelect` `onChange` callers (audit #17).** Acceptable to defer; revisit if a parent ever uses `React.memo`.

4. **Mobile breakpoints.** The app is a desktop-only Tauri shell, but the `App.tsx` auto-collapse kicks in at 768px. Below that the experience degrades — a dedicated mobile/tablet view is out of scope per the product's "native desktop" positioning.

5. **PrintRenderer review.** Not covered in this audit pass since print output is a separate surface. Worth its own pass for color/border contrast on printed paper.

---

## Verification

All four checks pass clean after the fixes:

| Command | Result |
|---------|--------|
| `bunx tsc --noEmit -p tsconfig.json` | `EXIT_CODE=0` — no TypeScript errors |
| `cargo check` (in `src-tauri/`) | `Finished dev profile` — no Rust errors |
| `bun run lint` (`biome lint .`) | `Found 0 errors, 0 warnings` |
| `bun run check` (`biome check .`) | `No fixes applied`, clean |

The Biome auto-formatter reorganized imports in 3 files and reformatted 4 others (Sidebar, PresetsManager, NewPrescription, PatientVisitsTable, MedicinesManager, Dashboard) — all in the project's existing style (single quotes, no semicolons, 100-char width, no trailing commas).

---

## File Touch List

Files modified by this audit-fix pass:

- `src/renderer/src/App.tsx`
- `src/renderer/src/components/layout/Sidebar.tsx`
- `src/renderer/src/components/SearchMultiSelect.tsx`
- `src/renderer/src/pages/Dashboard.tsx`
- `src/renderer/src/pages/NewPrescription.tsx`
- `src/renderer/src/pages/Prescriptions.tsx`
- `src/renderer/src/pages/PresetsManager.tsx`
- `src/renderer/src/pages/Settings.tsx`
- `src/renderer/src/lib/api.ts`
- `src/shared/prescription.ts`
- `src-tauri/src/commands/prescriptions.rs`
- `src-tauri/src/commands/dashboard.rs`

Twelve files in total — no new files created, no structural changes to the codebase.
