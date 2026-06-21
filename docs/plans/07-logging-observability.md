# Plan 07 — Logging & Observability (Nice-to-Have)

**Severity:** Low / Nice-to-have · **Source:** `docs/codebase/CONCERNS.md` §1, §6 (item 3)

> Owner decision: structured logging is a **nice-to-have**, low priority, and
> **not** required to be silent-to-UI-by-mandate. Implement when convenient.
> Pick up only after the higher-priority plans (01-06) if time allows.

## Concern

Neither layer has logging/observability. Failed DB operations, migrations,
imports/exports, and print actions leave no trail, making field issues hard to
diagnose. User-facing error messages already surface failures; this plan adds a
**developer/diagnostic trail**, not new UI.

## Evidence

- `docs/codebase/INTEGRATIONS.md` and code review: no logger configured
- Key failure points without logs:
  - `src-tauri/src/db.rs` — `init_database`, `open_connection`, `check_integrity`
  - `src-tauri/src/migrations.rs` — `run_migrations`
  - `src-tauri/src/commands/settings.rs` (and its split modules per Plan 02) —
    backup import/export, JSON import/export
  - `src-tauri/src/commands/printing.rs` — print / save-as-PDF flow

## Approach (Rust backend first)

Use a lightweight, idiomatic stack:

- `log` facade + `tauri-plugin-log` (writes to stdout + a rotating file in the
  app log dir), **or** `tracing` + `tracing-subscriber` if structured spans are
  preferred. Recommend `tauri-plugin-log` for minimal wiring in a Tauri app.

### Tasks (backend)

1. **Add the dependency** to `src-tauri/Cargo.toml`
   (`tauri-plugin-log = "2"` or `log` + a subscriber).
2. **Initialize** the logger in the Tauri builder in `src-tauri/src/lib.rs`
   (`.plugin(tauri_plugin_log::Builder::new().build())`), with levels: `info`
   default, `warn`/`error` for failures, `debug` behind dev builds.
3. **Instrument key paths** with concise messages (no PII — log counts/ids, never
   patient names/phones):
   - DB init success/failure, migration version transitions
   - Backup export/import: start, validation result, rollback-on-failure
   - JSON import: parsed counts, skipped duplicates, transaction outcome
   - Print/PDF: dialog opened, exported path vs cancelled, errors
4. **Keep messages structured & low-cardinality**; prefer `error!`/`warn!` only on
   real failures to avoid log noise.

## Approach (renderer — optional, smaller scope)

- Add a thin `logger` util wrapping `console` (gated by dev) and optionally
  forwarding errors to the backend log via a small `log_event` Tauri command.
- Wrap `api.ts` invoke failures to log before surfacing to the UI.

## Affected files

- `src-tauri/Cargo.toml` (dependency)
- `src-tauri/src/lib.rs` (logger init)
- `src-tauri/src/db.rs`, `migrations.rs`, `commands/settings*` , `commands/printing.rs`
  (instrumentation)
- Optional: `src/renderer/src/lib/api.ts` + a small logger util

## Verification

```bash
cd src-tauri
cargo build
cargo test
```

Manual: run `bun run dev`, trigger a failing import (bad file) and a successful
backup; confirm log entries appear in stdout and the app log directory; confirm
**no PII** is logged.

## Risks / notes

- **Privacy:** this is medical-adjacent data. Log identifiers and counts only —
  never patient names, phone numbers, addresses, or section/medicine free-text.
- Keep logging additive and non-blocking; never let a logging failure break a
  command.
- Lowest priority of the seven plans; safe to defer.
