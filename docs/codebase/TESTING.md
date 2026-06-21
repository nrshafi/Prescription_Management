# Testing Patterns

## Core Sections (Required)

### 1) Test Stack and Commands

- Primary test framework: Rust's built-in test harness (`cargo test`, `#[test]`). No JS/renderer test framework is configured (`AGENTS.md`, `package.json` has no `test` script).
- Assertion/mocking tools: Rust `assert!`/`assert_eq!`; real (in-memory/temp) SQLite via `rusqlite` — no mocking library.

```bash
# Run all (Rust) tests
cd src-tauri && cargo test

# Unit tests only — same command; all current tests are unit-level
cargo test

# Integration / e2e — none configured
# Coverage — none configured
```

### 2) Test Layout

- Placement: inline `#[cfg(test)] mod tests` blocks at the bottom of the source file under test (co-located), not a separate `tests/` dir.
- Files with tests: `src-tauri/src/commands/mod.rs`, `src-tauri/src/migrations.rs`, `src-tauri/src/commands/settings.rs` (22 `#[test]` functions total per `Grep`).
- Naming: descriptive snake_case (`phone_search_enabled_requires_four_digits`, `patient_search_clause_numeric_search_includes_phone`).
- Setup files: none; tests construct their own SQLite connections/fixtures inline.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | Yes (Rust) | Helpers + SQL builders (`opt_trim`, `ensure_max_len`, `phone_search_enabled`, `patient_search_clause`), migrations, settings/JSON import validation | `commands/mod.rs`, `migrations.rs`, `commands/settings.rs` |
| Integration | Partial | DB-level behavior via real SQLite in migration/settings tests | No cross-layer (renderer↔backend) tests |
| E2E | No | — | No user-flow/automation tests found |
| Renderer (TS/React) | No | — | "No automated test suite for the React renderer" (`README.md`, `AGENTS.md`) |

### 4) Mocking and Isolation Strategy

- Main approach: no mocks; tests exercise real `rusqlite::Connection` instances and pure helper functions.
- Isolation: each test builds its own state (fresh connections / explicit inputs); the production global `Db` mutex is not involved in tests.
- Common failure mode: schema drift between hand-written migration SQL and assertions; tests must be updated alongside appended migrations.

### 5) Coverage and Quality Signals

- Coverage tool + threshold: None configured. [TODO]
- Current reported coverage: Unknown. [TODO]
- Known gaps: Entire renderer/UI untested; no integration test crossing the Tauri IPC boundary; no CI to run `cargo test` automatically (no CI configs per scan).

### 6) Evidence

- `src-tauri/src/commands/mod.rs` (test module + helpers)
- `src-tauri/src/migrations.rs`, `src-tauri/src/commands/settings.rs` (test modules)
- `README.md`, `AGENTS.md`, `package.json`
