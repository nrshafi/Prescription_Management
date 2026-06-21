# Plan 03 — Refactor `NewPrescription.tsx` & High-Churn Renderer Areas

**Severity:** Medium · **Source:** `docs/codebase/CONCERNS.md` §1, §5

## Concern

`src/renderer/src/pages/NewPrescription.tsx` is the largest renderer file
(~1307 lines / 45.4 KB) and the highest-churn one (21 changes). It mixes the page
container with many inline sub-components and complex form state, making changes
risky.

Related high-churn files to treat carefully (no forced refactor, just discipline):
- `src/renderer/src/pages/Prescriptions.tsx` (522 lines, 16 changes)
- `src/renderer/src/lib/prescription-mapping.ts` (12 changes)

## Decision context

- Owner: **renderer test framework / CI not needed now.** Verification is via
  `bun run typecheck` and manual smoke testing in `bun run dev`.
- This is a structural refactor to reduce file size and isolate state; behavior
  must remain identical.

## Evidence (current inline pieces in NewPrescription.tsx)

- Helpers: `toErrorMessage` (83), `formatDate` (89)
- Inline components: `EditableSelectCell` (93), `MedRow` (125), `MedSearch` (215),
  `SectionCard` (1254)
- Main component `NewPrescription` (348) with many handlers:
  medicines (`addMedicine` 510, `updateMedicine` 599, `removeMedicine` 603,
  `moveMedicine` 607), presets/bundles (`addBundle` 413, `addBundleMedicines` 527,
  `applyBundle` 551, `handleApply*`), section change handlers, save/print
  (`buildUiForSave` 670), clear (`handleClear` 620).

## Target structure

Create a co-located folder and split by responsibility, keeping `NewPrescription`
as the orchestrating container:

```
src/renderer/src/pages/NewPrescription/
  index.tsx                 # NewPrescription container (state + wiring)
  MedicinesEditor.tsx       # MedRow, MedSearch, EditableSelectCell, add/move/remove
  SectionsEditor.tsx        # SectionCard + section change handlers wiring
  PresetBundles.tsx         # bundle pickers + apply handlers
  helpers.ts                # toErrorMessage, formatDate, buildUiForSave (pure)
  types.ts                  # PrescriptionUiState, MedicineRow, PrescriptionPageActions
```

> Alternative (lower risk): keep a single `NewPrescription.tsx` but extract the
> pure helpers and the three leaf components into sibling files first, then
> revisit. Choose based on diff size tolerance.

## Tasks

1. **Extract pure helpers** (`toErrorMessage`, `formatDate`, and the pure parts of
   `buildUiForSave`) into `helpers.ts`. No state dependencies.
2. **Extract shared types** (`PrescriptionUiState`, `MedicineRow`,
   `PrescriptionPageActions`, etc.) into `types.ts`.
3. **Extract the medicines table** (`MedRow`, `MedSearch`, `EditableSelectCell`)
   into `MedicinesEditor.tsx`, exposing a typed props interface
   (`value`, `onChange`, `onAdd`, `onMove`, `onRemove`, `suggestions`).
4. **Extract sections** (`SectionCard` + section change handlers) into
   `SectionsEditor.tsx`.
5. **Extract preset/bundle UI + apply logic** into `PresetBundles.tsx`.
6. **Slim the container** so `index.tsx` owns state (`useState`/refs), data loads
   (`loadPatientData`), save/print orchestration, and composes the children.
7. **Update imports** anywhere `NewPrescription` is referenced (route/page
   registry) to point at the new folder `index.tsx` (path stays
   `pages/NewPrescription`).

## Discipline for related churn files (no refactor required)

- `Prescriptions.tsx`: make **small diffs**, smoke-test list/filter in dev.
- `prescription-mapping.ts`: keep in sync with `src/shared` types and the Rust
  structs in `commands/prescriptions.rs`; changing field shapes requires touching
  all three.

## Affected files

- `src/renderer/src/pages/NewPrescription.tsx` → `pages/NewPrescription/*`
- Page/route registry that imports `NewPrescription`
- No change to `src/shared/*` or Rust unless a type mismatch surfaces

## Verification

```bash
bun run typecheck
bun run check
bun run dev   # manual smoke test
```

Manual smoke test checklist:
- Search/select patient, load prior data.
- Add/edit/reorder/remove medicines; medicine search suggestions work.
- Add chief complaint & diagnosis; apply a bundle; apply all bundles.
- Save prescription; Print / Save-as-PDF dialog opens.
- Clear form resets state.

## Risks / notes

- **Behavior must not change.** Move code verbatim; defer logic cleanup.
- Watch for stale closures when moving handlers — pass state and setters via props
  rather than re-deriving inside children.
- Do the extraction incrementally (one component per commit) and typecheck between
  steps to keep diffs reviewable.
