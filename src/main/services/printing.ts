import { eq } from 'drizzle-orm'
import type { DoctorProfileRecord, PaperSettingsRecord, PrescriptionPrintData } from '../../shared/print'
import { getDb } from '../db/client'
import { doctorProfile, paperSettings } from '../db/schema'
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
  const row = getDb().select().from(doctorProfile).limit(1).get()
  if (!row) return DEFAULT_DOCTOR_PROFILE

  return {
    id: row.doctorId,
    name: row.name,
    degrees: row.degrees,
    speciality: row.speciality,
    phone: row.phone,
    email: row.email,
    address: row.address,
    chamber: row.chamber,
    logoPath: row.logoPath,
    signaturePath: row.signaturePath
  }
}

export function getPaperSettingsForPrint(): PaperSettingsRecord {
  const row = getDb()
    .select()
    .from(paperSettings)
    .where(eq(paperSettings.paperSettingId, 1))
    .get()
  if (!row) return DEFAULT_PAPER_SETTINGS

  return {
    id: row.paperSettingId,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    marginTop: row.marginTop,
    marginBottom: row.marginBottom,
    marginLeft: row.marginLeft,
    marginRight: row.marginRight
  }
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
