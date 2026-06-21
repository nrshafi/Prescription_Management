use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::db::{self, Db};
use crate::migrations;

use super::backup::{backup_to, timestamp_millis, BackupActionResult};
use super::{get_doctor_profile, get_paper_settings, DoctorProfileRecord, PaperSettingsRecord};

pub const JSON_FORMAT_VERSION: u32 = 1;

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

#[cfg_attr(test, derive(Debug))]
struct ImportPatient {
    patient_code: Option<String>,
    name: String,
    age: Option<String>,
    gender: Option<String>,
    phone: Option<String>,
    address: Option<String>,
    prescriptions: Vec<ImportPrescription>,
}

#[cfg_attr(test, derive(Debug))]
struct ImportPrescription {
    visit_no: Option<i64>,
    created_at: Option<String>,
    sections: Vec<super::super::prescriptions::PrescriptionSectionInput>,
    medicines: Vec<super::super::prescriptions::PrescriptionMedicineInput>,
}

#[cfg_attr(test, derive(Debug))]
struct ImportPreset {
    category: String,
    title: String,
    content: Option<String>,
    links: Vec<super::super::presets::PresetLinkInput>,
}

#[cfg_attr(test, derive(Debug))]
struct ValidatedJsonImport {
    patients: Vec<ImportPatient>,
    presets: Vec<ImportPreset>,
}

#[derive(Default)]
struct ImportStats {
    patients_created: usize,
    patients_matched: usize,
    prescriptions_imported: usize,
    prescriptions_skipped: usize,
    presets_created: usize,
    presets_skipped: usize,
}

impl ImportStats {
    fn message(&self) -> String {
        format!(
            "JSON import complete: {} patient(s) created, {} patient(s) matched, {} prescription(s) imported, {} prescription(s) skipped, {} preset(s) created, {} preset(s) skipped.",
            self.patients_created,
            self.patients_matched,
            self.prescriptions_imported,
            self.prescriptions_skipped,
            self.presets_created,
            self.presets_skipped
        )
    }
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
        let patient_code = super::super::opt_trim(patient.patient_code.as_ref());
        if let Some(code) = &patient_code {
            if !seen_codes.insert(code.clone()) {
                return Err(format!("Duplicate patientCode in JSON file: {code}"));
            }
        }

        let name = patient.name.unwrap_or_default().trim().to_string();
        if name.is_empty() {
            return Err(format!("{label}.name is required"));
        }
        super::super::ensure_max_len(&name, 120, &format!("{label}.name"))?;
        let age = super::super::opt_trim(patient.age.as_ref());
        if let Some(value) = &age {
            super::super::ensure_max_len(value, 30, &format!("{label}.age"))?;
        }
        let gender = super::super::opt_trim(patient.gender.as_ref());
        if let Some(value) = &gender {
            if !super::super::patients::GENDERS.contains(&value.as_str()) {
                return Err(format!("{label}.gender is invalid"));
            }
        }
        let phone = super::super::opt_trim(patient.phone.as_ref());
        if let Some(value) = &phone {
            super::super::ensure_max_len(value, 30, &format!("{label}.phone"))?;
        }
        let address = super::super::opt_trim(patient.address.as_ref());
        if let Some(value) = &address {
            super::super::ensure_max_len(value, 300, &format!("{label}.address"))?;
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
                if !super::super::prescriptions::PRESCRIPTION_SECTION_TYPES.contains(&section_type.as_str()) {
                    return Err(format!(
                        "{prescription_label}.sections[{section_index}].sectionType is invalid"
                    ));
                }
                let content = section.content.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(
                    &content,
                    4000,
                    &format!("{prescription_label}.sections[{section_index}].content"),
                )?;
                sections.push(super::super::prescriptions::PrescriptionSectionInput {
                    section_type,
                    content: Some(content),
                });
            }

