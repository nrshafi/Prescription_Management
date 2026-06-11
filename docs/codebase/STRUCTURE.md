# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `src-tauri/` | Rust backend: Tauri app config, SQLite database, migrations, commands, print windows | `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json` |
| `src-tauri/src/commands/` | Per-domain Tauri commands (dashboard, patients, prescriptions, presets, settings, printing) | `src-tauri/src/commands/mod.rs` |
| `src-tauri/src/db.rs` | SQLite connection, pragmas, Electron database import, WAL helpers | `src-tauri/src/db.rs` |
| `src-tauri/src/migrations.rs` | `PRAGMA user_version` migrations and singleton rows | `src-tauri/src/migrations.rs` |
| `src-tauri/capabilities/` | Tauri permission capabilities for `main` and `print-*` windows | `src-tauri/capabilities/default.json` |
| `src/renderer/` | Renderer HTML and React application source | `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx` |
| `src/renderer/src/lib/api.ts` | Typed API adapter over Tauri `invoke` (also installs `window.api` shim) | `src/renderer/src/lib/api.ts` |
| `src/renderer/src/pages/` | Top-level renderer views selected by app state | `src/renderer/src/App.tsx` |
| `src/renderer/src/components/` | Renderer UI components, including layout, patient dialogs, and shadcn-style UI primitives | `src/renderer/src/components/` |
| `src/shared/` | Shared Zod schemas and TypeScript types used by the renderer | `src/shared/patient.ts`, `src/shared/prescription.ts` |
| `build/` | App icons used by the Tauri bundler | `src-tauri/tauri.conf.json` |
| `resources/` | Legacy app resources (icon) | `resources/icon.png` |
| `diagrams/` | Database diagram source | `diagrams/er.mmd` |
| `.agents/skills/` | Repository-local agent skills and guidance | `.agents/skills/tauri-v2/SKILL.md` |
| `.vscode/` | Workspace editor/launch settings | `.vscode/settings.json` |

### 2) Entry Points

- Backend entry: `src-tauri/src/main.rs` -> `prescriptx_lib::run()` in `src-tauri/src/lib.rs` (plugins, DB setup, command registration).
- Renderer entry: `src/renderer/src/main.tsx`, mounted into `src/renderer/index.html` by Vite; imports `@/lib/api` for the `window.api` shim.
- Print renderer route: same renderer app enters print mode when the query contains `printPrescriptionId`; `autoprint=1` triggers `window.print()` once content is ready.
- How entry is selected: `tauri dev`/`tauri build` via `package.json` scripts; dev loads the Vite server (`devUrl`), production loads `dist/` (`frontendDist`).

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src-tauri/src/` | Tauri APIs, dialogs, SQLite access, command handlers, validation | React UI rendering |
| `src-tauri/src/commands/` | Prepared SQL, transactions, Rust-side validation | Window bootstrap or migration definitions |
| `src/renderer/src/lib/api.ts` | Typed `invoke` wrappers matching backend commands | SQL or business logic |
| `src/renderer/src/` | React UI, client-side state, `api`/`window.api` calls | Direct SQLite access or Rust imports |
| `src/shared/` | Cross-layer types and Zod schemas | Tauri APIs, SQLite client, React components |

### 4) Naming and Organization Rules

- File naming pattern: renderer pages/components use PascalCase files such as `Dashboard.tsx`, `NewPrescription.tsx`; Rust modules and shared TS modules use snake/lower-case files such as `patients.rs`, `patient.ts`.
- Directory organization pattern: backend organized per domain under `src-tauri/src/commands/`; renderer pages/components grouped separately.
- Import aliasing or path conventions: renderer supports `@renderer/*` and `@/*` mapped to `src/renderer/src/*`; shadcn aliases map `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, and `@/hooks`.
- Shared imports from renderer use relative paths for `src/shared/*`.
- Tauri command names are snake_case versions of the old IPC channels (e.g. `patients:list` -> `patients_list`).

### 5) Evidence

- `package.json`
- `vite.config.ts`
- `tsconfig.json`
- `components.json`
- `src-tauri/src/lib.rs`
- `src-tauri/src/db.rs`
- `src-tauri/src/commands/mod.rs`
- `src/renderer/src/lib/api.ts`
- `src/renderer/src/main.tsx`
- `src/renderer/src/App.tsx`
- `src/shared/patient.ts`
