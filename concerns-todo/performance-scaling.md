# Performance and Scaling Concerns

## Overview

This plan addresses performance and scaling risks around database query patterns, dashboard data loading, and missing performance baselines. No runtime performance output is currently available, so these are risk-based concerns rather than confirmed bottlenecks.

## Concerns & Action Plans

### Correlated Subqueries in Patient/Prescription Listing

- Evidence: `src/main/services/patients.ts`, `src/main/services/dashboard.ts`
- Current symptom: No runtime performance output available.
- Scaling risk: Larger patient and prescription tables may make list and dashboard queries slower.

Actionable Steps:

1. Define representative data volume targets for patients and prescriptions.
2. Run query-plan checks against representative datasets.
3. Identify correlated subqueries that repeatedly scan larger tables.
4. Add indexes only where query plans show avoidable scans or expensive lookups.
5. Re-check query plans after indexing to confirm intended access paths are used.

Potential Challenges & Mitigation:

- Challenge: There is no current runtime performance output or known data volume target.
- Mitigation: Avoid premature optimization until representative data sizes are available.
- Challenge: Indexes can improve reads while adding write overhead.
- Mitigation: Add only indexes supported by query-plan evidence.

Estimated Effort: medium

### `Dashboard` Loads All Prescriptions to Compute Total and Recent List

- Evidence: `src/renderer/src/pages/Dashboard.tsx`
- Current symptom: No runtime performance output available.
- Scaling risk: `window.api.prescriptions.list()` returns all matching rows for dashboard count and recent slicing.

Actionable Steps:

1. Confirm expected prescription row counts as data grows.
2. Profile dashboard loading with representative prescription data.
3. If loading is slow, add a dedicated dashboard query for total prescription count.
4. If recent slicing is inefficient, add a dedicated recent prescriptions query with an explicit limit.
5. Update the dashboard to consume dedicated totals and recent prescription data instead of the full prescription list.

Potential Challenges & Mitigation:

- Challenge: The current implementation may be acceptable for small datasets.
- Mitigation: Require profiling or representative seed data before changing data access patterns.
- Challenge: Dedicated dashboard queries must match existing filters and ordering semantics.
- Mitigation: Define expected semantics before replacing `prescriptions.list()` usage.

Estimated Effort: medium

### No Detected Performance Tests or Benchmarks

- Evidence: Phase 1 scan terminal output
- Current symptom: No baseline exists.
- Scaling risk: Query and UI regressions may go unnoticed.

Actionable Steps:

1. Define representative data sizes for patients and prescriptions.
2. Add a benchmark, seed dataset, or manual profiling workflow for list and dashboard views.
3. Capture baseline timings for patient listing, prescription listing, and dashboard loading.
4. Document the baseline so future changes can be compared against it.
5. Re-run the benchmark or profiling workflow after query or dashboard data-loading changes.

Potential Challenges & Mitigation:

- Challenge: No formal performance test framework is currently detected.
- Mitigation: Start with lightweight representative seed data or manual profiling before adding benchmark infrastructure.
- Challenge: Choosing meaningful data volumes can be difficult.
- Mitigation: Base test sizes on realistic usage expectations once known.

Estimated Effort: medium

## Overall Effort

Overall effort: medium. Establish representative data expectations and baseline measurements first. Query optimization and dedicated dashboard queries should follow only when profiling or query-plan evidence shows the need.
