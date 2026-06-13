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

/// Whether a search term is specific enough to substring-match the phone column.
/// Requires at least 4 digit characters to avoid matching the middle of unrelated
/// numbers (e.g. searching "19" should not hit phone "01912345678").
pub(crate) fn phone_search_enabled(search: &str) -> bool {
    search.chars().filter(|c| c.is_ascii_digit()).count() >= 4
}

#[cfg(test)]
mod tests {
    use super::phone_search_enabled;

    #[test]
    fn phone_search_enabled_requires_four_digits() {
        assert!(!phone_search_enabled("19"));
        assert!(phone_search_enabled("1912"));
        assert!(phone_search_enabled("017-1234"));
        assert!(!phone_search_enabled("Rahim"));
        assert!(!phone_search_enabled(""));
    }
}
