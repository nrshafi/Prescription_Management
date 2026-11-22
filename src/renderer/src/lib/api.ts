import type {
  PatientDeleteOptions,
  PatientDeleteResult,
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '@shared/patient'
import type {
  MedicineSuggestion,
  PrescriptionDetail,
  PrescriptionFormValues,
  PrescriptionListItem,
  PrescriptionQuery,
  PresetFormValues,
  PresetRecord
} from '@shared/prescription'
import type {
  DoctorProfileRecord,
  PaperSettingsRecord,
  PrescriptionPrintData,
  PrintActionResult
} from '@shared/print'
import type {
  BackupActionResult,
  DoctorProfileFormValues,
  PaperSettingsFormValues
} from '@shared/settings'
import { invokeLogged } from './logger'

// Renderer-side API adapter backed by Tauri commands.
export const api = {
  dashboard: {
    stats: (): Promise<{
      totalPatients: number
      totalPrescriptions: number
      todaysPrescriptions: number
    }> => invokeLogged('dashboard_stats')
  },
  patients: {
    list: (query?: PatientQuery): Promise<PatientListItem[]> =>
      invokeLogged('patients_list', { query: query ?? {} }),
    visits: (id: number): Promise<PatientVisit[]> => invokeLogged('patients_visits', { id }),
    create: (input: PatientFormValues): Promise<PatientRecord> =>
      invokeLogged('patients_create', { input }),
    update: (id: number, input: PatientFormValues): Promise<PatientRecord> =>
      invokeLogged('patients_update', { id, input }),
    delete: (id: number, options?: PatientDeleteOptions): Promise<PatientDeleteResult> =>
      invokeLogged('patients_delete', { id, options: options ?? {} }),
    prescriptionCount: (id: number): Promise<number> =>
      invokeLogged('patients_prescription_count', { id })
  },
  prescriptions: {
    list: (query?: PrescriptionQuery): Promise<PrescriptionListItem[]> =>
      invokeLogged('prescriptions_list', { query: query ?? {} }),
    get: (id: number): Promise<PrescriptionDetail | undefined> =>
      invokeLogged<PrescriptionDetail | null>('prescriptions_get', { id }).then(
        (value) => value ?? undefined
      ),
    create: (input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      invokeLogged('prescriptions_create', { input }),
    update: (id: number, input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      invokeLogged('prescriptions_update', { id, input }),
    duplicate: (id: number): Promise<PrescriptionDetail> =>
      invokeLogged('prescriptions_duplicate', { id }),
    medicineSuggestions: (search?: string): Promise<MedicineSuggestion[]> =>
      invokeLogged('prescriptions_medicine_suggestions', { search: search ?? '' })
  },
  presets: {
    list: (category?: string): Promise<PresetRecord[]> =>
      invokeLogged('presets_list', { category: category ?? null }),
    create: (input: PresetFormValues): Promise<PresetRecord> =>
      invokeLogged('presets_create', { input }),
    update: (id: number, input: PresetFormValues): Promise<PresetRecord> =>
      invokeLogged('presets_update', { id, input }),
    delete: (id: number): Promise<{ id: number }> => invokeLogged('presets_delete', { id })
  },
  settings: {
    get: (): Promise<{ doctorProfile: DoctorProfileRecord; paperSettings: PaperSettingsRecord }> =>
      invokeLogged('settings_get'),
    updateDoctorProfile: (input: DoctorProfileFormValues): Promise<DoctorProfileRecord> =>
      invokeLogged('settings_update_doctor_profile', { input }),
    updatePaperSettings: (input: PaperSettingsFormValues): Promise<PaperSettingsRecord> =>
      invokeLogged('settings_update_paper_settings', { input }),
    exportBackup: (): Promise<BackupActionResult> => invokeLogged('settings_export_backup'),
    importBackup: (): Promise<BackupActionResult> => invokeLogged('settings_import_backup'),
    exportJson: (): Promise<BackupActionResult> => invokeLogged('settings_export_json'),
    importJson: (): Promise<BackupActionResult> => invokeLogged('settings_import_json')
  },
  printing: {
    data: (prescriptionId: number): Promise<PrescriptionPrintData> =>
      invokeLogged('printing_data', { prescriptionId }),
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
      invokeLogged('printing_preview', { prescriptionId }),
    print: (prescriptionId: number): Promise<PrintActionResult> =>
      invokeLogged('printing_print', { prescriptionId }),
    pdf: (prescriptionId: number): Promise<PrintActionResult> =>
      invokeLogged('printing_pdf', { prescriptionId })
  }
}

export type Api = typeof api
