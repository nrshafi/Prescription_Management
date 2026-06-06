import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`)
}

export const doctorProfile = sqliteTable('doctor_profile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientCode: text('patient_code').notNull().unique(),
  name: text('name').notNull(),
  age: text('age'),
  gender: text('gender'),
  phone: text('phone'),
  address: text('address'),
  ...timestamps
})

export const templates = sqliteTable('templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  paperSize: text('paper_size').notNull().default('A4'),
  layoutJson: text('layout_json')
})

export const prescriptions = sqliteTable('prescriptions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  patientId: integer('patient_id')
    .notNull()
    .references(() => patients.id, { onDelete: 'cascade' }),
  templateId: integer('template_id').references(() => templates.id),
  visitNo: integer('visit_no').notNull().default(1),
  ...timestamps
})

export const prescriptionSections = sqliteTable('prescription_sections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prescriptionId: integer('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  sectionType: text('section_type').notNull(),
  content: text('content'),
  position: integer('position').notNull().default(0)
})

export const prescriptionMedicines = sqliteTable('prescription_medicines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  prescriptionId: integer('prescription_id')
    .notNull()
    .references(() => prescriptions.id, { onDelete: 'cascade' }),
  medicineName: text('medicine_name').notNull(),
  dosage: text('dosage'),
  frequency: text('frequency'),
  duration: text('duration'),
  notes: text('notes'),
  position: integer('position').notNull().default(0)
})

export const presets = sqliteTable('presets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content')
})

export const paperSettings = sqliteTable('paper_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
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
export type Template = typeof templates.$inferSelect
export type PaperSettings = typeof paperSettings.$inferSelect
