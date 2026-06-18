import { invoke } from '@tauri-apps/api/core'
import type {
  PatientDeleteOptions,
  PatientDeleteResult,
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '../../../shared/patient'
import type {
  MedicineSuggestion,
  PrescriptionDetail,
  PrescriptionFormValues,
  PrescriptionListItem,
  PrescriptionQuery,
  PresetFormValues,
  PresetRecord
} from '../../../shared/prescription'
import type {
  DoctorProfileRecord,
  PaperSettingsRecord,
  PrescriptionPrintData,
  PrintActionResult
} from '../../../shared/print'
import type {
  BackupActionResult,
  DoctorProfileFormValues,
  PaperSettingsFormValues
} from '../../../shared/settings'

// Renderer-side API adapter backed by Tauri commands.
export const api = {
  dashboard: {
    stats: (): Promise<{
      totalPatients: number
      todaysPrescriptions: number
      recentPatients: PatientListItem[]
    }> => invoke('dashboard_stats')
  },
  patients: {
    list: (query?: PatientQuery): Promise<PatientListItem[]> =>
      invoke('patients_list', { query: query ?? {} }),
    visits: (id: number): Promise<PatientVisit[]> => invoke('patients_visits', { id }),
    create: (input: PatientFormValues): Promise<PatientRecord> =>
      invoke('patients_create', { input }),
    update: (id: number, input: PatientFormValues): Promise<PatientRecord> =>
      invoke('patients_update', { id, input }),
    delete: (id: number, options?: PatientDeleteOptions): Promise<PatientDeleteResult> =>
      invoke('patients_delete', { id, options: options ?? {} }),
    prescriptionCount: (id: number): Promise<number> =>
      invoke('patients_prescription_count', { id })
  },
  prescriptions: {
    list: (query?: PrescriptionQuery): Promise<PrescriptionListItem[]> =>
      invoke('prescriptions_list', { query: query ?? {} }),
    get: (id: number): Promise<PrescriptionDetail | undefined> =>
      invoke<PrescriptionDetail | null>('prescriptions_get', { id }).then(
        (value) => value ?? undefined
      ),
    create: (input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      invoke('prescriptions_create', { input }),
    update: (id: number, input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      invoke('prescriptions_update', { id, input }),
    duplicate: (id: number): Promise<PrescriptionDetail> =>
      invoke('prescriptions_duplicate', { id }),
    medicineSuggestions: (search?: string): Promise<MedicineSuggestion[]> =>
      invoke('prescriptions_medicine_suggestions', { search: search ?? '' })
  },
  presets: {
    list: (category?: string): Promise<PresetRecord[]> =>
      invoke('presets_list', { category: category ?? null }),
    create: (input: PresetFormValues): Promise<PresetRecord> => invoke('presets_create', { input }),
    update: (id: number, input: PresetFormValues): Promise<PresetRecord> =>
      invoke('presets_update', { id, input }),
    delete: (id: number): Promise<{ id: number }> => invoke('presets_delete', { id })
  },
  settings: {
    get: (): Promise<{ doctorProfile: DoctorProfileRecord; paperSettings: PaperSettingsRecord }> =>
      invoke('settings_get'),
    updateDoctorProfile: (input: DoctorProfileFormValues): Promise<DoctorProfileRecord> =>
      invoke('settings_update_doctor_profile', { input }),
    updatePaperSettings: (input: PaperSettingsFormValues): Promise<PaperSettingsRecord> =>
      invoke('settings_update_paper_settings', { input }),
    exportBackup: (): Promise<BackupActionResult> => invoke('settings_export_backup'),
    importBackup: (): Promise<BackupActionResult> => invoke('settings_import_backup'),
    exportJson: (): Promise<BackupActionResult> => invoke('settings_export_json'),
    importJson: (): Promise<BackupActionResult> => invoke('settings_import_json')
  },
  printing: {
    data: (prescriptionId: number): Promise<PrescriptionPrintData> =>
      invoke('printing_data', { prescriptionId }),
    // The print window calls this once its content has rendered. When the
    // window was opened with autoprint=1 (print / PDF flows), trigger the
    // system print dialog from the webview itself.
    ready: (): void => {
      const params = new URLSearchParams(window.location.search)
      if (params.get('autoprint') === '1') {
        window.setTimeout(() => window.print(), 150)
      }
    },
    preview: (prescriptionId: number): Promise<PrintActionResult> =>
      invoke('printing_preview', { prescriptionId }),
    print: (prescriptionId: number): Promise<PrintActionResult> =>
      invoke('printing_print', { prescriptionId }),
    pdf: (prescriptionId: number): Promise<PrintActionResult> =>
      invoke('printing_pdf', { prescriptionId })
  }
}

export type Api = typeof api
