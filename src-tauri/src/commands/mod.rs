pub mod dashboard;
pub mod patients;
pub mod prescriptions;
pub mod presets;
pub mod printing;
pub mod settings;

/// Trim an optional string, mapping empty results to None.
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
