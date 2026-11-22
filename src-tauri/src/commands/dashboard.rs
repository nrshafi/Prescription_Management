use serde::Serialize;
use tauri::State;

use crate::db::Db;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_patients: i64,
    pub total_prescriptions: i64,
    pub todays_prescriptions: i64,
}

#[tauri::command]
pub fn dashboard_stats(state: State<'_, Db>) -> Result<DashboardStats, String> {
    let conn = state.conn()?;

    let total_patients: i64 = conn
        .query_row("SELECT COUNT(*) FROM patients", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let total_prescriptions: i64 = conn
        .query_row("SELECT COUNT(*) FROM prescriptions", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;
    let todays_prescriptions: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM prescriptions WHERE date(created_at, 'localtime') = date('now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_patients,
        total_prescriptions,
        todays_prescriptions,
    })
}
