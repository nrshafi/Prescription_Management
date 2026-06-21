# Plan 05 — Cleanup: Dependency Classification & Legacy Schema-Repair Sunset

**Severity:** Low · **Source:** `docs/codebase/CONCERNS.md` §2, §1 (item 4), §6

This file groups two independent low-risk cleanups.

---

## Part A — Move `react` / `react-dom` to `dependencies`

### Concern

`react` and `react-dom` are listed under `devDependencies`, which misrepresents
dependency intent (they are runtime libraries for the bundled app).

### Evidence

- `package.json:43-44` — `react` and `react-dom` under `devDependencies`
- `package.json:18-34` — `dependencies` block (target location)

### Tasks

1. Remove `"react"` and `"react-dom"` from `devDependencies`.
2. Add them to `dependencies` with the same version ranges
   (`react: ^19.2.1`, `react-dom: ^19.2.1`).
3. Keep `@types/react` / `@types/react-dom` in `devDependencies` (types are
   build-time only).

### Verification

```bash
bun install
bun run typecheck
bun run build:renderer
```

### Notes

- Harmless to the build either way (Vite bundles regardless of section); this is
  a correctness/clarity fix.

---

## Part B — Sunset legacy schema-repair (`ensure_prescriptions_no_templates_fk`)

### Concern

A startup repair path rebuilds the `prescriptions` table when an old DB still
references a dropped `templates` table (Electron-era schema). The owner has
**approved sunsetting** this; it adds startup work and complexity for a migration
that has run for existing users.

### Evidence

- `src-tauri/src/db.rs:86` — call site inside `init_database`
- `src-tauri/src/migrations.rs:137-169` — `ensure_prescriptions_no_templates_fk`
- `src-tauri/src/migrations.rs:209-279` — its two `#[cfg(test)]` tests
- Migration 4 (`migrations.rs:95-109`) already rebuilds `prescriptions` without
  the `templates` FK for any DB upgrading through the migration list, so the
  runtime repair is redundant for migrated DBs.

### Tasks

1. **Remove the call** at `db.rs:86`:
   `migrations::ensure_prescriptions_no_templates_fk(&conn)?;`
2. **Remove the function** `ensure_prescriptions_no_templates_fk` from
   `migrations.rs` (lines ~137-169).
3. **Remove its tests**:
   `ensure_prescriptions_no_templates_fk_repairs_dangling_reference` and
   `ensure_prescriptions_no_templates_fk_noop_on_clean_schema`.
4. **Do NOT touch** the migration array (`MIGRATIONS`) or reorder anything —
   migrations are append-only (`README.md`).
5. Leave `ensure_singleton_rows` and `ensure_preset_links_table` intact.

### Verification

```bash
cd src-tauri
cargo test
cargo build
```

Smoke test in `bun run dev`: app launches, create a patient + prescription
(write path that previously triggered the dangling-FK error) succeeds.

### Risks / notes

- **Confirm there are no un-migrated DBs in the wild** before removal. The owner
  approved sunset; migration 4 covers DBs that pass through the normal migration
  path. If any legacy DB skipped migrations (e.g. an imported backup that bumped
  `user_version`), it would no longer be auto-repaired — acceptable per the
  owner's decision, but note it in the changelog/commit message.
- Keep this as its own commit, separate from Part A, for a clean history.
