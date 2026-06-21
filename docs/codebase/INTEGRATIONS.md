# External Integrations

PrescriptX is an offline, local-first desktop app. It has **no external API/backend services, no databases over the network, and no auth provider**. Integrations are limited to the local SQLite store, native OS dialogs, and opening external support URLs in the browser.

## Core Sections (Required)

### 1) Integration Inventory

| System | Type | Purpose | Auth model | Criticality | Evidence |
|--------|------|---------|------------|-------------|----------|
| Local SQLite DB | Embedded DB | All application data persistence | None (local file) | High | `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs` |
| Tauri IPC bridge | In-process IPC | Renderer ↔ Rust command calls | Capability/permission gated | High | `src/renderer/src/lib/api.ts`, `src-tauri/src/lib.rs` |
| tauri-plugin-dialog | Native OS dialog | File pickers for backup/JSON export & import | OS user | Medium | `src-tauri/src/lib.rs`, `capabilities/default.json` |
| tauri-plugin-shell | OS shell open | Open Telegram/Discord support links from Settings | `shell:allow-open` | Low | `src/renderer/src/pages/Settings.tsx`, `capabilities/default.json` |
| OS print subsystem | Native print | Print/PDF via `window.print()` in a print webview | OS user | Medium | `src-tauri/src/commands/printing.rs`, `src/renderer/src/lib/api.ts` |

External URLs opened (informational, not API calls): `https://t.me/nafiur_rahman_shafi`, `https://discord.com/users/775961069083951115` (`src/renderer/src/pages/Settings.tsx`).

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| SQLite `prescription.db` | Primary datastore (patients, prescriptions, sections, medicines, presets, settings) | `src-tauri/src/db.rs` + `src-tauri/src/commands/*` via rusqlite | Local file corruption / accidental loss; mitigated by backup API + integrity checks | `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs` |

- Location: `{appDataDir}/prescription.db` (`com.prescriptx.app`), WAL mode, foreign keys ON (`db.rs`, `tauri.conf.json` identifier).
- Backup/import goes through the rusqlite `Backup` API (never raw file copy) with header + `integrity_check` + `foreign_key_check` validation and a pre-import safety snapshot (`db.rs`, `README.md`, `commands/settings.rs`).

### 3) Secrets and Credentials Handling

- Credential sources: None. No `.env.example`/`.env.template`; no env-var reads except Vite's built-in `import.meta.env.PROD` (`src/renderer/src/main.tsx`).
- Hardcoding checks: No API keys/tokens/URLs-as-secrets found (`Grep` over `src`). Only two public support links are hardcoded.
- Rotation/lifecycle: N/A — no secrets.

### 4) Reliability and Failure Behavior

- Retry/backoff: None — local synchronous SQLite calls (`db.rs`).
- Timeout policy: N/A for IPC/DB. SQLite backup runs in stepped batches (`run_to_completion(64, 5ms, ...)` in `db.rs`).
- Fallback behavior: Backup import is transactional with an automatic pre-import snapshot rollback on failure; JSON import runs in a single transaction with safety snapshot (`README.md`, `commands/settings.rs`). Print/PDF falls back to the system "Save as PDF" dialog (`printing.rs`).

### 5) Observability for Integrations

- Logging around external/DB calls: None — no logging library detected in either layer.
- Metrics/tracing: None (no APM/Prometheus/CI configs per scan).
- Missing visibility gaps: No persistent error logs for failed DB operations, imports, or print actions; failures surface only as rejected command results to the UI. [TODO] confirm whether logging is desired.

### 6) Evidence

- `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs`, `src-tauri/src/commands/settings.rs`, `src-tauri/src/commands/printing.rs`
- `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json`, `src-tauri/tauri.conf.json`
- `src/renderer/src/lib/api.ts`, `src/renderer/src/pages/Settings.tsx`, `src/renderer/src/main.tsx`
