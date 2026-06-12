use std::collections::HashMap;

use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::Db;

pub const PRESET_CATEGORIES: [&str; 5] = [
    "Chief Complaint",
    "Medicine",
    "Advice",
    "Investigations",
    "Provisional Diagnosis",
];

pub const PRESET_BUNDLE_CATEGORIES: [&str; 2] = ["Chief Complaint", "Provisional Diagnosis"];

pub const PRESET_LINK_KINDS: [&str; 4] = [
    "Medicine",
    "Investigations",
    "Advice",
    "Provisional Diagnosis",
];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetLinkRecord {
    pub id: i64,
    pub owner_preset_id: i64,
    pub target_kind: String,
    pub target_preset_id: Option<i64>,
    pub label: String,
    pub dosage: Option<String>,
    pub frequency: Option<String>,
    pub duration: Option<String>,
    pub position: i64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetRecord {
    pub id: i64,
    pub category: String,
    pub title: String,
    pub content: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub links: Option<Vec<PresetLinkRecord>>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetLinkInput {
    pub target_kind: String,
    #[serde(default)]
    pub target_preset_id: Option<i64>,
    pub label: String,
    #[serde(default)]
    pub dosage: Option<String>,
    #[serde(default)]
    pub frequency: Option<String>,
    #[serde(default)]
    pub duration: Option<String>,
    #[serde(default)]
    pub position: Option<i64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetFormValues {
    pub category: String,
    pub title: String,
    #[serde(default)]
    pub content: Option<String>,
    #[serde(default)]
    pub links: Option<Vec<PresetLinkInput>>,
}

struct NormalizedPresetLink {
    target_kind: String,
    target_preset_id: Option<i64>,
    label: String,
    dosage: String,
    frequency: String,
    duration: String,
    position: i64,
}

struct NormalizedPreset {
    category: String,
    title: String,
    content: String,
    links: Vec<NormalizedPresetLink>,
}

fn is_bundle_category(category: &str) -> bool {
    PRESET_BUNDLE_CATEGORIES.contains(&category)
}

/// Mirrors the shared Zod `presetFormSchema` rules.
fn normalize_preset(input: &PresetFormValues) -> Result<NormalizedPreset, String> {
    if !PRESET_CATEGORIES.contains(&input.category.as_str()) {
        return Err("Invalid preset category".to_string());
    }
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("Title is required".to_string());
    }
    super::ensure_max_len(&title, 160, "Title")?;

    let content = input.content.as_deref().unwrap_or("").trim().to_string();
    super::ensure_max_len(&content, 4000, "Content")?;

    let mut links = Vec::new();
    if is_bundle_category(&input.category) {
        for (index, link) in input.links.iter().flatten().enumerate() {
            if !PRESET_LINK_KINDS.contains(&link.target_kind.as_str()) {
                return Err("Invalid linked item kind".to_string());
            }
            if let Some(target) = link.target_preset_id {
                if target <= 0 {
                    return Err("Invalid linked preset".to_string());
                }
            }
            let label = link.label.trim().to_string();
            if label.is_empty() {
                continue;
            }
            super::ensure_max_len(&label, 160, "Linked item")?;
            let dosage = link.dosage.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&dosage, 120, "Dosage")?;
            let frequency = link.frequency.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&frequency, 120, "Frequency")?;
            let duration = link.duration.as_deref().unwrap_or("").trim().to_string();
            super::ensure_max_len(&duration, 120, "Duration")?;

            links.push(NormalizedPresetLink {
                target_kind: link.target_kind.clone(),
                target_preset_id: link.target_preset_id,
                label,
                dosage,
                frequency,
                duration,
                position: link.position.unwrap_or(index as i64),
            });
        }
    }

    Ok(NormalizedPreset {
        category: input.category.clone(),
        title,
        content,
        links,
    })
}

fn attach_preset_links(
    conn: &Connection,
    rows: Vec<PresetRecord>,
) -> Result<Vec<PresetRecord>, String> {
    let bundle_ids: Vec<i64> = rows
        .iter()
        .filter(|row| is_bundle_category(&row.category))
        .map(|row| row.id)
        .collect();
    if bundle_ids.is_empty() {
        return Ok(rows);
    }

    let placeholders = vec!["?"; bundle_ids.len()].join(", ");
    let sql = format!(
        "SELECT link_id, owner_preset_id, target_kind, target_preset_id, label, dosage, frequency, duration, position FROM preset_links WHERE owner_preset_id IN ({placeholders}) ORDER BY owner_preset_id, position"
    );
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let links = stmt
        .query_map(
            params_from_iter(bundle_ids.iter().map(|id| Value::Integer(*id))),
            |row| {
                Ok(PresetLinkRecord {
                    id: row.get(0)?,
                    owner_preset_id: row.get(1)?,
                    target_kind: row.get(2)?,
                    target_preset_id: row.get(3)?,
                    label: row.get(4)?,
                    dosage: row.get(5)?,
                    frequency: row.get(6)?,
                    duration: row.get(7)?,
                    position: row.get(8)?,
                })
            },
        )
        .map_err(|e| e.to_string())?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;

    let mut by_owner: HashMap<i64, Vec<PresetLinkRecord>> = HashMap::new();
    for link in links {
        by_owner.entry(link.owner_preset_id).or_default().push(link);
    }

    Ok(rows
        .into_iter()
        .map(|mut row| {
            if is_bundle_category(&row.category) {
                row.links = Some(by_owner.remove(&row.id).unwrap_or_default());
            }
            row
        })
        .collect())
}

