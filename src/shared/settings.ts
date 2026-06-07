import { z } from 'zod'

export const doctorProfileFormSchema = z.object({
  name: z.string().trim().max(160).optional().or(z.literal('')),
  degrees: z.string().trim().max(240).optional().or(z.literal('')),
  speciality: z.string().trim().max(160).optional().or(z.literal('')),
  phone: z.string().trim().max(80).optional().or(z.literal('')),
  email: z.string().trim().max(160).optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  chamber: z.string().trim().max(500).optional().or(z.literal('')),
  logoPath: z.string().trim().max(1000).optional().or(z.literal('')),
  signaturePath: z.string().trim().max(1000).optional().or(z.literal(''))
})

export const paperSettingsFormSchema = z.object({
  widthMm: z.number().positive().max(1000),
  heightMm: z.number().positive().max(1000),
  marginTop: z.number().min(0).max(100),
  marginBottom: z.number().min(0).max(100),
  marginLeft: z.number().min(0).max(100),
  marginRight: z.number().min(0).max(100)
})

export type DoctorProfileFormValues = z.infer<typeof doctorProfileFormSchema>
export type PaperSettingsFormValues = z.infer<typeof paperSettingsFormSchema>

export interface BackupActionResult {
  ok: boolean
  path?: string
}
