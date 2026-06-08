import { and, asc, desc, eq, like, or, type SQL, sql } from 'drizzle-orm'
import {
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
import { type Patient, patients, prescriptions } from '../db/schema'

function toPatientRecord(patient: Patient): PatientRecord {
  return {
    id: patient.patientId,
    patientCode: patient.patientCode,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    phone: patient.phone,
    address: patient.address,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt
  }
}

function nextPatientCode(): string {
  const db = getDb()
  const row = db
    .select({
      maxSeq: sql<number>`COALESCE(MAX(CAST(SUBSTR(${patients.patientCode}, 5) AS INTEGER)), 0)`
    })
    .from(patients)
    .get()
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

export function listPatients(query: PatientQuery = {}): PatientListItem[] {
  const db = getDb()
  const { search, gender, ageMin, ageMax, dateFrom, dateTo, minVisits, sortBy, sortDir } =
    patientQuerySchema.parse(query)

  const filters: SQL[] = []
  if (search) {
    const term = `%${search}%`
    filters.push(
      or(
        like(patients.patientCode, term),
        like(patients.name, term),
        like(patients.phone, term),
        sql`CAST(${patients.patientId} AS TEXT) = ${search}`,
        sql`EXISTS (
          SELECT 1 FROM prescriptions p
          WHERE p.patient_id = ${patients.patientId} AND CAST(p.prescription_id AS TEXT) = ${search}
        )`
      )!
    )
  }
  if (gender) {
    filters.push(eq(patients.gender, gender)!)
  }
  if (ageMin !== undefined && ageMin !== null) {
    filters.push(sql`CAST(${patients.age} AS INTEGER) >= ${ageMin}`)
  }
  if (ageMax !== undefined && ageMax !== null) {
    filters.push(sql`CAST(${patients.age} AS INTEGER) <= ${ageMax}`)
  }
  if (dateFrom) {
    filters.push(sql`${patients.createdAt} >= ${dateFrom}`)
  }
  if (dateTo) {
    filters.push(sql`${patients.createdAt} <= ${dateTo} || ' 23:59:59'`)
  }
  if (minVisits !== undefined && minVisits !== null) {
    filters.push(sql`(
      SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = ${patients.patientId}
    ) >= ${minVisits}`)
  }

  const visitCount = sql<number>`(
    SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = ${patients.patientId}
  )`

  const baseSortColumns = {
    id: patients.patientId,
    name: patients.name,
    age: patients.age,
    gender: patients.gender
  }
  const baseSortColumn = baseSortColumns[sortBy as keyof typeof baseSortColumns]

  const sortExpr =
    sortBy === 'complaint'
      ? sql`(
          SELECT ps.content
          FROM prescription_sections ps
          JOIN prescriptions p ON p.prescription_id = ps.prescription_id
          WHERE p.patient_id = ${patients.patientId}
            AND ps.section_type = 'Chief Complaint'
            AND ps.content IS NOT NULL AND ps.content <> ''
          ORDER BY p.visit_no DESC, p.prescription_id DESC
          LIMIT 1
        )`
      : sortBy === 'diagnosis'
        ? sql`(
            SELECT ps.content
            FROM prescription_sections ps
            JOIN prescriptions p ON p.prescription_id = ps.prescription_id
            WHERE p.patient_id = ${patients.patientId}
              AND ps.section_type = 'Provisional Diagnosis'
              AND ps.content IS NOT NULL AND ps.content <> ''
            ORDER BY p.visit_no DESC, p.prescription_id DESC
            LIMIT 1
          )`
        : undefined

  const column = sortExpr ?? baseSortColumn
  const orderBy = (sortDir as SortDirection) === 'asc' ? asc(column) : desc(column)

  return db
    .select({
      id: patients.patientId,
      patientCode: patients.patientCode,
      name: patients.name,
      age: patients.age,
      gender: patients.gender,
      phone: patients.phone,
      address: patients.address,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      lastDiagnosis: sql<string | null>`(
        SELECT ps.content
        FROM prescription_sections ps
        JOIN prescriptions p ON p.prescription_id = ps.prescription_id
        WHERE p.patient_id = ${patients.patientId}
          AND ps.section_type = 'Provisional Diagnosis'
          AND ps.content IS NOT NULL AND ps.content <> ''
        ORDER BY p.visit_no DESC, p.prescription_id DESC
        LIMIT 1
      )`,
      lastComplaint: sql<string | null>`(
        SELECT ps.content
        FROM prescription_sections ps
        JOIN prescriptions p ON p.prescription_id = ps.prescription_id
        WHERE p.patient_id = ${patients.patientId}
          AND ps.section_type = 'Chief Complaint'
          AND ps.content IS NOT NULL AND ps.content <> ''
        ORDER BY p.visit_no DESC, p.prescription_id DESC
        LIMIT 1
      )`,
      visitCount
    })
    .from(patients)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy)
    .all()
}

export function getPatient(id: number): PatientRecord | undefined {
  const db = getDb()
  const patient = db.select().from(patients).where(eq(patients.patientId, id)).get()
  return patient ? toPatientRecord(patient) : undefined
}

export function getPatientVisits(patientId: number): PatientVisit[] {
  const db = getDb()
  return db
    .select({
      id: prescriptions.prescriptionId,
      visitNo: prescriptions.visitNo,
      createdAt: prescriptions.createdAt,
      diagnosis: sql<string>`(
        SELECT ps.content FROM prescription_sections ps
        WHERE ps.prescription_id = ${prescriptions.prescriptionId} AND ps.section_type = 'Provisional Diagnosis'
        ORDER BY ps.position LIMIT 1
      )`,
      complaint: sql<string>`(
        SELECT ps.content FROM prescription_sections ps
        WHERE ps.prescription_id = ${prescriptions.prescriptionId} AND ps.section_type = 'Chief Complaint'
        ORDER BY ps.position LIMIT 1
      )`
    })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.visitNo), desc(prescriptions.prescriptionId))
    .all()
}

export function createPatient(input: PatientFormValues): PatientRecord {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  const created = db.transaction((tx) => {
    const patientCode = nextPatientCode()
    return tx
      .insert(patients)
      .values({ patientCode, ...values })
      .returning()
      .get()
  })
  return toPatientRecord(created)
}

export function updatePatient(id: number, input: PatientFormValues): PatientRecord {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  const updated = db
    .update(patients)
    .set({ ...values, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(patients.patientId, id))
    .returning()
    .get()

  if (!updated) {
    throw new Error(`Patient ${id} not found`)
  }
  return toPatientRecord(updated)
}

export function prescriptionCount(patientId: number): number {
  const db = getDb()
  const row = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .get()
  return row?.count ?? 0
}

export function deletePatient(id: number): { id: number } {
  const db = getDb()
  db.transaction(() => {
    db.delete(prescriptions).where(eq(prescriptions.patientId, id)).run()
    db.delete(patients).where(eq(patients.patientId, id)).run()
  })
  return { id }
}
