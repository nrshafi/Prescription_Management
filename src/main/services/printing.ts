import type {
  DoctorProfileRecord,
  PaperSettingsRecord,
  PrescriptionPrintData
} from '../../shared/print'
import { getDb } from '../db/client'
import { getPrescription } from './prescriptions'

const DEFAULT_DOCTOR_PROFILE: DoctorProfileRecord = {
  id: 1,
  name: null,
  degrees: null,
  speciality: null,
  phone: null,
  email: null,
  address: null,
  chamber: null,
  logoPath: null,
  signaturePath: null
}

const DEFAULT_PAPER_SETTINGS: PaperSettingsRecord = {
  id: 1,
  widthMm: 210,
  heightMm: 297,
  marginTop: 10,
  marginBottom: 10,
  marginLeft: 10,
  marginRight: 10
}

export function getDoctorProfileForPrint(): DoctorProfileRecord {
  const row = getDb()
    .prepare(
      `
SELECT
  doctor_id AS id,
  name AS name,
  degrees AS degrees,
  speciality AS speciality,
  phone AS phone,
  email AS email,
  address AS address,
  chamber AS chamber,
  logo_path AS logoPath,
  signature_path AS signaturePath
FROM doctor_profile
WHERE doctor_id = 1
`
    )
    .get() as DoctorProfileRecord | undefined
  if (!row) return DEFAULT_DOCTOR_PROFILE
  return row
}

export function getPaperSettingsForPrint(): PaperSettingsRecord {
  const row = getDb()
    .prepare(
      `
SELECT
  paper_setting_id AS id,
  width_mm AS widthMm,
  height_mm AS heightMm,
  margin_top AS marginTop,
  margin_bottom AS marginBottom,
  margin_left AS marginLeft,
  margin_right AS marginRight
FROM paper_settings
WHERE paper_setting_id = 1
`
    )
    .get() as PaperSettingsRecord | undefined
  if (!row) return DEFAULT_PAPER_SETTINGS
  return row
}

export function getPrescriptionPrintData(prescriptionId: number): PrescriptionPrintData {
  const prescription = getPrescription(prescriptionId)
  if (!prescription) throw new Error(`Prescription ${prescriptionId} not found`)

  return {
    doctorProfile: getDoctorProfileForPrint(),
    paperSettings: getPaperSettingsForPrint(),
    prescription
  }
}
