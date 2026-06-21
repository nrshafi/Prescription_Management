# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: **Two-layer Tauri desktop app** — a React renderer (presentation) over a Rust command backend (domain + data), with a shared TypeScript contracts layer.
- Why this classification: README and AGENTS.md describe exactly two layers (renderer + backend) plus `src/shared`. The renderer never touches the database; all access flows through `src/renderer/src/lib/api.ts`, a thin adapter over Tauri `invoke` (`README.md`, `api.ts`). Backend code is organized by domain under `src-tauri/src/commands/` and registered centrally in `src-tauri/src/lib.rs`.
- Primary constraints:
  - Single shared SQLite connection guarded by a `Mutex<Connection>` (`Db` in `src-tauri/src/db.rs`); only one transaction is ever active, enabling `unchecked_transaction` use (`README.md`).
  - Validation is duplicated: Zod schemas in `src/shared` (canonical limits) and Rust `normalize_*` re-validation server-side (`README.md`, `AGENTS.md`).
  - Fully offline, local-first; no network/external service dependency.

### 2) System Flow

```text
React page (pages/*) -> api.<domain>.<method>() -> Tauri invoke('<command>')
  -> #[tauri::command] in src-tauri/src/commands/<domain>.rs
  -> Db mutex lock (db.rs) -> rusqlite SQL on prescription.db
  -> Result<T, String> serialized (serde camelCase) -> Promise<T> in renderer
```

1. A page component (e.g. `NewPrescription.tsx`) calls `api.prescriptions.create(input)` (`src/renderer/src/lib/api.ts`).
2. `api.ts` calls `invoke('prescriptions_create', { input })` over the Tauri IPC bridge.
3. The matching `#[tauri::command]` runs in `src-tauri/src/commands/prescriptions.rs`, registered in `src-tauri/src/lib.rs`.
4. The command locks the managed connection via `state.conn()` (`db.rs`) and executes SQL with rusqlite.
5. Structs serialize with `#[serde(rename_all = "camelCase")]` and return as `Result<T, String>` (`patients.rs`).
6. Printing diverges: `printing_preview/print/pdf` open a new `print-*` webview window on the renderer print route; the renderer triggers `window.print()` when ready (`printing.rs`, `api.ts`).

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Renderer (`src/renderer`) | UI, navigation state, form validation, calling `api.*` | DB access, business rules | `src/renderer/src/App.tsx`, `README.md` |
| API adapter (`lib/api.ts`) | Mapping JS calls → `invoke` command names/args | SQL, validation, persistence | `src/renderer/src/lib/api.ts` |
| Shared (`src/shared`) | Zod schemas, TS types, canonical limits | React/Tauri/Rust imports | `src/shared/prescription.ts` |
| Commands (`src-tauri/src/commands`) | Domain logic, SQL, server-side validation | UI rendering | `src-tauri/src/commands/patients.rs` |
| DB layer (`db.rs`, `migrations.rs`) | Connection, WAL/FK pragmas, backup, integrity, schema migrations | Domain command logic | `src-tauri/src/db.rs`, `migrations.rs` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Managed singleton (Tauri state) | `Db(Mutex<Connection>)` in `db.rs`, `app.manage(...)` in `lib.rs` | One serialized DB connection; safe transactions |
| Adapter | `src/renderer/src/lib/api.ts` | Single typed boundary over Tauri `invoke` |
| Command registry | `tauri::generate_handler![...]` in `lib.rs` | Central registration of all backend commands |
| Versioned migrations | `MIGRATIONS` array + `PRAGMA user_version` in `migrations.rs` | Ordered, append-only schema evolution |
| Shared-schema mirroring | Zod in `src/shared` mirrored by Rust `normalize_*` | Validate on both client and server |
| Singleton rows | `ensure_singleton_rows()` for `doctor_profile`/`paper_settings` | Guarantee config rows exist (`db.rs`, `migrations.rs`) |
| Backup-API copy | `copy_database` via rusqlite `Backup` in `db.rs` | Avoid WAL corruption on export/import |

### 5) Known Architectural Risks

- Dual source of truth for validation limits (Zod + Rust `normalize_*`) can drift if not kept in sync (`README.md` explicitly warns).
- Single global mutex around the DB serializes all access; fine for a single-user desktop app but blocks concurrency by design (`db.rs`).
- Legacy-migration repair code (`ensure_prescriptions_no_templates_fk`) reflects an Electron→Tauri/schema history and adds startup complexity (`db.rs`, `migrations.rs`, recent commits).
- Renderer↔shared coupling uses deep relative imports (`../../../shared/...`) in `api.ts` rather than an alias, making refactors fragile.

### 6) Evidence

- `src-tauri/src/lib.rs`, `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs`
- `src-tauri/src/commands/patients.rs`, `src-tauri/src/commands/printing.rs`
- `src/renderer/src/lib/api.ts`, `src/renderer/src/App.tsx`
- `README.md`, `AGENTS.md`
