# Codebase Concerns

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| high | No automated test suite or CI pipeline detected | `package.json`, Phase 1 scan terminal output | Database migrations, IPC handlers, backup restore, and print flows can regress without automated checks. | Add tests and CI after deciding preferred framework. |
| high | Local patient/prescription data appears stored in an unencrypted SQLite file | `src/main/db/client.ts`, `src/main/db/migrate.ts` | Medical/patient data confidentiality depends on OS/user profile protections unless encryption or file-permission controls are added. | Decide local data protection requirements. |
| medium | BrowserWindow sandbox is disabled for main and print windows | `src/main/index.ts`, `src/main/print-window.ts` | Expands renderer/preload risk surface if untrusted content or unsafe navigation reaches a window. | Document rationale or enable sandbox-compatible preload pattern. |
| medium | Large renderer pages mix UI, data loading, state, and persistence actions | `src/renderer/src/pages/NewPrescription.tsx`, `src/renderer/src/pages/Prescriptions.tsx`, Phase 1 scan terminal output | More difficult to safely modify prescription workflows and patient list behavior. | Extract focused hooks/components only when making related changes. |
| medium | No structured logging/observability for migrations, DB failures, backup, or print failures | `src/main/db/migrate.ts`, `src/main/services/settings.ts`, `src/main/ipc/index.ts`, `src/preload/index.ts` | Field failures may be hard to diagnose for an offline desktop app. | Add minimal diagnostic logging policy and implementation. |

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Missing test framework and tests | No `test` script/dependency/files detected | `package.json`, Phase 1 scan terminal output | Manual verification remains the only guard for core flows. | Pick a test stack and start with service/migration tests. |
| Large `NewPrescription` component | File contains multiple local subcomponents, state, data loading, save/print/PDF actions, and layout | `src/renderer/src/pages/NewPrescription.tsx` | High-cost changes and hidden coupling in prescription workflow. | Extract only stable seams during feature work. |
| Large `Prescriptions` page | File contains filters, patient CRUD dialog state, expandable visit loading, print actions, and list/grid UI | `src/renderer/src/pages/Prescriptions.tsx` | Patient/prescription list behavior is fragile under change. | Extract visit-loading/action logic or view components when touched. |
| README is generic compared with manifest | README says only “An Electron application with React and TypeScript”; package description names offline single-doctor app | `README.md`, `package.json` | Onboarding docs understate domain and current app identity. | Update README to reflect verified project purpose. |

### 3) Security Concerns

| Risk | OWASP category (if applicable) | Evidence | Current mitigation | Gap |
|------|--------------------------------|----------|--------------------|-----|
| Local sensitive data at rest | A02 Cryptographic Failures | `src/main/db/client.ts`, `src/main/db/migrate.ts` | SQLite stored under Electron `userData`; no DB credentials | `[ASK USER]` encryption/file-permission/compliance requirements are not documented. |
| Renderer sandbox disabled | A05 Security Misconfiguration | `src/main/index.ts`, `src/main/print-window.ts` | Navigation policy denies new windows and only opens allowlisted external protocols | `[ASK USER]` rationale for `sandbox: false` is not documented. |
| User-facing raw error messages | A09 Security Logging and Monitoring Failures / N/A | `src/renderer/src/pages/NewPrescription.tsx`, `src/renderer/src/pages/Settings.tsx`, `src/main/services/patients.ts` | Renderer uses fallback strings for non-Error values | `[ASK USER]` redaction/user-facing error policy is not documented. |
| SQL injection through user input | A03 Injection | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts` | Values are bound as `?` parameters; dynamic sort columns use whitelisted maps; section type subquery uses bound parameters | Continue reviewing any new dynamic SQL for whitelist/parameter use. |

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|-------------|-----------------------|
| Correlated subqueries in patient/prescription listing | `src/main/services/patients.ts`, `src/main/services/dashboard.ts` | No runtime performance output available | Larger patient/prescription tables may make list/dashboard queries slower. | Add indexes/query-plan checks when data volume targets are known. |
| `Dashboard` loads all prescriptions to compute total and recent list | `src/renderer/src/pages/Dashboard.tsx` | No runtime performance output available | `window.api.prescriptions.list()` returns all matching rows for dashboard count/recent slicing. | Add dedicated dashboard totals/recent prescription query if data grows. |
| No detected performance tests/benchmarks | Phase 1 scan terminal output | No baseline exists | Query/UI regressions may go unnoticed. | Add benchmark or representative seed/manual profile when needed. |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|-------------|----------------------|
| `src/main/services/patients.ts` | SQL-heavy patient list/delete logic with cascade delete acknowledgement | 11 recent changes in Phase 1 scan terminal output | Add or manually verify list filters, sorting, delete count guard, and cascade behavior. |
| `src/renderer/src/pages/Prescriptions.tsx` | Large UI workflow for patients, visits, filters, print actions | 10 recent changes and top-10 largest source file in Phase 1 scan terminal output | Make focused changes; verify list/grid, filters, expand visits, CRUD, print/PDF. |
| `src/main/ipc/index.ts` | Central adapter for all renderer-main operations | 9 recent changes in Phase 1 scan terminal output | Keep channel, preload, type declarations, and services synchronized. |
| `src/main/services/prescriptions.ts` | SQL-heavy prescription/preset creation, update, duplicate, suggestions | 8 recent changes in Phase 1 scan terminal output | Verify create/update/duplicate, preset links, and medicine suggestions. |
| `src/preload/index.ts` and `src/preload/index.d.ts` | Runtime bridge and type declaration must match | 8 recent changes each in Phase 1 scan terminal output | Update both files together and verify renderer typecheck. |
| `src/main/db/migrate.ts` | Schema evolution and singleton-row setup | 6 recent changes in Phase 1 scan terminal output | Test fresh DB and legacy DB upgrade paths before shipping. |

### 6) `[ASK USER]` Questions

1. [ASK USER] Should local SQLite data be encrypted or protected beyond Electron `userData` storage?
2. [ASK USER] What is the intended rationale for `sandbox: false` in BrowserWindow configuration?
3. [ASK USER] What user-facing error redaction policy should be used for database, backup, and print failures?
4. [ASK USER] Which automated test framework should be adopted for this Electron + React + SQLite app?
5. [ASK USER] Should `README.md` be updated to match the package-described PrescriptX/offline single-doctor intent?

### 7) Evidence

- Phase 1 scan terminal output
- `package.json`
- `README.md`
- `src/main/db/client.ts`
- `src/main/db/migrate.ts`
- `src/main/index.ts`
- `src/main/print-window.ts`
- `src/main/ipc/index.ts`
- `src/main/services/patients.ts`
- `src/main/services/prescriptions.ts`
- `src/main/services/settings.ts`
- `src/main/services/dashboard.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/renderer/src/pages/Dashboard.tsx`
- `src/renderer/src/pages/NewPrescription.tsx`
- `src/renderer/src/pages/Prescriptions.tsx`
- `src/renderer/src/pages/Settings.tsx`
