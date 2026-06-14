import type { PrescriptionDetail } from './prescription'

export const PRINT_FONTS = [
  { key: 'times', label: 'Times New Roman', stack: "'Times New Roman', Times, serif" },
  { key: 'arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { key: 'georgia', label: 'Georgia', stack: "Georgia, 'Times New Roman', serif" },
  { key: 'calibri', label: 'Calibri', stack: "Calibri, 'Segoe UI', sans-serif" }
] as const

export type PrintFontKey = (typeof PRINT_FONTS)[number]['key']

export const PRINT_FONT_STORAGE_KEY = 'printFont'
export const DEFAULT_PRINT_FONT: PrintFontKey = 'times'

export function getPrintFontKey(key: string | null): PrintFontKey {
  return PRINT_FONTS.find((font) => font.key === key)?.key ?? DEFAULT_PRINT_FONT
}

export function getPrintFontStack(key: string | null): string {
  const resolved = getPrintFontKey(key)
  return PRINT_FONTS.find((font) => font.key === resolved)?.stack ?? PRINT_FONTS[0].stack
}

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
}
