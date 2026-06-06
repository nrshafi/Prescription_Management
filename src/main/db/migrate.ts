import { app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { eq } from 'drizzle-orm'
import { getDb } from './client'
import { paperSettings } from './schema'

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
  const existing = db.select().from(paperSettings).where(eq(paperSettings.id, 1)).all()
  if (existing.length === 0) {
    db.insert(paperSettings).values({ id: 1 }).run()
  }
}
