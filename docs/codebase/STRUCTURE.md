# Codebase Structure

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `src/main/` | Electron main process, database initialization, IPC registration, printing windows, services | `src/main/index.ts`, `src/main/ipc/index.ts`, `src/main/services/` |
| `src/main/db/` | SQLite client, schema interfaces, and `PRAGMA user_version` migrations | `src/main/db/client.ts`, `src/main/db/migrate.ts`, `src/main/db/schema.ts` |
| `src/main/ipc/` | IPC handler registration for renderer-to-main operations | `src/main/ipc/index.ts` |
| `src/main/services/` | Main-process business/data operations for dashboard, patients, prescriptions, printing, settings | `src/main/services/patients.ts`, `src/main/services/prescriptions.ts`, `src/main/services/settings.ts` |
| `src/preload/` | Context bridge and typed `window.api` surface | `src/preload/index.ts`, `src/preload/index.d.ts` |
| `src/renderer/` | Renderer HTML and React application source | `src/renderer/index.html`, `src/renderer/src/main.tsx`, `src/renderer/src/App.tsx` |
| `src/renderer/src/pages/` | Top-level renderer views selected by app state | `src/renderer/src/App.tsx`, `src/renderer/src/pages/` |
| `src/renderer/src/components/` | Renderer UI components, including layout, patient dialogs, and shadcn-style UI primitives | `src/renderer/src/components/layout/Header.tsx`, `src/renderer/src/components/ui/button.tsx` |
| `src/renderer/src/lib/` | Renderer helper modules | `src/renderer/src/lib/utils.ts`, `src/renderer/src/lib/navigation.ts` |
| `src/shared/` | Shared Zod schemas and TypeScript types used by main/preload/renderer | `src/shared/patient.ts`, `src/shared/prescription.ts`, `src/shared/settings.ts`, `src/shared/print.ts` |
| `resources/` | Packaged resources including app icon | `resources/icon.png`, `src/main/index.ts`, `electron-builder.yml` |
| `diagrams/` | Database diagram source | `diagrams/er.mmd` |
| `Reference/` | Reference code bundle linked to a Figma source, separate from production `src/` tree | Phase 1 scan terminal output, `Reference/README.md` |
| `.agents/skills/` | Repository-local agent skills and guidance | `.agents/skills/shadcn/SKILL.md`, `.agents/skills/sqlite-database-expert/SKILL.md` |
| `.vscode/` | Workspace editor/launch settings | `.vscode/settings.json`, `.vscode/launch.json` |

### 2) Entry Points

- Main runtime entry: `src/main/index.ts` is built to `./out/main/index.js`, matching `package.json` `main`.
- Preload entry: `src/preload/index.ts`, loaded by BrowserWindow via `join(__dirname, '../preload/index.js')`.
- Renderer entry: `src/renderer/src/main.tsx`, mounted into `src/renderer/index.html` by electron-vite/Vite.
- Print renderer route: same renderer app enters print mode when pathname is `/print` or query contains `printPrescriptionId`.
- Secondary entry points: no standalone CLI, worker, or job entry points were found in the scan.
- How entry is selected: `electron-vite` scripts in `package.json`; development loads `process.env.ELECTRON_RENDERER_URL`, production loads `../renderer/index.html`.

### 3) Module Boundaries

| Boundary | What belongs here | What must not be here |
|----------|-------------------|------------------------|
| `src/main/` | Electron APIs, filesystem/dialog/printing APIs, SQLite access, IPC handlers | React UI rendering; direct browser DOM code except executed in print-window JavaScript string |
| `src/main/db/` | Database connection, migrations, schema row interfaces | Renderer imports; page UI logic |
| `src/main/services/` | Prepared SQL, transactions, validation-backed business operations | Direct React component state or DOM UI |
| `src/preload/` | Typed bridge from renderer to IPC channels | Database queries or renderer components |
| `src/renderer/src/` | React UI, client-side state, `window.api` calls | Direct imports from main-process modules |
| `src/shared/` | Cross-process types and Zod schemas | Electron APIs, SQLite client, React components |

### 4) Naming and Organization Rules

- File naming pattern: renderer page/components commonly use PascalCase files such as `Dashboard.tsx`, `NewPrescription.tsx`, `PatientFormDialog.tsx`; main service/db/shared modules use lower-case or kebab/camel files such as `patients.ts`, `prescriptions.ts`, `print-spooler.ts`, `patient.ts`.
- Directory organization pattern: source is organized primarily by Electron process/layer (`main`, `preload`, `renderer`, `shared`), with renderer pages/components grouped separately.
- Import aliasing or path conventions: renderer supports `@renderer/*` and `@/*` mapped to `src/renderer/src/*`; shadcn aliases map `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, and `@/hooks`.
- Shared imports from renderer currently use relative paths for `src/shared/*` in representative pages/components.

### 5) Evidence

- Phase 1 scan terminal output
- `package.json`
- `electron.vite.config.ts`
- `tsconfig.web.json`
- `components.json`
- `src/main/index.ts`
- `src/preload/index.ts`
- `src/renderer/src/main.tsx`
- `src/renderer/src/App.tsx`
- `src/main/db/client.ts`
- `src/main/db/migrate.ts`
- `src/main/ipc/index.ts`
- `src/shared/patient.ts`
