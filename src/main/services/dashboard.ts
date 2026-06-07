import { desc, sql } from 'drizzle-orm'
import type { PatientListItem } from '../../shared/patient'
import { getDb } from '../db/client'
import { patients, prescriptions } from '../db/schema'

export interface DashboardStats {
  totalPatients: number
  todaysPrescriptions: number
  recentPatients: PatientListItem[]
}

export function getDashboardStats(): DashboardStats {
  const db = getDb()

  const patientCount = db.select({ count: sql<number>`count(*)` }).from(patients).get()
  const todaysCount = db
    .select({ count: sql<number>`count(*)` })
    .from(prescriptions)
    .where(sql`date(${prescriptions.createdAt}) = date('now', 'localtime')`)
    .get()

  return {
    totalPatients: patientCount?.count ?? 0,
    todaysPrescriptions: todaysCount?.count ?? 0,
    recentPatients: getRecentPatients()
  }
}

export function getRecentPatients(limit = 6): PatientListItem[] {
  return getDb()
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
      visitCount: sql<number>`(
        SELECT COUNT(*) FROM prescriptions p WHERE p.patient_id = ${patients.patientId}
      )`,
      lastComplaint: sql<string | null>`(
        SELECT ps.content
        FROM prescriptions p
        JOIN prescription_sections ps ON ps.prescription_id = p.prescription_id
        WHERE p.patient_id = ${patients.patientId} AND ps.section_type = 'Chief Complaint'
        ORDER BY p.created_at DESC, p.prescription_id DESC
        LIMIT 1
      )`,
      lastDiagnosis: sql<string | null>`(
        SELECT ps.content
        FROM prescriptions p
        JOIN prescription_sections ps ON ps.prescription_id = p.prescription_id
        WHERE p.patient_id = ${patients.patientId} AND ps.section_type = 'Probational Diagnosis'
        ORDER BY p.created_at DESC, p.prescription_id DESC
        LIMIT 1
      )`
    })
    .from(patients)
    .orderBy(desc(patients.createdAt), desc(patients.patientId))
    .limit(limit)
    .all()
}
