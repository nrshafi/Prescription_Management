import { join } from 'node:path'
import Database from 'better-sqlite3'
import { app } from 'electron'

let sqlite: Database.Database | null = null

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'prescription.db')
}

export function initDatabase(): Database.Database {
  if (sqlite) return sqlite

  sqlite = new Database(getDatabasePath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return sqlite
}

export function getDb(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
  }
}
