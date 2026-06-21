use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;

use rusqlite::backup::Backup;
use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::migrations;

/// Managed application database connection.
pub struct Db(pub Mutex<Connection>);

impl Db {
    pub fn conn(&self) -> Result<MutexGuard<'_, Connection>, String> {
        self.0.lock().map_err(|_| "Database lock poisoned".to_string())
    }
}

pub fn database_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Could not resolve app data directory: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create app data directory: {e}"))?;
    Ok(dir.join("prescription.db"))
}

pub fn open_connection(path: &Path) -> Result<Connection, String> {
    let conn = Connection::open(path).map_err(|e| {
        log::error!("db: failed to open connection");
        format!("Could not open database: {e}")
    })?;
    // `journal_mode` returns a row, so it cannot go through execute().
    conn.query_row("PRAGMA journal_mode = WAL", [], |_| Ok(()))
        .map_err(|e| {
            log::error!("db: failed to enable WAL mode");
            format!("Could not enable WAL mode: {e}")
        })?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(|e| {
            log::error!("db: failed to enable foreign keys");
            format!("Could not enable foreign keys: {e}")
        })?;
    Ok(conn)
}

/// Clean copy through the SQLite backup API so WAL state can never be corrupted.
pub fn copy_database(source: &Path, destination: &Path) -> Result<(), String> {
    let src = Connection::open(source).map_err(|e| e.to_string())?;
    let mut dest = Connection::open(destination).map_err(|e| e.to_string())?;
    let backup = Backup::new(&src, &mut dest).map_err(|e| e.to_string())?;
    backup
        .run_to_completion(64, Duration::from_millis(5), None)
        .map_err(|e| e.to_string())
}

/// Verifies a database is structurally sound and free of dangling foreign keys.
/// Used before accepting an imported backup as the live database so a file that
/// merely *looks* like SQLite (valid header) cannot replace good data with a
/// corrupt or inconsistent database.
pub fn check_integrity(conn: &Connection) -> Result<(), String> {
    let result: String = conn
        .query_row("PRAGMA integrity_check", [], |row| row.get(0))
        .map_err(|e| format!("Could not run integrity check: {e}"))?;
    if result != "ok" {
        return Err(format!("Database failed integrity check: {result}"));
    }

    let violations: i64 = conn
        .query_row("SELECT COUNT(*) FROM pragma_foreign_key_check", [], |row| row.get(0))
        .map_err(|e| format!("Could not run foreign key check: {e}"))?;
    if violations > 0 {
        return Err(format!(
            "Database failed foreign key check: {violations} violation(s)"
        ));
    }
    Ok(())
}

pub fn remove_wal_artifacts(db_path: &Path) {
    for suffix in ["-wal", "-shm"] {
        let mut artifact = db_path.as_os_str().to_os_string();
        artifact.push(suffix);
        let _ = fs::remove_file(PathBuf::from(artifact));
    }
}

/// Opens the application database, runs migrations, and ensures singleton rows.
pub fn init_database(app: &AppHandle) -> Result<Connection, String> {
    let db_path = database_path(app)?;
    log::info!("db: opening database");
    let conn = open_connection(&db_path)?;
    migrations::run_migrations(&conn)?;
    migrations::ensure_singleton_rows(&conn)?;
    log::info!("db: ready");
    Ok(conn)
}
