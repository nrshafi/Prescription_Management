use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension, Row};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Db;

pub const GENDERS: [&str; 3] = ["Male", "Female", "Other"];

pub(crate) const LAST_COMPLAINT_SQL: &str = "(
  SELECT ps.content
  FROM prescription_sections ps
  JOIN prescriptions p ON p.prescription_id = ps.prescription_id
  WHERE p.patient_id = patients.patient_id
    AND ps.section_type = 'Chief Complaint'
    AND ps.content IS NOT NULL
    AND ps.content <> ''
  ORDER BY p.visit_no DESC, p.prescription_id DESC
  LIMIT 1
)";

pub(crate) const LAST_DIAGNOSIS_SQL: &str = "(
  SELECT ps.content
  FROM prescription_sections ps
  JOIN prescriptions p ON p.prescription_id = ps.prescription_id
  WHERE p.patient_id = patients.patient_id
    AND ps.section_type = 'Provisional Diagnosis'
    AND ps.content IS NOT NULL
    AND ps.content <> ''
  ORDER BY p.visit_no DESC, p.prescription_id DESC
  LIMIT 1
)";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientRecord {
    pub id: i64,
    pub patient_code: String,
    pub name: String,
    pub age: Option<String>,
    pub gender: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientListItem {
    #[serde(flatten)]
    pub record: PatientRecord,
    pub last_diagnosis: Option<String>,
    pub last_complaint: Option<String>,
    pub visit_count: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientVisit {
    pub id: i64,
    pub visit_no: i64,
    pub created_at: String,
    pub diagnosis: Option<String>,
    pub complaint: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientFormValues {
    pub name: String,
    #[serde(default)]
    pub age: Option<String>,
    #[serde(default)]
    pub gender: Option<String>,
    #[serde(default)]
    pub phone: Option<String>,
    #[serde(default)]
    pub address: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PatientQuery {
    pub search: Option<String>,
    pub gender: Option<String>,
    pub age_min: Option<i64>,
    pub age_max: Option<i64>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub min_visits: Option<i64>,
    pub sort_by: Option<String>,
    pub sort_dir: Option<String>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PatientDeleteOptions {
    pub acknowledged_prescriptions: Option<i64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PatientDeleteResult {
    pub id: i64,
    pub deleted_prescriptions: i64,
}

struct NormalizedPatient {
    name: String,
    age: Option<String>,
    gender: Option<String>,
    phone: Option<String>,
    address: Option<String>,
}

/// Mirrors the shared Zod `patientFormSchema` rules.
fn normalize_patient(input: &PatientFormValues) -> Result<NormalizedPatient, String> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("Name is required".to_string());
    }
    super::ensure_max_len(&name, 120, "Name")?;

    let age = super::opt_trim(input.age.as_ref());
    if let Some(value) = &age {
        super::ensure_max_len(value, 30, "Age")?;
    }

    let gender = super::opt_trim(input.gender.as_ref());
    if let Some(value) = &gender {
        if !GENDERS.contains(&value.as_str()) {
            return Err("Invalid gender".to_string());
        }
    }

    let phone = super::opt_trim(input.phone.as_ref());
    if let Some(value) = &phone {
        super::ensure_max_len(value, 30, "Phone")?;
    }

    let address = super::opt_trim(input.address.as_ref());
    if let Some(value) = &address {
        super::ensure_max_len(value, 300, "Address")?;
    }

    Ok(NormalizedPatient {
        name,
        age,
        gender,
        phone,
        address,
    })
}

pub(crate) fn patient_list_item_from_row(row: &Row<'_>) -> rusqlite::Result<PatientListItem> {
    Ok(PatientListItem {
        record: PatientRecord {
            id: row.get(0)?,
            patient_code: row.get(1)?,
            name: row.get(2)?,
            age: row.get(3)?,
            gender: row.get(4)?,
            phone: row.get(5)?,
            address: row.get(6)?,
            created_at: row.get(7)?,
            updated_at: row.get(8)?,
        },
        last_diagnosis: row.get(9)?,
        last_complaint: row.get(10)?,
        visit_count: row.get(11)?,
    })
}

fn fetch_patient(conn: &Connection, id: i64) -> Result<Option<PatientRecord>, String> {
    conn.query_row(
        "SELECT patient_id, patient_code, name, age, gender, phone, address, created_at, updated_at FROM patients WHERE patient_id = ?",
        [id],
        |row| {
            Ok(PatientRecord {
                id: row.get(0)?,
                patient_code: row.get(1)?,
                name: row.get(2)?,
                age: row.get(3)?,
                gender: row.get(4)?,
                phone: row.get(5)?,
                address: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        },
    )
    .optional()
    .map_err(|e| e.to_string())
}

fn prescription_count(conn: &Connection, patient_id: i64) -> Result<i64, String> {
    conn.query_row(
        "SELECT COUNT(*) FROM prescriptions WHERE patient_id = ?",
        [patient_id],
        |row| row.get(0),
    )
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn patients_list(
    state: State<'_, Db>,
    query: Option<PatientQuery>,
) -> Result<Vec<PatientListItem>, String> {
    let q = query.unwrap_or_default();
    let conn = state.conn()?;

    let search = q.search.as_deref().map(str::trim).unwrap_or("").to_string();
    let gender = super::opt_trim(q.gender.as_ref());
    if let Some(value) = &gender {
        if !GENDERS.contains(&value.as_str()) {
            return Err("Invalid gender".to_string());
        }
    }
    for bound in [q.age_min, q.age_max, q.min_visits].iter().flatten() {
        if *bound < 0 {
            return Err("Invalid filter value".to_string());
        }
    }

    let mut filters: Vec<String> = Vec::new();
    let mut bind_values: Vec<Value> = Vec::new();

    if !search.is_empty() {
        let term = format!("%{search}%");
        let mut or_clauses = vec![
            "patients.patient_code LIKE ?".to_string(),
            "patients.name LIKE ?".to_string(),
        ];
        bind_values.push(Value::Text(term.clone())); // patient_code
        bind_values.push(Value::Text(term.clone())); // name

        if super::phone_search_enabled(&search) {
            or_clauses.push("patients.phone LIKE ?".to_string());
            bind_values.push(Value::Text(term.clone())); // phone
        }

        or_clauses.push("CAST(patients.patient_id AS TEXT) = ?".to_string());
        or_clauses.push(
            "EXISTS (SELECT 1 FROM prescriptions p WHERE p.patient_id = patients.patient_id AND CAST(p.prescription_id AS TEXT) = ?)".to_string(),
        );
        bind_values.push(Value::Text(search.clone())); // patient_id exact
        bind_values.push(Value::Text(search.clone())); // prescription_id exact

        filters.push(format!("({})", or_clauses.join(" OR ")));
    }
    if let Some(value) = gender {
        filters.push("patients.gender = ?".to_string());
        bind_values.push(Value::Text(value));
    }
    if let Some(value) = q.age_min {
        filters.push("CAST(patients.age AS INTEGER) >= ?".to_string());
        bind_values.push(Value::Integer(value));
    }
    if let Some(value) = q.age_max {
        filters.push("CAST(patients.age AS INTEGER) <= ?".to_string());
        bind_values.push(Value::Integer(value));
    }

    let date_from = super::opt_trim(q.date_from.as_ref());
    let date_to = super::opt_trim(q.date_to.as_ref());
    match (&date_from, &date_to) {
        (Some(from), Some(to)) => {
            filters.push(
                "EXISTS (SELECT 1 FROM prescriptions p WHERE p.patient_id = patients.patient_id AND p.created_at >= ? AND p.created_at <= ? || ' 23:59:59')"
                    .to_string(),
            );
            bind_values.push(Value::Text(from.clone()));
            bind_values.push(Value::Text(to.clone()));
        }
        (Some(from), None) => {
            filters.push(
                "EXISTS (SELECT 1 FROM prescriptions p WHERE p.patient_id = patients.patient_id AND p.created_at >= ?)"
                    .to_string(),
            );
            bind_values.push(Value::Text(from.clone()));
        }
        (None, Some(to)) => {
            filters.push(
                "EXISTS (SELECT 1 FROM prescriptions p WHERE p.patient_id = patients.patient_id AND p.created_at <= ? || ' 23:59:59')"
                    .to_string(),
            );
            bind_values.push(Value::Text(to.clone()));
        }
        (None, None) => {}
    }

    if let Some(value) = q.min_visits {
        filters.push(
            "(SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = patients.patient_id) >= ?"
                .to_string(),
        );
        bind_values.push(Value::Integer(value));
    }

    let order_col = match q.sort_by.as_deref() {
        Some("name") => "patients.name",
        Some("age") => "patients.age",
        Some("gender") => "patients.gender",
        Some("complaint") => LAST_COMPLAINT_SQL,
        Some("diagnosis") => LAST_DIAGNOSIS_SQL,
        _ => "patients.patient_id",
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
        "SELECT patients.patient_id, patients.patient_code, patients.name, patients.age, patients.gender, patients.phone, patients.address, patients.created_at, patients.updated_at, {LAST_DIAGNOSIS_SQL}, {LAST_COMPLAINT_SQL}, (SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = patients.patient_id) FROM patients {where_clause} ORDER BY {order_col} {order_dir}"
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params_from_iter(bind_values), patient_list_item_from_row)
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn patients_visits(state: State<'_, Db>, id: i64) -> Result<Vec<PatientVisit>, String> {
    let conn = state.conn()?;
    let mut stmt = conn
        .prepare(
            "SELECT prescription_id, visit_no, created_at, (SELECT ps.content FROM prescription_sections ps WHERE ps.prescription_id = prescriptions.prescription_id AND ps.section_type = 'Provisional Diagnosis' ORDER BY ps.position LIMIT 1), (SELECT ps.content FROM prescription_sections ps WHERE ps.prescription_id = prescriptions.prescription_id AND ps.section_type = 'Chief Complaint' ORDER BY ps.position LIMIT 1) FROM prescriptions WHERE patient_id = ? ORDER BY visit_no DESC, prescription_id DESC",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([id], |row| {
            Ok(PatientVisit {
                id: row.get(0)?,
                visit_no: row.get(1)?,
                created_at: row.get(2)?,
                diagnosis: row.get(3)?,
                complaint: row.get(4)?,
            })
        })
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    Ok(rows)
}

#[tauri::command]
pub fn patients_create(state: State<'_, Db>, input: PatientFormValues) -> Result<PatientRecord, String> {
    let values = normalize_patient(&input)?;
    let conn = state.conn()?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let max_seq: i64 = tx
        .query_row(
            "SELECT COALESCE(MAX(CAST(SUBSTR(patient_code, 5) AS INTEGER)), 0) FROM patients",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let patient_code = format!("PAT-{:06}", max_seq + 1);
    tx.execute(
        "INSERT INTO patients (patient_code, name, age, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)",
        params![patient_code, values.name, values.age, values.gender, values.phone, values.address],
    )
    .map_err(|e| e.to_string())?;
    let id = tx.last_insert_rowid();
    tx.commit().map_err(|e| e.to_string())?;

    fetch_patient(&conn, id)?.ok_or_else(|| "Could not load created patient.".to_string())
}

#[tauri::command]
pub fn patients_update(
    state: State<'_, Db>,
    id: i64,
    input: PatientFormValues,
) -> Result<PatientRecord, String> {
    let values = normalize_patient(&input)?;
    let conn = state.conn()?;

    let changes = conn
        .execute(
            "UPDATE patients SET name = ?, age = ?, gender = ?, phone = ?, address = ?, updated_at = (CURRENT_TIMESTAMP) WHERE patient_id = ?",
            params![values.name, values.age, values.gender, values.phone, values.address, id],
        )
        .map_err(|e| e.to_string())?;
    if changes == 0 {
        return Err(format!("Patient {id} not found"));
    }

    fetch_patient(&conn, id)?.ok_or_else(|| format!("Patient {id} not found"))
}

#[tauri::command]
pub fn patients_delete(
    state: State<'_, Db>,
    id: i64,
    options: Option<PatientDeleteOptions>,
) -> Result<PatientDeleteResult, String> {
    let options = options.unwrap_or_default();
    let conn = state.conn()?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    let existing: Option<i64> = tx
        .query_row(
            "SELECT patient_id FROM patients WHERE patient_id = ?",
            [id],
            |row| row.get(0),
        )
        .optional()
        .map_err(|e| e.to_string())?;
    if existing.is_none() {
        return Err(format!("Patient {id} not found"));
    }

    // Deleting a patient cascades to their prescriptions. Require the caller
    // to acknowledge the exact count so prescriptions can never be destroyed
    // by a stale UI.
    let count: i64 = tx
        .query_row(
            "SELECT COUNT(*) FROM prescriptions WHERE patient_id = ?",
            [id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if count > 0 && options.acknowledged_prescriptions != Some(count) {
        let plural = if count == 1 { "" } else { "s" };
        return Err(format!(
            "Patient {id} has {count} prescription{plural} that will also be deleted. Refresh and confirm the deletion again."
        ));
    }

    tx.execute("DELETE FROM patients WHERE patient_id = ?", [id])
        .map_err(|e| e.to_string())?;
    tx.commit().map_err(|e| e.to_string())?;

    Ok(PatientDeleteResult {
        id,
        deleted_prescriptions: count,
    })
}

#[tauri::command]
pub fn patients_prescription_count(state: State<'_, Db>, id: i64) -> Result<i64, String> {
    let conn = state.conn()?;
    prescription_count(&conn, id)
}
