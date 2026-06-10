import type Database from 'better-sqlite3'
import {
  type PatientDeleteOptions,
  type PatientDeleteResult,
  type PatientFormValues,
  type PatientListItem,
  type PatientQuery,
  type PatientRecord,
  type PatientVisit,
  patientFormSchema,
  patientQuerySchema,
  type SortDirection
} from '../../shared/patient'
import { getDb } from '../db/client'

function toPatientRecord(row: {
  patient_id: number
  patient_code: string
  name: string
  age: string | null
  gender: string | null
  phone: string | null
  address: string | null
  created_at: string
  updated_at: string
}): PatientRecord {
  return {
    id: row.patient_id,
    patientCode: row.patient_code,
    name: row.name,
    age: row.age,
    gender: row.gender,
    phone: row.phone,
    address: row.address,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

function nextPatientCode(db: Database.Database): string {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(CAST(SUBSTR(patient_code, 5) AS INTEGER)), 0) AS maxSeq FROM patients`
    )
    .get() as { maxSeq: number }
  const next = (row?.maxSeq ?? 0) + 1
  return `PAT-${String(next).padStart(6, '0')}`
}

function normalize(values: PatientFormValues): {
  name: string
  age: string | null
  gender: string | null
  phone: string | null
  address: string | null
} {
  return {
    name: values.name.trim(),
    age: values.age?.trim() ? values.age.trim() : null,
    gender: values.gender?.trim() ? values.gender.trim() : null,
    phone: values.phone?.trim() ? values.phone.trim() : null,
    address: values.address?.trim() ? values.address.trim() : null
  }
}

const LAST_COMPLAINT_SQL = `(
  SELECT ps.content
  FROM prescription_sections ps
  JOIN prescriptions p ON p.prescription_id = ps.prescription_id
  WHERE p.patient_id = patients.patient_id
    AND ps.section_type = 'Chief Complaint'
    AND ps.content IS NOT NULL
    AND ps.content <> ''
  ORDER BY p.visit_no DESC, p.prescription_id DESC
  LIMIT 1
)`

const LAST_DIAGNOSIS_SQL = `(
  SELECT ps.content
  FROM prescription_sections ps
  JOIN prescriptions p ON p.prescription_id = ps.prescription_id
  WHERE p.patient_id = patients.patient_id
    AND ps.section_type = 'Provisional Diagnosis'
    AND ps.content IS NOT NULL
    AND ps.content <> ''
  ORDER BY p.visit_no DESC, p.prescription_id DESC
  LIMIT 1
)`

export function listPatients(query: PatientQuery = {}): PatientListItem[] {
  const db = getDb()
  const { search, gender, ageMin, ageMax, dateFrom, dateTo, minVisits, sortBy, sortDir } =
    patientQuerySchema.parse(query)

  const filters: string[] = []
  const params: unknown[] = []

  if (search) {
    const term = `%${search}%`
    filters.push(
      `(patients.patient_code LIKE ? OR patients.name LIKE ? OR patients.phone LIKE ? OR CAST(patients.patient_id AS TEXT) = ? OR EXISTS (
        SELECT 1 FROM prescriptions p
        WHERE p.patient_id = patients.patient_id AND CAST(p.prescription_id AS TEXT) = ?
      ))`
    )
    params.push(term, term, term, search, search)
  }
  if (gender) {
    filters.push('patients.gender = ?')
    params.push(gender)
  }
  if (ageMin !== undefined && ageMin !== null) {
    filters.push('CAST(patients.age AS INTEGER) >= ?')
    params.push(ageMin)
  }
  if (ageMax !== undefined && ageMax !== null) {
    filters.push('CAST(patients.age AS INTEGER) <= ?')
    params.push(ageMax)
  }
  if (dateFrom && dateTo) {
    filters.push(`EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.patient_id = patients.patient_id
        AND p.created_at >= ?
        AND p.created_at <= ? || ' 23:59:59'
    )`)
    params.push(dateFrom, dateTo)
  } else if (dateFrom) {
    filters.push(`EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.patient_id = patients.patient_id AND p.created_at >= ?
    )`)
    params.push(dateFrom)
  } else if (dateTo) {
    filters.push(`EXISTS (
      SELECT 1 FROM prescriptions p
      WHERE p.patient_id = patients.patient_id AND p.created_at <= ? || ' 23:59:59'
    )`)
    params.push(dateTo)
  }
  if (minVisits !== undefined && minVisits !== null) {
    filters.push(`(
      SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = patients.patient_id
    ) >= ?`)
    params.push(minVisits)
  }

  const sortColumns: Record<string, string> = {
    id: 'patients.patient_id',
    name: 'patients.name',
    age: 'patients.age',
    gender: 'patients.gender',
    complaint: LAST_COMPLAINT_SQL,
    diagnosis: LAST_DIAGNOSIS_SQL
  }
  const orderCol = sortColumns[sortBy] ?? 'patients.patient_id'
  const orderDir = (sortDir as SortDirection) === 'asc' ? 'ASC' : 'DESC'

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const sql = `
SELECT
  patients.patient_id AS id,
  patients.patient_code AS patientCode,
  patients.name AS name,
  patients.age AS age,
  patients.gender AS gender,
  patients.phone AS phone,
  patients.address AS address,
  patients.created_at AS createdAt,
  patients.updated_at AS updatedAt,
  ${LAST_DIAGNOSIS_SQL} AS lastDiagnosis,
  ${LAST_COMPLAINT_SQL} AS lastComplaint,
  (SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = patients.patient_id) AS visitCount
