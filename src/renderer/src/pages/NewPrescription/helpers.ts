import type { PrescriptionUiState } from '@/lib/prescription-mapping'
import type { MedicineRow } from './types'

export function toErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
}

let medKey = 0

export function nextMedKey(): string {
  return `m-${++medKey}`
}

export function buildUiForSave(
  ui: PrescriptionUiState,
  medicines: MedicineRow[],
  patientId: number
): PrescriptionUiState {
  return {
    ...ui,
    patientId,
    medicines: medicines.map((m, position) => ({
      medicineName: m.medicineName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      notes: m.notes,
      position
    }))
  }
}
