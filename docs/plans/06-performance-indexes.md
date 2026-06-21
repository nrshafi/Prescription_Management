# Plan 06 — Performance: Index `prescription_sections` for Last-Complaint/Diagnosis Lookups

**Severity:** Low (Performance) · **Source:** `docs/codebase/CONCERNS.md` §4

## Concern

The patient list runs correlated subqueries to fetch each patient's most recent
Chief Complaint and Provisional Diagnosis. These do a per-row scan of
`prescription_sections` filtered by `section_type` and ordered by `position`,
which slows down as prescription history grows.

## Evidence

- `src-tauri/src/commands/patients.rs:10` — `LAST_COMPLAINT_SQL`
- `src-tauri/src/commands/patients.rs:22` — `LAST_DIAGNOSIS_SQL`
- `patients.rs:306` — patient list `SELECT` embeds both subqueries per row
- `patients.rs:323` — visit list uses similar per-prescription section subqueries
- Subqueries filter on `ps.section_type` and `ps.prescription_id`, order by
  `ps.position`. Today `prescription_sections` has no covering index for this
  access pattern (see schema in `migrations.rs:48-55`).

## Approach

Add a composite index that matches the subquery access pattern. Because
migrations are **append-only**, add a **new migration entry** — never edit or
reorder existing ones.

Proposed index:

```sql
CREATE INDEX IF NOT EXISTS prescription_sections_lookup_idx
  ON prescription_sections (prescription_id, section_type, position);
```

This supports: filter by `prescription_id` + `section_type`, ordered by
`position` (the `LIMIT 1` "latest section" pattern).

## Tasks

1. **Append a new migration** to the `MIGRATIONS` array in
   `src-tauri/src/migrations.rs` (becomes index 4 → `user_version` 5). Do **not**
   modify migrations 1-4.
   ```rust
   r#"
   CREATE INDEX IF NOT EXISTS prescription_sections_lookup_idx
     ON prescription_sections (prescription_id, section_type, position);
   "#,
   ```
   Update the array length type annotation (`[&str; 4]` → `[&str; 5]`).
2. **Add an idempotent ensure-helper (optional)** mirroring
   `ensure_preset_links_table`, e.g. `ensure_prescription_sections_index`, called
   from `init_database` — this covers imported backups whose `user_version` was
   already bumped past the new migration. Use `CREATE INDEX IF NOT EXISTS` so it
   is safe to run repeatedly.
3. **Add a migration test** confirming the index exists after `run_migrations`:
   ```sql
   SELECT COUNT(*) FROM sqlite_master
     WHERE type='index' AND name='prescription_sections_lookup_idx';
   ```
4. **(Optional) Verify the planner uses it** with `EXPLAIN QUERY PLAN` on the
   subquery during local testing.

## Affected files

- `src-tauri/src/migrations.rs` (new migration entry; optional ensure-helper + test)
- `src-tauri/src/db.rs` (only if adding the ensure-helper call in `init_database`)

## Verification

```bash
cd src-tauri
cargo test
cargo build
```

Manual: open the patient list in `bun run dev` with several patients/visits;
confirm correct last complaint/diagnosis still display.

## Risks / notes

- **Append-only migrations:** never edit existing entries; only add at the end and
  bump the array size. (`README.md`, `CONCERNS.md` §5)
- Index adds negligible write overhead for a single-doctor dataset; the read win
  grows with history size.
- If the optional ensure-helper is added, keep it `CREATE INDEX IF NOT EXISTS` so
  it never conflicts with the migration that may have already created it.
