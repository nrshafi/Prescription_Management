import { sql } from 'drizzle-orm'
import { getDb } from '../db/client'
import { patients, prescriptions } from '../db/schema'

export interface DashboardStats {
  totalPatients: number
  todaysPrescriptions: number
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
    todaysPrescriptions: todaysCount?.count ?? 0
  }
}
