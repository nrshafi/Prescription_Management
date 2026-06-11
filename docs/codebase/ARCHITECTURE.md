# Architecture

## Core Sections (Required)

### 1) Architectural Style

- Primary style: Electron multi-process layered architecture.
- Why this classification: files are separated into `src/main`, `src/preload`, `src/renderer`, and `src/shared`; main registers IPC handlers, preload exposes a typed API, and renderer calls `window.api.*` rather than importing main services.
- Primary constraints: offline local persistence through SQLite; renderer-to-main communication through IPC; print/PDF output handled by Electron BrowserWindow/webContents APIs.

### 2) System Flow

```text
React renderer -> window.api preload bridge -> ipcMain handler -> main service -> SQLite/printing/filesystem -> IPC response -> React state/UI
```

1. Electron starts in `src/main/index.ts`, sets app policies, initializes SQLite, runs migrations, ensures singleton rows, registers IPC handlers, then creates the main BrowserWindow.
2. BrowserWindow loads `src/preload/index.js`, which exposes `window.api` methods backed by named IPC channels.
3. React starts in `src/renderer/src/main.tsx`; `src/renderer/src/App.tsx` selects pages and passes navigation/action callbacks.
4. Renderer pages call methods such as `window.api.patients.list`, `window.api.prescriptions.create`, `window.api.settings.exportBackup`, and `window.api.printing.pdf`.
5. IPC handlers in `src/main/ipc/index.ts` delegate to service functions in `src/main/services/*`.
6. Services validate with shared Zod schemas where present, run prepared SQLite statements/transactions, perform backup/print operations, and return typed results back through IPC.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Main process bootstrap | App lifecycle, BrowserWindow creation, navigation policy, DB initialization order, IPC registration | Renderer component state | `src/main/index.ts` |
| Database client/migrations | SQLite file path, WAL/foreign-key pragmas, migration SQL, singleton rows | Renderer UI and IPC channel definitions | `src/main/db/client.ts`, `src/main/db/migrate.ts` |
| Main IPC | Channel names and adapter functions from IPC to services | SQL schema definitions or React rendering | `src/main/ipc/index.ts` |
| Main services | Business logic, prepared SQL, transactions, backup/import, print data | Direct renderer state updates | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts`, `src/main/services/printing.ts` |
| Preload bridge | Typed `window.api` exposure and IPC invocation shape | SQL/business logic | `src/preload/index.ts`, `src/preload/index.d.ts` |
| Shared contracts | Zod schemas and TypeScript shapes shared across processes | Electron APIs or database connections | `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/shared/settings.ts`, `src/shared/print.ts` |
| Renderer app/pages | React state, UI rendering, localStorage theme preference, calls to `window.api` | Direct SQLite access or Electron `ipcMain` handlers | `src/renderer/src/App.tsx`, `src/renderer/src/pages/NewPrescription.tsx`, `src/renderer/src/pages/Settings.tsx` |
| Print window | Hidden/visible print BrowserWindow creation and readiness detection | General app navigation | `src/main/print-window.ts`, `src/renderer/src/App.tsx` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Singleton database connection | `src/main/db/client.ts` | Reuses one `better-sqlite3` connection after `initDatabase()` and throws if accessed before initialization. |
| `PRAGMA user_version` migrations | `src/main/db/migrate.ts` | Applies migration strings by numeric SQLite user version. |
| IPC adapter layer | `src/main/ipc/index.ts`, `src/preload/index.ts` | Keeps renderer calls typed and routes them through named IPC channels. |
| Shared Zod validation | `src/shared/*.ts`, `src/main/services/*.ts`, `src/renderer/src/components/patients/PatientFormDialog.tsx` | Validates IPC inputs and form inputs with the same schemas. |
| Prepared SQL statements | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts` | Binds user input as SQL parameters for queries and mutations. |
| Transactions for multi-step writes | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/db/migrate.ts` | Keeps multi-statement create/update/delete/migration operations atomic. |
| Renderer page switch state | `src/renderer/src/App.tsx`, `src/renderer/src/lib/navigation.ts` | Uses app state instead of a router package to select top-level pages. |
| Print fallback | `src/main/ipc/index.ts`, `src/main/services/print-spooler.ts` | Opens print preview when printers/spooler are unavailable or print fails. |

### 5) Known Architectural Risks

- Large renderer pages combine form state, data loading, UI layout, and persistence actions in single files; `NewPrescription.tsx` and `Prescriptions.tsx` are the largest source files in the Phase 1 scan terminal output.
- No automated tests or CI were detected, so IPC/database/print flows rely on manual verification unless tests are added.
- `BrowserWindow` uses `sandbox: false` in both main and print windows; the security rationale is `[ASK USER]`.
- Error messages thrown by main services are surfaced to renderer UI in several places; intended user-facing error policy is `[ASK USER]`.

### 6) Evidence

- `src/main/index.ts`
- `src/main/db/client.ts`
- `src/main/db/migrate.ts`
- `src/main/ipc/index.ts`
- `src/preload/index.ts`
- `src/preload/index.d.ts`
- `src/main/services/patients.ts`
- `src/main/services/prescriptions.ts`
- `src/main/services/settings.ts`
- `src/main/services/printing.ts`
- `src/main/print-window.ts`
- `src/renderer/src/main.tsx`
- `src/renderer/src/App.tsx`
- `src/renderer/src/pages/NewPrescription.tsx`
- Phase 1 scan terminal output
