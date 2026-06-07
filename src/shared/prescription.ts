import { z } from 'zod'

export const PRESCRIPTION_SECTION_TYPES = [
  'Chief Complaint',
  'Examination',
  'Investigations',
  'Provisional Diagnosis',
  'Advice',
  'Follow Up'
] as const

export type PrescriptionSectionType = (typeof PRESCRIPTION_SECTION_TYPES)[number]

export const PRESET_CATEGORIES = [
  'Chief Complaint',
  'Medicine',
  'Advice',
  'Investigations',
  'Provisional Diagnosis'
] as const

export type PresetCategory = (typeof PRESET_CATEGORIES)[number]

export const presetFormSchema = z.object({
  category: z.enum(PRESET_CATEGORIES),
  title: z.string().trim().min(1, 'Title is required').max(160, 'Title is too long'),
  content: z.string().trim().max(4000, 'Content is too long').optional().or(z.literal(''))
})

export const prescriptionSectionInputSchema = z.object({
  sectionType: z.enum(PRESCRIPTION_SECTION_TYPES),
  content: z.string().trim().max(4000, 'Section content is too long').optional().or(z.literal('')),
  position: z.number().int().min(0)
})

export const prescriptionMedicineInputSchema = z.object({
  medicineName: z
    .string()
    .trim()
    .max(160, 'Medicine name is too long')
    .optional()
    .or(z.literal('')),
  dosage: z.string().trim().max(120, 'Dosage is too long').optional().or(z.literal('')),
  frequency: z.string().trim().max(120, 'Frequency is too long').optional().or(z.literal('')),
  duration: z.string().trim().max(120, 'Duration is too long').optional().or(z.literal('')),
  notes: z.string().trim().max(300, 'Notes are too long').optional().or(z.literal('')),
  position: z.number().int().min(0)
})

export const prescriptionFormSchema = z.object({
  patientId: z.number().int().positive('Patient is required'),
  templateId: z.number().int().positive().nullable().optional(),
  sections: z.array(prescriptionSectionInputSchema),
  medicines: z.array(prescriptionMedicineInputSchema)
})

export type PrescriptionSectionInput = z.infer<typeof prescriptionSectionInputSchema>
export type PrescriptionMedicineInput = z.infer<typeof prescriptionMedicineInputSchema>
export type PrescriptionFormValues = z.infer<typeof prescriptionFormSchema>
export type PresetFormValues = z.infer<typeof presetFormSchema>

export interface PrescriptionSectionRecord extends PrescriptionSectionInput {
  id: number
}

export interface PrescriptionMedicineRecord extends PrescriptionMedicineInput {
  id: number
}

export interface PrescriptionListItem {
  id: number
  patientId: number
  patientCode: string
  patientName: string
  age: string | null
  gender: string | null
  visitNo: number
  createdAt: string
  updatedAt: string
  chiefComplaint: string | null
  provisionalDiagnosis: string | null
}

export interface PrescriptionDetail extends PrescriptionListItem {
  templateId: number | null
  phone: string | null
  address: string | null
  sections: PrescriptionSectionRecord[]
  medicines: PrescriptionMedicineRecord[]
}

export interface PresetRecord {
  id: number
  category: PresetCategory
  title: string
  content: string | null
}

export interface MedicineSuggestion {
  medicineName: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  notes: string | null
  useCount: number
  lastUsedAt: string | null
}
