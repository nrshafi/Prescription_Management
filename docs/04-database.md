# 04 — Database

SQLite via better-sqlite3, schema managed by Drizzle ORM. Database file is stored
in the OS `userData` (app-data) directory. Pragmas: WAL mode, `foreign_keys = ON`.

## Entity Relationships

```text
doctor_profile (single row)
paper_settings (single row)

patients 1───* prescriptions
prescriptions 1───* prescription_sections
prescriptions 1───* prescription_medicines
templates 1───* prescriptions
presets (standalone, by category)
```

## Tables

### doctor_profile
Single record only.

| Field          | Type    |
| -------------- | ------- |
| id             | integer (PK) |
| name           | text    |
| degrees        | text    |
| speciality     | text    |
| phone          | text    |
| email          | text    |
| address        | text    |
| chamber        | text    |
| logo_path      | text    |
| signature_path | text    |

### patients

| Field        | Type     |
| ------------ | -------- |
| id           | integer (PK) |
| patient_code | text (unique, e.g. `PAT-000001`) |
| name         | text     |
| age          | text     |
| gender       | text     |
| phone        | text     |
| address      | text     |
| created_at   | datetime |
| updated_at   | datetime |

### prescriptions

| Field       | Type     |
| ----------- | -------- |
| id          | integer (PK) |
| patient_id  | integer (FK → patients.id) |
| template_id | integer (FK → templates.id) |
| visit_no    | integer  |
| created_at  | datetime |
| updated_at  | datetime |

### prescription_sections
The most important table — keeps prescription content future-proof.

| Field           | Type    |
| --------------- | ------- |
| id              | integer (PK) |
| prescription_id | integer (FK → prescriptions.id) |
| section_type    | text    |
| content         | text    |
| position        | integer |

`section_type` values (from wireframe): `Chief Complaint` (C/C),
`Examination` (O/E), `Investigation` (Inv), `Diagnosis` (Dia), `Advice`,
`Follow Up`.

### prescription_medicines

| Field           | Type    |
| --------------- | ------- |
| id              | integer (PK) |
| prescription_id | integer (FK → prescriptions.id) |
| medicine_name   | text    |
| dosage          | text    |
| frequency       | text    |
| duration        | text    |
| notes           | text    |
| position        | integer |

### presets

| Field    | Type    |
| -------- | ------- |
| id       | integer (PK) |
| category | text    |
| title    | text    |
| content  | text    |

`category` values: `Medicine`, `Advice`, `Diagnosis`, `Investigation`.

### templates

| Field       | Type    |
| ----------- | ------- |
| id          | integer (PK) |
| name        | text    |
| paper_size  | text    |
| layout_json | text    |

One record in v1; architecture supports unlimited templates later.

### paper_settings
Single record (default A4).

| Field         | Type   |
| ------------- | ------ |
| id            | integer (PK) |
| width_mm      | number |
| height_mm     | number |
| margin_top    | number |
| margin_bottom | number |
| margin_left   | number |
| margin_right  | number |

Default A4: 210 × 297 mm. Later: A5, Letter, Custom — no rewrite required.

## Code Generation Rules

- **patient_code:** zero-padded sequence `PAT-000001`, generated on patient
  creation (derived from max existing sequence within a transaction).
- **Pres_ID:** prescription `id` surfaced as a searchable identifier.
- **visit_no:** incremented per patient (count of that patient's prescriptions + 1)
  at creation time, inside a transaction.

## Notes

- Cascade deletes: removing a prescription removes its sections and medicines.
- Timestamps stored as ISO datetime; `updated_at` refreshed on writes.
- Search supports Patient_ID, Pres_ID, Name, and Phone (see screens doc).
