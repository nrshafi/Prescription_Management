import { z } from 'zod'

export const GENDERS = ['Male', 'Female', 'Other'] as const

export const patientFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name is too long'),
  age: z.string().trim().max(30, 'Age is too long').optional().or(z.literal('')),
  gender: z.enum(GENDERS).optional().or(z.literal('')),
  phone: z.string().trim().max(30, 'Phone is too long').optional().or(z.literal('')),
  address: z.string().trim().max(300, 'Address is too long').optional().or(z.literal(''))
})

export type PatientFormValues = z.infer<typeof patientFormSchema>

export const PATIENT_SORT_FIELDS = [
  'id',
  'name',
  'age',
  'gender',
  'complaint',
  'diagnosis'
] as const
export type PatientSortField = (typeof PATIENT_SORT_FIELDS)[number]

export const SORT_DIRECTIONS = ['asc', 'desc'] as const
export type SortDirection = (typeof SORT_DIRECTIONS)[number]

export type PatientQuery = {
  search?: string
  gender?: (typeof GENDERS)[number]
  ageMin?: number
  ageMax?: number
  dateFrom?: string
  dateTo?: string
  minVisits?: number
  sortBy?: (typeof PATIENT_SORT_FIELDS)[number]
  sortDir?: (typeof SORT_DIRECTIONS)[number]
}

// Shared row/result shapes (kept here so the renderer never imports main-process code).
export interface PatientRecord {
  id: number
  patientCode: string
  name: string
  age: string | null
  gender: string | null
  phone: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface PatientListItem extends PatientRecord {
  lastDiagnosis: string | null
  lastComplaint: string | null
  visitCount: number
}

export interface PatientVisit {
  id: number
  visitNo: number
  createdAt: string
  diagnosis: string | null
  complaint: string | null
}

export interface PatientDeleteOptions {
  // Number of prescriptions the caller knows will be cascade-deleted.
  // Deleting a patient that still has prescriptions is refused unless this
  // matches the live count, so records can never vanish unacknowledged.
  acknowledgedPrescriptions?: number
}

export interface PatientDeleteResult {
  id: number
  deletedPrescriptions: number
}
