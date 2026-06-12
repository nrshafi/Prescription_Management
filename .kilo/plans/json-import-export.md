# JSON Import / Export (alongside SQLite backup)

## Goal

Add JSON-based **Export JSON** and **Import JSON** to the Settings → Backup card, sitting next to the
existing SQLite **Export Backup** / **Import Backup** buttons. When the user clicks **Import JSON**, show a
modal containing a properly-formatted JSON example so the user knows the exact data structure. Validate the
imported JSON against the expected schema in the Rust backend before touching the database, and surface clear
errors when the JSON is invalid or malformed.

## Decisions (from user)

- **Export scope**: Full database — doctor profile, paper settings, patients, prescriptions (sections +
  medicines), presets (with links). Produces a portable JSON file.
- **Import mode**: **Merge / append** (not replace).
- **Merge dedupe**: Smart dedupe.
  - Patients: match an existing patient by `patient_code` first; if no code match, match by `name` +
    `phone`. If matched, reuse that patient and append their prescriptions. If no match, insert a new
    patient with a freshly generated `patient_code` (never reuse the JSON's code/id when it collides).
  - Presets: skip if a preset with the same `category` + `title` already exists; otherwise insert.
  - Prescriptions: always inserted under the resolved patient, with `visit_no` continuing from that
    patient's current max (reuse `create_prescription_internal` semantics).
- **Settings on import**: **Never** apply doctor profile or paper settings during JSON import. They are
  still included in the export file (full snapshot) but ignored on import. Only patients / prescriptions /
  presets are merged.
- **Example UI**: shadcn **Dialog** (modal) showing the schema example + a "Choose File…" action.

## Background (current state)

- Backend command file: `src-tauri/src/commands/settings.rs` already has `settings_export_backup` /
  `settings_import_backup` (SQLite `.db` via `rusqlite::backup`), plus `BackupActionResult`,
  `is_sqlite_database`, snapshot/rollback helpers.
- Commands registered in `src-tauri/src/lib.rs` (`generate_handler!`).
- API surface: `src/renderer/src/lib/api.ts` → `api.settings.exportBackup/importBackup`.
- Shared TS types: `src/shared/settings.ts` (`BackupActionResult`).
- UI: `src/renderer/src/pages/Settings.tsx` Backup card (lines ~270–286).
- DB schema (relevant tables) in `src-tauri/src/migrations.rs`:
  `doctor_profile`, `paper_settings`, `patients`, `prescriptions`, `prescription_sections`,
  `prescription_medicines`, `presets`, `preset_links`.
- `serde_json` is already a dependency in `src-tauri/Cargo.toml`.
- Patient codes generated as `PAT-{:06}` from `MAX(SUBSTR(patient_code, 5))` (`patients.rs` ~line 361).
- `tauri-plugin-dialog` already permitted in `src-tauri/capabilities/default.json` (`dialog:default`).
  Saving/reading a plain text JSON file goes through Rust `std::fs`, so no new capability is required
  (the dialog only picks a path, same pattern as the existing backup commands).
- A shadcn `Dialog` component already exists at `src/renderer/src/components/ui/dialog.tsx`.

## JSON file format (export shape / import schema)

Top-level object, camelCase to match the existing serde `rename_all = "camelCase"` convention:

```json
{
  "formatVersion": 1,
  "exportedAt": "2026-06-12T15:00:00.000Z",
  "doctorProfile": {
    "name": "Dr. Jane Doe",
    "degrees": "MBBS, FCPS",
    "speciality": "Cardiology",
    "phone": "0123456789",
    "email": "jane@example.com",
    "address": "123 Clinic Road",
    "chamber": "City Hospital, Room 4",
    "logoPath": "",
    "signaturePath": ""
  },
  "paperSettings": {
    "widthMm": 210,
    "heightMm": 297,
    "marginTop": 10,
    "marginBottom": 10,
    "marginLeft": 10,
    "marginRight": 10
  },
  "patients": [
    {
      "patientCode": "PAT-000001",
      "name": "John Smith",
      "age": "42",
      "gender": "Male",
      "phone": "0987654321",
      "address": "45 Main Street",
      "prescriptions": [
        {
          "visitNo": 1,
          "createdAt": "2026-01-10 09:30:00",
          "sections": [
            { "sectionType": "Chief Complaint", "content": "Chest pain", "position": 0 },
            { "sectionType": "Provisional Diagnosis", "content": "Angina", "position": 3 }
          ],
          "medicines": [
            {
              "medicineName": "Aspirin",
              "dosage": "75mg",
              "frequency": "1+0+0",
              "duration": "30 days",
              "notes": "After meal",
              "position": 0
            }
          ]
        }
      ]
    }
  ],
  "presets": [
    {
      "category": "Medicine",
      "title": "Aspirin 75mg",
      "content": "Aspirin 75mg",
      "links": []
    }
  ]
}
```

Schema / validation rules (enforced in Rust before any DB write):

- `formatVersion` must be present and equal to `JSON_FORMAT_VERSION` (see constant below); reject others
  with a clear message.
- `exportedAt` is **informational and ignored** on import (no format validation). It is written on export
  as an RFC3339/ISO timestamp for human reference only.
- `doctorProfile`, `paperSettings` optional (ignored on import, but tolerated if present).
- `patients` and `presets` optional arrays; default to empty if absent.
- Each patient: `name` required, non-empty (trimmed). `gender`, when present, must be one of
  `patients::GENDERS`. Length caps mirror the patient form rules.
- Each prescription section: `sectionType` must be in
  `prescriptions::PRESCRIPTION_SECTION_TYPES`; `content` ≤ 4000 chars.
- Each medicine: field length caps mirror `normalize_prescription`
  (name ≤ 160, dosage/frequency/duration ≤ 120, notes ≤ 300).
- Each preset: `category` in `presets::PRESET_CATEGORIES`, `title` non-empty ≤ 160, `content` ≤ 4000;
  links validated against `PRESET_LINK_KINDS` (reuse preset normalization rules).
- **Duplicate `patientCode` within the same file**: collect all non-empty `patientCode` values into a
  `HashSet<String>` during validation; if a code appears twice, abort with a message naming the duplicate.
  (Patients without a `patientCode` are allowed and matched by name+phone instead.)
- On any validation failure, abort the whole import (no partial writes) and return a descriptive message.

### Field normalization for matching

Before name+phone matching, normalize consistently so `""`, `null`, and `"  "` collapse to the same value:
- `name` → `trim()`
- `phone` → `trim()`, then treat empty as `None` (reuse `opt_trim` from `commands/mod.rs`)
This avoids `John Smith + ""` vs `John Smith + null` vs `John Smith + " "` being treated as different
patients.

### Schema version constant

Define one source of truth in `settings.rs`:
```rust
pub const JSON_FORMAT_VERSION: u32 = 1;
```
Use it both when writing the export (`format_version: JSON_FORMAT_VERSION`) and when validating the import
(`if export.format_version != JSON_FORMAT_VERSION { ... }`). Mirror the value in `src/shared/settings.ts`
(e.g. `export const JSON_FORMAT_VERSION = 1`) so the example/docs stay in sync.

## Backend changes — `src-tauri/src/commands/settings.rs`

Add a new module-level section for JSON import/export. Keep the existing SQLite commands untouched.

1. **New serde types** (Deserialize for import, Serialize for export). To avoid duplication, define a
   shared set of `#[derive(Serialize, Deserialize)]` structs:
   - `JsonExport { format_version: u32, exported_at: String, doctor_profile, paper_settings, patients: Vec<JsonPatient>, presets: Vec<JsonPreset> }`
   - `JsonPatient { patient_code, name, age, gender, phone, address, prescriptions: Vec<JsonPrescription> }`
   - `JsonPrescription { visit_no, created_at, sections: Vec<JsonSection>, medicines: Vec<JsonMedicine> }`
   - `JsonSection { section_type, content, position }`
   - `JsonMedicine { medicine_name, dosage, frequency, duration, notes, position }`
   - `JsonPreset { category, title, content, links: Vec<JsonPresetLink> }` (+ `JsonPresetLink`)
   - All `#[serde(rename_all = "camelCase")]`; import-side optionals use `#[serde(default)]`.

2. **`build_json_export(conn) -> Result<JsonExport, String>`** (pure read):
   - Reuse `get_doctor_profile` / `get_paper_settings`.
   - Query all patients; for each, query its prescriptions and, per prescription, its sections + medicines
     (reuse the SELECT shapes already in `prescriptions.rs` / `patients.rs`, or add small local queries).
   - Query all presets + their links (reuse the loader pattern in `presets.rs`).

3. **`#[tauri::command] settings_export_json(app, state) -> Result<BackupActionResult, String>`**:
   - Build the export struct, `serde_json::to_string_pretty`.
   - Open a save dialog (filter `JSON` / `["json"]`, default name
     `prescription-export-{timestamp}.json`, default dir = documents) using the same
     `spawn_blocking` + `blocking_save_file` pattern as `settings_export_backup`.
   - Write the JSON string with `fs::write`. Return `BackupActionResult { ok, path }`.

4. **Import validation/normalization helpers** (pure, no DB): functions that take the deserialized JSON and
   produce normalized in-memory structs or an `Err(String)`. To keep coupling low, prefer **dedicated
   service-layer import helpers** over exposing many low-level internals (see step 6) — `settings.rs`
   consumes a small, supported import API rather than several private functions.

5. **`ImportStats` struct** for structured reporting (instead of ad-hoc string building):
   ```rust
   #[derive(Default)]
   struct ImportStats {
       patients_created: usize,
       patients_matched: usize,
       prescriptions_imported: usize,
       presets_created: usize,
       presets_skipped: usize,
   }
   ```
   The final user-facing message is generated from these fields. Makes future UI breakdowns easy and keeps
   counting logic centralized.

6. **`#[tauri::command] settings_import_json(app, state) -> Result<BackupActionResult, String>`**:
   - Open pick-file dialog (filter `["json"]`), `spawn_blocking` + `blocking_pick_file`.
   - `fs::read_to_string`; `serde_json::from_str::<JsonExport>` → on parse error return
     `BackupActionResult { ok: false, message: "The selected file is not valid JSON: …" }`.
     - Note: the whole file is read into memory and parsed at once. Acceptable for single-clinic datasets;
       documented as a known limitation for very large exports (see Edge cases).
   - Validate `format_version == JSON_FORMAT_VERSION`; otherwise `ok: false` with message.
   - Run full validation/normalization of all patients/prescriptions/presets up front, including the
     in-file duplicate `patientCode` check and field normalization for matching. Any failure →
     `ok: false` with the specific message, **no DB writes**.
   - **Patient-code allocation (batch-aware)**: query the next sequence **once** at import start
     (`SELECT COALESCE(MAX(CAST(SUBSTR(patient_code, 5) AS INTEGER)), 0) FROM patients`), keep a mutable
     `next_patient_seq` counter, and increment it in memory for each newly inserted patient. Avoids
     repeated `MAX(...)` scans when many new patients are imported.
   - **Safety snapshot (secondary protection)**: before writing, snapshot the live DB via the existing
     `backup_to` into a `*.pre-json-import-<ts>` file. See the "Atomicity" note below for why this is a
     belt-and-braces extra, not the primary guard.
   - Open a single transaction (`conn.unchecked_transaction()`), then perform the merge, updating
     `ImportStats` as it goes:
     - **Presets**: for each, `SELECT preset_id FROM presets WHERE category=? AND title=?`; if it exists →
       `presets_skipped += 1` (skip entirely, including links — see "Preset dedupe" note); else insert
       preset + links → `presets_created += 1`.
     - **Patients**: resolve existing patient by `patient_code` (when provided), else by normalized
       `name`+`phone`. If found → reuse `patient_id`, `patients_matched += 1`. If not → insert with the
       next allocated `PAT-{:06}` code from `next_patient_seq` (do **not** trust the JSON code on
       collision), `patients_created += 1`.
     - **Prescriptions**: for each prescription under the resolved patient, insert through the import
       helper (compute next `visit_no` from current max for that patient, insert prescription row, then
       sections + medicines), `prescriptions_imported += 1`.
   - Commit. On success: delete snapshot, build the message from `ImportStats`, return
     `BackupActionResult { ok: true, message: Some(...) }`.
   - On any DB error mid-transaction: the transaction rolls back automatically on drop. Return
     `ok: false` with the error. Always clean up the snapshot file (restore from it only as a last-resort
     recovery if the connection itself is left in a bad state).

   **Atomicity note**: the merge runs inside one SQLite transaction, so a mid-import failure rolls back and
   leaves the DB unchanged — this is the **primary** corruption protection (no connection-swap like the
   SQLite `.db` import needs). The snapshot is a **secondary** safety net documented as such; if the
   transaction guarantee is considered sufficient during implementation, the snapshot can be dropped to
   avoid extra I/O and cleanup paths. Decision recorded here so the "why both exist" rationale is explicit.

7. **Reuse via a service-layer import helper** (reduce coupling vs. exposing internals):
   - In `prescriptions.rs`, add `pub(crate) fn import_prescription(conn: &Connection, patient_id: i64,
     input: &PrescriptionFormValues) -> Result<i64, String>` (a thin, supported wrapper that validates +
     inserts one prescription for a known patient and returns the new id). `settings.rs` calls only this,
     not `create_prescription_internal` / `replace_prescription_content` / `normalize_prescription`
     directly.
   - In `presets.rs`, add `pub(crate) fn import_preset(conn: &Connection, input: &PresetFormValues) ->
     Result<i64, String>` (validate + insert preset and links), keeping `normalize_preset` private.
   - This keeps the existing private internals encapsulated and exposes a minimal, intentional import
     surface. Changes are additive; existing behavior is untouched.

## Register commands — `src-tauri/src/lib.rs`

Add to `generate_handler!`:
- `commands::settings::settings_export_json`
- `commands::settings::settings_import_json`

## API surface — `src/renderer/src/lib/api.ts`

Under `settings`:
```ts
exportJson: (): Promise<BackupActionResult> => invoke('settings_export_json'),
importJson: (): Promise<BackupActionResult> => invoke('settings_import_json')
```
(`BackupActionResult` is already imported.)

## Shared types — `src/shared/settings.ts`

- Add an exported `JSON_EXPORT_EXAMPLE` constant (the pretty example string above) for the modal to
  display, so the UI and docs share one source of truth.
- Add `export const JSON_FORMAT_VERSION = 1` mirroring the Rust constant; the example uses it.
- Reuse `BackupActionResult` for results.

## UI — `src/renderer/src/pages/Settings.tsx`

1. Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`,
   `DialogTrigger` from `@/components/ui/dialog`, plus a code/JSON icon (e.g. `FileJson` from lucide-react).
2. Add state `const [jsonHelpOpen, setJsonHelpOpen] = useState(false)`.
3. Add two handlers mirroring the existing backup ones:
   - `exportJson()` → `api.settings.exportJson()`, set status/error.
   - `importJson()` → `api.settings.importJson()`; on `ok` refresh nothing extra is strictly required
     (settings aren't changed), but re-load `api.settings.get()` is harmless; set status from
     `result.message`; on `!ok` show `result.message`. Then close the modal.
4. In the Backup card, add buttons next to the existing ones:
   - `Export JSON` → `exportJson`.
   - `Import JSON` → opens the modal (`setJsonHelpOpen(true)`), it does **not** immediately open the file
     dialog.
5. Modal content:
   - Title: "Import from JSON".
   - Description: explains it merges patients, prescriptions, and presets (settings are not imported), and
     that the file must match the format below.
   - A scrollable `<pre>` block showing `JSON_EXPORT_EXAMPLE` (monospace, muted background, max-height with
     overflow-auto).
   - Footer: `Cancel` (closes modal) and `Choose File…` (calls `importJson()` which triggers the native
     pick dialog; close the modal first or after — close after invoking so errors can surface in the page
     status area).
   - Optionally update the card `CardDescription` to mention JSON alongside SQLite.

## Error handling summary

- Invalid JSON syntax → friendly message via `BackupActionResult.message`.
- Wrong/missing `formatVersion` → message.
- Schema violations (bad gender, unknown section type, over-length, bad preset category, etc.) → specific
  message naming the offending field; nothing written.
- DB error during merge → transaction rollback, snapshot restore fallback, message surfaced.
- All messages render in the existing `error` / `status` paragraphs in `Settings.tsx`.

## Files to change

- `src-tauri/src/commands/settings.rs` — JSON structs, `JSON_FORMAT_VERSION`, `ImportStats`, export/import
  commands, validation (incl. in-file duplicate-code check + match normalization), batch-aware code
  allocation, merge.
- `src-tauri/src/commands/prescriptions.rs` — add `pub(crate) fn import_prescription(...)` service helper.
- `src-tauri/src/commands/presets.rs` — add `pub(crate) fn import_preset(...)` service helper.
- `src-tauri/src/lib.rs` — register two commands.
- `src/renderer/src/lib/api.ts` — `exportJson` / `importJson`.
- `src/shared/settings.ts` — `JSON_EXPORT_EXAMPLE` constant.
- `src/renderer/src/pages/Settings.tsx` — buttons, handlers, import modal.

## Verification (request permission before running)

- `cargo check` in `src-tauri/`
- `bun run typecheck`
- `bun run lint`
- `bun run dev` — manual: export JSON, edit/break a field, import, confirm validation error; import a valid
  file and confirm merge counts and dedupe behavior.

## Edge cases (explicit decisions)

- **Duplicate `patientCode` inside one file** → detected in validation via `HashSet<String>`; abort before
  any write, message names the duplicate code.
- **Empty / null / whitespace phone (and name)** → normalized (`trim`, empty→`None`) before name+phone
  matching so equivalent values match consistently.
- **Preset with same category+title but different content** → **skipped** (counted in `presets_skipped`).
  This is intentional: editing preset content elsewhere will not be overwritten by a re-import. Documented
  so it is a deliberate choice, not a silent surprise. (Revisit later if "update on import" is wanted.)
- **`exportedAt`** → ignored on import; written on export for human reference only.
- **Very large imports** → the file is fully read + parsed in memory (`read_to_string` + `from_str`).
  Acceptable for typical single-doctor clinic databases; noted as a known limitation. Streaming/chunked
  import is out of scope.
- **Batch inserts of new patients** → patient-code sequence allocated once and incremented in memory, not
  re-queried per patient.

## Out of scope

- Replacing the existing SQLite backup commands (kept as-is).
- Importing doctor profile / paper settings (export includes them; import ignores them).
- Schema/format versions other than `JSON_FORMAT_VERSION` (rejected with a message; forward-compat later).
- Updating existing presets/patients on import (dedupe skips/reuses; no in-place overwrite).
- Streaming/chunked parsing for very large files.
