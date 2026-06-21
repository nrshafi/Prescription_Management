# Codebase Concerns

Note on churn data: the scan's HIGH-CHURN list references Electron-era paths (`src/main/`, `src/preload/`, `src/main/ipc/`) that no longer exist in the tree. Commit `5cc2203` removed "legacy Electron/Drizzle import compatibility," confirming a migration from Electron to the current Tauri layout. Treat those churn entries as historical; current high-churn source maps to `src/renderer/src/pages/NewPrescription.tsx`, `Prescriptions.tsx`, `Settings.tsx`, `lib/prescription-mapping.ts`, and `src-tauri/src/commands/prescriptions.rs`.

## Core Sections (Required)

### 1) Top Risks (Prioritized)

| Severity | Concern | Evidence | Impact | Suggested action |
|----------|---------|----------|--------|------------------|
| Med | Dual validation source (Zod vs Rust `normalize_*`) can drift | `README.md`, `src/shared/prescription.ts` | Client/server limits diverge silently → inconsistent behavior | Generate or test parity; add a test asserting limits match |
| Med | Largest files mix many responsibilities | `commands/settings.rs` (~47.6KB), `pages/NewPrescription.tsx` (~45.4KB) (scan §Code Metrics) | Hard to change safely; high churn already on these | Extract backup/JSON-import logic and form sub-sections |
| Low | No logging/observability in either layer (user: nice-to-have) | INTEGRATIONS.md, code review | Failed imports/prints/DB ops leave no trail | Add lightweight structured logging when convenient |
| Low | Legacy schema-repair runs on every startup (user: approved for sunset) | `db.rs` (`ensure_prescriptions_no_templates_fk`), commit `eba30c2` | Added startup work + complexity for old DBs | Remove the repair path; it is no longer needed |

> Decisions (from project owner): renderer test framework and CI are **not needed now**; one-click PDF export is **out of scope** — keep the "Save as PDF" dialog flow. Logging is a **nice-to-have**. Legacy schema-repair **can be sunset**.

### 2) Technical Debt

| Debt item | Why it exists | Where | Risk if ignored | Suggested fix |
|-----------|---------------|-------|-----------------|---------------|
| Legacy FK-repair migration logic | Electron→Tauri/schema history | `src-tauri/src/migrations.rs`, `db.rs` | Permanent startup overhead, confusing code | Time-box removal after user DBs migrate |
| Deep relative shared imports | No alias for `src/shared` | `src/renderer/src/lib/api.ts` (`../../../shared/...`) | Fragile to moves/refactors | Add a `@shared/*` path alias |
| Oversized `settings.rs` | Backup + JSON import + settings all in one module | `src-tauri/src/commands/settings.rs` | Merge conflicts, low readability | Split into `settings`, `backup`, `json_io` modules |
| `react`/`react-dom` under devDependencies | Misclassification | `package.json` | Misleading dependency intent | Move to `dependencies` (harmless to build) |

### 3) Security Concerns

| Risk | OWASP category | Evidence | Current mitigation | Gap |
|------|----------------|----------|--------------------|-----|
| SQL injection | A03 Injection | `src-tauri/src/commands/*.rs` | Uses `params`/`params_from_iter` parameterized queries; SQL fragments are static, only values bound (`commands/mod.rs`, `patients.rs`) | Keep dynamic clause-building bound-only; never interpolate user values into SQL strings |
| Importing untrusted DB/JSON files | A08 Data Integrity | `db.rs` `check_integrity`, `commands/settings.rs` | Header + `integrity_check` + `foreign_key_check` + pre-import snapshot rollback; JSON `formatVersion` gating | Imported content is user-provided but local; acceptable for single-user offline app |
| Opening external URLs | N/A | `src/renderer/src/pages/Settings.tsx` | Hardcoded fixed support URLs; `shell:allow-open` only | Low risk; URLs are constants, not user input |
| Webview CSP | A05 Misconfiguration | `tauri.conf.json`, `src/renderer/index.html` | Restrictive CSP (`default-src 'self'`, scripts self-only) | `style-src 'unsafe-inline'` allowed (needed by Tailwind); acceptable |

No secrets, auth, or network endpoints exist to expose (offline app).

### 4) Performance and Scaling Concerns

| Concern | Evidence | Current symptom | Scaling risk | Suggested improvement |
|---------|----------|-----------------|--------------|-----------------------|
| Single global DB mutex | `Db(Mutex<Connection>)` in `db.rs` | All DB access serialized | None for single-user desktop; would bottleneck multi-user | Acceptable by design; document the constraint |
| Correlated subqueries for last complaint/diagnosis | `LAST_COMPLAINT_SQL` / `LAST_DIAGNOSIS_SQL` in `patients.rs` | Per-row subquery in patient list | Slower as prescription history grows | Add indexes on `(patient_id, section_type, visit_no)`; consider materializing |

### 5) Fragile/High-Churn Areas

| Area | Why fragile | Churn signal | Safe change strategy |
|------|-------------|--------------|----------------------|
| `src/renderer/src/pages/NewPrescription.tsx` | Largest renderer file; complex form state | 21 changes (scan churn; path still current) | Change incrementally; extract sub-sections; verify with `bun run typecheck` |
| `src/renderer/src/pages/Prescriptions.tsx` | Core list/filter view | 16 changes | Small diffs; manual smoke test in `bun run dev` |
| `src/renderer/src/lib/prescription-mapping.ts` | Maps records ↔ form values across layers | 12 changes | Keep in sync with `src/shared` types and Rust structs |
| `src-tauri/src/commands/settings.rs` | Largest Rust file (backup/JSON import) | 7 changes; high size | Add Rust tests before refactor (tests already present) |
| `src-tauri/src/migrations.rs` | Append-only; reorder breaks existing DBs | 2 test changes | Never edit/reorder existing migrations — append only (`README.md`) |

### 6) Resolved Decisions (from project owner)

1. CI pipeline (`cargo test` / `bun run check` / `typecheck` on push) — **Not needed.**
2. Renderer test framework (Vitest + RTL) — **Not needed now**; manual testing is intentional.
3. Structured logging/error reporting for DB, import, and print failures — **Nice to have** (low priority, not silent-to-UI-by-mandate).
4. Legacy schema-repair path (`ensure_prescriptions_no_templates_fk`) — **Approved for sunset**; safe to remove.
5. One-click PDF export — **Out of scope**; keep the system "Save as PDF" dialog flow (`printing.rs`).

### 7) Evidence

- scan output: `docs/codebase/.codebase-scan.txt` (Code Metrics, High-Churn, CI/CD, Security sections)
- `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs`, `src-tauri/src/commands/settings.rs`, `commands/patients.rs`, `commands/printing.rs`, `commands/mod.rs`
- `src/renderer/src/lib/api.ts`, `src/shared/prescription.ts`, `package.json`, `tauri.conf.json`, `README.md`, `AGENTS.md`
