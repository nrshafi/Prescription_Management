# External Integrations

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|---------------------------|---------|------------|-------------|----------|
| SQLite database via `better-sqlite3` | Local DB | Persist doctor profile, paper settings, patients, prescriptions, sections, medicines, presets, preset links | Local file access through Electron app user data path; no DB credentials | High | `package.json`, `src/main/db/client.ts`, `src/main/db/migrate.ts` |
| Electron IPC | Process bridge | Renderer calls main-process operations | Context bridge exposes fixed `window.api` methods; no user auth layer found | High | `src/preload/index.ts`, `src/main/ipc/index.ts` |
| Electron dialog/filesystem | OS integration | Export PDF, export SQLite backup, import SQLite backup | User selects files through OS dialogs; no credentials | Medium | `src/main/ipc/index.ts`, `src/main/services/settings.ts` |
| Electron printing/webContents | OS integration | Print prescriptions, create previews, export PDFs | OS printer/PDF access; no credentials | Medium | `src/main/ipc/index.ts`, `src/main/print-window.ts`, `src/main/services/print-spooler.ts` |
| OS external URL handler | OS integration | Open allowed external links in system browser | Protocol allowlist for `https:`, `http:`, `mailto:`, `tel:` | Low | `src/main/index.ts` |

No external HTTP API client was found in production `src/`; `fetch(` matches in repository-local skill/reference docs are not application integrations.

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| `{userData}/prescription.db` | Primary local application database | `src/main/db/client.ts` plus `src/main/services/*` | Local unencrypted medical/patient data; database file permission/encryption policy is `[ASK USER]` | `src/main/db/client.ts`, `src/main/db/migrate.ts`, `src/main/services/settings.ts` |
| Browser `localStorage` | Renderer theme preference | `src/renderer/src/App.tsx`, `src/renderer/src/pages/Settings.tsx` | Preference only; no sensitive data observed in read files | `src/renderer/src/App.tsx`, `src/renderer/src/pages/Settings.tsx` |

### 3) Secrets and Credentials Handling

- Credential sources: no `.env.example`, `.env.template`, or `.env.sample` files were found; no application credential reads were found in production source.
- Hardcoding checks: no production external API base URL or credential string was found; `ELECTRON_RENDERER_URL` is read only for dev server loading/navigation.
- Rotation or lifecycle notes: `[TODO]` no secrets lifecycle exists in files reviewed.

### 4) Reliability and Failure Behavior

- Retry/backoff behavior: no generic retry/backoff mechanism was found.
- Timeout policy: print readiness polling in `src/main/print-window.ts` finishes after 8000 ms if content is not detected; no network timeout policy applies because no production external API calls were found.
- Circuit-breaker or fallback behavior: printing checks installed printers and catches spooler errors, then falls back to print preview in IPC print flow.
- Backup import behavior: validates SQLite header, snapshots live DB, closes DB, replaces DB file, reruns migrations/singleton setup, and restores snapshot on failure.

### 5) Observability for Integrations

- Logging around external calls: no structured logging around SQLite, printing, filesystem, or IPC was found; preload logs context bridge exposure errors with `console.error`.
- Metrics/tracing coverage: no metrics, tracing, APM, or monitoring config was detected.
- Missing visibility gaps: `[TODO]` define desired diagnostic logging for backup import/export, migrations, DB failures, and print failures.

### 6) Evidence

- `package.json`
- `src/main/db/client.ts`
- `src/main/db/migrate.ts`
- `src/main/ipc/index.ts`
- `src/preload/index.ts`
- `src/main/index.ts`
- `src/main/print-window.ts`
- `src/main/services/settings.ts`
- `src/main/services/print-spooler.ts`
- `src/renderer/src/App.tsx`
- `src/renderer/src/pages/Settings.tsx`
- Phase 1 scan terminal output
