import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { app, dialog, ipcMain } from 'electron'
import type { PatientFormValues, PatientQuery } from '../../shared/patient'
import type { PrintActionResult } from '../../shared/print'
import type { PrescriptionFormValues } from '../../shared/prescription'
import { getDatabasePath } from '../db/client'
import { createPrintWindow, printPageSize } from '../print-window'
import { getDashboardStats } from '../services/dashboard'
import {
  createPatient,
  deletePatient,
  getPatient,
  getPatientVisits,
  listPatients,
  updatePatient
} from '../services/patients'
import {
  createPrescription,
  duplicatePrescription,
  getPrescription,
  listPrescriptions,
  listPresets,
  updatePrescription
} from '../services/prescriptions'
import { getPaperSettingsForPrint, getPrescriptionPrintData } from '../services/printing'

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

  ipcMain.handle('prescriptions:list', (_e, search?: string) => listPrescriptions(search ?? ''))
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
  ipcMain.handle('presets:list', (_e, category?: string) => listPresets(category))

  ipcMain.handle('printing:data', (_e, prescriptionId: number) => getPrescriptionPrintData(prescriptionId))
  ipcMain.handle('printing:preview', async (_e, prescriptionId: number): Promise<PrintActionResult> => {
    await createPrintWindow({ prescriptionId, show: true })
    return { ok: true }
  })
  ipcMain.handle('printing:print', async (_e, prescriptionId: number): Promise<PrintActionResult> => {
    const paper = getPaperSettingsForPrint()
    const printWindow = await createPrintWindow({ prescriptionId, show: false })

    return new Promise((resolve, reject) => {
      printWindow.webContents.print(
        {
          silent: false,
          printBackground: true,
          pageSize: printPageSize(paper)
        },
        (success, failureReason) => {
          printWindow.close()
          if (!success) {
            reject(new Error(failureReason || 'Printing failed.'))
            return
          }
          resolve({ ok: true })
        }
      )
    })
  })
  ipcMain.handle('printing:pdf', async (_e, prescriptionId: number): Promise<PrintActionResult> => {
    const paper = getPaperSettingsForPrint()
    const defaultPath = join(app.getPath('documents'), `prescription-${prescriptionId}.pdf`)
    const target = await dialog.showSaveDialog({
      title: 'Export Prescription PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }]
    })

    if (target.canceled || !target.filePath) return { ok: false }

    const printWindow = await createPrintWindow({ prescriptionId, show: false })
    try {
      const pdf = await printWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: printPageSize(paper),
        margins: {
          top: 0,
          bottom: 0,
          left: 0,
          right: 0
        }
      })

      await writeFile(target.filePath, pdf)
    } finally {
      printWindow.close()
    }

    return { ok: true, path: target.filePath }
  })
}
