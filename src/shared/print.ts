import type { PrescriptionDetail } from './prescription'

export interface DoctorProfileRecord {
  id: number
  name: string | null
  degrees: string | null
  speciality: string | null
  phone: string | null
  email: string | null
  address: string | null
  chamber: string | null
  logoPath: string | null
  signaturePath: string | null
}

export interface PaperSettingsRecord {
  id: number
  widthMm: number
  heightMm: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}

export interface PrescriptionPrintData {
  doctorProfile: DoctorProfileRecord
  paperSettings: PaperSettingsRecord
  prescription: PrescriptionDetail
}

export interface PrintActionResult {
  ok: boolean
  path?: string
  message?: string
  fallbackPreview?: boolean
}
