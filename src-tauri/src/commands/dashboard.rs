use serde::Serialize;
use tauri::State;

use super::patients::{patient_list_item_from_row, PatientListItem, LAST_COMPLAINT_SQL, LAST_DIAGNOSIS_SQL};
use crate::db::Db;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DashboardStats {
    pub total_patients: i64,
    pub total_prescriptions: i64,
    pub todays_prescriptions: i64,
    pub recent_patients: Vec<PatientListItem>,
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
            "SELECT COUNT(*) FROM prescriptions WHERE date(created_at) = date('now', 'localtime')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let sql = format!(
        "SELECT patients.patient_id, patients.patient_code, patients.name, patients.age, patients.gender, patients.phone, patients.address, patients.created_at, patients.updated_at, {LAST_DIAGNOSIS_SQL}, {LAST_COMPLAINT_SQL}, (SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = patients.patient_id) FROM patients ORDER BY patients.created_at DESC, patients.patient_id DESC LIMIT ?"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let recent_patients = stmt
        .query_map([6_i64], patient_list_item_from_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    Ok(DashboardStats {
        total_patients,
        total_prescriptions,
        todays_prescriptions,
        recent_patients,
    })
}