            let mut medicines = Vec::with_capacity(prescription.medicines.len());
            for (medicine_index, medicine) in prescription.medicines.into_iter().enumerate() {
                let medicine_label = format!("{prescription_label}.medicines[{medicine_index}]");
                let medicine_name = medicine.medicine_name.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(&medicine_name, 160, &format!("{medicine_label}.medicineName"))?;
                let dosage = medicine.dosage.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(&dosage, 120, &format!("{medicine_label}.dosage"))?;
                let frequency = medicine.frequency.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(&frequency, 120, &format!("{medicine_label}.frequency"))?;
                let duration = medicine.duration.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(&duration, 120, &format!("{medicine_label}.duration"))?;
                let notes = medicine.notes.as_deref().unwrap_or("").trim().to_string();
                super::super::ensure_max_len(&notes, 300, &format!("{medicine_label}.notes"))?;
                medicines.push(super::super::prescriptions::PrescriptionMedicineInput {
                    medicine_name: Some(medicine_name),
                    dosage: Some(dosage),
                    frequency: Some(frequency),
                    duration: Some(duration),
                    notes: Some(notes),
                });
            }

            prescriptions.push(ImportPrescription {
                visit_no: prescription.visit_no,
                created_at: prescription.created_at,
                sections,
                medicines,
            });
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
        if !super::super::presets::PRESET_CATEGORIES.contains(&category.as_str()) {
            return Err(format!("{label}.category is invalid"));
        }
        let title = preset.title.unwrap_or_default().trim().to_string();
        if title.is_empty() {
            return Err(format!("{label}.title is required"));
        }
        super::super::ensure_max_len(&title, 160, &format!("{label}.title"))?;
        let content = preset.content.as_deref().unwrap_or("").trim().to_string();
        super::super::ensure_max_len(&content, 4000, &format!("{label}.content"))?;

        let mut links = Vec::with_capacity(preset.links.len());
        for (link_index, link) in preset.links.into_iter().enumerate() {
            let link_label = format!("{label}.links[{link_index}]");
            let Some(target_kind) = link.target_kind else {
                return Err(format!("{link_label}.targetKind is required"));
            };
            if !super::super::presets::PRESET_LINK_KINDS.contains(&target_kind.as_str()) {
                return Err(format!("{link_label}.targetKind is invalid"));
            }
            if let Some(target) = link.target_preset_id {
                if target <= 0 {
                    return Err(format!("{link_label}.targetPresetId is invalid"));
                }
            }
            let link_label_value = link.label.unwrap_or_default().trim().to_string();
            super::super::ensure_max_len(&link_label_value, 160, &format!("{link_label}.label"))?;
            let dosage = link.dosage.as_deref().unwrap_or("").trim().to_string();
            super::super::ensure_max_len(&dosage, 120, &format!("{link_label}.dosage"))?;
            let frequency = link.frequency.as_deref().unwrap_or("").trim().to_string();
            super::super::ensure_max_len(&frequency, 120, &format!("{link_label}.frequency"))?;
            let duration = link.duration.as_deref().unwrap_or("").trim().to_string();
            super::super::ensure_max_len(&duration, 120, &format!("{link_label}.duration"))?;
            links.push(super::super::presets::PresetLinkInput {
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
    migrations::ensure_preset_links_table(conn)?;

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

        let form = super::super::presets::PresetFormValues {
            category: preset.category,
            title: preset.title,
            content: preset.content,
            links: Some(preset.links),
        };
        super::super::presets::import_preset(&tx, &form)?;
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
            let visit_no = match prescription.visit_no {
                Some(v) if v >= 1 => v,
                _ => tx
                    .query_row(
                        "SELECT COALESCE(MAX(visit_no), 0) + 1 FROM prescriptions WHERE patient_id = ?",
                        [patient_id],
                        |row| row.get(0),
                    )
                    .map_err(|e| e.to_string())?,
            };

            let duplicate: Option<i64> = tx
                .query_row(
                    "SELECT prescription_id FROM prescriptions WHERE patient_id = ? AND visit_no = ? LIMIT 1",
                    params![patient_id, visit_no],
                    |row| row.get(0),
                )
                .optional()
                .map_err(|e| e.to_string())?;
            if duplicate.is_some() {
                stats.prescriptions_skipped += 1;
                continue;
            }

            let form = super::super::prescriptions::PrescriptionFormValues {
                patient_id,
                sections: prescription.sections,
                medicines: prescription.medicines,
            };
            super::super::prescriptions::import_prescription_with_visit(
                &tx,
                patient_id,
                &form,
                visit_no,
                prescription.created_at.as_deref(),
            )?;
            stats.prescriptions_imported += 1;
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(stats)
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

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(json: &str) -> JsonExport {
        serde_json::from_str(json).expect("valid JSON")
    }

    #[test]
    fn rejects_missing_format_version() {
        let export = parse(r#"{ "patients": [], "presets": [] }"#);
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("formatVersion"), "{err}");
    }

    #[test]
    fn rejects_unsupported_format_version() {
        let export = parse(r#"{ "formatVersion": 999, "patients": [], "presets": [] }"#);
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("Unsupported"), "{err}");
    }

    #[test]
    fn rejects_duplicate_patient_codes() {
        let export = parse(
            r#"{
                "formatVersion": 1,
                "patients": [
                    { "patientCode": "PAT-000001", "name": "A" },
                    { "patientCode": "PAT-000001", "name": "B" }
                ],
                "presets": []
            }"#,
        );
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("Duplicate patientCode"), "{err}");
    }

    #[test]
    fn rejects_blank_patient_name() {
        let export = parse(
            r#"{ "formatVersion": 1, "patients": [ { "name": "   " } ], "presets": [] }"#,
        );
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("name is required"), "{err}");
    }

