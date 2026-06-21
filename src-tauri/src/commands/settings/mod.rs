use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Db;

pub(crate) mod backup;
pub(crate) mod json_io;

#[derive(Debug, Serialize, Deserialize)]
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

#[derive(Debug, Serialize, Deserialize)]
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
