use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::backup::Backup;
use rusqlite::Connection;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::db::{self, Db};
use crate::migrations;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupActionResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

impl BackupActionResult {
    pub(crate) fn cancelled() -> Self {
        Self {
            ok: false,
            path: None,
            message: None,
        }
    }
}

pub(crate) fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

pub(crate) fn backup_to(conn: &Connection, target: &Path) -> Result<(), String> {
    let mut dest = Connection::open(target).map_err(|e| e.to_string())?;
    let backup = Backup::new(conn, &mut dest).map_err(|e| e.to_string())?;
    backup
        .run_to_completion(64, Duration::from_millis(5), None)
        .map_err(|e| e.to_string())
}

/// Every SQLite database starts with this 16-byte, NUL-terminated magic string.
fn is_sqlite_database(path: &Path) -> bool {
    const HEADER: [u8; 16] = *b"SQLite format 3\0";
    let Ok(mut file) = fs::File::open(path) else {
        return false;
    };
    let mut buf = [0u8; 16];
    match file.read_exact(&mut buf) {
        Ok(()) => buf == HEADER,
        Err(_) => false,
    }
}

fn reopen_database(db_path: &Path) -> Result<Connection, String> {
    let conn = db::open_connection(db_path)?;
    migrations::run_migrations(&conn)?;
    migrations::ensure_singleton_rows(&conn)?;
    migrations::ensure_prescription_sections_index(&conn)?;
    Ok(conn)
}

/// Opens a database that originated from an untrusted import and verifies it is
/// structurally sound before migrations run, so a corrupt-but-openable file
/// cannot replace good data.
fn reopen_imported_database(db_path: &Path) -> Result<Connection, String> {
    let conn = db::open_connection(db_path)?;
    db::check_integrity(&conn)?;
    migrations::run_migrations(&conn)?;
    migrations::ensure_singleton_rows(&conn)?;
    migrations::ensure_prescription_sections_index(&conn)?;
    Ok(conn)
}

#[tauri::command]
pub async fn settings_export_backup(
    app: AppHandle,
    state: State<'_, Db>,
) -> Result<BackupActionResult, String> {
    log::info!("backup export: starting");
    let dialog_app = app.clone();
    let file_name = format!("prescription-backup-{}.db", timestamp_millis());
    let picked = tauri::async_runtime::spawn_blocking(move || {
        let mut builder = dialog_app
            .dialog()
            .file()
            .set_title("Export Backup")
            .set_file_name(file_name)
            .add_filter("SQLite Database", &["db"]);
        if let Ok(documents) = dialog_app.path().document_dir() {
            builder = builder.set_directory(documents);
        }
        builder.blocking_save_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(picked) = picked else {
        log::info!("backup export: cancelled by user");
        return Ok(BackupActionResult::cancelled());
    };
    let target = picked.into_path().map_err(|e| e.to_string())?;

    let conn = state.conn()?;
    if let Err(err) = backup_to(&conn, &target) {
        log::error!("backup export: failed to write backup");
        return Err(err);
    }

    log::info!("backup export: saved to {}", target.display());
    Ok(BackupActionResult {
        ok: true,
        path: Some(target.display().to_string()),
        message: None,
    })
}

#[tauri::command]
pub async fn settings_import_backup(
    app: AppHandle,
    state: State<'_, Db>,
) -> Result<BackupActionResult, String> {
    log::info!("backup import: starting");
    let dialog_app = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .set_title("Import Backup")
            .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(picked) = picked else {
        log::info!("backup import: cancelled by user");
        return Ok(BackupActionResult::cancelled());
    };
    let source = picked.into_path().map_err(|e| e.to_string())?;

    // Refuse files that are not SQLite databases before touching the live data.
    if !is_sqlite_database(&source) {
        log::warn!("backup import: rejected non-SQLite file");
        return Ok(BackupActionResult {
            ok: false,
            path: None,
            message: Some("The selected file is not a valid SQLite database backup.".to_string()),
        });
    }

    let db_path = db::database_path(&app)?;
    let snapshot_path = PathBuf::from(format!(
        "{}.pre-import-{}",
        db_path.display(),
        timestamp_millis()
    ));

    let mut guard = state.conn()?;

    // Snapshot the live database first so a failed import can be rolled back.
    backup_to(&guard, &snapshot_path)?;
    log::info!("backup import: snapshot created");

    // Close the current connection by swapping in a placeholder.
    let placeholder = Connection::open_in_memory().map_err(|e| e.to_string())?;
    drop(std::mem::replace(&mut *guard, placeholder));

    db::remove_wal_artifacts(&db_path);

    // Copy through the SQLite backup API (never a raw byte copy) so a partial
    // or WAL-inconsistent source can't corrupt the live database, then verify
    // integrity before accepting it.
    let replaced = db::copy_database(&source, &db_path)
        .and_then(|_| reopen_imported_database(&db_path));

    match replaced {
        Ok(conn) => {
            *guard = conn;
            let _ = fs::remove_file(&snapshot_path);
            log::info!("backup import: success");
            let name = source
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| source.display().to_string());
            Ok(BackupActionResult {
                ok: true,
                path: Some(name),
                message: None,
            })
        }
        Err(reason) => {
            // Restore the snapshot so the app never ends up without a database.
            db::remove_wal_artifacts(&db_path);
            db::copy_database(&snapshot_path, &db_path).map_err(|e| {
                log::error!("backup import: rollback failed to restore snapshot");
                format!("Backup import failed and the previous database could not be restored: {e}")
            })?;
            let conn = reopen_database(&db_path)?;
            *guard = conn;
            let _ = fs::remove_file(&snapshot_path);
            log::error!("backup import: failed, previous database restored");
            Ok(BackupActionResult {
                ok: false,
                path: None,
                message: Some(format!(
                    "Backup import failed and the previous database was restored. ({reason})"
                )),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn integrity_check_passes_for_fresh_database() {
        let conn = Connection::open_in_memory().unwrap();
        crate::migrations::run_migrations(&conn).unwrap();
        crate::migrations::ensure_singleton_rows(&conn).unwrap();
        assert!(db::check_integrity(&conn).is_ok());
    }
}
