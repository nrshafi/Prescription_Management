use std::collections::HashSet;
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

pub const JSON_FORMAT_VERSION: u32 = 1;

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

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonExport {
    format_version: Option<u32>,
    #[serde(default)]
    exported_at: Option<String>,
    #[serde(default)]
    doctor_profile: Option<JsonDoctorProfile>,
    #[serde(default)]
    paper_settings: Option<JsonPaperSettings>,
    #[serde(default)]
    patients: Vec<JsonPatient>,
    #[serde(default)]
    presets: Vec<JsonPreset>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonDoctorProfile {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    degrees: Option<String>,
    #[serde(default)]
    speciality: Option<String>,
    #[serde(default)]
    phone: Option<String>,
    #[serde(default)]
    email: Option<String>,
    #[serde(default)]
    address: Option<String>,
    #[serde(default)]
    chamber: Option<String>,
    #[serde(default)]
    logo_path: Option<String>,
    #[serde(default)]
    signature_path: Option<String>,
}

impl From<DoctorProfileRecord> for JsonDoctorProfile {
    fn from(value: DoctorProfileRecord) -> Self {
        Self {
            name: value.name,
            degrees: value.degrees,
            speciality: value.speciality,
            phone: value.phone,
            email: value.email,
            address: value.address,
            chamber: value.chamber,
            logo_path: value.logo_path,
            signature_path: value.signature_path,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPaperSettings {
    width_mm: f64,
    height_mm: f64,
    margin_top: f64,
    margin_bottom: f64,
    margin_left: f64,
    margin_right: f64,
}

impl From<PaperSettingsRecord> for JsonPaperSettings {
    fn from(value: PaperSettingsRecord) -> Self {
        Self {
            width_mm: value.width_mm,
            height_mm: value.height_mm,
            margin_top: value.margin_top,
            margin_bottom: value.margin_bottom,
            margin_left: value.margin_left,
            margin_right: value.margin_right,
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPatient {
    #[serde(default)]
    patient_code: Option<String>,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    age: Option<String>,
    #[serde(default)]
    gender: Option<String>,
    #[serde(default)]
    phone: Option<String>,
    #[serde(default)]
    address: Option<String>,
    #[serde(default)]
    prescriptions: Vec<JsonPrescription>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPrescription {
    #[serde(default)]
    visit_no: Option<i64>,
    #[serde(default)]
    created_at: Option<String>,
    #[serde(default)]
    sections: Vec<JsonSection>,
    #[serde(default)]
    medicines: Vec<JsonMedicine>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonSection {
    #[serde(default)]
    section_type: Option<String>,
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    position: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonMedicine {
    #[serde(default)]
    medicine_name: Option<String>,
    #[serde(default)]
    dosage: Option<String>,
    #[serde(default)]
    frequency: Option<String>,
    #[serde(default)]
    duration: Option<String>,
    #[serde(default)]
    notes: Option<String>,
    #[serde(default)]
    position: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPreset {
    #[serde(default)]
    category: Option<String>,
    #[serde(default)]
    title: Option<String>,
    #[serde(default)]
    content: Option<String>,
    #[serde(default)]
    links: Vec<JsonPresetLink>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JsonPresetLink {
    #[serde(default)]
    target_kind: Option<String>,
    #[serde(default)]
    target_preset_id: Option<i64>,
    #[serde(default)]
    label: Option<String>,
    #[serde(default)]
    dosage: Option<String>,
    #[serde(default)]
    frequency: Option<String>,
    #[serde(default)]
    duration: Option<String>,
    #[serde(default)]
    position: Option<i64>,
}

struct ImportPatient {
    patient_code: Option<String>,
    name: String,
    age: Option<String>,
    gender: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    prescriptions: Vec<ImportPrescription>,
}

struct ImportPrescription {
    sections: Vec<super::prescriptions::PrescriptionSectionInput>,
    medicines: Vec<super::prescriptions::PrescriptionMedicineInput>,
}

struct ImportPreset {
    category: String,
    title: String,
    content: Option<String>,
    links: Vec<super::presets::PresetLinkInput>,
}

struct ValidatedJsonImport {
    patients: Vec<ImportPatient>,
    presets: Vec<ImportPreset>,
}

#[derive(Default)]
struct ImportStats {
    patients_created: usize,
    patients_matched: usize,
    prescriptions_imported: usize,
    presets_created: usize,
    presets_skipped: usize,
}

impl ImportStats {
    fn message(&self) -> String {
        format!(
            "JSON import complete: {} patient(s) created, {} patient(s) matched, {} prescription(s) imported, {} preset(s) created, {} preset(s) skipped.",
            self.patients_created,
            self.patients_matched,
            self.prescriptions_imported,
            self.presets_created,
            self.presets_skipped
        )
    }
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

fn build_json_export(conn: &Connection) -> Result<JsonExport, String> {
    let doctor_profile = get_doctor_profile(conn)?;
    let paper_settings = get_paper_settings(conn)?;

    let mut patient_stmt = conn
        .prepare(
            "SELECT patient_id, patient_code, name, age, gender, phone, address FROM patients ORDER BY patient_id",
        )
        .map_err(|e| e.to_string())?;
    let patient_rows = patient_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                JsonPatient {
                    patient_code: row.get(1)?,
                    name: row.get(2)?,
                    age: row.get(3)?,
                    gender: row.get(4)?,
                    phone: row.get(5)?,
                    address: row.get(6)?,
                    prescriptions: Vec::new(),
                },
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut patients = Vec::with_capacity(patient_rows.len());
    for (patient_id, mut patient) in patient_rows {
        let mut prescription_stmt = conn
            .prepare(
                "SELECT prescription_id, visit_no, created_at FROM prescriptions WHERE patient_id = ? ORDER BY visit_no, prescription_id",
            )
            .map_err(|e| e.to_string())?;
        let prescriptions = prescription_stmt
            .query_map([patient_id], |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    JsonPrescription {
                        visit_no: row.get(1)?,
                        created_at: row.get(2)?,
                        sections: Vec::new(),
                        medicines: Vec::new(),
                    },
                ))
            })
            .map_err(|e| e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;

        for (prescription_id, mut prescription) in prescriptions {
            let mut section_stmt = conn
                .prepare(
                    "SELECT section_type, content, position FROM prescription_sections WHERE prescription_id = ? ORDER BY position",
                )
                .map_err(|e| e.to_string())?;
            prescription.sections = section_stmt
                .query_map([prescription_id], |row| {
                    Ok(JsonSection {
                        section_type: Some(row.get(0)?),
                        content: row.get(1)?,
                        position: row.get(2)?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;

            let mut medicine_stmt = conn
                .prepare(
                    "SELECT medicine_name, dosage, frequency, duration, notes, position FROM prescription_medicines WHERE prescription_id = ? ORDER BY position",
                )
                .map_err(|e| e.to_string())?;
            prescription.medicines = medicine_stmt
                .query_map([prescription_id], |row| {
                    Ok(JsonMedicine {
                        medicine_name: row.get(0)?,
                        dosage: row.get(1)?,
                        frequency: row.get(2)?,
                        duration: row.get(3)?,
                        notes: row.get(4)?,
                        position: row.get(5)?,
                    })
                })
                .map_err(|e| e.to_string())?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;

            patient.prescriptions.push(prescription);
        }
        patients.push(patient);
    }

    let mut preset_stmt = conn
        .prepare("SELECT preset_id, category, title, content FROM presets ORDER BY category, title")
        .map_err(|e| e.to_string())?;
    let preset_rows = preset_stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, i64>(0)?,
                JsonPreset {
                    category: Some(row.get(1)?),
                    title: Some(row.get(2)?),
                    content: row.get(3)?,
                    links: Vec::new(),
                },
            ))
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut presets = Vec::with_capacity(preset_rows.len());
    for (preset_id, mut preset) in preset_rows {
        let mut link_stmt = conn
            .prepare(
                "SELECT target_kind, target_preset_id, label, dosage, frequency, duration, position FROM preset_links WHERE owner_preset_id = ? ORDER BY position",
            )
            .map_err(|e| e.to_string())?;
        preset.links = link_stmt
            .query_map([preset_id], |row| {
                Ok(JsonPresetLink {
                    target_kind: Some(row.get(0)?),
                    target_preset_id: row.get(1)?,
                    label: Some(row.get(2)?),
                    dosage: row.get(3)?,
                    frequency: row.get(4)?,
                    duration: row.get(5)?,
                    position: row.get(6)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<rusqlite::Result<Vec<_>>>()
            .map_err(|e| e.to_string())?;
        presets.push(preset);
    }

    Ok(JsonExport {
        format_version: Some(JSON_FORMAT_VERSION),
        exported_at: Some(conn
            .query_row("SELECT strftime('%Y-%m-%dT%H:%M:%fZ', 'now')", [], |row| row.get(0))
            .map_err(|e| e.to_string())?),
        doctor_profile: Some(doctor_profile.into()),
        paper_settings: Some(paper_settings.into()),
        patients,
        presets,
    })
}

fn validate_json_import(export: JsonExport) -> Result<ValidatedJsonImport, String> {
    let Some(format_version) = export.format_version else {
        return Err("Missing JSON formatVersion.".to_string());
    };
    if format_version != JSON_FORMAT_VERSION {
        return Err(format!(
            "Unsupported JSON formatVersion {}. This app supports formatVersion {}.",
            format_version, JSON_FORMAT_VERSION
        ));
    }

    let mut seen_codes = HashSet::new();
    let mut patients = Vec::with_capacity(export.patients.len());
    for (patient_index, patient) in export.patients.into_iter().enumerate() {
        let label = format!("patients[{}]", patient_index);
        let patient_code = super::opt_trim(patient.patient_code.as_ref());
        if let Some(code) = &patient_code {
            if !seen_codes.insert(code.clone()) {
                return Err(format!("Duplicate patientCode in JSON file: {code}"));
            }
        }

        let name = patient.name.unwrap_or_default().trim().to_string();
        if name.is_empty() {
            return Err(format!("{label}.name is required"));
        }
        super::ensure_max_len(&name, 120, &format!("{label}.name"))?;
        let age = super::opt_trim(patient.age.as_ref());
        if let Some(value) = &age {
            super::ensure_max_len(value, 30, &format!("{label}.age"))?;
        }
        let gender = super::opt_trim(patient.gender.as_ref());
        if let Some(value) = &gender {
            if !super::patients::GENDERS.contains(&value.as_str()) {
                return Err(format!("{label}.gender is invalid"));
            }
        }
        let phone = super::opt_trim(patient.phone.as_ref());
        if let Some(value) = &phone {
            super::ensure_max_len(value, 30, &format!("{label}.phone"))?;
        }
        let address = super::opt_trim(patient.address.as_ref());
        if let Some(value) = &address {
            super::ensure_max_len(value, 300, &format!("{label}.address"))?;
        }

        let mut prescriptions = Vec::with_capacity(patient.prescriptions.len());
        for (prescription_index, prescription) in patient.prescriptions.into_iter().enumerate() {
            let prescription_label = format!("{label}.prescriptions[{prescription_index}]");
            let mut sections = Vec::with_capacity(prescription.sections.len());
            for (section_index, section) in prescription.sections.into_iter().enumerate() {
                let Some(section_type) = section.section_type else {
                    return Err(format!(
                        "{prescription_label}.sections[{section_index}].sectionType is required"
                    ));
                };
                if !super::prescriptions::PRESCRIPTION_SECTION_TYPES.contains(&section_type.as_str()) {
                    return Err(format!(
                        "{prescription_label}.sections[{section_index}].sectionType is invalid"
                    ));
                }
                let content = section.content.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(
                    &content,
                    4000,
                    &format!("{prescription_label}.sections[{section_index}].content"),
                )?;
                sections.push(super::prescriptions::PrescriptionSectionInput {
                    section_type,
                    content: Some(content),
                    position: section.position,
                });
            }

            let mut medicines = Vec::with_capacity(prescription.medicines.len());
            for (medicine_index, medicine) in prescription.medicines.into_iter().enumerate() {
                let medicine_label = format!("{prescription_label}.medicines[{medicine_index}]");
                let medicine_name = medicine.medicine_name.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(&medicine_name, 160, &format!("{medicine_label}.medicineName"))?;
                let dosage = medicine.dosage.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(&dosage, 120, &format!("{medicine_label}.dosage"))?;
                let frequency = medicine.frequency.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(&frequency, 120, &format!("{medicine_label}.frequency"))?;
                let duration = medicine.duration.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(&duration, 120, &format!("{medicine_label}.duration"))?;
                let notes = medicine.notes.as_deref().unwrap_or("").trim().to_string();
                super::ensure_max_len(&notes, 300, &format!("{medicine_label}.notes"))?;
                medicines.push(super::prescriptions::PrescriptionMedicineInput {
                    medicine_name: Some(medicine_name),
                    dosage: Some(dosage),
                    frequency: Some(frequency),
                    duration: Some(duration),
                    notes: Some(notes),
                    position: medicine.position,
                });
            }

            prescriptions.push(ImportPrescription { sections, medicines });
        }

        patients.push(ImportPatient {
            patient_code,
            name,
            age,
            gender,
            phone,
            address,
            prescriptions,
        });
    }

    let mut presets = Vec::with_capacity(export.presets.len());
    for (preset_index, preset) in export.presets.into_iter().enumerate() {
        let label = format!("presets[{preset_index}]");
        let Some(category) = preset.category else {
            return Err(format!("{label}.category is required"));
        };
        if !super::presets::PRESET_CATEGORIES.contains(&category.as_str()) {
            return Err(format!("{label}.category is invalid"));
        }
        let title = preset.title.unwrap_or_default().trim().to_string();
        if title.is_empty() {
            return Err(format!("{label}.title is required"));
        }
        super::ensure_max_len(&title, 160, &format!("{label}.title"))?;
        let content = preset.content.as_deref().unwrap_or("").trim().to_string();
        super::ensure_max_len(&content, 4000, &format!("{label}.content"))?;

        let mut links = Vec::with_capacity(preset.links.len());
        for (link_index, link) in preset.links.into_iter().enumerate() {
            let link_label = format!("{label}.links[{link_index}]");
            let Some(target_kind) = link.target_kind else {
                return Err(format!("{link_label}.targetKind is required"));
            };
            if !super::presets::PRESET_LINK_KINDS.contains(&target_kind.as_str()) {
                return Err(format!("{link_label}.targetKind is invalid"));
            }
            if let Some(target) = link.target_preset_id {
                if target <= 0 {
                    return Err(format!("{link_label}.targetPresetId is invalid"));
                }
            }
            let link_label_value = link.label.unwrap_or_default().trim().to_string();
            super::ensure_max_len(&link_label_value, 160, &format!("{link_label}.label"))?;
            let dosage = link.dosage.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&dosage, 120, &format!("{link_label}.dosage"))?;
            let frequency = link.frequency.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&frequency, 120, &format!("{link_label}.frequency"))?;
            let duration = link.duration.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&duration, 120, &format!("{link_label}.duration"))?;
            links.push(super::presets::PresetLinkInput {
                target_kind,
                target_preset_id: None,
                label: link_label_value,
                dosage: Some(dosage),
                frequency: Some(frequency),
                duration: Some(duration),
                position: link.position,
            });
        }

        presets.push(ImportPreset {
            category,
            title,
            content: Some(content),
            links,
        });
    }

    Ok(ValidatedJsonImport { patients, presets })
}

fn next_patient_sequence(conn: &Connection) -> Result<i64, String> {
    conn.query_row(
        "SELECT COALESCE(MAX(CAST(SUBSTR(patient_code, 5) AS INTEGER)), 0) FROM patients",
        [],
        |row| row.get::<_, i64>(0),
    )
    .map(|max_seq| max_seq + 1)
    .map_err(|e| e.to_string())
}

fn resolve_patient_id(conn: &Connection, patient: &ImportPatient) -> Result<Option<i64>, String> {
    if let Some(code) = &patient.patient_code {
        let existing = conn
            .query_row(
                "SELECT patient_id FROM patients WHERE patient_code = ?",
                [code],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if existing.is_some() {
            return Ok(existing);
        }
    }

    match &patient.phone {
        Some(phone) => conn
            .query_row(
                "SELECT patient_id FROM patients WHERE name = ? AND phone = ? ORDER BY patient_id LIMIT 1",
                params![patient.name.as_str(), phone.as_str()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string()),
        None => conn
            .query_row(
                "SELECT patient_id FROM patients WHERE name = ? AND phone IS NULL ORDER BY patient_id LIMIT 1",
                [patient.name.as_str()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string()),
    }
}

fn import_json_into_db(conn: &Connection, input: ValidatedJsonImport) -> Result<ImportStats, String> {
    let mut stats = ImportStats::default();
    let mut next_seq = next_patient_sequence(conn)?;
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;

    for preset in input.presets {
        let existing: Option<i64> = tx
            .query_row(
                "SELECT preset_id FROM presets WHERE category = ? AND title = ? LIMIT 1",
                params![preset.category.as_str(), preset.title.as_str()],
                |row| row.get(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if existing.is_some() {
            stats.presets_skipped += 1;
            continue;
        }

        let form = super::presets::PresetFormValues {
            category: preset.category,
            title: preset.title,
            content: preset.content,
            links: Some(preset.links),
        };
        super::presets::import_preset(&tx, &form)?;
        stats.presets_created += 1;
    }

    for patient in input.patients {
        let patient_id = if let Some(id) = resolve_patient_id(&tx, &patient)? {
            stats.patients_matched += 1;
            id
        } else {
            let patient_code = format!("PAT-{next_seq:06}");
            next_seq += 1;
            tx.execute(
                "INSERT INTO patients (patient_code, name, age, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
                params![
                    patient_code.as_str(),
                    patient.name.as_str(),
                    patient.age.as_deref(),
                    patient.gender.as_deref(),
                    patient.phone.as_deref(),
                    patient.address.as_deref()
                ],
            )
            .map_err(|e| e.to_string())?;
            stats.patients_created += 1;
            tx.last_insert_rowid()
        };

        for prescription in patient.prescriptions {
            let form = super::prescriptions::PrescriptionFormValues {
                patient_id,
                template_id: None,
                sections: prescription.sections,
                medicines: prescription.medicines,
            };
            super::prescriptions::import_prescription(&tx, patient_id, &form)?;
            stats.prescriptions_imported += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(stats)
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
pub async fn settings_export_json(
    app: AppHandle,
    state: State<'_, Db>,
) -> Result<BackupActionResult, String> {
    let json = {
        let conn = state.conn()?;
        let export = build_json_export(&conn)?;
        serde_json::to_string_pretty(&export).map_err(|e| e.to_string())?
    };

    let dialog_app = app.clone();
    let file_name = format!("prescription-export-{}.json", timestamp_millis());
    let picked = tauri::async_runtime::spawn_blocking(move || {
        let mut builder = dialog_app
            .dialog()
            .file()
            .set_title("Export JSON")
            .set_file_name(file_name)
            .add_filter("JSON", &["json"]);
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
    fs::write(&target, json).map_err(|e| e.to_string())?;

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

#[tauri::command]
pub async fn settings_import_json(
    app: AppHandle,
    state: State<'_, Db>,
) -> Result<BackupActionResult, String> {
    let dialog_app = app.clone();
    let picked = tauri::async_runtime::spawn_blocking(move || {
        dialog_app
            .dialog()
            .file()
            .set_title("Import JSON")
            .add_filter("JSON", &["json"])
            .blocking_pick_file()
    })
    .await
    .map_err(|e| e.to_string())?;

    let Some(picked) = picked else {
        return Ok(BackupActionResult::cancelled());
    };
    let source = picked.into_path().map_err(|e| e.to_string())?;
    let contents = fs::read_to_string(&source).map_err(|e| e.to_string())?;
    let export = match serde_json::from_str::<JsonExport>(&contents) {
        Ok(export) => export,
        Err(err) => {
            return Ok(BackupActionResult {
                ok: false,
                path: None,
                message: Some(format!("The selected file is not valid JSON: {err}")),
            });
        }
    };
    let import = match validate_json_import(export) {
        Ok(import) => import,
        Err(message) => {
            return Ok(BackupActionResult {
                ok: false,
                path: None,
                message: Some(message),
            });
        }
    };

    let snapshot_path = db::database_path(&app).ok().map(|db_path| {
        PathBuf::from(format!(
            "{}.pre-json-import-{}",
            db_path.display(),
            timestamp_millis()
        ))
    });

    let conn = state.conn()?;
    if let Some(path) = &snapshot_path {
        if let Err(err) = backup_to(&conn, path) {
            return Ok(BackupActionResult {
                ok: false,
                path: None,
                message: Some(format!("JSON import could not create a safety snapshot: {err}")),
            });
        }
    }

    match import_json_into_db(&conn, import) {
        Ok(stats) => {
            if let Some(path) = &snapshot_path {
                let _ = fs::remove_file(path);
            }
            Ok(BackupActionResult {
                ok: true,
                path: Some(source.display().to_string()),
                message: Some(stats.message()),
            })
        }
        Err(reason) => {
            if let Some(path) = &snapshot_path {
                let _ = fs::remove_file(path);
            }
            Ok(BackupActionResult {
                ok: false,
                path: None,
                message: Some(format!("JSON import failed. No changes were saved. ({reason})")),
            })
        }
    }
}
