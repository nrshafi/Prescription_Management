import { copyFile, open, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { app, dialog } from 'electron'
import type { DoctorProfileRecord, PaperSettingsRecord } from '../../shared/print'
import {
  type BackupActionResult,
  type DoctorProfileFormValues,
  doctorProfileFormSchema,
  type PaperSettingsFormValues,
  paperSettingsFormSchema
} from '../../shared/settings'
import { closeDatabase, getDatabasePath, getDb, initDatabase } from '../db/client'
import { ensureSingletonRows, runMigrations } from '../db/migrate'
import { getDoctorProfileForPrint, getPaperSettingsForPrint } from './printing'

// Every SQLite database starts with this 16-byte, NUL-terminated magic string.
const SQLITE_HEADER = Buffer.from('SQLite format 3\u0000', 'latin1')

function nullable(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function getSettings(): {
  doctorProfile: DoctorProfileRecord
  paperSettings: PaperSettingsRecord
} {
  return {
    doctorProfile: getDoctorProfileForPrint(),
    paperSettings: getPaperSettingsForPrint()
  }
}

export function updateDoctorProfile(input: DoctorProfileFormValues): DoctorProfileRecord {
  const values = doctorProfileFormSchema.parse(input)
  getDb()
    .prepare(
      `
UPDATE doctor_profile SET
  name = ?,
  degrees = ?,
  speciality = ?,
  phone = ?,
  email = ?,
  address = ?,
  chamber = ?,
  logo_path = ?,
  signature_path = ?
WHERE doctor_id = 1
`
    )
    .run(
      nullable(values.name),
      nullable(values.degrees),
      nullable(values.speciality),
      nullable(values.phone),
      nullable(values.email),
      nullable(values.address),
      nullable(values.chamber),
      nullable(values.logoPath),
      nullable(values.signaturePath)
    )
  return getDoctorProfileForPrint()
}

export function updatePaperSettings(input: PaperSettingsFormValues): PaperSettingsRecord {
  const values = paperSettingsFormSchema.parse(input)
  getDb()
    .prepare(
      `
UPDATE paper_settings SET
  width_mm = ?,
  height_mm = ?,
  margin_top = ?,
  margin_bottom = ?,
  margin_left = ?,
  margin_right = ?
WHERE paper_setting_id = 1
`
    )
    .run(
      values.widthMm,
      values.heightMm,
      values.marginTop,
      values.marginBottom,
      values.marginLeft,
      values.marginRight
    )
  return getPaperSettingsForPrint()
}

export async function exportBackup(): Promise<BackupActionResult> {
  const defaultPath = join(app.getPath('documents'), `prescription-backup-${Date.now()}.db`)
  const target = await dialog.showSaveDialog({
    title: 'Export Backup',
    defaultPath,
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  })
  if (target.canceled || !target.filePath) return { ok: false }

  await getDb().backup(target.filePath)
  return { ok: true, path: target.filePath }
}

async function isSqliteDatabase(filePath: string): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof open>> | null = null
  try {
    handle = await open(filePath, 'r')
    const header = Buffer.alloc(SQLITE_HEADER.length)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    return bytesRead === header.length && header.equals(SQLITE_HEADER)
  } catch {
    return false
  } finally {
    await handle?.close()
  }
}

async function removeWalArtifacts(dbPath: string): Promise<void> {
  await rm(`${dbPath}-wal`, { force: true })
  await rm(`${dbPath}-shm`, { force: true })
}

export async function importBackup(): Promise<BackupActionResult> {
  const target = await dialog.showOpenDialog({
    title: 'Import Backup',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
  })
  const sourcePath = target.filePaths[0]
  if (target.canceled || !sourcePath) return { ok: false }

  // Refuse files that are not SQLite databases before touching the live data.
  if (!(await isSqliteDatabase(sourcePath))) {
    return {
      ok: false,
      message: 'The selected file is not a valid SQLite database backup.'
    }
  }

  const dbPath = getDatabasePath()
  const snapshotPath = `${dbPath}.pre-import-${Date.now()}`

  // Snapshot the live database first so a failed import can be rolled back.
  await getDb().backup(snapshotPath)
  closeDatabase()

  try {
    await removeWalArtifacts(dbPath)
    await copyFile(sourcePath, dbPath)
    initDatabase()
    runMigrations()
    ensureSingletonRows()
  } catch (error) {
    // Restore the snapshot so the app never ends up without a database.
    closeDatabase()
    await removeWalArtifacts(dbPath)
    await copyFile(snapshotPath, dbPath)
    initDatabase()
    runMigrations()
    ensureSingletonRows()
    await rm(snapshotPath, { force: true })
    const reason = error instanceof Error ? error.message : 'Unknown error.'
    return {
      ok: false,
      message: `Backup import failed and the previous database was restored. (${reason})`
    }
  }

  await rm(snapshotPath, { force: true })
  return { ok: true, path: basename(sourcePath) }
}
