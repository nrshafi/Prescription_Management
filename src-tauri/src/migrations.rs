use rusqlite::Connection;

/// Ordered, append-only migration scripts. The current schema version is
/// tracked with `PRAGMA user_version`.
const MIGRATIONS: [&str; 4] = [
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
CREATE TABLE IF NOT EXISTS prescriptions (
  prescription_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  patient_id INTEGER NOT NULL,
  visit_no INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE no action ON DELETE cascade
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
    r#"
CREATE TABLE prescriptions_new (
  prescription_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  patient_id INTEGER NOT NULL,
  visit_no INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE no action ON DELETE cascade
);
INSERT INTO prescriptions_new (prescription_id, patient_id, visit_no, created_at, updated_at)
  SELECT prescription_id, patient_id, visit_no, created_at, updated_at FROM prescriptions;
DROP TABLE prescriptions;
ALTER TABLE prescriptions_new RENAME TO prescriptions;
DROP TABLE IF EXISTS templates;
"#,
];

fn user_version(conn: &Connection) -> Result<i64, String> {
    conn.query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(|e| e.to_string())
}

pub fn run_migrations(conn: &Connection) -> Result<(), String> {
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

/// Rebuilds the `prescriptions` table without the legacy `template_id` foreign
/// key when an older migration dropped the `templates` table but left the
/// dangling reference behind. With `PRAGMA foreign_keys = ON`, that dangling
/// reference makes any write touching `prescriptions` fail with
/// "no such table: main.templates".
pub fn ensure_prescriptions_no_templates_fk(conn: &Connection) -> Result<(), String> {
    let sql: String = conn
        .query_row(
            "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'prescriptions'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    if !sql.to_lowercase().contains("templates") {
        return Ok(());
    }

    conn.execute_batch(
        "PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE prescriptions_new (
  prescription_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  patient_id INTEGER NOT NULL,
  visit_no INTEGER DEFAULT 1 NOT NULL,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE no action ON DELETE cascade
);
INSERT INTO prescriptions_new (prescription_id, patient_id, visit_no, created_at, updated_at)
  SELECT prescription_id, patient_id, visit_no, created_at, updated_at FROM prescriptions;
DROP TABLE prescriptions;
ALTER TABLE prescriptions_new RENAME TO prescriptions;
COMMIT;
PRAGMA foreign_keys = ON;",
    )
    .map_err(|e| e.to_string())
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

#[cfg(test)]
mod tests {
    use super::*;

    /// Reproduces the legacy schema where `prescriptions` referenced a
    /// `templates` table that a later migration dropped, leaving a dangling
    /// foreign key. Inserting a patient then failed with
    /// "no such table: main.templates".
    #[test]
    fn ensure_prescriptions_no_templates_fk_repairs_dangling_reference() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE patients (
               patient_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
               patient_code TEXT NOT NULL,
               name TEXT NOT NULL
             );
             CREATE TABLE prescriptions (
               prescription_id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
               patient_id INTEGER NOT NULL,
               template_id INTEGER,
               visit_no INTEGER DEFAULT 1 NOT NULL,
               created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
               updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
               FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON UPDATE no action ON DELETE cascade,
               FOREIGN KEY (template_id) REFERENCES templates(template_id) ON UPDATE no action ON DELETE no action
             );",
        )
        .unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn.execute(
            "INSERT INTO patients (patient_code, name) VALUES ('PAT-000001', 'Test')",
            [],
        )
        .unwrap();

        // With foreign keys enforced, writing to prescriptions resolves the
        // dangling templates reference and fails.
        let broken = conn.execute(
            "INSERT INTO prescriptions (patient_id, visit_no) VALUES (1, 1)",
            [],
        );
        assert!(broken
            .unwrap_err()
            .to_string()
            .contains("no such table: main.templates"));

        ensure_prescriptions_no_templates_fk(&conn).unwrap();

        // After the repair the table no longer references templates and the
        // insert succeeds.
        conn.execute(
            "INSERT INTO prescriptions (patient_id, visit_no) VALUES (1, 1)",
            [],
        )
        .unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM prescriptions", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    /// A healthy `prescriptions` table without the legacy reference must be
    /// left untouched.
    #[test]
    fn ensure_prescriptions_no_templates_fk_noop_on_clean_schema() {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        ensure_prescriptions_no_templates_fk(&conn).unwrap();

        let sql: String = conn
            .query_row(
                "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'prescriptions'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert!(!sql.to_lowercase().contains("templates"));
    }
}
