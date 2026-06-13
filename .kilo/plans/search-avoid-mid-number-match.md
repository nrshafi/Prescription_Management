# Plan: Avoid matching the middle of numbers in search

## Problem

The patient and prescription list search uses `phone LIKE '%term%'`, so a short numeric
search such as patient ID `19` matches the middle of unrelated numbers — e.g. the phone
number `01912345678` contains `19`, so that patient is wrongly returned.

The offending clauses are identical in two places:

- `src-tauri/src/commands/patients.rs:230-241` (`patients_list`)
- `src-tauri/src/commands/prescriptions.rs:415-426` (`prescriptions_list`)

Current clause (patients.rs):

```rust
let term = format!("%{search}%");
filters.push(
    "(patients.patient_code LIKE ? OR patients.name LIKE ? OR patients.phone LIKE ? OR CAST(patients.patient_id AS TEXT) = ? OR EXISTS (...))"
);
bind_values.push(Value::Text(term.clone())); // patient_code
bind_values.push(Value::Text(term.clone())); // name
bind_values.push(Value::Text(term));         // phone
bind_values.push(Value::Text(search.clone())); // patient_id exact
bind_values.push(Value::Text(search.clone())); // prescription_id exact
```

## Chosen approach (confirmed with user)

Keep substring matching, but **only allow the `phone` field to substring-match when the
search term is "numeric-heavy" and at least 4 digits long.** Short numeric terms like `19`
will no longer match phone numbers, while still matching `patient_code`, `name`,
`patient_id`, and `prescription_id` as before.

Decisions:
- **Min length for phone substring match: 4 digits.**
- Other fields (`patient_code`, `name`, exact `patient_id` / `prescription_id`) are
  unchanged — they are already either exact matches or text fields where mid-string
  matching is desired.

### Definition of "should search phone"

A search term is allowed to substring-match `phone` when, after trimming, the term contains
at least 4 digit characters. This covers:
- Pure numeric fragments: `1912` (4 digits) → allowed; `19` → not allowed.
- Formatted phone fragments the user might paste, e.g. `017-1234` (still ≥ 4 digits).

Non-numeric searches (e.g. a name like `Rahim`) have 0 digits, so the phone clause is
simply omitted for them — which is correct, since names don't live in the phone column.

## Implementation

### 1. Add a shared helper in `src-tauri/src/commands/mod.rs`

Add a small helper used by both list commands so the rule lives in one place:

```rust
/// Whether a search term is specific enough to substring-match the phone column.
/// Requires at least 4 digit characters to avoid matching the middle of unrelated
/// numbers (e.g. searching "19" should not hit phone "01912345678").
pub(crate) fn phone_search_enabled(search: &str) -> bool {
    search.chars().filter(|c| c.is_ascii_digit()).count() >= 4
}
```

### 2. Update `patients_list` (`src-tauri/src/commands/patients.rs:230-241`)

Build the search clause conditionally so the `phone LIKE ?` branch is only included when
`phone_search_enabled(&search)` is true:

```rust
if !search.is_empty() {
    let term = format!("%{search}%");
    let mut or_clauses = vec![
        "patients.patient_code LIKE ?".to_string(),
        "patients.name LIKE ?".to_string(),
    ];
    bind_values.push(Value::Text(term.clone())); // patient_code
    bind_values.push(Value::Text(term.clone())); // name

    if super::phone_search_enabled(&search) {
        or_clauses.push("patients.phone LIKE ?".to_string());
        bind_values.push(Value::Text(term.clone())); // phone
    }

    or_clauses.push("CAST(patients.patient_id AS TEXT) = ?".to_string());
    or_clauses.push(
        "EXISTS (SELECT 1 FROM prescriptions p WHERE p.patient_id = patients.patient_id AND CAST(p.prescription_id AS TEXT) = ?)".to_string(),
    );
    bind_values.push(Value::Text(search.clone())); // patient_id exact
    bind_values.push(Value::Text(search.clone())); // prescription_id exact

    filters.push(format!("({})", or_clauses.join(" OR ")));
}
```

Note: binding order must continue to match the `?` order in the assembled clause. Because
the clause is now built from the same `or_clauses` vec in the same order the binds are
pushed, this stays consistent.

### 3. Update `prescriptions_list` (`src-tauri/src/commands/prescriptions.rs:415-426`)

Apply the same conditional construction. The only difference from patients is the final
prescription-id branch references `prescriptions.prescription_id` directly:

```rust
if !search.is_empty() {
    let term = format!("%{search}%");
    let mut or_clauses = vec![
        "patients.patient_code LIKE ?".to_string(),
        "patients.name LIKE ?".to_string(),
    ];
    bind_values.push(Value::Text(term.clone())); // patient_code
    bind_values.push(Value::Text(term.clone())); // name

    if super::phone_search_enabled(&search) {
        or_clauses.push("patients.phone LIKE ?".to_string());
        bind_values.push(Value::Text(term.clone())); // phone
    }

    or_clauses.push("CAST(patients.patient_id AS TEXT) = ?".to_string());
    or_clauses.push("CAST(prescriptions.prescription_id AS TEXT) = ?".to_string());
    bind_values.push(Value::Text(search.clone())); // patient_id exact
    bind_values.push(Value::Text(search.clone())); // prescription_id exact

    filters.push(format!("({})", or_clauses.join(" OR ")));
}
```

Important: in `prescriptions_list`, `bind_values` is pre-seeded with the two
`SECTION_CONTENT_SUBQUERY` SELECT-list parameters (prescriptions.rs:409-412). The search
binds are appended after those, exactly as today, so ordering remains correct.

## Why this fixes the example

Searching `19`:
- `19` has 2 digits → `phone_search_enabled` is false → no `phone LIKE '%19%'` clause.
- Still matches `patient_code LIKE '%19%'`, `name LIKE '%19%'`, exact `patient_id = 19`,
  and exact `prescription_id = 19`.
- The patient whose phone is `01912345678` is no longer returned (unless they actually
  match one of the other fields).

Searching `1912` (4 digits) still substring-matches phone, preserving useful phone lookup.

## Edge cases / notes

- `patient_code` substring matching is preserved. Codes look like `PAT-000019`; a search of
  `19` still matches via `patient_code LIKE '%19%'` (acceptable — it's the code field, and
  the user is explicitly searching codes). If desired later, this could be tightened to a
  suffix match, but it is out of scope for this fix.
- Pure exact-match on `patient_id` / `prescription_id` is unchanged, so `19` still finds the
  patient/prescription with that exact ID.
- No DB migration or schema change required.
- No frontend/shared TypeScript changes required; `PatientQuery.search` /
  `PrescriptionQuery.search` semantics are unchanged.

## Verification

1. `cd src-tauri; cargo build` (and `cargo clippy`) to confirm it compiles.
2. Manual check in the app:
   - Create a patient with phone `01912345678` and a different patient with ID/code/name
     not containing `19`.
   - Search `19` → the phone-only patient should NOT appear.
   - Search `1912` → the phone patient SHOULD appear.
   - Search the patient's exact ID → still appears.
3. (Optional) Add a Rust unit test for `phone_search_enabled`:
   - `"19"` → false, `"1912"` → true, `"017-1234"` → true, `"Rahim"` → false, `""` → false.

## Files to change

- `src-tauri/src/commands/mod.rs` — add `phone_search_enabled` helper.
- `src-tauri/src/commands/patients.rs` — conditional phone clause in `patients_list`.
- `src-tauri/src/commands/prescriptions.rs` — conditional phone clause in `prescriptions_list`.
