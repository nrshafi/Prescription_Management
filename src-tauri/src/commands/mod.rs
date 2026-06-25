pub mod dashboard;
pub mod logging;
pub mod patients;
pub mod prescriptions;
pub mod presets;
pub mod printing;
pub mod settings;

/// Trim an optional string, mapping empty results to None.
/// Canonical field length limits for the `normalize_*` validators.
///
/// These mirror the Zod `.max(N)` values in `src/shared/*.ts` and are the
/// single source of truth for the Rust side. If you change a limit in
/// `src/shared/*.ts`, update the matching constant here **and** the parity
/// tests in `commands::patients`, `commands::prescriptions`, and
/// `commands::presets`. The parity tests cover both the ASCII and multi-byte
/// (`chars().count()`) semantics to match Zod's `.max()` exactly.

// Patient (`src/shared/patient.ts` -> `patientFormSchema`).
pub(crate) const PATIENT_NAME_MAX: usize = 120;
pub(crate) const PATIENT_AGE_MAX: usize = 30;
pub(crate) const PATIENT_PHONE_MAX: usize = 30;
pub(crate) const PATIENT_ADDRESS_MAX: usize = 300;

// Prescription (`src/shared/prescription.ts` -> `prescriptionSectionInputSchema`,
// `prescriptionMedicineInputSchema`).
pub(crate) const PRESCRIPTION_SECTION_CONTENT_MAX: usize = 4000;
pub(crate) const MEDICINE_NAME_MAX: usize = 160;
pub(crate) const MEDICINE_DOSAGE_MAX: usize = 120;
pub(crate) const MEDICINE_FREQUENCY_MAX: usize = 120;
pub(crate) const MEDICINE_DURATION_MAX: usize = 120;
pub(crate) const MEDICINE_NOTES_MAX: usize = 300;

// Preset (`src/shared/prescription.ts` -> `presetFormSchema`,
// `presetLinkFormSchema`).
pub(crate) const PRESET_TITLE_MAX: usize = 160;
pub(crate) const PRESET_CONTENT_MAX: usize = 4000;
pub(crate) const PRESET_LINK_LABEL_MAX: usize = 160;

pub(crate) fn opt_trim(value: Option<&String>) -> Option<String> {
    value
        .map(|v| v.trim().to_string())
        .filter(|v| !v.is_empty())
}

pub(crate) fn ensure_max_len(value: &str, max: usize, label: &str) -> Result<(), String> {
    if value.chars().count() > max {
        return Err(format!("{label} is too long"));
    }
    Ok(())
}

/// Whether a search term is specific enough to substring-match the phone column.
/// Requires at least 4 digit characters to avoid matching the middle of unrelated
/// numbers (e.g. searching "19" should not hit phone "01912345678").
pub(crate) fn phone_search_enabled(search: &str) -> bool {
    search.chars().filter(|c| c.is_ascii_digit()).count() >= 4
}

/// Builds the shared patient search OR-clause used by both the patient list and
/// the prescription list, pushing the matching bind values (in clause order)
/// onto `bind_values`. `prescription_id_clause` is the SQL fragment that matches
/// an exact prescription id, which differs between callers: the patient list has
/// no `prescriptions` join so it uses an `EXISTS` subquery, while the
/// prescription list joins `prescriptions` and matches the column directly.
///
/// Returns `None` when `search` is empty so callers can skip the clause.
pub(crate) fn patient_search_clause(
    search: &str,
    prescription_id_clause: &str,
    bind_values: &mut Vec<rusqlite::types::Value>,
) -> Option<String> {
    use rusqlite::types::Value;

    if search.is_empty() {
        return None;
    }

    let term = format!("%{search}%");
    let mut or_clauses = vec![
        "patients.patient_code LIKE ?".to_string(),
        "patients.name LIKE ?".to_string(),
    ];
    bind_values.push(Value::Text(term.clone())); // patient_code
    bind_values.push(Value::Text(term.clone())); // name

    if phone_search_enabled(search) {
        or_clauses.push("patients.phone LIKE ?".to_string());
        bind_values.push(Value::Text(term)); // phone
    }

    or_clauses.push("CAST(patients.patient_id AS TEXT) = ?".to_string());
    or_clauses.push(prescription_id_clause.to_string());
    bind_values.push(Value::Text(search.to_string())); // patient_id exact
    bind_values.push(Value::Text(search.to_string())); // prescription_id exact

    Some(format!("({})", or_clauses.join(" OR ")))
}

#[cfg(test)]
mod tests {
    use super::{ensure_max_len, opt_trim, patient_search_clause, phone_search_enabled};
    use rusqlite::types::Value;

    #[test]
    fn phone_search_enabled_requires_four_digits() {
        assert!(!phone_search_enabled("19"));
        assert!(phone_search_enabled("1912"));
        assert!(phone_search_enabled("017-1234"));
        assert!(!phone_search_enabled("Rahim"));
        assert!(!phone_search_enabled(""));
    }

    #[test]
    fn opt_trim_maps_blank_to_none() {
        assert_eq!(opt_trim(Some(&"  hi ".to_string())), Some("hi".to_string()));
        assert_eq!(opt_trim(Some(&"   ".to_string())), None);
        assert_eq!(opt_trim(None), None);
    }

    #[test]
    fn ensure_max_len_counts_chars_not_bytes() {
        // "é" is 2 bytes but 1 char; a 3-char limit must accept "ééé".
        assert!(ensure_max_len("ééé", 3, "Field").is_ok());
        assert!(ensure_max_len("éééé", 3, "Field").is_err());
    }

    #[test]
    fn patient_search_clause_empty_search_is_none() {
        let mut binds = Vec::new();
        assert!(patient_search_clause("", "x = ?", &mut binds).is_none());
        assert!(binds.is_empty());
    }

    #[test]
    fn patient_search_clause_text_search_skips_phone() {
        let mut binds = Vec::new();
        let clause = patient_search_clause("Rahim", "pid = ?", &mut binds).unwrap();
        // No phone clause for a non-numeric term: code, name, patient_id, prescription_id.
        assert!(!clause.contains("patients.phone"));
        assert!(clause.contains("pid = ?"));
        assert_eq!(binds.len(), 4);
        assert_eq!(binds[0], Value::Text("%Rahim%".to_string()));
        assert_eq!(binds[2], Value::Text("Rahim".to_string()));
    }

    #[test]
    fn patient_search_clause_numeric_search_includes_phone() {
        let mut binds = Vec::new();
        let clause = patient_search_clause("01912", "pid = ?", &mut binds).unwrap();
        assert!(clause.contains("patients.phone LIKE ?"));
        // code, name, phone, patient_id, prescription_id.
        assert_eq!(binds.len(), 5);
    }
}
