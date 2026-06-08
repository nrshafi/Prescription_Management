export interface DoctorProfile {
  doctorId: number
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

export interface Patient {
  patientId: number
  patientCode: string
  name: string
  age: string | null
  gender: string | null
  phone: string | null
  address: string | null
  createdAt: string
  updatedAt: string
}

export interface Template {
  templateId: number
  name: string
  paperSize: string
  layoutJson: string | null
}

export interface Prescription {
  prescriptionId: number
  patientId: number
  templateId: number | null
  visitNo: number
  createdAt: string
  updatedAt: string
}

export interface PrescriptionSection {
  sectionId: number
  prescriptionId: number
  sectionType: string
  content: string | null
  position: number
}

export interface PrescriptionMedicine {
  medicineId: number
  prescriptionId: number
  medicineName: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  notes: string | null
  position: number
}

export interface Preset {
  presetId: number
  category: string
  title: string
  content: string | null
}

export interface PresetLink {
  linkId: number
  ownerPresetId: number
  targetKind: string
  targetPresetId: number | null
  label: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  position: number
}

export interface PaperSettings {
  paperSettingId: number
  widthMm: number
  heightMm: number
  marginTop: number
  marginBottom: number
  marginLeft: number
  marginRight: number
}
