import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '../shared/patient'
import type {
  MedicineSuggestion,
  PrescriptionDetail,
  PrescriptionFormValues,
  PrescriptionListItem,
  PresetFormValues,
  PresetRecord
} from '../shared/prescription'
import type {
  DoctorProfileRecord,
  PaperSettingsRecord,
  PrescriptionPrintData,
  PrintActionResult
} from '../shared/print'
import type {
  BackupActionResult,
  DoctorProfileFormValues,
  PaperSettingsFormValues
} from '../shared/settings'

type Api = {
  health: () => Promise<{ ok: boolean; dbPath: string }>
  dashboard: {
    stats: () => Promise<{
      totalPatients: number
      todaysPrescriptions: number
      recentPatients: PatientListItem[]
    }>
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
    medicineSuggestions: (search?: string) => Promise<MedicineSuggestion[]>
  }
  presets: {
    list: (category?: string) => Promise<PresetRecord[]>
    create: (input: PresetFormValues) => Promise<PresetRecord>
    update: (id: number, input: PresetFormValues) => Promise<PresetRecord>
    delete: (id: number) => Promise<{ id: number }>
  }
  settings: {
    get: () => Promise<{ doctorProfile: DoctorProfileRecord; paperSettings: PaperSettingsRecord }>
    updateDoctorProfile: (input: DoctorProfileFormValues) => Promise<DoctorProfileRecord>
    updatePaperSettings: (input: PaperSettingsFormValues) => Promise<PaperSettingsRecord>
    exportBackup: () => Promise<BackupActionResult>
    importBackup: () => Promise<BackupActionResult>
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
