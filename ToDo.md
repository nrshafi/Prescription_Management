# Electron To Tauri Migration Plan

## Goal
Migrate the desktop app from Electron to Tauri v2 while preserving the existing React UI, SQLite data model, and current app behavior.

## Recommended Direction
- Replace Electron main/preload with a Tauri + Rust backend.
- Keep the current React frontend.
- Use `vite` directly instead of `electron-vite`.
- Use `rusqlite` in Rust for SQLite.
- Use Tauri plugins for dialogs/filesystem where needed.
- Treat printing and one-click PDF as the highest-risk area.

## Phase 1: Prepare Frontend Build
- Add a standard `vite.config.ts` for the renderer.
- Preserve existing path aliases:
  - `@/* -> src/renderer/src/*`
  - `@renderer/* -> src/renderer/src/*`
- Keep Tailwind and React plugins.
- Ensure Tauri frontend dist points to the Vite build output.
- Keep `src/renderer/index.html` initially to reduce UI churn.
- Remove `electron.vite.config.ts` only after Tauri dev/build works.

## Phase 2: Add Tauri Shell
Create a new Tauri structure without deleting Electron yet:

```text
src-tauri/
  Cargo.toml
  tauri.conf.json
  build.rs
  src/
    main.rs
    db.rs
    migrations.rs
    commands/
      dashboard.rs
      patients.rs
      prescriptions.rs
      presets.rs
      settings.rs
      printing.rs
```

### Tauri config targets
- App name: `PrescriptX`
- App identifier: `com.prescriptx.app`
- Window size: `1200x800`
- Icons from existing `build/` or `resources/`
- Dev URL pointing to Vite
- Dist dir pointing to renderer build

## Phase 3: Replace Preload With Frontend API Adapter
- Create `src/renderer/src/lib/api.ts` as the renderer API adapter.
- Implement renderer calls using Tauri `invoke`.
- Target parity with current `window.api` methods:
  - `dashboard`
  - `patients`
  - `prescriptions`
  - `presets`
  - `settings`
  - `printing`
- Recommended final state: import an explicit `api` module instead of relying on `window.api`.
- If desired, keep a temporary `window.api` adapter during transition.

## Phase 4: Port SQLite Layer To Rust
Port the current Node/`better-sqlite3` backend to Rust/`rusqlite`.

Current files to port:
- `src/main/db/client.ts`
- `src/main/db/migrate.ts`
- `src/main/db/schema.ts`
- `src/main/services/dashboard.ts`
- `src/main/services/patients.ts`
- `src/main/services/prescriptions.ts`
- `src/main/services/printing.ts`
- `src/main/services/settings.ts`

Implementation notes:
- Open SQLite from Tauri app data directory.
- Use `PRAGMA journal_mode = WAL`.
- Use `PRAGMA foreign_keys = ON`.
- Keep `PRAGMA user_version` migration strategy.
- Keep singleton rows for `doctor_profile` and `paper_settings`.

## Phase 5: Port IPC Handlers To Tauri Commands
Replace Electron IPC channels with Tauri commands.

Examples:
| Electron IPC | Tauri Command |
|---|---|
| `dashboard:stats` | `dashboard_stats` |
| `patients:list` | `patients_list` |
| `patients:get` | `patients_get` |
| `patients:create` | `patients_create` |
| `patients:update` | `patients_update` |
| `patients:delete` | `patients_delete` |
| `patients:prescriptionCount` | `patients_prescription_count` |
| `prescriptions:list` | `prescriptions_list` |
| `prescriptions:get` | `prescriptions_get` |
| `prescriptions:create` | `prescriptions_create` |
| `prescriptions:update` | `prescriptions_update` |
| `prescriptions:saveDraft` | `prescriptions_save_draft` |
| `prescriptions:duplicate` | `prescriptions_duplicate` |
| `prescriptions:medicineSuggestions` | `prescriptions_medicine_suggestions` |
| `presets:list` | `presets_list` |
| `presets:get` | `presets_get` |
| `presets:create` | `presets_create` |
| `presets:update` | `presets_update` |
| `presets:delete` | `presets_delete` |
| `settings:get` | `settings_get` |
| `settings:updateDoctorProfile` | `settings_update_doctor_profile` |
| `settings:updatePaperSettings` | `settings_update_paper_settings` |
| `settings:exportBackup` | `settings_export_backup` |
| `settings:importBackup` | `settings_import_backup` |
| `printing:data` | `printing_data` |
| `printing:ready` | remove / replace with webview ready signal |
| `printing:preview` | `printing_preview` |
| `printing:print` | `printing_print` |
| `printing:pdf` | `printing_pdf` |

Notes:
- Current Zod validation is frontend-only.
- Rust commands should perform their own validation.
- Duplicate critical validation rules in Rust.

## Phase 6: Handle Existing Database Migration
Tauri will not automatically read the existing Electron database.

Plan:
- Compute Tauri database path in app data directory.
- If Tauri DB does not exist, detect whether an existing Electron database exists.
- If an old DB exists, copy it into the Tauri app data directory.
- Run migrations and ensure singleton rows after copy.
- Do not overwrite an existing Tauri database.
- Avoid corrupting WAL state; prefer clean copy/backup migration if possible.

## Phase 7: Backup And Import
Current Electron behavior:
- Export backup with save dialog
- Import backup with open dialog
- Validate SQLite header
- Snapshot current DB before replacement
- Remove WAL artifacts
- Restore on failure