FROM patients
${whereClause}
ORDER BY ${orderCol} ${orderDir}
`

  return db.prepare(sql).all(...params) as PatientListItem[]
}

export function getPatient(id: number): PatientRecord | undefined {
  const db = getDb()
  const patient = db
    .prepare(
      `SELECT patient_id, patient_code, name, age, gender, phone, address, created_at, updated_at FROM patients WHERE patient_id = ?`
    )
    .get(id) as Parameters<typeof toPatientRecord>[0] | undefined
  return patient ? toPatientRecord(patient) : undefined
}

export function getPatientVisits(patientId: number): PatientVisit[] {
  const db = getDb()
  return db
    .prepare(
      `
SELECT
  prescription_id AS id,
  visit_no AS visitNo,
  created_at AS createdAt,
  (
    SELECT ps.content FROM prescription_sections ps
    WHERE ps.prescription_id = prescriptions.prescription_id AND ps.section_type = 'Provisional Diagnosis'
    ORDER BY ps.position LIMIT 1
  ) AS diagnosis,
  (
    SELECT ps.content FROM prescription_sections ps
    WHERE ps.prescription_id = prescriptions.prescription_id AND ps.section_type = 'Chief Complaint'
    ORDER BY ps.position LIMIT 1
  ) AS complaint
FROM prescriptions
WHERE patient_id = ?
ORDER BY visit_no DESC, prescription_id DESC
`
    )
    .all(patientId) as PatientVisit[]
}

export function createPatient(input: PatientFormValues): PatientRecord {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  const created = db.transaction(() => {
    const patientCode = nextPatientCode(db)
    const info = db
      .prepare(
        `INSERT INTO patients (patient_code, name, age, gender, phone, address) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(patientCode, values.name, values.age, values.gender, values.phone, values.address)
    const row = db
      .prepare(
        `SELECT patient_id, patient_code, name, age, gender, phone, address, created_at, updated_at FROM patients WHERE patient_id = ?`
      )
      .get(Number(info.lastInsertRowid)) as Parameters<typeof toPatientRecord>[0]
    return row
  })()

  return toPatientRecord(created)
}

export function updatePatient(id: number, input: PatientFormValues): PatientRecord {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  const updated = db
    .prepare(
      `UPDATE patients SET name = ?, age = ?, gender = ?, phone = ?, address = ?, updated_at = (CURRENT_TIMESTAMP) WHERE patient_id = ?`
    )
    .run(values.name, values.age, values.gender, values.phone, values.address, id)

  if (updated.changes === 0) {
    throw new Error(`Patient ${id} not found`)
  }

  const row = db
    .prepare(
      `SELECT patient_id, patient_code, name, age, gender, phone, address, created_at, updated_at FROM patients WHERE patient_id = ?`
    )
    .get(id) as Parameters<typeof toPatientRecord>[0]

  return toPatientRecord(row)
}

export function prescriptionCount(patientId: number): number {
  const db = getDb()
  const row = db
    .prepare(`SELECT COUNT(*) AS count FROM prescriptions WHERE patient_id = ?`)
    .get(patientId) as { count: number }
  return row?.count ?? 0
}

export function deletePatient(
  id: number,
  options: PatientDeleteOptions = {}
): PatientDeleteResult {
  const db = getDb()

  return db.transaction(() => {
    const existing = db
      .prepare('SELECT patient_id FROM patients WHERE patient_id = ?')
      .get(id) as { patient_id: number } | undefined
    if (!existing) {
      throw new Error(`Patient ${id} not found`)
    }

    // Deleting a patient cascades to their prescriptions. Require the caller
    // to acknowledge the exact count so prescriptions can never be destroyed
    // by a stale UI (e.g. a visit added between opening the dialog and
    // confirming the delete).
    const count = prescriptionCount(id)
    if (count > 0 && options.acknowledgedPrescriptions !== count) {
      throw new Error(
        `Patient ${id} has ${count} prescription${count === 1 ? '' : 's'} that will also be deleted. Refresh and confirm the deletion again.`
      )
    }

    db.prepare('DELETE FROM patients WHERE patient_id = ?').run(id)
    return { id, deletedPrescriptions: count }
  })()
}
