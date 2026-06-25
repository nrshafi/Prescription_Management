use serde::Deserialize;

const MAX_MESSAGE_LEN: usize = 500;
const MAX_CONTEXT_LEN: usize = 200;
const ALLOWED_LEVELS: [&str; 4] = ["info", "warn", "error", "debug"];

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub level: String,
    pub message: String,
    #[serde(default)]
    pub context: Option<serde_json::Value>,
}

/// Renderer-side logging sink. The renderer (webview) cannot reach the `log`
/// crate directly, so it forwards structured log events through this command
/// to be emitted by the same `tauri-plugin-log` setup that handles the backend.
///
/// The command is intentionally permissive: any input is accepted but truncated
/// to a safe size, and invalid levels are dropped silently with a single warn
/// line. Logging must never break the caller, so this command returns `Ok`
/// unconditionally and never panics.
#[tauri::command]
pub fn log_event(event: LogEvent) -> Result<(), String> {
    let level = event.level.to_ascii_lowercase();
    if !ALLOWED_LEVELS.contains(&level.as_str()) {
        log::warn!("renderer: dropped log_event with invalid level");
        return Ok(());
    }

    let mut message = event.message;
    if message.chars().count() > MAX_MESSAGE_LEN {
        let mut truncated: String = message.chars().take(MAX_MESSAGE_LEN).collect();
        truncated.push('…');
        message = truncated;
    }

    if let Some(ctx) = event.context {
        if let Ok(rendered) = serde_json::to_string(&ctx) {
            let total = rendered.chars().count();
            let mut compact: String = rendered.chars().take(MAX_CONTEXT_LEN).collect();
            if total > MAX_CONTEXT_LEN {
                compact.push('…');
            }
            message.push_str(&format!(" ctx={compact}"));
        }
    }

    let prefixed = format!("renderer: {message}");

    match level.as_str() {
        "info" => log::info!("{}", prefixed),
        "warn" => log::warn!("{}", prefixed),
        "error" => log::error!("{}", prefixed),
        _ => log::debug!("{}", prefixed),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{log_event, LogEvent, ALLOWED_LEVELS, MAX_CONTEXT_LEN, MAX_MESSAGE_LEN};

    #[test]
    fn allowed_levels_constant() {
        assert_eq!(ALLOWED_LEVELS.len(), 4);
        assert!(ALLOWED_LEVELS.contains(&"info"));
        assert!(ALLOWED_LEVELS.contains(&"warn"));
        assert!(ALLOWED_LEVELS.contains(&"error"));
        assert!(ALLOWED_LEVELS.contains(&"debug"));
    }

    #[test]
    fn caps_constant_sizes() {
        assert!(MAX_MESSAGE_LEN > 0);
        assert!(MAX_CONTEXT_LEN > 0);
        assert!(MAX_CONTEXT_LEN < MAX_MESSAGE_LEN);
    }

    #[test]
    fn valid_level_returns_ok() {
        let event = LogEvent {
            level: "info".to_string(),
            message: "hello".to_string(),
            context: None,
        };
        assert!(log_event(event).is_ok());
    }

    #[test]
    fn invalid_level_is_silently_dropped() {
        let event = LogEvent {
            level: "fatal".to_string(),
            message: "should be dropped".to_string(),
            context: None,
        };
        assert!(log_event(event).is_ok());
    }

    #[test]
    fn oversized_message_is_truncated_without_panic() {
        let event = LogEvent {
            level: "warn".to_string(),
            message: "x".repeat(MAX_MESSAGE_LEN * 4),
            context: None,
        };
        assert!(log_event(event).is_ok());
    }

    #[test]
    fn message_containing_format_placeholders_does_not_panic() {
        let event = LogEvent {
            level: "error".to_string(),
            message: "arg must be a {0} string, got {user_input}".to_string(),
            context: None,
        };
        assert!(log_event(event).is_ok());
    }
}