Tauri replacement:
- Use Tauri dialog plugin for save/open dialogs.
- Use Rust filesystem APIs.
- Keep SQLite header validation.
- Keep snapshot/rollback behavior.
- Keep `user_version` migrations after import.

## Phase 8: Printing And PDF
This is the highest-risk area.

Current Electron behavior depends on:
- Hidden print window
- `webContents.print()`
- `webContents.printToPDF()`
- Printer availability detection
- Print-ready IPC handshake

Recommended staged approach:
1. Preserve the existing print route/UI:
   - current `PrintRenderer.tsx`
   - `/print?id=...` style rendering
2. Implement print preview as a Tauri webview window that opens the print route.
3. Implement direct print initially with `window.print()` from the print window.
4. Implement PDF export separately.

### PDF strategy decision needed
- Short-term: use system print dialog and let user choose “Save as PDF”.
- Medium-term: generate PDF in Rust from structured prescription data using a PDF crate.
- Alternative: use a WebView/Chromium-based PDF solution, but this can add complexity.

Recommendation:
- First migration should preserve print preview and manual print.
- Treat one-click PDF export parity as a separate milestone unless it is business-critical.

## Phase 9: External Links And Security
Current Electron behavior prevents unsafe navigation and limits external protocol opening.

Tauri replacement:
- Configure CSP in Tauri config.
- Avoid broad shell permissions.
- Use Tauri opener only for allowlisted protocols:
  - `https:`
  - `http:`
  - `mailto:`
  - `tel:`
- Prevent untrusted remote navigation in the renderer.
- Avoid broad filesystem permissions.
- Keep Tauri permissions minimal and explicit.

## Phase 10: Package Scripts And Dependencies
Target scripts:
```json
{
  "dev": "tauri dev",
  "build": "bun run typecheck && tauri build",
  "build:renderer": "vite build",
  "preview": "vite preview"
}
```

Dependencies to add:
- `@tauri-apps/api`
- `@tauri-apps/cli`
- Tauri plugins needed for dialog/filesystem/shell as required

Dependencies to remove after migration is stable:
- `electron`
- `electron-builder`
- `electron-vite`
- `@electron-toolkit/preload`
- `@electron-toolkit/utils`
- `@electron-toolkit/tsconfig`
- `better-sqlite3`
- `@types/better-sqlite3`

## Phase 11: TypeScript Config Cleanup
- Remove Electron Toolkit `extends` from `tsconfig.node.json` / `tsconfig.web.json`.
- Simplify to standard Vite/Tauri TypeScript config.
- Remove `tsconfig.node.json` once `src/main` and `src/preload` are deleted.
- Remove `src/preload/*.d.ts` from renderer includes once adapter is removed.

## Phase 12: Remove Electron Code
Delete or archive after Tauri parity is verified:
- `src/main/`
- `src/preload/`
- `electron.vite.config.ts`
- `electron-builder.yml`
- Electron build artifacts/config
- Electron-specific package dependencies

Update docs:
- `AGENTS.md`
- `README.md`
- `docs/codebase/ARCHITECTURE.md`
- `docs/codebase/STACK.md`
- `docs/codebase/STRUCTURE.md`
- `docs/codebase/TESTING.md`

## Verification Commands
Run only when authorized during implementation:

```bash
bun run typecheck
bun run lint
bun run dev
bun run build
tauri dev
tauri build
```

## Manual Verification Checklist
- App launches in Tauri dev mode.
- Database initializes successfully.
- Existing Electron database migrates on first launch.
- Dashboard loads and shows stats.
- Patients CRUD works.
- Prescriptions CRUD works.
- Presets and medicines work.
- Settings save correctly.
- Backup export works.
- Backup import rejects invalid files.
- Backup import rollback works when import fails.
- Print preview opens.
- Print works via system dialog.
- PDF behavior matches chosen implementation target.
- Packaged Windows app launches.
- Packaged app persists data across restarts.

## Suggested Implementation Order
1. Add Tauri scaffold while keeping Electron untouched.
2. Convert renderer build from `electron-vite` to plain Vite.
3. Add frontend `api` adapter using Tauri `invoke`.
4. Port database init and migrations to Rust.
5. Port dashboard, patients, and presets commands.
6. Port prescriptions commands.
7. Port settings, backup export, and backup import.
8. Port print preview and basic printing.
9. Decide and implement PDF export strategy.
10. Remove Electron dependencies/config/code.
11. Update docs and verification scripts.
12. Run full manual verification and packaging.

## Main Risks
- Printing and PDF parity is the largest unknown.
- Existing database location changes between Electron and Tauri.
- TypeScript shared types cannot be reused directly in Rust.
- Validation rules currently live in Zod and must be duplicated in Rust.
- Packaging behavior differs across Windows/macOS/Linux.
- Moving from a Node native SQLite module to Rust SQLite requires careful query porting.

## Open Questions
1. Should the Tauri version automatically import the existing Electron database on first launch?
2. Is one-click PDF export mandatory, or is print preview plus system “Save as PDF” acceptable for the first Tauri version?
3. Should the renderer keep a temporary `window.api` adapter, or refactor directly to an imported `api` module?

## Recommended Answers Before Starting
- Auto-migrate the existing Electron database on first launch.
- Refactor renderer to an imported `api` module.
- Treat one-click PDF export as a separate parity milestone after the core Tauri app is running.
