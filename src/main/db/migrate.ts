import type Database from 'better-sqlite3'
import { getDb } from './client'

const MIGRATIONS: string[] = [
  `
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
`,
  `
UPDATE prescription_sections SET section_type = 'Provisional Diagnosis' WHERE section_type = 'Probational Diagnosis';
UPDATE presets SET category = 'Provisional Diagnosis' WHERE category = 'Probational Diagnosis';
`,
  `
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
`
]



function bootstrapUserVersionFromDrizzle(db: Database.Database): void {
  const version = db.pragma('user_version', { simple: true }) as number
  if (version > 0) return
  const drizzleTable = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`
    )
    .get() as { name: string } | undefined
  if (drizzleTable) {
    db.pragma(`user_version = ${MIGRATIONS.length}`)
  }
}

export function runMigrations(): void {
  const db = getDb()
  bootstrapUserVersionFromDrizzle(db)
  const current = db.pragma('user_version', { simple: true }) as number

  for (let i = current; i < MIGRATIONS.length; i++) {
    const migrate = db.transaction(() => {
      db.exec(MIGRATIONS[i])
      db.pragma(`user_version = ${i + 1}`)
    })
    migrate()
  }
}

export function ensureSingletonRows(): void {
  const db = getDb()
  const doctor = db.prepare('SELECT doctor_id FROM doctor_profile WHERE doctor_id = 1').get()
  if (!doctor) {
    db.prepare('INSERT INTO doctor_profile (doctor_id) VALUES (1)').run()
  }

  const paper = db
    .prepare('SELECT paper_setting_id FROM paper_settings WHERE paper_setting_id = 1')
    .get()
  if (!paper) {
    db.prepare('INSERT INTO paper_settings (paper_setting_id) VALUES (1)').run()
  }
}
