# Fragile/High-Churn Areas

## Overview

These areas combine high recent change activity with critical behavior such as SQL-heavy data operations, renderer-main communication, preload bridge consistency, schema migration, and large UI workflows. Changes should be narrow, deliberate, and paired with targeted verification.

## Concerns & Action Plans

### `src/main/services/patients.ts`

- Why fragile: SQL-heavy patient list/delete logic with cascade delete acknowledgement.
- Churn signal: 11 recent changes in Phase 1 scan terminal output.

Actionable Steps:

1. Verify patient list filters after any change.
2. Verify patient list sorting behavior.
3. Verify delete count guard behavior before removing patient records.
4. Verify cascade delete acknowledgement and resulting cascade behavior.
5. Keep changes focused on one patient operation at a time where possible.

Potential Challenges & Mitigation:

- Challenge: SQL-heavy logic may cause regressions in filtering, sorting, or deletion behavior.
- Mitigation: Manually check list filters, sorting, delete count guard, and cascade behavior before shipping.

Estimated Effort: medium

### `src/renderer/src/pages/Prescriptions.tsx`

- Why fragile: Large UI workflow for patients, visits, filters, and print actions.
- Churn signal: 10 recent changes and top-10 largest source file in Phase 1 scan terminal output.

Actionable Steps:

1. Make focused changes instead of broad refactors.
2. Verify list and grid behavior after UI updates.
3. Verify filters still apply correctly.
4. Verify visit expansion behavior.
5. Verify CRUD, print, and PDF flows.

Potential Challenges & Mitigation:

- Challenge: Changes in one interaction path may regress another workflow.
- Mitigation: Keep edits targeted and manually verify list/grid, filters, expanded visits, CRUD, print, and PDF behavior.

Estimated Effort: high

### `src/main/ipc/index.ts`

- Why fragile: Central adapter for all renderer-main operations.
- Churn signal: 9 recent changes in Phase 1 scan terminal output.

Actionable Steps:

1. Keep IPC channels synchronized with renderer usage.
2. Keep preload bridge behavior aligned with IPC changes.
3. Keep type declarations synchronized with exposed operations.
4. Keep service method calls aligned with IPC adapter behavior.
5. Verify changed operations end-to-end from renderer to main service.

Potential Challenges & Mitigation:

- Challenge: Mismatches between channels, preload exposure, type declarations, and services can cause runtime or type-level failures.
- Mitigation: Update related IPC, preload, declarations, and service references together.

Estimated Effort: high

### `src/main/services/prescriptions.ts`

- Why fragile: SQL-heavy prescription and preset creation, update, duplicate, and suggestion logic.
- Churn signal: 8 recent changes in Phase 1 scan terminal output.

Actionable Steps:

1. Verify prescription create behavior.
2. Verify prescription update behavior.
3. Verify prescription duplicate behavior.
4. Verify preset links after creation or update changes.
5. Verify medicine suggestions after SQL changes.
6. Keep SQL changes narrowly scoped to the specific prescription operation being modified.

Potential Challenges & Mitigation:

- Challenge: Prescription SQL changes may affect create, update, duplicate, preset links, or suggestions in subtle ways.
- Mitigation: Verify each affected prescription operation after changes.

Estimated Effort: medium

### `src/preload/index.ts` and `src/preload/index.d.ts`

- Why fragile: Runtime bridge and type declaration must match.
- Churn signal: 8 recent changes each in Phase 1 scan terminal output.

Actionable Steps:

1. Update `src/preload/index.ts` and `src/preload/index.d.ts` together.
2. Ensure exposed runtime APIs match declared TypeScript types.
3. Verify renderer typecheck after bridge or declaration changes.
4. Confirm renderer code uses the declared preload API consistently.

Potential Challenges & Mitigation:

- Challenge: Runtime bridge and declaration drift can cause renderer code to typecheck incorrectly or fail at runtime.
- Mitigation: Treat both preload files as a paired change and verify renderer typecheck.

Estimated Effort: medium

### `src/main/db/migrate.ts`

- Why fragile: Schema evolution and singleton-row setup.
- Churn signal: 6 recent changes in Phase 1 scan terminal output.

Actionable Steps:

1. Verify fresh database creation path.
2. Verify legacy database upgrade path.
3. Confirm schema changes preserve expected singleton-row setup.
4. Avoid shipping migration changes without testing both fresh and upgrade scenarios.

Potential Challenges & Mitigation:

- Challenge: Migration changes can permanently affect user databases.
- Mitigation: Test fresh DB and legacy DB upgrade paths before shipping.
- Challenge: Singleton-row setup may be skipped or duplicated if migration logic changes incorrectly.
- Mitigation: Include singleton-row checks in migration verification.

Estimated Effort: medium

## Overall Effort

Overall effort: high. The safest approach is to make focused changes, update coupled files together, and verify the specific behavior tied to each fragile area before shipping.
