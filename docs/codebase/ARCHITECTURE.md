# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: Tauri two-layer desktop architecture (Rust backend + webview renderer).
- Why this classification: the Rust backend in `src-tauri/` owns the database, validation, dialogs, and window management and exposes `#[tauri::command]` functions; the React renderer calls them through a typed `invoke` adapter (`src/renderer/src/lib/api.ts`) rather than importing backend code.
- Primary constraints: offline local persistence through SQLite (rusqlite); renderer-to-backend communication through Tauri IPC; print output handled by dedicated `print-*` webview windows and the system print dialog.

### 2) System Flow

```text
React renderer -> api adapter (Tauri invoke) -> #[tauri::command] handler -> rusqlite/dialogs/windows -> serialized response -> React state/UI
```

1. Tauri starts in `src-tauri/src/main.rs` -> `lib.rs::run()`, registers plugins, opens the SQLite database (importing a legacy Electron database on first launch), runs migrations, ensures singleton rows, and manages the connection as state.
2. The renderer starts in `src/renderer/src/main.tsx`; importing `@/lib/api` installs the `window.api` compatibility shim.
3. `src/renderer/src/App.tsx` selects pages; the print route is selected by the `printPrescriptionId` query parameter.
4. Renderer pages call methods such as `api.patients.list`, `api.prescriptions.create`, `api.settings.exportBackup`, and `api.printing.print` (or the legacy `window.api.*`).
5. Commands in `src-tauri/src/commands/*` validate input (mirroring the shared Zod schemas), run prepared SQLite statements/transactions, perform backup/print operations, and return camelCase-serialized results.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Backend bootstrap | App lifecycle, plugin/window setup, DB initialization order, command registration | Renderer component state | `src-tauri/src/lib.rs` |
| Database/migrations | SQLite file path, WAL/foreign-key pragmas, migration SQL, singleton rows, Electron DB import | Renderer UI and command business logic | `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs` |
| Commands | Business logic, prepared SQL, transactions, validation, backup/import, print windows | React rendering | `src-tauri/src/commands/` |
| API adapter | Typed `invoke` wrappers and the temporary `window.api` shim | SQL/business logic | `src/renderer/src/lib/api.ts` |
| Shared contracts | Zod schemas and TypeScript shapes for the renderer | Tauri APIs or database connections | `src/shared/*.ts` |
| Renderer app/pages | React state, UI rendering, localStorage theme preference, API calls | Direct SQLite access or backend imports | `src/renderer/src/App.tsx`, `src/renderer/src/pages/` |
| Print windows | `print-*` webview windows on the print route; `autoprint=1` triggers `window.print()` | General app navigation | `src-tauri/src/commands/printing.rs`, `src/renderer/src/pages/PrintRenderer.tsx` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Managed singleton connection | `src-tauri/src/db.rs`, `src-tauri/src/lib.rs` | One rusqlite connection behind a Mutex in Tauri managed state. |
| `PRAGMA user_version` migrations | `src-tauri/src/migrations.rs` | Applies migration scripts by numeric SQLite user version (compatible with Electron-era databases). |
| Command adapter layer | `src-tauri/src/commands/`, `src/renderer/src/lib/api.ts` | Keeps renderer calls typed and routes them through named Tauri commands. |
| Duplicated validation | `src/shared/*.ts` (Zod) and `src-tauri/src/commands/*` (Rust) | Frontend Zod schemas cannot run in Rust, so commands re-validate critical rules. |
| Prepared SQL statements | `src-tauri/src/commands/patients.rs`, `prescriptions.rs`, `presets.rs` | Binds user input as SQL parameters for queries and mutations. |
| Transactions for multi-step writes | `src-tauri/src/commands/*`, `src-tauri/src/migrations.rs` | Keeps multi-statement operations atomic via `unchecked_transaction`. |
| Renderer page switch state | `src/renderer/src/App.tsx`, `src/renderer/src/lib/navigation.ts` | Uses app state instead of a router package to select top-level pages. |
| Backup snapshot/rollback | `src-tauri/src/commands/settings.rs` | Validates the SQLite header, snapshots before replacing, and restores on failure. |

### 5) Known Architectural Risks

- Printing relies on the system print dialog (`window.print()`); one-click PDF export parity with Electron is a separate milestone.
- Validation rules are duplicated between Zod (renderer) and Rust (backend) and can drift.
- Large renderer pages combine form state, data loading, UI layout, and persistence actions in single files (`NewPrescription.tsx`, `Prescriptions.tsx`).
- No automated tests or CI were detected, so command/database/print flows rely on manual verification.
- The `window.api` shim is transitional; pages should migrate to importing `api` from `@/lib/api`.

### 6) Evidence

- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/migrations.rs`
- `src-tauri/src/commands/`
- `src/renderer/src/lib/api.ts`
- `src/renderer/src/main.tsx`
- `src/renderer/src/App.tsx`
- `src/renderer/src/pages/PrintRenderer.tsx`
