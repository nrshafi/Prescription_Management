use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use rusqlite::backup::Backup;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::db::{self, Db};
use crate::migrations;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DoctorProfileRecord {
    pub id: i64,
    pub name: Option<String>,
    pub degrees: Option<String>,
    pub speciality: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub chamber: Option<String>,
    pub logo_path: Option<String>,
    pub signature_path: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PaperSettingsRecord {
    pub id: i64,
    pub width_mm: f64,
    pub height_mm: f64,
    pub margin_top: f64,
    pub margin_bottom: f64,
    pub margin_left: f64,
    pub margin_right: f64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SettingsPayload {
    pub doctor_profile: DoctorProfileRecord,
    pub paper_settings: PaperSettingsRecord,
}

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
    fn cancelled() -> Self {
        Self {
            ok: false,
            path: None,
            message: None,
        }
    }
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct DoctorProfileFormValues {
    pub name: Option<String>,
    pub degrees: Option<String>,
    pub speciality: Option<String>,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
    pub chamber: Option<String>,
    pub logo_path: Option<String>,
    pub signature_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaperSettingsFormValues {
    pub width_mm: f64,
    pub height_mm: f64,
    pub margin_top: f64,
    pub margin_bottom: f64,
    pub margin_left: f64,
    pub margin_right: f64,
}

pub(crate) fn get_doctor_profile(conn: &Connection) -> Result<DoctorProfileRecord, String> {
    let row = conn
        .query_row(
            "SELECT doctor_id, name, degrees, speciality, phone, email, address, chamber, logo_path, signature_path FROM doctor_profile WHERE doctor_id = 1",
            [],
            |row| {
                Ok(DoctorProfileRecord {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    degrees: row.get(2)?,
                    speciality: row.get(3)?,
                    phone: row.get(4)?,
                    email: row.get(5)?,
                    address: row.get(6)?,
                    chamber: row.get(7)?,
                    logo_path: row.get(8)?,
                    signature_path: row.get(9)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(row.unwrap_or(DoctorProfileRecord {
        id: 1,
        name: None,
        degrees: None,
        speciality: None,
        phone: None,
        email: None,
        address: None,
        chamber: None,
        logo_path: None,
        signature_path: None,
    }))
}

pub(crate) fn get_paper_settings(conn: &Connection) -> Result<PaperSettingsRecord, String> {
    let row = conn
        .query_row(
            "SELECT paper_setting_id, width_mm, height_mm, margin_top, margin_bottom, margin_left, margin_right FROM paper_settings WHERE paper_setting_id = 1",
            [],
            |row| {
                Ok(PaperSettingsRecord {
                    id: row.get(0)?,
                    width_mm: row.get(1)?,
                    height_mm: row.get(2)?,
                    margin_top: row.get(3)?,
                    margin_bottom: row.get(4)?,
                    margin_left: row.get(5)?,
                    margin_right: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    Ok(row.unwrap_or(PaperSettingsRecord {
        id: 1,
        width_mm: 210.0,
        height_mm: 297.0,
        margin_top: 10.0,
        margin_bottom: 10.0,
        margin_left: 10.0,
        margin_right: 10.0,
    }))
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn backup_to(conn: &Connection, target: &Path) -> Result<(), String> {
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
    Ok(conn)
}

#[tauri::command]
pub fn settings_get(state: State<'_, Db>) -> Result<SettingsPayload, String> {
    let conn = state.conn()?;
    Ok(SettingsPayload {
        doctor_profile: get_doctor_profile(&conn)?,
        paper_settings: get_paper_settings(&conn)?,
    })
}

#[tauri::command]
pub fn settings_update_doctor_profile(
    state: State<'_, Db>,
    input: DoctorProfileFormValues,
) -> Result<DoctorProfileRecord, String> {
    // Mirrors the shared Zod `doctorProfileFormSchema` length limits.
    let checks: [(&Option<String>, usize, &str); 9] = [
        (&input.name, 160, "Name"),
        (&input.degrees, 240, "Degrees"),
        (&input.speciality, 160, "Speciality"),
        (&input.phone, 80, "Phone"),
        (&input.email, 160, "Email"),
        (&input.address, 500, "Address"),
        (&input.chamber, 500, "Chamber"),
        (&input.logo_path, 1000, "Logo path"),
        (&input.signature_path, 1000, "Signature path"),
    ];
    for (value, max, label) in checks {
        if let Some(value) = value {
            super::ensure_max_len(value.trim(), max, label)?;
        }
    }

    let conn = state.conn()?;
    conn.execute(
        "UPDATE doctor_profile SET name = ?, degrees = ?, speciality = ?, phone = ?, email = ?, address = ?, chamber = ?, logo_path = ?, signature_path = ? WHERE doctor_id = 1",
        params![
            super::opt_trim(input.name.as_ref()),
            super::opt_trim(input.degrees.as_ref()),
            super::opt_trim(input.speciality.as_ref()),
            super::opt_trim(input.phone.as_ref()),
            super::opt_trim(input.email.as_ref()),
            super::opt_trim(input.address.as_ref()),
            super::opt_trim(input.chamber.as_ref()),
            super::opt_trim(input.logo_path.as_ref()),
            super::opt_trim(input.signature_path.as_ref())
        ],
    )
    .map_err(|e| e.to_string())?;

    get_doctor_profile(&conn)
}

#[tauri::command]
pub fn settings_update_paper_settings(
    state: State<'_, Db>,
    input: PaperSettingsFormValues,
) -> Result<PaperSettingsRecord, String> {
    // Mirrors the shared Zod `paperSettingsFormSchema` ranges.
    for (value, label) in [(input.width_mm, "Paper width"), (input.height_mm, "Paper height")] {
        if !(value > 0.0 && value <= 1000.0) {
            return Err(format!("{label} must be between 0 and 1000 mm"));
        }
    }
    for (value, label) in [
        (input.margin_top, "Top margin"),
        (input.margin_bottom, "Bottom margin"),
        (input.margin_left, "Left margin"),
        (input.margin_right, "Right margin"),
    ] {
        if !(0.0..=100.0).contains(&value) {
            return Err(format!("{label} must be between 0 and 100 mm"));
        }
    }

    let conn = state.conn()?;
    conn.execute(
        "UPDATE paper_settings SET width_mm = ?, height_mm = ?, margin_top = ?, margin_bottom = ?, margin_left = ?, margin_right = ? WHERE paper_setting_id = 1",
        params![
            input.width_mm,
            input.height_mm,
            input.margin_top,
            input.margin_bottom,
            input.margin_left,
            input.margin_right
        ],
    )
    .map_err(|e| e.to_string())?;

    get_paper_settings(&conn)
}

#[tauri::command]
pub async fn settings_export_backup(
    app: AppHandle,
    state: State<'_, Db>,
) -> Result<BackupActionResult, String> {
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
        return Ok(BackupActionResult::cancelled());
    };
    let target = picked.into_path().map_err(|e| e.to_string())?;

    let conn = state.conn()?;
    backup_to(&conn, &target)?;

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
        return Ok(BackupActionResult::cancelled());
    };
    let source = picked.into_path().map_err(|e| e.to_string())?;

    // Refuse files that are not SQLite databases before touching the live data.
    if !is_sqlite_database(&source) {
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

    // Close the current connection by swapping in a placeholder.
    let placeholder = Connection::open_in_memory().map_err(|e| e.to_string())?;
    drop(std::mem::replace(&mut *guard, placeholder));

    db::remove_wal_artifacts(&db_path);

    let replaced = fs::copy(&source, &db_path)
        .map_err(|e| e.to_string())
        .and_then(|_| reopen_database(&db_path));

    match replaced {
        Ok(conn) => {
            *guard = conn;
            let _ = fs::remove_file(&snapshot_path);
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
            fs::copy(&snapshot_path, &db_path).map_err(|e| {
                format!("Backup import failed and the previous database could not be restored: {e}")
            })?;
            let conn = reopen_database(&db_path)?;
            *guard = conn;
            let _ = fs::remove_file(&snapshot_path);
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
