# Plan 02 — Refactor `settings.rs` (Backup / JSON I/O extraction)

**Severity:** Medium · **Source:** `docs/codebase/CONCERNS.md` §1, §2, §5

## Concern

`src-tauri/src/commands/settings.rs` is the largest Rust file (~1404 lines /
47.6 KB) and mixes three distinct responsibilities in one module:

1. Settings CRUD (doctor profile, paper settings).
2. Binary `.db` backup export/import (SQLite backup API, snapshot/rollback).
3. Portable JSON export/import (envelope structs, validation, merge logic).

This makes the file hard to change safely and prone to merge conflicts. It also
carries churn (7 changes).

## Evidence

Outline of current `settings.rs`:

- Records/payloads: `DoctorProfileRecord` (20), `PaperSettingsRecord` (35),
  `SettingsPayload` (47), `BackupActionResult` (54), form-value structs (74, 88)
- JSON envelope structs: `JsonExport` (99) … `JsonPresetLink` (251),
  `ImportPatient` (269) … `ImportStats` (302)
- Helpers: `timestamp_millis` (393), `backup_to` (400), `is_sqlite_database` (409),
  `reopen_database` (421), `reopen_imported_database` (432)
- JSON pipeline: `build_json_export` (441), `validate_json_import` (591),
  `next_patient_sequence` (766), `resolve_patient_id` (776),
  `import_json_into_db` (811)
- Commands: `settings_get` (910), `settings_update_doctor_profile` (919),
  `settings_update_paper_settings` (962), `settings_export_backup` (1001),
  `settings_import_backup` (1079), `settings_export_json` (1038),
  `settings_import_json` (1168)
- Tests: `mod tests` (1255)

Command registration lives in `src-tauri/src/lib.rs:36-42` as
`commands::settings::settings_*`.

## Target structure

Convert the single file into a `settings/` module directory:

```
src-tauri/src/commands/settings/
  mod.rs        # settings records + settings_get/update_* commands; re-exports
  backup.rs     # binary .db export/import: backup_to, is_sqlite_database,
                # reopen_*, settings_export_backup, settings_import_backup
  json_io.rs    # Json* + Import* structs, build_json_export,
                # validate_json_import, resolve_patient_id, next_patient_sequence,
                # import_json_into_db, settings_export_json, settings_import_json
```

## Tasks

1. **Create the module directory** `src-tauri/src/commands/settings/` and move the
   existing file content into `mod.rs` as a starting point (or create the three
   files directly).
2. **Move JSON code** (structs, validators, importer, the two JSON commands) into
   `json_io.rs`. Keep visibility `pub(crate)`/`pub` as needed; mark the `#[tauri::command]`
   functions `pub`.
3. **Move backup code** (`backup_to`, `is_sqlite_database`, `reopen_database`,
   `reopen_imported_database`, the two backup commands) into `backup.rs`.
4. **Keep settings CRUD** (`DoctorProfileRecord`, `PaperSettingsRecord`,
   `SettingsPayload`, form-value structs, `settings_get`, the two update commands)
   in `mod.rs`.
5. **Re-export commands from `mod.rs`** so existing paths stay valid:
   ```rust
   mod backup;
   mod json_io;
   pub use backup::{settings_export_backup, settings_import_backup};
   pub use json_io::{settings_export_json, settings_import_json};
   ```
   This means **no change** is needed in `lib.rs` (paths remain
   `commands::settings::settings_*`).
6. **Relocate `use` imports** per file (e.g. `rusqlite`, `tauri`, `db::*`,
   `super::mod` helpers). Add `use super::*;` or explicit imports as needed.
7. **Split the test module.** Move each test next to the code it exercises
   (`backup.rs` tests, `json_io.rs` tests). Shared test fixtures can live in a
   small `#[cfg(test)]` helper in `mod.rs`.
8. **Confirm shared helpers** (`opt_trim`, `ensure_max_len`) still resolve from
   `crate::commands::` / `super::super::`.

## Affected files

- `src-tauri/src/commands/settings.rs` → split into `settings/{mod,backup,json_io}.rs`
- `src-tauri/src/commands/mod.rs` (no change to `pub mod settings;` — a module
  directory resolves the same way)
- `src-tauri/src/lib.rs` (verify only; should require no edits)
- `src/shared/settings.ts` (no change — wire contract unchanged)

## Verification

```bash
cd src-tauri
cargo test
cargo build
```

Then smoke-test the four data operations in `bun run dev`: Export Backup,
Import Backup, Export JSON, Import JSON.

## Risks / notes

- **Pure refactor — no behavior change.** Do not alter snapshot/rollback or
  validation logic while moving it.
- Keep command function signatures and names identical so the Tauri
  `generate_handler!` list and the renderer `api.ts` calls keep working.
- Watch for now-`pub(crate)` items that were previously private within one file
  and are now referenced across sibling modules; widen visibility minimally.
