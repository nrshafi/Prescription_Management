use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Db;

pub const PRESCRIPTION_SECTION_TYPES: [&str; 6] = [
    "Chief Complaint",
    "Examination",
    "Investigations",
    "Provisional Diagnosis",
    "Advice",
    "Follow Up",
];

// The section type is bound as a `?` parameter by the caller (in SELECT-list
// order, ahead of any WHERE parameters) instead of being interpolated into
// the SQL string.
const SECTION_CONTENT_SUBQUERY: &str = "(SELECT ps.content FROM prescription_sections ps WHERE ps.prescription_id = prescriptions.prescription_id AND ps.section_type = ? ORDER BY ps.position LIMIT 1)";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionListItem {
    pub id: i64,
    pub patient_id: i64,
    pub patient_code: String,
    pub patient_name: String,
    pub phone: Option<String>,
    pub age: Option<String>,
    pub gender: Option<String>,
    pub visit_no: i64,
    pub created_at: String,
    pub updated_at: String,
    pub chief_complaint: Option<String>,
    pub provisional_diagnosis: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionSectionRecord {
    pub id: i64,
    pub section_type: String,
    pub content: String,
    pub position: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionMedicineRecord {
    pub id: i64,
    pub medicine_name: String,
    pub dosage: String,
    pub frequency: String,
    pub duration: String,
    pub notes: String,
    pub position: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionDetail {
    #[serde(flatten)]
    pub item: PrescriptionListItem,
    pub template_id: Option<i64>,
    pub address: Option<String>,
    pub sections: Vec<PrescriptionSectionRecord>,
    pub medicines: Vec<PrescriptionMedicineRecord>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MedicineSuggestion {
    pub medicine_name: String,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub duration: Option<String>,
    pub notes: Option<String>,
    pub use_count: i64,
    pub last_used_at: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PrescriptionQuery {
    pub search: Option<String>,
    pub gender: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionSectionInput {
    pub section_type: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub position: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionMedicineInput {
    #[serde(default)]
    pub medicine_name: Option<String>,
    #[serde(default)]
    pub dosage: Option<String>,
    #[serde(default)]
    pub frequency: Option<String>,
    #[serde(default)]
    pub duration: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub position: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrescriptionFormValues {
    pub patient_id: i64,
    #[serde(default)]
    pub template_id: Option<i64>,
    pub sections: Vec<PrescriptionSectionInput>,
    pub medicines: Vec<PrescriptionMedicineInput>,
}

struct NormalizedSection {
    section_type: String,
    content: String,
    position: i64,
}

struct NormalizedMedicine {
    medicine_name: String,
    dosage: String,
    frequency: String,
    duration: String,
    notes: String,
    position: i64,
}

struct NormalizedPrescription {
    patient_id: i64,
    template_id: Option<i64>,
    sections: Vec<NormalizedSection>,
    medicines: Vec<NormalizedMedicine>,
}

fn trimmed(value: &Option<String>) -> String {
    value.as_deref().unwrap_or("").trim().to_string()
}

fn to_nullable(value: &str) -> Option<&str> {
    if value.is_empty() {
        None
    } else {
        Some(value)
    }
}

/// Mirrors the shared Zod `prescriptionFormSchema` rules.
fn normalize_prescription(input: &PrescriptionFormValues) -> Result<NormalizedPrescription, String> {
    if input.patient_id <= 0 {
        return Err("Patient is required".to_string());
    }
    if let Some(template_id) = input.template_id {
        if template_id <= 0 {
            return Err("Invalid template".to_string());
        }
    }

    let mut sections = Vec::with_capacity(input.sections.len());
    for (index, section) in input.sections.iter().enumerate() {
        if !PRESCRIPTION_SECTION_TYPES.contains(&section.section_type.as_str()) {
            return Err(format!("Invalid section type: {}", section.section_type));
        }
        let content = trimmed(&section.content);
        super::ensure_max_len(&content, 4000, "Section content")?;
        sections.push(NormalizedSection {
            section_type: section.section_type.clone(),
            content,
            position: index as i64,
        });
    }

    let mut medicines = Vec::new();
    let mut position: i64 = 0;
    for medicine in &input.medicines {
        let medicine_name = trimmed(&medicine.medicine_name);
        super::ensure_max_len(&medicine_name, 160, "Medicine name")?;
        let dosage = trimmed(&medicine.dosage);
        super::ensure_max_len(&dosage, 120, "Dosage")?;
        let frequency = trimmed(&medicine.frequency);
        super::ensure_max_len(&frequency, 120, "Frequency")?;
        let duration = trimmed(&medicine.duration);
        super::ensure_max_len(&duration, 120, "Duration")?;
        let notes = trimmed(&medicine.notes);
        super::ensure_max_len(&notes, 300, "Notes")?;

        if medicine_name.is_empty()
            && dosage.is_empty()
            && frequency.is_empty()
            && duration.is_empty()
            && notes.is_empty()
        {
            continue;
        }
        medicines.push(NormalizedMedicine {
            medicine_name,
            dosage,
            frequency,
            duration,
            notes,
            position,
        });
        position += 1;
    }

    Ok(NormalizedPrescription {
        patient_id: input.patient_id,
        template_id: input.template_id,
        sections,
        medicines,
    })
}

fn replace_prescription_content(
    conn: &Connection,
    prescription_id: i64,
    values: &NormalizedPrescription,
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM prescription_sections WHERE prescription_id = ?",
        [prescription_id],
    )
    .map_err(|e| e.to_string())?;
    conn.execute(
        "DELETE FROM prescription_medicines WHERE prescription_id = ?",
        [prescription_id],
    )
    .map_err(|e| e.to_string())?;

    for section in &values.sections {
        conn.execute(
            "INSERT INTO prescription_sections (prescription_id, section_type, content, position) VALUES (?, ?, ?, ?)",
            params![prescription_id, section.section_type, to_nullable(&section.content), section.position],
        )
        .map_err(|e| e.to_string())?;
    }

    for medicine in &values.medicines {
        let name = if medicine.medicine_name.is_empty() {
            "Medicine"
        } else {
            medicine.medicine_name.as_str()
        };
        conn.execute(
            "INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, frequency, duration, notes, position) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                prescription_id,
                name,
                to_nullable(&medicine.dosage),
                to_nullable(&medicine.frequency),
                to_nullable(&medicine.duration),
                to_nullable(&medicine.notes),
                medicine.position
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn create_prescription_internal(
    conn: &Connection,
    values: &NormalizedPrescription,
) -> Result<i64, String> {
    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let max_visit_no: i64 = tx
        .query_row(
            "SELECT COALESCE(MAX(visit_no), 0) FROM prescriptions WHERE patient_id = ?",
            [values.patient_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO prescriptions (patient_id, template_id, visit_no) VALUES (?, ?, ?)",
        params![values.patient_id, values.template_id, max_visit_no + 1],
    )
    .map_err(|e| e.to_string())?;
    let prescription_id = tx.last_insert_rowid();
    replace_prescription_content(&tx, prescription_id, values)?;
    tx.commit().map_err(|e| e.to_string())?;
    Ok(prescription_id)
}

pub(crate) fn import_prescription(
    conn: &Connection,
    patient_id: i64,
    input: &PrescriptionFormValues,
) -> Result<i64, String> {
    let mut values = normalize_prescription(input)?;
    values.patient_id = patient_id;

    let max_visit_no: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(visit_no), 0) FROM prescriptions WHERE patient_id = ?",
            [values.patient_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO prescriptions (patient_id, template_id, visit_no) VALUES (?, ?, ?)",
        params![values.patient_id, values.template_id, max_visit_no + 1],
    )
    .map_err(|e| e.to_string())?;
    let prescription_id = conn.last_insert_rowid();
    replace_prescription_content(conn, prescription_id, &values)?;
    Ok(prescription_id)
}

pub(crate) fn get_prescription_internal(
    conn: &Connection,
    id: i64,
) -> Result<Option<PrescriptionDetail>, String> {
    let sql = format!(
        "SELECT prescriptions.prescription_id, patients.patient_id, patients.patient_code, patients.name, patients.phone, patients.age, patients.gender, prescriptions.visit_no, prescriptions.created_at, prescriptions.updated_at, {SECTION_CONTENT_SUBQUERY}, {SECTION_CONTENT_SUBQUERY}, prescriptions.template_id, patients.address FROM prescriptions INNER JOIN patients ON prescriptions.patient_id = patients.patient_id WHERE prescriptions.prescription_id = ?"
    );
    let base = conn
        .query_row(&sql, params!["Chief Complaint", "Provisional Diagnosis", id], |row| {
            Ok((
                PrescriptionListItem {
                    id: row.get(0)?,
                    patient_id: row.get(1)?,
                    patient_code: row.get(2)?,
                    patient_name: row.get(3)?,
                    phone: row.get(4)?,
                    age: row.get(5)?,
                    gender: row.get(6)?,
                    visit_no: row.get(7)?,
                    created_at: row.get(8)?,
                    updated_at: row.get(9)?,
                    chief_complaint: row.get(10)?,
                    provisional_diagnosis: row.get(11)?,
                },
                row.get::<_, Option<i64>>(12)?,
                row.get::<_, Option<String>>(13)?,
            ))
        })
        .optional()
        .map_err(|e| e.to_string())?;

    let Some((item, template_id, address)) = base else {
        return Ok(None);
    };

    let mut section_stmt = conn
        .prepare("SELECT section_id, section_type, content, position FROM prescription_sections WHERE prescription_id = ? ORDER BY position")
        .map_err(|e| e.to_string())?;
    let sections = section_stmt
        .query_map([id], |row| {
            Ok(PrescriptionSectionRecord {
                id: row.get(0)?,
                section_type: row.get(1)?,
                content: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                position: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut medicine_stmt = conn
        .prepare("SELECT medicine_id, medicine_name, dosage, frequency, duration, notes, position FROM prescription_medicines WHERE prescription_id = ? ORDER BY position")
        .map_err(|e| e.to_string())?;
    let medicines = medicine_stmt
        .query_map([id], |row| {
            Ok(PrescriptionMedicineRecord {
                id: row.get(0)?,
                medicine_name: row.get(1)?,
                dosage: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                frequency: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                duration: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                notes: row.get::<_, Option<String>>(5)?.unwrap_or_default(),
                position: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    Ok(Some(PrescriptionDetail {
        item,
        template_id,
        address,
        sections,
        medicines,
    }))
}

#[tauri::command]
pub fn prescriptions_list(
    state: State<'_, Db>,
    query: Option<PrescriptionQuery>,
) -> Result<Vec<PrescriptionListItem>, String> {
    let q = query.unwrap_or_default();
    let conn = state.conn()?;

    let search = q.search.as_deref().map(str::trim).unwrap_or("").to_string();
    let gender = super::opt_trim(q.gender.as_ref());
    if let Some(value) = &gender {
        if !super::patients::GENDERS.contains(&value.as_str()) {
            return Err("Invalid gender".to_string());
        }
    }

    // Bound in SELECT-list order, ahead of the filter parameters.
    let mut bind_values: Vec<Value> = vec![
        Value::Text("Chief Complaint".to_string()),
        Value::Text("Provisional Diagnosis".to_string()),
    ];
    let mut filters: Vec<String> = Vec::new();

    if !search.is_empty() {
        let term = format!("%{search}%");
        filters.push(
            "(patients.patient_code LIKE ? OR patients.name LIKE ? OR patients.phone LIKE ? OR CAST(patients.patient_id AS TEXT) = ? OR CAST(prescriptions.prescription_id AS TEXT) = ?)"
                .to_string(),
        );
        bind_values.push(Value::Text(term.clone()));
        bind_values.push(Value::Text(term.clone()));
        bind_values.push(Value::Text(term));
        bind_values.push(Value::Text(search.clone()));
        bind_values.push(Value::Text(search.clone()));
    }
    if let Some(value) = gender {
        filters.push("patients.gender = ?".to_string());
        bind_values.push(Value::Text(value));
    }
    if let Some(value) = super::opt_trim(q.date_from.as_ref()) {
        filters.push("prescriptions.created_at >= ?".to_string());
        bind_values.push(Value::Text(value));
    }
    if let Some(value) = super::opt_trim(q.date_to.as_ref()) {
        filters.push("prescriptions.created_at <= ? || ' 23:59:59'".to_string());
        bind_values.push(Value::Text(value));
    }

    let order_col = match q.sort_by.as_deref() {
        Some("id") => "prescriptions.prescription_id",
        Some("patientName") => "patients.name",
        Some("patientCode") => "patients.patient_code",
        Some("visitNo") => "prescriptions.visit_no",
        _ => "prescriptions.created_at",
    };
    let order_dir = if q.sort_dir.as_deref() == Some("asc") {
        "ASC"
    } else {
        "DESC"
    };
    let where_clause = if filters.is_empty() {
        String::new()
    } else {
        format!("WHERE {}", filters.join(" AND "))
    };

    let sql = format!(
        "SELECT prescriptions.prescription_id, patients.patient_id, patients.patient_code, patients.name, patients.phone, patients.age, patients.gender, prescriptions.visit_no, prescriptions.created_at, prescriptions.updated_at, {SECTION_CONTENT_SUBQUERY}, {SECTION_CONTENT_SUBQUERY} FROM prescriptions INNER JOIN patients ON prescriptions.patient_id = patients.patient_id {where_clause} ORDER BY {order_col} {order_dir}"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(bind_values), |row| {
            Ok(PrescriptionListItem {
                id: row.get(0)?,
                patient_id: row.get(1)?,
                patient_code: row.get(2)?,
                patient_name: row.get(3)?,
                phone: row.get(4)?,
                age: row.get(5)?,
                gender: row.get(6)?,
                visit_no: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
                chief_complaint: row.get(10)?,
                provisional_diagnosis: row.get(11)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn prescriptions_get(state: State<'_, Db>, id: i64) -> Result<Option<PrescriptionDetail>, String> {
    let conn = state.conn()?;
    get_prescription_internal(&conn, id)
}

#[tauri::command]
pub fn prescriptions_create(
    state: State<'_, Db>,
    input: PrescriptionFormValues,
) -> Result<PrescriptionDetail, String> {
    let values = normalize_prescription(&input)?;
    let conn = state.conn()?;
    let id = create_prescription_internal(&conn, &values)?;
    get_prescription_internal(&conn, id)?
        .ok_or_else(|| "Could not load created prescription.".to_string())
}

#[tauri::command]
pub fn prescriptions_save_draft(
    state: State<'_, Db>,
    input: PrescriptionFormValues,
) -> Result<PrescriptionDetail, String> {
    prescriptions_create(state, input)
}

#[tauri::command]
pub fn prescriptions_update(
    state: State<'_, Db>,
    id: i64,
    input: PrescriptionFormValues,
) -> Result<PrescriptionDetail, String> {
    let values = normalize_prescription(&input)?;
    let conn = state.conn()?;

    let existing = get_prescription_internal(&conn, id)?
        .ok_or_else(|| format!("Prescription {id} not found"))?;
    if values.patient_id != existing.item.patient_id {
        return Err("Patient cannot be changed for an existing prescription.".to_string());
    }

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE prescriptions SET template_id = ?, updated_at = (CURRENT_TIMESTAMP) WHERE prescription_id = ?",
        params![values.template_id, id],
    )
    .map_err(|e| e.to_string())?;
    replace_prescription_content(&tx, id, &values)?;
    tx.commit().map_err(|e| e.to_string())?;

    get_prescription_internal(&conn, id)?
        .ok_or_else(|| "Could not load updated prescription.".to_string())
}

#[tauri::command]
pub fn prescriptions_duplicate(state: State<'_, Db>, id: i64) -> Result<PrescriptionDetail, String> {
    let conn = state.conn()?;
    let source = get_prescription_internal(&conn, id)?
        .ok_or_else(|| format!("Prescription {id} not found"))?;

    let values = NormalizedPrescription {
        patient_id: source.item.patient_id,
        template_id: source.template_id,
        sections: source
            .sections
            .iter()
            .enumerate()
            .map(|(index, section)| NormalizedSection {
                section_type: section.section_type.clone(),
                content: section.content.trim().to_string(),
                position: index as i64,
            })
            .collect(),
        medicines: source
            .medicines
            .iter()
            .enumerate()
            .map(|(index, medicine)| NormalizedMedicine {
                medicine_name: medicine.medicine_name.trim().to_string(),
                dosage: medicine.dosage.trim().to_string(),
                frequency: medicine.frequency.trim().to_string(),
                duration: medicine.duration.trim().to_string(),
                notes: medicine.notes.trim().to_string(),
                position: index as i64,
            })
            .collect(),
    };

    let new_id = create_prescription_internal(&conn, &values)?;
    get_prescription_internal(&conn, new_id)?
        .ok_or_else(|| "Could not load created prescription.".to_string())
}

#[tauri::command]
pub fn prescriptions_medicine_suggestions(
    state: State<'_, Db>,
    search: Option<String>,
) -> Result<Vec<MedicineSuggestion>, String> {
    let conn = state.conn()?;
    let term = search.unwrap_or_default().trim().to_string();

    let mut filters = vec!["prescription_medicines.medicine_name <> ''".to_string()];
    let mut bind_values: Vec<Value> = Vec::new();
    if !term.is_empty() {
        filters.push("prescription_medicines.medicine_name LIKE ?".to_string());
        bind_values.push(Value::Text(format!("%{term}%")));
    }
    bind_values.push(Value::Integer(8));

    let sql = format!(
        "SELECT prescription_medicines.medicine_name, MAX(prescription_medicines.dosage), MAX(prescription_medicines.frequency), MAX(prescription_medicines.duration), MAX(prescription_medicines.notes), COUNT(*), MAX(prescriptions.created_at) FROM prescription_medicines INNER JOIN prescriptions ON prescription_medicines.prescription_id = prescriptions.prescription_id WHERE {} GROUP BY prescription_medicines.medicine_name ORDER BY MAX(prescriptions.created_at) DESC, COUNT(*) DESC LIMIT ?",
        filters.join(" AND ")
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(bind_values), |row| {
            Ok(MedicineSuggestion {
                medicine_name: row.get(0)?,
                dosage: row.get(1)?,
                frequency: row.get(2)?,
                duration: row.get(3)?,
                notes: row.get(4)?,
                use_count: row.get(5)?,
                last_used_at: row.get(6)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}