    #[test]
    fn rejects_invalid_section_type() {
        let export = parse(
            r#"{
                "formatVersion": 1,
                "patients": [ {
                    "name": "A",
                    "prescriptions": [ {
                        "sections": [ { "sectionType": "Bogus", "content": "x" } ]
                    } ]
                } ],
                "presets": []
            }"#,
        );
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("sectionType is invalid"), "{err}");
    }

    #[test]
    fn rejects_invalid_preset_category() {
        let export = parse(
            r#"{
                "formatVersion": 1,
                "patients": [],
                "presets": [ { "category": "Bogus", "title": "x" } ]
            }"#,
        );
        let err = validate_json_import(export).unwrap_err();
        assert!(err.contains("category is invalid"), "{err}");
    }

    #[test]
    fn accepts_and_imports_minimal_export() {
        let export = parse(
            r#"{
                "formatVersion": 1,
                "patients": [ {
                    "name": "Rahim",
                    "phone": "01912345678",
                    "prescriptions": [ {
                        "visitNo": 1,
                        "sections": [ { "sectionType": "Chief Complaint", "content": "Fever" } ],
                        "medicines": [ { "medicineName": "Napa", "dosage": "500mg" } ]
                    } ]
                } ],
                "presets": [ { "category": "Advice", "title": "Rest", "content": "Drink water" } ]
            }"#,
        );
        let validated = validate_json_import(export).expect("valid import");

        let conn = Connection::open_in_memory().unwrap();
        crate::migrations::run_migrations(&conn).unwrap();
        crate::migrations::ensure_singleton_rows(&conn).unwrap();

        let stats = import_json_into_db(&conn, validated).expect("import succeeds");
        assert_eq!(stats.patients_created, 1);
        assert_eq!(stats.prescriptions_imported, 1);
        assert_eq!(stats.presets_created, 1);

        let patient_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0))
            .unwrap();
        assert_eq!(patient_count, 1);
        let medicine: String = conn
            .query_row("SELECT medicine_name FROM prescription_medicines", [], |r| r.get(0))
            .unwrap();
        assert_eq!(medicine, "Napa");

        // Importing the same export again must not duplicate the patient or
        // its visit (idempotent merge on patient identity + visit_no).
        let export2 = parse(
            r#"{
                "formatVersion": 1,
                "patients": [ {
                    "name": "Rahim",
                    "phone": "01912345678",
                    "prescriptions": [ {
                        "visitNo": 1,
                        "sections": [ { "sectionType": "Chief Complaint", "content": "Fever" } ],
                        "medicines": []
                    } ]
                } ],
                "presets": []
            }"#,
        );
        let validated2 = validate_json_import(export2).unwrap();
        let stats2 = import_json_into_db(&conn, validated2).unwrap();
        assert_eq!(stats2.patients_matched, 1);
        assert_eq!(stats2.prescriptions_skipped, 1);

        let patient_count_after: i64 = conn
            .query_row("SELECT COUNT(*) FROM patients", [], |r| r.get(0))
            .unwrap();
        assert_eq!(patient_count_after, 1);
    }
}
