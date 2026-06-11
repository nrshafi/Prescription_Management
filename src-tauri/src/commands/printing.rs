use std::time::{SystemTime, UNIX_EPOCH};

use serde::Serialize;
use tauri::{AppHandle, State, WebviewUrl, WebviewWindowBuilder};

use super::prescriptions::{get_prescription_internal, PrescriptionDetail};
use super::settings::{get_doctor_profile, get_paper_settings, DoctorProfileRecord, PaperSettingsRecord};
use crate::db::Db;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionPrintData {
    pub doctor_profile: DoctorProfileRecord,
    pub paper_settings: PaperSettingsRecord,
    pub prescription: PrescriptionDetail,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrintActionResult {
    pub ok: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fallback_preview: Option<bool>,
}

impl PrintActionResult {
    fn ok() -> Self {
        Self {
            ok: true,
            path: None,
            message: None,
            fallback_preview: None,
        }
    }
}

fn timestamp_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// Opens a dedicated print window on the existing renderer print route
/// (`index.html?printPrescriptionId=...`). With `autoprint`, the renderer
/// triggers the system print dialog itself once content is ready.
fn open_print_window(app: &AppHandle, prescription_id: i64, autoprint: bool) -> Result<(), String> {
    let label = format!("print-{prescription_id}-{}", timestamp_millis());
    let mut path = format!("index.html?printPrescriptionId={prescription_id}");
    if autoprint {
        path.push_str("&autoprint=1");
    }
    WebviewWindowBuilder::new(app, label, WebviewUrl::App(path.into()))
        .title("Print Preview")
        .inner_size(980.0, 1200.0)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn printing_data(
    state: State<'_, Db>,
    prescription_id: i64,
) -> Result<PrescriptionPrintData, String> {
    let conn = state.conn()?;
    let prescription = get_prescription_internal(&conn, prescription_id)?
        .ok_or_else(|| format!("Prescription {prescription_id} not found"))?;
    Ok(PrescriptionPrintData {
        doctor_profile: get_doctor_profile(&conn)?,
        paper_settings: get_paper_settings(&conn)?,
        prescription,
    })
}

#[tauri::command]
pub async fn printing_preview(app: AppHandle, prescription_id: i64) -> Result<PrintActionResult, String> {
    open_print_window(&app, prescription_id, false)?;
    Ok(PrintActionResult::ok())
}

#[tauri::command]
pub async fn printing_print(app: AppHandle, prescription_id: i64) -> Result<PrintActionResult, String> {
    open_print_window(&app, prescription_id, true)?;
    Ok(PrintActionResult::ok())
}

#[tauri::command]
pub async fn printing_pdf(app: AppHandle, prescription_id: i64) -> Result<PrintActionResult, String> {
    // One-click PDF export is a separate milestone. For now the print dialog
    // opens and the user can choose "Save as PDF" as the destination.
    open_print_window(&app, prescription_id, true)?;
    Ok(PrintActionResult {
        ok: true,
        path: None,
        message: Some(
            "Choose 'Save as PDF' as the destination in the print dialog to export a PDF."
                .to_string(),
        ),
        fallback_preview: None,
    })
}
