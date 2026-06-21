# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `src/renderer/` | Vite + React 19 renderer (SPA UI). Root of the Vite build. | `vite.config.ts` (`root: 'src/renderer'`), `src/renderer/index.html` |
| `src/renderer/src/pages/` | Top-level view components (Dashboard, NewPrescription, Prescriptions, PresetsManager, MedicinesManager, Settings, PrintRenderer) | scan tree, `src/renderer/src/App.tsx` |
| `src/renderer/src/components/` | Reusable UI: `ui/` (shadcn), `layout/`, `patients/`, `prescriptions/` | `Glob` of `src/renderer/src/**` |
| `src/renderer/src/lib/` | `api.ts` (Tauri adapter), `prescription-mapping.ts`, `navigation.ts`, `utils.ts` | `src/renderer/src/lib/api.ts` |
| `src/shared/` | Zod schemas + TS types shared by the renderer (`patient`, `prescription`, `print`, `settings`) | `src/shared/prescription.ts`, `AGENTS.md` |
| `src-tauri/` | Rust backend + Tauri config | `src-tauri/Cargo.toml` |
| `src-tauri/src/commands/` | Domain command modules (dashboard, patients, prescriptions, presets, settings, printing) | `src-tauri/src/lib.rs` |
| `src-tauri/src/db.rs` | Managed SQLite connection, open/backup/integrity helpers | `src-tauri/src/db.rs` |
| `src-tauri/src/migrations.rs` | Append-only `PRAGMA user_version` migrations + singleton ensure | `src-tauri/src/migrations.rs` |
| `src-tauri/capabilities/` | Tauri permission capabilities for windows | `src-tauri/capabilities/default.json` |
| `src-tauri/gen/schemas/` | Generated Tauri ACL/capability schemas (artifacts — do not edit) | scan tree |
| `dist/`, `build/`, `node_modules/` | Build output, bundle icons, deps (artifacts) | scan tree |
| `Reference/` | Standalone reference UI mockup (separate pnpm project, not part of the app build) | `Reference/package.json`, `Reference/pnpm-workspace.yaml` |
| `diagrams/` | ER diagram source (`er.mmd`) | scan tree |
| `.agents/skills/` | Bundled agent skills (shadcn, sqlite, tauri-v2, rust, react) | scan tree, `AGENTS.md` |
| `docs/codebase/` | This generated documentation set | this file |

### 2) Entry Points

- Renderer entry: `src/renderer/index.html` → `src/renderer/src/main.tsx` → `App.tsx`.
- Backend entry: `src-tauri/src/main.rs` → `prescriptx_lib::run()` in `src-tauri/src/lib.rs`.
- App startup: `tauri::Builder` registers plugins, runs `db::init_database` in `setup()`, registers the `invoke_handler` command list (`src-tauri/src/lib.rs`).
- Print "route": the same renderer loaded with `?printPrescriptionId=<id>` renders `PrintRenderer` instead of the main shell (`src/renderer/src/App.tsx` line 44; `src-tauri/src/commands/printing.rs`).
- How selected: Vite `root` is `src/renderer`; Tauri `build.beforeDevCommand`/`frontendDist` wire renderer to backend (`src-tauri/tauri.conf.json`).

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src/renderer` | React UI, state, calls to `api.*` | Direct DB access, backend logic (`README.md`) |
| `src/renderer/src/lib/api.ts` | Thin typed wrapper over Tauri `invoke` | Business rules / SQL |
| `src/shared` | Zod schemas + TS types only | React or Tauri/Rust imports |
| `src-tauri/src/commands` | `#[tauri::command]` business logic + SQL per domain | UI concerns |
| `src-tauri/src/db.rs` / `migrations.rs` | Connection management + schema | Domain command logic (kept isolated per `README.md`) |

### 4) Naming and Organization Rules

- Renderer files: PascalCase for components (`NewPrescription.tsx`, `PatientFormDialog.tsx`); camelCase/kebab for lib files (`api.ts`, `prescription-mapping.ts`).
- shadcn `ui/` components: lowercase (`button.tsx`, `dialog.tsx`) per shadcn convention.
- Rust: snake_case modules and command names (`patients_create`, `printing_preview`) (`src-tauri/src/lib.rs`).
- Organization: renderer is feature/role-based (`pages/`, `components/<domain>/`); backend is domain-based (`commands/<domain>.rs`).
- Path aliases: `@/*` and `@renderer/*` → `src/renderer/src/*` (`tsconfig.json`, `vite.config.ts`). Shared types imported via relative paths (`../../../shared/...`) in `api.ts`.

### 5) Evidence

- scan tree (`docs/codebase/.codebase-scan.txt`)
- `vite.config.ts`, `tsconfig.json`, `src-tauri/tauri.conf.json`
- `src/renderer/src/App.tsx`, `src/renderer/src/lib/api.ts`
- `src-tauri/src/lib.rs`, `src-tauri/src/db.rs`, `src-tauri/src/migrations.rs`
