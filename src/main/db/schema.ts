import { sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
}

export const doctorProfile = sqliteTable('doctor_profile', {
  doctorId: integer('doctor_id').primaryKey({ autoIncrement: true }),
  name: text('name'),
  degrees: text('degrees'),
  speciality: text('speciality'),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  chamber: text('chamber'),
  logoPath: text('logo_path'),
  signaturePath: text('signature_path')
})

export const patients = sqliteTable('patients', {
  patientId: integer('patient_id').primaryKey({ autoIncrement: true }),
  patientCode: text('patient_code').notNull().unique(),
  name: text('name').notNull(),
  age: text('age'),
  gender: text('gender'),
  phone: text('phone'),
  address: text('address'),
  ...timestamps
})

export const templates = sqliteTable('templates', {
  templateId: integer('template_id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  paperSize: text('paper_size').notNull().default('A4'),
  layoutJson: text('layout_json')
})

export const prescriptions = sqliteTable('prescriptions', {
  prescriptionId: integer('prescription_id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.patientId, { onDelete: 'cascade' }),
  templateId: integer('template_id').references(() => templates.templateId),
  visitNo: integer('visit_no').notNull().default(1),
  ...timestamps
})

export const prescriptionSections = sqliteTable('prescription_sections', {
  sectionId: integer('section_id').primaryKey({ autoIncrement: true }),
  prescriptionId: integer('prescription_id')
    .notNull()
    .references(() => prescriptions.prescriptionId, { onDelete: 'cascade' }),
  sectionType: text('section_type').notNull(),
  content: text('content'),
  position: integer('position').notNull().default(0)
})

export const prescriptionMedicines = sqliteTable('prescription_medicines', {
  medicineId: integer('medicine_id').primaryKey({ autoIncrement: true }),
  prescriptionId: integer('prescription_id')
    .notNull()
    .references(() => prescriptions.prescriptionId, { onDelete: 'cascade' }),
  medicineName: text('medicine_name').notNull(),
  dosage: text('dosage'),
  frequency: text('frequency'),
  duration: text('duration'),
  notes: text('notes'),
  position: integer('position').notNull().default(0)
})

export const presets = sqliteTable('presets', {
  presetId: integer('preset_id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content')
})

export const presetLinks = sqliteTable(
  'preset_links',
  {
    linkId: integer('link_id').primaryKey({ autoIncrement: true }),
    ownerPresetId: integer('owner_preset_id')
      .notNull()
      .references(() => presets.presetId, { onDelete: 'cascade' }),
    targetKind: text('target_kind').notNull(),
    targetPresetId: integer('target_preset_id').references(() => presets.presetId, {
      onDelete: 'set null'
    }),
    label: text('label').notNull(),
    dosage: text('dosage'),
    frequency: text('frequency'),
    duration: text('duration'),
    position: integer('position').notNull().default(0)
  },
  (table) => [
    index('preset_links_owner_preset_id_idx').on(table.ownerPresetId),
    index('preset_links_target_preset_id_idx').on(table.targetPresetId)
  ]
)

export const paperSettings = sqliteTable('paper_settings', {
  paperSettingId: integer('paper_setting_id').primaryKey({ autoIncrement: true }),
  widthMm: real('width_mm').notNull().default(210),
  heightMm: real('height_mm').notNull().default(297),
  marginTop: real('margin_top').notNull().default(10),
  marginBottom: real('margin_bottom').notNull().default(10),
  marginLeft: real('margin_left').notNull().default(10),
  marginRight: real('margin_right').notNull().default(10)
})

export type DoctorProfile = typeof doctorProfile.$inferSelect
export type Patient = typeof patients.$inferSelect
export type NewPatient = typeof patients.$inferInsert
export type Prescription = typeof prescriptions.$inferSelect
export type PrescriptionSection = typeof prescriptionSections.$inferSelect
export type PrescriptionMedicine = typeof prescriptionMedicines.$inferSelect
export type Preset = typeof presets.$inferSelect
export type PresetLink = typeof presetLinks.$inferSelect
export type Template = typeof templates.$inferSelect
export type PaperSettings = typeof paperSettings.$inferSelect
