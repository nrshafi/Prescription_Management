import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'
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
  PrescriptionQuery,
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

// Custom typed API exposed to the renderer.
const api = {
  health: (): Promise<{ ok: boolean; dbPath: string }> => ipcRenderer.invoke('app:health'),
  dashboard: {
    stats: (): Promise<{
      totalPatients: number
      todaysPrescriptions: number
      recentPatients: PatientListItem[]
    }> => ipcRenderer.invoke('dashboard:stats')
  },
  patients: {
    list: (query?: PatientQuery): Promise<PatientListItem[]> =>
      ipcRenderer.invoke('patients:list', query ?? {}),
    get: (id: number): Promise<PatientRecord | undefined> => ipcRenderer.invoke('patients:get', id),
    visits: (id: number): Promise<PatientVisit[]> => ipcRenderer.invoke('patients:visits', id),
    create: (input: PatientFormValues): Promise<PatientRecord> =>
      ipcRenderer.invoke('patients:create', input),
    update: (id: number, input: PatientFormValues): Promise<PatientRecord> =>
      ipcRenderer.invoke('patients:update', id, input),
    delete: (id: number): Promise<{ id: number }> => ipcRenderer.invoke('patients:delete', id),
    prescriptionCount: (id: number): Promise<number> =>
      ipcRenderer.invoke('patients:prescriptionCount', id)
  },
  prescriptions: {
    list: (query?: PrescriptionQuery): Promise<PrescriptionListItem[]> =>
      ipcRenderer.invoke('prescriptions:list', query ?? {}),
    get: (id: number): Promise<PrescriptionDetail | undefined> =>
      ipcRenderer.invoke('prescriptions:get', id),
    create: (input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      ipcRenderer.invoke('prescriptions:create', input),
    update: (id: number, input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      ipcRenderer.invoke('prescriptions:update', id, input),
    saveDraft: (input: PrescriptionFormValues): Promise<PrescriptionDetail> =>
      ipcRenderer.invoke('prescriptions:saveDraft', input),
    duplicate: (id: number): Promise<PrescriptionDetail> =>
      ipcRenderer.invoke('prescriptions:duplicate', id),
    medicineSuggestions: (search?: string): Promise<MedicineSuggestion[]> =>
      ipcRenderer.invoke('prescriptions:medicineSuggestions', search ?? '')
  },
  presets: {
    list: (category?: string): Promise<PresetRecord[]> =>
      ipcRenderer.invoke('presets:list', category),
    create: (input: PresetFormValues): Promise<PresetRecord> =>
      ipcRenderer.invoke('presets:create', input),
    update: (id: number, input: PresetFormValues): Promise<PresetRecord> =>
      ipcRenderer.invoke('presets:update', id, input),
    delete: (id: number): Promise<{ id: number }> => ipcRenderer.invoke('presets:delete', id)
  },
  settings: {
    get: (): Promise<{ doctorProfile: DoctorProfileRecord; paperSettings: PaperSettingsRecord }> =>
      ipcRenderer.invoke('settings:get'),
    updateDoctorProfile: (input: DoctorProfileFormValues): Promise<DoctorProfileRecord> =>
      ipcRenderer.invoke('settings:updateDoctorProfile', input),
    updatePaperSettings: (input: PaperSettingsFormValues): Promise<PaperSettingsRecord> =>
      ipcRenderer.invoke('settings:updatePaperSettings', input),
    exportBackup: (): Promise<BackupActionResult> => ipcRenderer.invoke('settings:exportBackup'),
    importBackup: (): Promise<BackupActionResult> => ipcRenderer.invoke('settings:importBackup')
  },
  printing: {
    data: (prescriptionId: number): Promise<PrescriptionPrintData> =>
      ipcRenderer.invoke('printing:data', prescriptionId),
    ready: (): void => ipcRenderer.send('printing:ready'),
    preview: (prescriptionId: number): Promise<PrintActionResult> =>
      ipcRenderer.invoke('printing:preview', prescriptionId),
    print: (prescriptionId: number): Promise<PrintActionResult> =>
      ipcRenderer.invoke('printing:print', prescriptionId),
    pdf: (prescriptionId: number): Promise<PrintActionResult> =>
      ipcRenderer.invoke('printing:pdf', prescriptionId)
  }
}

export type Api = typeof api

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // biome-ignore lint/suspicious/noTsIgnore: defined in index.d.ts
  // @ts-ignore
  window.electron = electronAPI
  // biome-ignore lint/suspicious/noTsIgnore: defined in index.d.ts
  // @ts-ignore
  window.api = api
}