fn replace_preset_links(
    conn: &Connection,
    owner_preset_id: i64,
    links: &[NormalizedPresetLink],
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM preset_links WHERE owner_preset_id = ?",
        [owner_preset_id],
    )
    .map_err(|e| e.to_string())?;

    for link in links {
        let is_medicine = link.target_kind == "Medicine";
        let dosage = if is_medicine && !link.dosage.is_empty() {
            Some(link.dosage.as_str())
        } else {
            None
        };
        let frequency = if is_medicine && !link.frequency.is_empty() {
            Some(link.frequency.as_str())
        } else {
            None
        };
        let duration = if is_medicine && !link.duration.is_empty() {
            Some(link.duration.as_str())
        } else {
            None
        };
        conn.execute(
            "INSERT INTO preset_links (owner_preset_id, target_kind, target_preset_id, label, dosage, frequency, duration, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                owner_preset_id,
                link.target_kind,
                link.target_preset_id,
                link.label,
                dosage,
                frequency,
                duration,
                link.position
            ],
        )
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn get_preset_internal(conn: &Connection, id: i64) -> Result<Option<PresetRecord>, String> {
    let preset = conn
        .query_row(
            "SELECT preset_id, category, title, content FROM presets WHERE preset_id = ?",
            [id],
            |row| {
                Ok(PresetRecord {
                    id: row.get(0)?,
                    category: row.get(1)?,
                    title: row.get(2)?,
                    content: row.get(3)?,
                    links: None,
                })
            },
        )
        .optional()
        .map_err(|e| e.to_string())?;

    let Some(preset) = preset else {
        return Ok(None);
    };
    let mut rows = attach_preset_links(conn, vec![preset])?;
    Ok(rows.pop())
}

pub(crate) fn import_preset(conn: &Connection, input: &PresetFormValues) -> Result<i64, String> {
    let values = normalize_preset(input)?;
    conn.execute(
        "INSERT INTO presets (category, title, content) VALUES (?, ?, ?)",
        params![
            values.category,
            values.title,
            if values.content.is_empty() { None } else { Some(values.content.as_str()) }
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = conn.last_insert_rowid();
    replace_preset_links(conn, id, &values.links)?;
    Ok(id)
}

#[tauri::command]
pub fn presets_list(
    state: State<'_, Db>,
    category: Option<String>,
) -> Result<Vec<PresetRecord>, String> {
    let conn = state.conn()?;

    let map_row = |row: &rusqlite::Row<'_>| -> rusqlite::Result<PresetRecord> {
        Ok(PresetRecord {
            id: row.get(0)?,
            category: row.get(1)?,
            title: row.get(2)?,
            content: row.get(3)?,
            links: None,
        })
    };

    let rows = match category {
        Some(category) if !category.is_empty() => {
            let mut stmt = conn
                .prepare("SELECT preset_id, category, title, content FROM presets WHERE category = ? ORDER BY category, title")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([category], map_row)
                .map_err(|e| e.to_string())?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;
            rows
        }
        _ => {
            let mut stmt = conn
                .prepare("SELECT preset_id, category, title, content FROM presets ORDER BY category, title")
                .map_err(|e| e.to_string())?;
            let rows = stmt
                .query_map([], map_row)
                .map_err(|e| e.to_string())?
                .collect::<rusqlite::Result<Vec<_>>>()
                .map_err(|e| e.to_string())?;
            rows
        }
    };

    attach_preset_links(&conn, rows)
}

#[tauri::command]
pub fn presets_get(state: State<'_, Db>, id: i64) -> Result<Option<PresetRecord>, String> {
    let conn = state.conn()?;
    get_preset_internal(&conn, id)
}

#[tauri::command]
pub fn presets_create(state: State<'_, Db>, input: PresetFormValues) -> Result<PresetRecord, String> {
    let values = normalize_preset(&input)?;
    let conn = state.conn()?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "INSERT INTO presets (category, title, content) VALUES (?, ?, ?)",
        params![
            values.category,
            values.title,
            if values.content.is_empty() { None } else { Some(values.content.as_str()) }
        ],
    )
    .map_err(|e| e.to_string())?;
    let id = tx.last_insert_rowid();
    replace_preset_links(&tx, id, &values.links)?;
    tx.commit().map_err(|e| e.to_string())?;

    get_preset_internal(&conn, id)?.ok_or_else(|| "Could not load created preset.".to_string())
}

#[tauri::command]
pub fn presets_update(
    state: State<'_, Db>,
    id: i64,
    input: PresetFormValues,
) -> Result<PresetRecord, String> {
    let values = normalize_preset(&input)?;
    let conn = state.conn()?;

    let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
    tx.execute(
        "UPDATE presets SET category = ?, title = ?, content = ? WHERE preset_id = ?",
        params![
            values.category,
            values.title,
            if values.content.is_empty() { None } else { Some(values.content.as_str()) },
            id
        ],
    )
    .map_err(|e| e.to_string())?;
    replace_preset_links(&tx, id, &values.links)?;
    tx.commit().map_err(|e| e.to_string())?;

    get_preset_internal(&conn, id)?.ok_or_else(|| format!("Preset {id} not found"))
}

#[derive(Debug, Serialize)]
pub struct PresetDeleteResult {
    pub id: i64,
}

#[tauri::command]
pub fn presets_delete(state: State<'_, Db>, id: i64) -> Result<PresetDeleteResult, String> {
    let conn = state.conn()?;
    conn.execute("DELETE FROM presets WHERE preset_id = ?", [id])
        .map_err(|e| e.to_string())?;
    Ok(PresetDeleteResult { id })
}
