import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app } from 'electron'
import { getDb } from './client'
import { doctorProfile, paperSettings } from './schema'

function getMigrationsFolder(): string {
  // In dev, migrations live in the project root /drizzle.
  // When packaged, they are shipped via electron-builder extraResources.
  if (is.dev) {
    return join(app.getAppPath(), 'drizzle')
  }
  return join(process.resourcesPath, 'drizzle')
}

export function runMigrations(): void {
  const db = getDb()
  migrate(db, { migrationsFolder: getMigrationsFolder() })
}

export function ensureSingletonRows(): void {
  const db = getDb()
  const existingDoctorProfile = db
    .select()
    .from(doctorProfile)
    .where(eq(doctorProfile.doctorId, 1))
    .all()
  if (existingDoctorProfile.length === 0) {
    db.insert(doctorProfile).values({ doctorId: 1 }).run()
  }

  const existing = db.select().from(paperSettings).where(eq(paperSettings.paperSettingId, 1)).all()
  if (existing.length === 0) {
    db.insert(paperSettings).values({ paperSettingId: 1 }).run()
  }
}
