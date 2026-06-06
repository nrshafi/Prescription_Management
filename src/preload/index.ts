import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type {
  PatientFormValues,
  PatientListItem,
  PatientQuery,
  PatientRecord,
  PatientVisit
} from '../shared/patient'

// Custom typed API exposed to the renderer.
const api = {
  health: (): Promise<{ ok: boolean; dbPath: string }> => ipcRenderer.invoke('app:health'),
  dashboard: {
    stats: (): Promise<{ totalPatients: number; todaysPrescriptions: number }> =>
      ipcRenderer.invoke('dashboard:stats')
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
    delete: (id: number): Promise<{ id: number }> => ipcRenderer.invoke('patients:delete', id)
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
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
