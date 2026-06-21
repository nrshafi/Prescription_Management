export interface PrescriptionPageActions {
  savePrescription: () => Promise<void>
  exportPdf: () => Promise<void>
  print: () => Promise<void>
}

export interface NewPrescriptionProps {
  editId: number | null
  seedPatient?: import('@shared/patient').PatientListItem | null
  onEditIdChange: (id: number | null) => void
  onBindActions: (actions: PrescriptionPageActions | null) => void
  onStatus?: (message: string | null) => void
}

export interface MedicineRow {
  key: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

export type MedicineAddDefaults = {
  dosage?: string
  frequency?: string
  duration?: string
  notes?: string
}

export type MedicineAddHandler = (name: string, defaults?: MedicineAddDefaults) => void

export interface ApplicableBundle {
  key: string
  label: string
  bundle: import('@shared/prescription').PresetRecord
}

export type MedSearchOption =
  | {
      type: 'suggestion'
      name: string
      suggestion: import('@shared/prescription').MedicineSuggestion
    }
  | { type: 'preset'; name: string }
  | { type: 'add'; name: string }
