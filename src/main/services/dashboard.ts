import type { PatientListItem } from '../../shared/patient'
import { getDb } from '../db/client'

export interface DashboardStats {
  totalPatients: number
  todaysPrescriptions: number
  recentPatients: PatientListItem[]
}

export function getDashboardStats(): DashboardStats {
  const db = getDb()

  const patientCount = db.prepare('SELECT COUNT(*) AS count FROM patients').get() as {
    count: number
  }
  const todaysCount = db
    .prepare(
      `SELECT COUNT(*) AS count FROM prescriptions WHERE date(created_at) = date('now', 'localtime')`
    )
    .get() as { count: number }

  return {
    totalPatients: patientCount?.count ?? 0,
    todaysPrescriptions: todaysCount?.count ?? 0,
    recentPatients: getRecentPatients()
  }
}

export function getRecentPatients(limit = 6): PatientListItem[] {
  const db = getDb()
  return db
    .prepare(
      `
SELECT
  p.patient_id AS id,
  p.patient_code AS patientCode,
  p.name AS name,
  p.age AS age,
  p.gender AS gender,
  p.phone AS phone,
  p.address AS address,
  p.created_at AS createdAt,
  p.updated_at AS updatedAt,
  (SELECT COUNT(*) FROM prescriptions pr WHERE pr.patient_id = p.patient_id) AS visitCount,
  (
    SELECT ps.content
    FROM prescriptions pr
    JOIN prescription_sections ps ON ps.prescription_id = pr.prescription_id
    WHERE pr.patient_id = p.patient_id AND ps.section_type = 'Chief Complaint'
    ORDER BY pr.created_at DESC, pr.prescription_id DESC
    LIMIT 1
  ) AS lastComplaint,
  (
    SELECT ps.content
    FROM prescriptions pr
    JOIN prescription_sections ps ON ps.prescription_id = pr.prescription_id
    WHERE pr.patient_id = p.patient_id AND ps.section_type = 'Provisional Diagnosis'
    ORDER BY pr.created_at DESC, pr.prescription_id DESC
    LIMIT 1
  ) AS lastDiagnosis
FROM patients p
ORDER BY p.created_at DESC, p.patient_id DESC
LIMIT ?
`
    )
    .all(limit) as PatientListItem[]
}
