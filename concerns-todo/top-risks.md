# Top Risks (Prioritized)

## Overview

This plan expands the highest-priority codebase risks into actionable follow-up work. The main themes are regression prevention, local data protection, renderer security posture, maintainability of prescription workflows, and diagnosability for offline field failures.

## Concerns & Action Plans

### No Automated Test Suite or CI Pipeline Detected

- Severity: high
- Evidence: `package.json`, Phase 1 scan terminal output
- Impact: Database migrations, IPC handlers, backup restore, and print flows can regress without automated checks.

Actionable Steps:

1. Choose an initial test strategy for renderer, backend, and integration boundaries.
2. Add a `test` script and minimal test dependencies after the framework decision.
3. Start coverage with database migrations, IPC handlers, backup restore behavior, and print-related logic.
4. Add CI checks for typecheck, lint, and the selected test command.
5. Document the local and CI verification commands.

Potential Challenges & Mitigation:

- Challenge: Test framework selection can delay progress.
- Mitigation: Start with the smallest framework choice that covers stable service and migration logic.
- Challenge: Desktop print flows can be hard to automate.
- Mitigation: Cover lower-level logic first, then add smoke or integration tests where practical.

Estimated Effort: high

### Local Patient/Prescription Data Appears Stored in an Unencrypted SQLite File

- Severity: high
- Evidence: `src/main/db/client.ts`, `src/main/db/migrate.ts`
- Impact: Medical and patient data confidentiality depends on OS/user profile protections unless encryption or file-permission controls are added.

Actionable Steps:

1. Decide local data protection requirements for patient and prescription data.
2. Document whether OS user-profile protections are acceptable for the intended deployment model.
3. Evaluate SQLite encryption, file-permission hardening, or both if additional protection is required.
4. Account for backup, restore, migration, and support workflows before changing storage behavior.
5. Record the chosen policy and the assumptions behind it.

Potential Challenges & Mitigation:

- Challenge: Encryption can affect migrations, backup restore, portability, and support workflows.
- Mitigation: Evaluate those flows before implementation and include them in verification coverage.
- Challenge: File permissions differ across platforms and installation contexts.
- Mitigation: Define supported platforms and verify behavior per platform.

Estimated Effort: high

### BrowserWindow Sandbox Is Disabled for Main and Print Windows

- Severity: medium
- Evidence: `src/main/index.ts`, `src/main/print-window.ts`
- Impact: Expands renderer/preload risk surface if untrusted content or unsafe navigation reaches a window.

Actionable Steps:

1. Document the current rationale for disabling the sandbox.
2. Review whether main and print windows can use a sandbox-compatible preload pattern.
3. Audit window navigation assumptions and confirm only trusted app content can load.
4. If feasible, enable sandboxing for one window type at a time.
5. Verify preload, IPC, and print behavior after any sandbox-related change.

Potential Challenges & Mitigation:

- Challenge: Existing preload APIs may rely on non-sandbox-compatible behavior.
- Mitigation: Identify exact preload dependencies before changing sandbox settings.
- Challenge: Print windows may have different constraints than the main window.
- Mitigation: Treat main and print windows as separate migration targets.

Estimated Effort: medium

### Large Renderer Pages Mix UI, Data Loading, State, and Persistence Actions

- Severity: medium
- Evidence: `src/renderer/src/pages/NewPrescription.tsx`, `src/renderer/src/pages/Prescriptions.tsx`, Phase 1 scan terminal output
- Impact: Prescription workflows and patient list behavior are harder to modify safely.

Actionable Steps:

1. Avoid broad rewrites unless driven by a specific feature or bug fix.
2. Extract focused hooks or components only around behavior already being touched.
3. Prioritize seams around data loading, form state, persistence actions, and presentation.
4. Preserve existing behavior during each extraction.
5. Add tests or manual verification notes around extracted logic when practical.

Potential Challenges & Mitigation:

- Challenge: Large-page refactors can introduce behavior changes.
- Mitigation: Extract the smallest stable seam and verify the affected flow immediately.
- Challenge: Workflow state may have implicit dependencies.
- Mitigation: Map the current flow before moving stateful logic.

Estimated Effort: medium

### No Structured Logging/Observability for Migrations, DB Failures, Backup, or Print Failures

- Severity: medium
- Evidence: `src/main/db/migrate.ts`, `src/main/services/settings.ts`, `src/main/ipc/index.ts`, `src/preload/index.ts`
- Impact: Field failures may be hard to diagnose for an offline desktop app.

Actionable Steps:

1. Define a minimal diagnostic logging policy for the offline desktop app.
2. Identify failure events to log for migrations, database failures, backup/restore, and print failures.
3. Decide local log storage location and support access workflow.
4. Add structured logging around high-risk failure paths.
5. Add redaction rules so logs do not expose sensitive patient or prescription data.

Potential Challenges & Mitigation:

- Challenge: Logs may accidentally capture sensitive medical or patient information.
- Mitigation: Log metadata and event context instead of raw records.
- Challenge: Excessive logging may make diagnosis harder.
- Mitigation: Start with minimal structured failure events.

Estimated Effort: medium

## Overall Effort

Overall effort: high. The highest-priority work is automated verification and local data protection decisions. The sandbox, maintainability, and observability items can be addressed incrementally alongside related feature or security work.
