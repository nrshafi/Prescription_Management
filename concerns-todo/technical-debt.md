# Technical Debt

## Overview

This plan covers known technical debt that increases maintenance cost, weakens onboarding, or reduces confidence in changes. The largest items should be addressed incrementally rather than through broad rewrites.

## Concerns & Action Plans

### Missing Test Framework and Tests

- Where: `package.json`, Phase 1 scan terminal output
- Risk: Manual verification remains the only guard for core flows.

Actionable Steps:

1. Choose an initial test stack that fits the Tauri, React, TypeScript, Rust, and SQLite architecture.
2. Add a `test` script and the minimum required dependencies.
3. Start with service and migration tests around stable backend behavior.
4. Add tests for high-risk prescription flows as seams become available.
5. Document how to run tests alongside the existing verification commands.

Potential Challenges & Mitigation:

- Challenge: Introducing tests may require setup work before useful coverage exists.
- Mitigation: Start with narrow service and migration tests rather than full UI or end-to-end coverage.
- Challenge: Tauri integration can make full-app testing complex.
- Mitigation: Test below the IPC boundary first, then add higher-level tests only where they provide clear value.

Estimated Effort: medium

### Large `NewPrescription` Component

- Where: `src/renderer/src/pages/NewPrescription.tsx`
- Risk: High-cost changes and hidden coupling in the prescription workflow.

Actionable Steps:

1. Avoid broad rewrites unless there is a direct feature or bug-fix need.
2. Identify stable seams when the file is touched, such as action handlers, data loading, form sections, or print/PDF behavior.
3. Extract the smallest reusable or independently understandable pieces.
4. Keep behavior unchanged during extraction.
5. Verify save, print preview, PDF, and prescription editing flows after related changes.

Potential Challenges & Mitigation:

- Challenge: Extracting too much at once can regress a critical workflow.
- Mitigation: Use small, behavior-preserving extractions during related feature work.
- Challenge: Print and PDF behavior may depend on subtle renderer state timing.
- Mitigation: Verify save, preview, print, and PDF paths after touching related logic.

Estimated Effort: high

### Continue Decomposing Large `Prescriptions` Page

- Where: `src/renderer/src/pages/Prescriptions.tsx`
- Risk: Patient and prescription list behavior remains fragile because filters, patient CRUD dialog state, expandable visit loading, and list/grid UI are still combined.
- Progress: Prescription visit table rendering and visit-level edit, preview, PDF, print, and duplicate buttons were extracted to `src/renderer/src/components/prescriptions/PatientVisitsTable.tsx` while keeping data loading and side effects in the page.

Actionable Steps:

1. Preserve current behavior unless changing the page for a specific feature or bug fix.
2. Consider separating patient CRUD dialog state from list rendering.
3. Move the patient grid card into a focused component when it can be extracted without changing data flow.
4. Move the patient table row into a focused component after preserving row click and action button propagation behavior.
5. Verify filtering, patient CRUD, expandable visits, print actions, and list/grid display after changes.

Potential Challenges & Mitigation:

- Challenge: UI state, filtering, and async visit loading may interact in non-obvious ways.
- Mitigation: Extract one responsibility at a time and verify the affected flow immediately.
- Challenge: Component extraction can create prop-heavy interfaces.
- Mitigation: Extract cohesive sections with clear inputs instead of splitting only by markup.

Estimated Effort: medium

## Overall Effort

Overall effort: medium. Test setup is a deliberate medium-sized task, and large page decomposition should happen incrementally during related feature work.
