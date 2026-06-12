# Plan: Generate Per-Concern Plan Files

## Goal
Review `docs/codebase/CONCERNS.md` and produce **5 separate `.md` plan files** in
`I:\Development\Prescription_Management\concerns-todo`, one per concern section
(Evidence section skipped per user decision).

## Output Files (kebab-case)
| # | Source section | Target filename |
|---|----------------|-----------------|
| 1 | Top Risks (Prioritized) | `top-risks.md` |
| 2 | Technical Debt | `technical-debt.md` |
| 3 | Security Concerns | `security-concerns.md` |
| 4 | Performance and Scaling Concerns | `performance-scaling.md` |
| 5 | Fragile/High-Churn Areas | `fragile-high-churn-areas.md` |

## Required structure for EACH file
Every generated file must contain:
1. **Title** — `# ` heading matching the concern section's heading.
2. **Actionable Steps** — concrete, ordered steps to address each concern row in that section.
3. **Potential Challenges & Mitigation** — risks of the remediation work and how to mitigate them.
4. **Estimated Effort Level** — low / medium / high (per concern row and/or overall).

Suggested per-file layout:
```
# <Section Title>

## Overview
<1-2 sentence summary of the concerns in this section>

## Concerns & Action Plans
### <Concern name>
- Evidence: <files>
- Actionable Steps:
  1. ...
- Potential Challenges & Mitigation: ...
- Estimated Effort: low | medium | high

## Overall Effort: low | medium | high
```

## Sub-Agent Delegation
- Assign **one sub-agent per section** (5 sub-agents total), each working independently
  on its own file using the corresponding section content from `CONCERNS.md`.
- Each sub-agent receives: the relevant table rows, the required structure above,
  and the target filename.

## API Rate Limit Handling
- Limit: **12 requests/minute**.
- With 5 sub-agents, dispatch in batches respecting the cap (e.g. up to ~6 concurrent
  per minute, or stagger). 5 files is under the cap, so a single batch is acceptable,
  but space out tool calls if combined calls approach 12/min.

## Content Mapping (from CONCERNS.md)

### 1) top-risks.md — 5 concerns
- No automated test suite / CI (high)
- Unencrypted SQLite patient data (high)
- BrowserWindow sandbox disabled (medium)
- Large renderer pages mixing concerns (medium)
- No structured logging/observability (medium)

### 2) technical-debt.md — 4 concerns
- Missing test framework and tests
- Large `NewPrescription` component
- Large `Prescriptions` page
- Generic README vs manifest

### 3) security-concerns.md — 4 concerns
- Local sensitive data at rest (A02)
- Renderer sandbox disabled (A05)
- User-facing raw error messages (A09)
- SQL injection through user input (A03)

### 4) performance-scaling.md — 3 concerns
- Correlated subqueries in patient/prescription listing
- Dashboard loads all prescriptions
- No performance tests/benchmarks

### 5) fragile-high-churn-areas.md — 6 areas
- `patients.ts`, `Prescriptions.tsx`, `ipc/index.ts`,
  `prescriptions.ts`, `preload/index.ts` + `.d.ts`, `db/migrate.ts`

## Execution Steps (for implementation phase)
1. Confirm `concerns-todo` directory exists (verified: it does).
2. For each of the 5 sections, generate the corresponding file with the required
   4-part structure, drawing details from the mapped rows above.
3. Verify all 5 files are created with correct kebab-case names.

## Notes / Decisions
- Granularity: **by section** (user choice).
- Evidence section (#6): **skipped** (user choice) — reference-only, not actionable.
