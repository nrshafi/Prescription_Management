import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '../shared/patient'

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
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
