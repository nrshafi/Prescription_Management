import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm'
import { getDb } from '../db/client'
import { patients, prescriptions, type Patient } from '../db/schema'
import {
  patientFormSchema,
  patientQuerySchema,
  type PatientFormValues,
  type PatientListItem,
  type PatientQuery,
  type PatientSortField,
  type PatientVisit,
  type SortDirection
} from '../../shared/patient'

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

const sortColumns = {
  id: patients.id,
  name: patients.name,
  age: patients.age,
  gender: patients.gender
} as const

// Subquery helpers: latest Diagnosis / Chief Complaint section content per patient.
function latestSectionExpr(sectionType: string): SQL<string> {
  return sql<string>`(
    SELECT ps.content
    FROM prescription_sections ps
    JOIN prescriptions p ON p.id = ps.prescription_id
    WHERE p.patient_id = ${patients.id}
      AND ps.section_type = ${sectionType}
      AND ps.content IS NOT NULL AND ps.content <> ''
    ORDER BY p.visit_no DESC, p.id DESC
    LIMIT 1
  )`
}

export function listPatients(query: PatientQuery = {}): PatientListItem[] {
  const db = getDb()
  const { search, gender, sortBy, sortDir } = patientQuerySchema.parse(query)

  const filters: SQL[] = []
  if (search) {
    const term = `%${search}%`
    filters.push(
      or(
        like(patients.patientCode, term),
        like(patients.name, term),
        like(patients.phone, term),
        sql`CAST(${patients.id} AS TEXT) = ${search}`,
        sql`EXISTS (
          SELECT 1 FROM prescriptions p
          WHERE p.patient_id = ${patients.id} AND CAST(p.id AS TEXT) = ${search}
        )`
      )!
    )
  }
  if (gender) {
    filters.push(eq(patients.gender, gender)!)
  }

  const column = sortColumns[sortBy as PatientSortField]
  const orderBy = (sortDir as SortDirection) === 'asc' ? asc(column) : desc(column)

  const visitCount = sql<number>`(
    SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = ${patients.id}
  )`

  return db
    .select({
      id: patients.id,
      patientCode: patients.patientCode,
      name: patients.name,
      age: patients.age,
      gender: patients.gender,
      phone: patients.phone,
      address: patients.address,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      lastDiagnosis: latestSectionExpr('Diagnosis'),
      lastComplaint: latestSectionExpr('Chief Complaint'),
      visitCount
    })
    .from(patients)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy)
    .all()
}

export function getPatient(id: number): Patient | undefined {
  const db = getDb()
  return db.select().from(patients).where(eq(patients.id, id)).get()
}

export function getPatientVisits(patientId: number): PatientVisit[] {
  const db = getDb()
  return db
    .select({
      id: prescriptions.id,
      visitNo: prescriptions.visitNo,
      createdAt: prescriptions.createdAt,
      diagnosis: sql<string>`(
        SELECT ps.content FROM prescription_sections ps
        WHERE ps.prescription_id = ${prescriptions.id} AND ps.section_type = 'Diagnosis'
        ORDER BY ps.position LIMIT 1
      )`,
      complaint: sql<string>`(
        SELECT ps.content FROM prescription_sections ps
        WHERE ps.prescription_id = ${prescriptions.id} AND ps.section_type = 'Chief Complaint'
        ORDER BY ps.position LIMIT 1
      )`
    })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .orderBy(desc(prescriptions.visitNo), desc(prescriptions.id))
    .all()
}

export function createPatient(input: PatientFormValues): Patient {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  return db.transaction((tx) => {
    const patientCode = nextPatientCode()
    const created = tx
      .insert(patients)
      .values({ patientCode, ...values })
      .returning()
      .get()
    return created
  })
}

export function updatePatient(id: number, input: PatientFormValues): Patient {
  const db = getDb()
  const values = normalize(patientFormSchema.parse(input))

  const updated = db
    .update(patients)
    .set({ ...values, updatedAt: sql`(CURRENT_TIMESTAMP)` })
    .where(eq(patients.id, id))
    .returning()
    .get()

  if (!updated) {
    throw new Error(`Patient ${id} not found`)
  }
  return updated
}

export function deletePatient(id: number): { id: number } {
  const db = getDb()
  db.delete(patients).where(eq(patients.id, id)).run()
  return { id }
}
