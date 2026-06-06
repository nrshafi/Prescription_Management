import { ipcMain } from 'electron'
import { getDatabasePath } from '../db/client'
import { getDashboardStats } from '../services/dashboard'
import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientVisits,
  listPatients,
  updatePatient
} from '../services/patients'
import type { PatientFormValues, PatientQuery } from '../../shared/patient'

export function registerIpcHandlers(): void {
  ipcMain.handle('app:health', () => {
    return { ok: true, dbPath: getDatabasePath() }
  })

  ipcMain.handle('dashboard:stats', () => {
    return getDashboardStats()
  })

  ipcMain.handle('patients:list', (_e, query: PatientQuery) => listPatients(query))
  ipcMain.handle('patients:get', (_e, id: number) => getPatient(id))
  ipcMain.handle('patients:visits', (_e, id: number) => getPatientVisits(id))
  ipcMain.handle('patients:create', (_e, input: PatientFormValues) => createPatient(input))
  ipcMain.handle('patients:update', (_e, id: number, input: PatientFormValues) =>
    updatePatient(id, input)
  )
  ipcMain.handle('patients:delete', (_e, id: number) => deletePatient(id))
}
