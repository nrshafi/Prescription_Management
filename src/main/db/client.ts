import { app } from 'electron'
import { join } from 'path'
import Database from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

let sqlite: Database.Database | null = null
let dbInstance: BetterSQLite3Database<typeof schema> | null = null

export function getDatabasePath(): string {
  return join(app.getPath('userData'), 'prescription.db')
}

export function initDatabase(): BetterSQLite3Database<typeof schema> {
  if (dbInstance) return dbInstance

  sqlite = new Database(getDatabasePath())
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  dbInstance = drizzle(sqlite, { schema })
  return dbInstance
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return dbInstance
}

export function getRawDb(): Database.Database {
  if (!sqlite) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    dbInstance = null
  }
}
