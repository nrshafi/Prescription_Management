import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, ipcMain } from 'electron'
import type { PatientFormValues, PatientQuery } from '../../shared/patient'
import type {
  PrescriptionFormValues,
  PrescriptionQuery,
  PresetFormValues
} from '../../shared/prescription'
import type { PrintActionResult } from '../../shared/print'
import type { DoctorProfileFormValues, PaperSettingsFormValues } from '../../shared/settings'
import { getDatabasePath } from '../db/client'
import { createPrintWindow, printPageSize } from '../print-window'
import { getDashboardStats } from '../services/dashboard'
import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientVisits,
  listPatients,
  prescriptionCount,
  updatePatient
} from '../services/patients'
import {
  createPrescription,
  createPreset,
  deletePreset,
  duplicatePrescription,
  getPrescription,
  getPreset,
  listMedicineSuggestions,
  listPrescriptions,
  listPresets,
  updatePrescription,
  updatePreset
} from '../services/prescriptions'
import { assertPrintersAvailable, formatPrintSpoolerError } from '../services/print-spooler'
import { getPaperSettingsForPrint, getPrescriptionPrintData } from '../services/printing'
import {
  exportBackup,
  getSettings,
  importBackup,
  updateDoctorProfile,
  updatePaperSettings
} from '../services/settings'

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
  ipcMain.handle('patients:prescriptionCount', (_e, id: number) => prescriptionCount(id))

  ipcMain.handle('prescriptions:list', (_e, query?: PrescriptionQuery) => listPrescriptions(query))
  ipcMain.handle('prescriptions:get', (_e, id: number) => getPrescription(id))
  ipcMain.handle('prescriptions:create', (_e, input: PrescriptionFormValues) =>
    createPrescription(input)
  )
  ipcMain.handle('prescriptions:update', (_e, id: number, input: PrescriptionFormValues) =>
    updatePrescription(id, input)
  )
  ipcMain.handle('prescriptions:saveDraft', (_e, input: PrescriptionFormValues) =>
    createPrescription(input)
  )
  ipcMain.handle('prescriptions:duplicate', (_e, id: number) => duplicatePrescription(id))
  ipcMain.handle('prescriptions:medicineSuggestions', (_e, search?: string) =>
    listMedicineSuggestions(search ?? '')
  )
  ipcMain.handle('presets:list', (_e, category?: string) => listPresets(category))
  ipcMain.handle('presets:get', (_e, id: number) => getPreset(id))
  ipcMain.handle('presets:create', (_e, input: PresetFormValues) => createPreset(input))
  ipcMain.handle('presets:update', (_e, id: number, input: PresetFormValues) =>
    updatePreset(id, input)
  )
  ipcMain.handle('presets:delete', (_e, id: number) => deletePreset(id))

  ipcMain.handle('settings:get', () => getSettings())
  ipcMain.handle('settings:updateDoctorProfile', (_e, input: DoctorProfileFormValues) =>
    updateDoctorProfile(input)
  )
  ipcMain.handle('settings:updatePaperSettings', (_e, input: PaperSettingsFormValues) =>
    updatePaperSettings(input)
  )
  ipcMain.handle('settings:exportBackup', () => exportBackup())
  ipcMain.handle('settings:importBackup', () => importBackup())

  ipcMain.handle('printing:data', (_e, prescriptionId: number) =>
    getPrescriptionPrintData(prescriptionId)
  )
  ipcMain.handle(
    'printing:preview',
    async (_e, prescriptionId: number): Promise<PrintActionResult> => {
      await createPrintWindow({ prescriptionId, show: true })
      return { ok: true }
    }
  )
  ipcMain.handle(
    'printing:print',
    async (_e, prescriptionId: number): Promise<PrintActionResult> => {
      const paper = getPaperSettingsForPrint()
      const printWindow = await createPrintWindow({ prescriptionId, show: false })

      const spooler = await assertPrintersAvailable(printWindow.webContents)
      if (!spooler.ok) {
        printWindow.close()
        await createPrintWindow({ prescriptionId, show: true })
        return { ok: false, message: spooler.message, fallbackPreview: true }
      }

      return new Promise((resolve) => {
        printWindow.webContents.print(
          {
            silent: false,
            printBackground: true,
            pageSize: printPageSize(paper)
          },
          (success, failureReason) => {
            printWindow.close()
            if (!success) {
              const message = formatPrintSpoolerError(
                failureReason ? new Error(failureReason) : new Error('Printing failed.')
              )
              void createPrintWindow({ prescriptionId, show: true }).then(() => {
                resolve({ ok: false, message, fallbackPreview: true })
              })
              return
            }
            resolve({ ok: true })
          }
        )
      })
    }
  )
  ipcMain.handle('printing:pdf', async (_e, prescriptionId: number): Promise<PrintActionResult> => {
    const paper = getPaperSettingsForPrint()
    const defaultPath = join(app.getPath('documents'), `prescription-${prescriptionId}.pdf`)
    const target = await dialog.showSaveDialog({
      title: 'Export Prescription PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (target.canceled || !target.filePath) return { ok: false }

    const printWindow = await createPrintWindow({
      prescriptionId,
      show: false,
      paintForPdf: true
    })
    try {
      const pdf = await printWindow.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
        pageSize: printPageSize(paper),
        margins: {
          marginType: 'none'
        }
      })

      await writeFile(target.filePath, pdf)
    } finally {
      printWindow.close()
    }

    return { ok: true, path: target.filePath }
  })
}
