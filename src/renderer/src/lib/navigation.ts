export type AppPage =
  | 'dashboard'
  | 'new-prescription'
  | 'patients'
  | 'prescriptions'
  | 'presets'
  | 'medicines'
  | 'settings'

export const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  'new-prescription': 'New Prescription',
  patients: 'Patients',
  prescriptions: 'Prescriptions',
  presets: 'Presets',
  medicines: 'Medicines',
  settings: 'Settings'
}
