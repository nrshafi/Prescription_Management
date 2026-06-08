export type AppPage =
  | 'dashboard'
  | 'new-prescription'
  | 'prescriptions'
  | 'presets'
  | 'medicines'
  | 'settings'

export const PAGE_TITLES: Record<AppPage, string> = {
  dashboard: 'Dashboard',
  'new-prescription': 'New Prescription',
  prescriptions: 'Prescriptions',
  presets: 'Presets',
  medicines: 'Medicines',
  settings: 'Settings'
}
