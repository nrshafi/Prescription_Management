# PrescriptX

PrescriptX is an offline desktop app for single-doctor prescription management.
It is built with Tauri v2, React, TypeScript, and Tailwind CSS, backed by a Rust
backend and local SQLite storage.

The renderer is a Vite-powered React app. Desktop integration, native windows,
and backend commands are handled through Tauri v2. Application data is stored in
SQLite on the local machine.

## Project Setup

### Prerequisites

- [Bun](https://bun.sh)
- [Rust toolchain](https://www.rust-lang.org/tools/install) (required by Tauri)
- Platform-specific Tauri prerequisites: https://v2.tauri.app/start/prerequisites/

### Install

```bash
bun install
```

## Development Commands

```bash
bun run dev          # Start the Tauri desktop app in development mode
bun run dev:renderer # Start the Vite renderer only
bun run typecheck    # Run TypeScript type checking
bun run lint         # Run Biome linting
bun run check        # Run Biome checks, formatting, and import sorting
bun run format       # Format files with Biome
```

### Tests

The Rust backend (commands, JSON import validation, SQL builders, database
integrity checks) is covered by unit tests:

```bash
cd src-tauri
cargo test
```

There is currently no automated test suite for the React renderer.

### Build

```bash
# Builds a bundle for the current operating system
bun run build
```

## Architecture

PrescriptX is a two-layer Tauri v2 application:

- **Renderer** (`src/renderer`) — a Vite + React 19 + TypeScript SPA styled with
  Tailwind CSS and shadcn/Radix UI components. It never talks to the database
  directly; all data access goes through `src/renderer/src/lib/api.ts`, a thin
  adapter over Tauri `invoke` commands.
- **Backend** (`src-tauri/src`) — Rust commands grouped by domain under
  `src-tauri/src/commands/` (`dashboard`, `patients`, `prescriptions`,
  `presets`, `settings`, `printing`). Database access (`db.rs`) and schema
  migrations (`migrations.rs`) are isolated from the command layer.
- **Shared contracts** (`src/shared`) — Zod schemas and TypeScript types shared
  by the renderer. The Rust command layer re-validates the same rules
  server-side (the `normalize_*` functions mirror the Zod schemas); the limits
  in `src/shared/*.ts` are the canonical source — keep both in sync when
  changing them.

The single SQLite connection is held behind a `Mutex<Connection>` managed by
Tauri (`Db` in `db.rs`). Because there is exactly one connection guarded by this
mutex, no two transactions are ever active at once, which is why the command
layer can safely use `unchecked_transaction`.

## Data Model

Application data lives in a local SQLite database at
`{appDataDir}/prescription.db` (WAL mode, foreign keys enabled). On first launch
a legacy Electron database at `{dataDir}/prescriptx/prescription.db` is imported
if present and no Tauri database exists yet.

Core tables (see `src-tauri/src/migrations.rs` for the authoritative schema):

- `doctor_profile` — singleton row (id `1`) with the doctor's letterhead details.
- `paper_settings` — singleton row (id `1`) with page size and margins (mm).
- `patients` — patient records keyed by an auto-generated `patient_code`
  (`PAT-000001`, ...) with a unique index.
- `prescriptions` — one row per visit, `visit_no` increasing per patient,
  cascade-deleted with the patient.
- `prescription_sections` — typed free-text sections (Chief Complaint,
  Examination, Investigations, Provisional Diagnosis, Advice, Follow Up, Weight).
- `prescription_medicines` — medicine rows (name, dosage, frequency, duration,
  notes) per prescription.
- `presets` — reusable snippets by category; `preset_links` links bundle presets
  (Chief Complaint / Provisional Diagnosis) to other presets.

### Migrations

The schema is versioned with SQLite's `PRAGMA user_version`. Migrations in
`MIGRATIONS` (in `migrations.rs`) are an ordered, append-only list applied inside
a transaction on startup; only migrations newer than the current `user_version`
run. A database created by the old Drizzle/Electron build is detected and marked
as having the baseline migration applied so later migrations still run. **Never
edit or reorder an existing migration — only append new ones.**

## Backup & Data Portability

Settings exposes four data operations (in `src-tauri/src/commands/settings.rs`):

- **Export / Import Backup** — a binary `.db` SQLite snapshot. Copies always go
  through the SQLite backup API (never a raw file copy) so WAL state can't be
  corrupted. On import the file is validated (SQLite header + `integrity_check` +
  `foreign_key_check`) and the live database is snapshotted first so a failed
  import is rolled back automatically.
- **Export / Import JSON** — a portable, human-readable JSON document. The
  envelope carries a `formatVersion` field; the current version is `1`
  (`JSON_FORMAT_VERSION`). Imports with a missing or unsupported `formatVersion`
  are rejected. JSON import is a merge: patients are matched by `patientCode`
  (or name + phone), prescriptions are skipped when a `visit_no` already exists,
  and presets are skipped when an identical category + title already exists.
  A safety snapshot is taken first and the whole import runs in one transaction.
