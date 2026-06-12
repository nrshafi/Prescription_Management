use rusqlite::Connection;

/// Ordered, append-only migration scripts. The current schema version is
/// tracked with `PRAGMA user_version`, mirroring the previous Electron
/// implementation so existing databases continue to migrate cleanly.
const MIGRATIONS: [&str; 3] = [
    r#"
CREATE TABLE IF NOT EXISTS doctor_profile (
  doctor_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT,
  degrees TEXT,
  speciality TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  chamber TEXT,
  logo_path TEXT,
  signature_path TEXT
);
CREATE TABLE IF NOT EXISTS paper_settings (
  paper_setting_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  width_mm REAL DEFAULT 210 NOT NULL,
  height_mm REAL DEFAULT 297 NOT NULL,
  margin_top REAL DEFAULT 10 NOT NULL,
  margin_bottom REAL DEFAULT 10 NOT NULL,
  margin_left REAL DEFAULT 10 NOT NULL,
  margin_right REAL DEFAULT 10 NOT NULL
);
CREATE TABLE IF NOT EXISTS patients (
  patient_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  patient_code TEXT NOT NULL,
  name TEXT NOT NULL,
  age TEXT,
  gender TEXT,
  phone TEXT,
  address TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS patients_patient_code_unique ON patients (patient_code);
CREATE TABLE IF NOT EXISTS templates (
  template_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  name TEXT NOT NULL,
  paper_size TEXT DEFAULT 'A4' NOT NULL,
  layout_json TEXT
);
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  patient_id INTEGER NOT NULL,
  template_id INTEGER,
  visit_no INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (template_id) REFERENCES templates(template_id) ON UPDATE no action ON DELETE no action
);
CREATE TABLE IF NOT EXISTS prescription_sections (
  section_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  prescription_id INTEGER NOT NULL,
  section_type TEXT NOT NULL,
  content TEXT,
  position INTEGER DEFAULT 0 NOT NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS prescription_medicines (
  medicine_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  prescription_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  notes TEXT,
  position INTEGER DEFAULT 0 NOT NULL,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(prescription_id) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE IF NOT EXISTS presets (
  preset_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT
);
"#,
    r#"
UPDATE prescription_sections SET section_type = 'Provisional Diagnosis' WHERE section_type = 'Probational Diagnosis';
UPDATE presets SET category = 'Provisional Diagnosis' WHERE category = 'Probational Diagnosis';
"#,
    r#"
CREATE TABLE IF NOT EXISTS preset_links (
  link_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  owner_preset_id INTEGER NOT NULL,
  target_kind TEXT NOT NULL,
  target_preset_id INTEGER,
  label TEXT NOT NULL,
  dosage TEXT,
  frequency TEXT,
  duration TEXT,
  position INTEGER DEFAULT 0 NOT NULL,
  FOREIGN KEY (owner_preset_id) REFERENCES presets(preset_id) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (target_preset_id) REFERENCES presets(preset_id) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS preset_links_owner_preset_id_idx ON preset_links (owner_preset_id);
CREATE INDEX IF NOT EXISTS preset_links_target_preset_id_idx ON preset_links (target_preset_id);
"#,
];

fn user_version(conn: &Connection) -> Result<i64, String> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}

/// A Drizzle-era database already has the baseline schema (migration 1), but
/// may predate later migrations. Only mark the baseline as applied and let the
/// remaining (idempotent) migrations run so older databases pick up newer
/// tables such as preset_links.
fn bootstrap_user_version_from_drizzle(conn: &Connection) -> Result<(), String> {
    if user_version(conn)? > 0 {
        return Ok(());
    }
    let has_drizzle: bool = conn
        .query_row(
            "SELECT EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations')",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    if has_drizzle {
        conn.execute_batch("PRAGMA user_version = 1;")
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
    bootstrap_user_version_from_drizzle(conn)?;
    let current = user_version(conn)? as usize;

    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current) {
        let script = format!(
            "BEGIN;\n{}\nPRAGMA user_version = {};\nCOMMIT;",
            sql,
            index + 1
        );
        conn.execute_batch(&script)
            .map_err(|e| format!("Migration {} failed: {e}", index + 1))?;
    }
    Ok(())
}

pub fn ensure_singleton_rows(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "INSERT OR IGNORE INTO doctor_profile (doctor_id) VALUES (1);\nINSERT OR IGNORE INTO paper_settings (paper_setting_id) VALUES (1);",
    )
    .map_err(|e| e.to_string())
}

/// Ensures the preset_links table exists even if user_version was already
/// bumped (e.g. by an imported backup) before this migration was added.
pub fn ensure_preset_links_table(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS preset_links (
            link_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            owner_preset_id INTEGER NOT NULL,
            target_kind TEXT NOT NULL,
            target_preset_id INTEGER,
            label TEXT NOT NULL,
            dosage TEXT,
            frequency TEXT,
            duration TEXT,
            position INTEGER DEFAULT 0 NOT NULL,
            FOREIGN KEY (owner_preset_id) REFERENCES presets(preset_id) ON UPDATE no action ON DELETE cascade,
            FOREIGN KEY (target_preset_id) REFERENCES presets(preset_id) ON UPDATE no action ON DELETE set null
        );
        CREATE INDEX IF NOT EXISTS preset_links_owner_preset_id_idx ON preset_links (owner_preset_id);
        CREATE INDEX IF NOT EXISTS preset_links_target_preset_id_idx ON preset_links (target_preset_id);",
    )
    .map_err(|e| e.to_string())
}
