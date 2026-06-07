import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '../shared/patient'
import type { PrescriptionPrintData, PrintActionResult } from '../shared/print'
import type {
  PresetRecord,
  PrescriptionDetail,
  PrescriptionFormValues,
  PrescriptionListItem
} from '../shared/prescription'

type Api = {
  health: () => Promise<{ ok: boolean; dbPath: string }>
  dashboard: {
    stats: () => Promise<{ totalPatients: number; todaysPrescriptions: number }>
  }
  patients: {
    list: (query?: PatientQuery) => Promise<PatientListItem[]>
    get: (id: number) => Promise<PatientRecord | undefined>
    visits: (id: number) => Promise<PatientVisit[]>
    create: (input: PatientFormValues) => Promise<PatientRecord>
    update: (id: number, input: PatientFormValues) => Promise<PatientRecord>
    delete: (id: number) => Promise<{ id: number }>
  }
  prescriptions: {
    list: (search?: string) => Promise<PrescriptionListItem[]>
    get: (id: number) => Promise<PrescriptionDetail | undefined>
    create: (input: PrescriptionFormValues) => Promise<PrescriptionDetail>
    update: (id: number, input: PrescriptionFormValues) => Promise<PrescriptionDetail>
    saveDraft: (input: PrescriptionFormValues) => Promise<PrescriptionDetail>
    duplicate: (id: number) => Promise<PrescriptionDetail>
  }
  presets: {
    list: (category?: string) => Promise<PresetRecord[]>
  }
  printing: {
    data: (prescriptionId: number) => Promise<PrescriptionPrintData>
    ready: () => void
    preview: (prescriptionId: number) => Promise<PrintActionResult>
    print: (prescriptionId: number) => Promise<PrintActionResult>
    pdf: (prescriptionId: number) => Promise<PrintActionResult>
  }
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
