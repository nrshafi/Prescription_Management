import { copyFile, rm } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { eq } from 'drizzle-orm'
import { app, dialog } from 'electron'
import type { DoctorProfileRecord, PaperSettingsRecord } from '../../shared/print'
import {
  type BackupActionResult,
  type DoctorProfileFormValues,
  doctorProfileFormSchema,
  type PaperSettingsFormValues,
  paperSettingsFormSchema
} from '../../shared/settings'
import { closeDatabase, getDatabasePath, getDb, getRawDb, initDatabase } from '../db/client'
import { ensureSingletonRows, runMigrations } from '../db/migrate'
import { doctorProfile, paperSettings } from '../db/schema'
import { getDoctorProfileForPrint, getPaperSettingsForPrint } from './printing'

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
    .update(doctorProfile)
    .set({
      name: nullable(values.name),
      degrees: nullable(values.degrees),
      speciality: nullable(values.speciality),
      phone: nullable(values.phone),
      email: nullable(values.email),
      address: nullable(values.address),
      chamber: nullable(values.chamber),
      logoPath: nullable(values.logoPath),
      signaturePath: nullable(values.signaturePath)
    })
    .where(eq(doctorProfile.doctorId, 1))
    .run()
  return getDoctorProfileForPrint()
}

export function updatePaperSettings(input: PaperSettingsFormValues): PaperSettingsRecord {
  const values = paperSettingsFormSchema.parse(input)
  getDb().update(paperSettings).set(values).where(eq(paperSettings.paperSettingId, 1)).run()
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

  await getRawDb().backup(target.filePath)
  return { ok: true, path: target.filePath }
}

export async function importBackup(): Promise<BackupActionResult> {
  const target = await dialog.showOpenDialog({
    title: 'Import Backup',
    properties: ['openFile'],
    filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
  })
  const sourcePath = target.filePaths[0]
  if (target.canceled || !sourcePath) return { ok: false }

  const dbPath = getDatabasePath()
  closeDatabase()
  await rm(`${dbPath}-wal`, { force: true })
  await rm(`${dbPath}-shm`, { force: true })
  await copyFile(sourcePath, dbPath)
  initDatabase()
  runMigrations()
  ensureSingletonRows()

  return { ok: true, path: basename(sourcePath) }
}
