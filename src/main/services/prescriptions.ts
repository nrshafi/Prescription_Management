import type Database from 'better-sqlite3'
import {
  type MedicineSuggestion,
  type PRESCRIPTION_SECTION_TYPES,
  PRESET_BUNDLE_CATEGORIES,
  type PrescriptionDetail,
  type PrescriptionFormValues,
  type PrescriptionListItem,
  type PrescriptionQuery,
  type PrescriptionSortField,
  type PresetCategory,
  type PresetFormValues,
  type PresetLinkKind,
  type PresetLinkRecord,
  type PresetRecord,
  prescriptionFormSchema,
  prescriptionQuerySchema,
  presetFormSchema,
  type SortDirection
} from '../../shared/prescription'
import { getDb } from '../db/client'

const BUNDLE_CATEGORIES = new Set<string>(PRESET_BUNDLE_CATEGORIES)

// The section type is bound as a `?` parameter by the caller (in SELECT-list
// order, ahead of any WHERE parameters) instead of being interpolated into
// the SQL string.
const SECTION_CONTENT_SUBQUERY = `(
    SELECT ps.content FROM prescription_sections ps
    WHERE ps.prescription_id = prescriptions.prescription_id
      AND ps.section_type = ?
    ORDER BY ps.position LIMIT 1
  )`

function normalize(values: PrescriptionFormValues): PrescriptionFormValues {
  const parsed = prescriptionFormSchema.parse(values)
  return {
    patientId: parsed.patientId,
    templateId: parsed.templateId ?? null,
    sections: parsed.sections.map((section, index) => ({
      sectionType: section.sectionType,
      content: section.content?.trim() ? section.content.trim() : '',
      position: index
    })),
    medicines: parsed.medicines
      .map((medicine, index) => ({
        medicineName: medicine.medicineName?.trim() ?? '',
        dosage: medicine.dosage?.trim() ? medicine.dosage.trim() : '',
        frequency: medicine.frequency?.trim() ? medicine.frequency.trim() : '',
        duration: medicine.duration?.trim() ? medicine.duration.trim() : '',
        notes: medicine.notes?.trim() ? medicine.notes.trim() : '',
        position: index
      }))
      .filter(
        (medicine) =>
          medicine.medicineName ||
          medicine.dosage ||
          medicine.frequency ||
          medicine.duration ||
          medicine.notes
      )
  }
}

function nextVisitNo(patientId: number, db: Database.Database): number {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(visit_no), 0) AS maxVisitNo FROM prescriptions WHERE patient_id = ?`
    )
    .get(patientId) as { maxVisitNo: number }
  return (row?.maxVisitNo ?? 0) + 1
}

function replacePrescriptionContent(
  prescriptionId: number,
  values: PrescriptionFormValues,
  db: Database.Database
): void {
  db.prepare('DELETE FROM prescription_sections WHERE prescription_id = ?').run(prescriptionId)
  db.prepare('DELETE FROM prescription_medicines WHERE prescription_id = ?').run(prescriptionId)

  const insertSection = db.prepare(
    `INSERT INTO prescription_sections (prescription_id, section_type, content, position) VALUES (?, ?, ?, ?)`
  )
  for (const section of values.sections) {
    insertSection.run(
      prescriptionId,
      section.sectionType,
      section.content || null,
      section.position
    )
  }

  const insertMedicine = db.prepare(
    `INSERT INTO prescription_medicines (prescription_id, medicine_name, dosage, frequency, duration, notes, position) VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  for (const medicine of values.medicines) {
    insertMedicine.run(
      prescriptionId,
      medicine.medicineName || 'Medicine',
      medicine.dosage || null,
      medicine.frequency || null,
      medicine.duration || null,
      medicine.notes || null,
      medicine.position
    )
  }
}

export function listPrescriptions(query: PrescriptionQuery = {}): PrescriptionListItem[] {
  const db = getDb()
  const { search, gender, dateFrom, dateTo, sortBy, sortDir } = prescriptionQuerySchema.parse(query)

  // Bound in SELECT-list order, ahead of the filter parameters.
  const params: unknown[] = ['Chief Complaint', 'Provisional Diagnosis']
  const filters: string[] = []

  if (search) {
    const term = `%${search}%`
    filters.push(
      `(patients.patient_code LIKE ? OR patients.name LIKE ? OR patients.phone LIKE ? OR CAST(patients.patient_id AS TEXT) = ? OR CAST(prescriptions.prescription_id AS TEXT) = ?)`
    )
    params.push(term, term, term, search, search)
  }
  if (gender) {
    filters.push('patients.gender = ?')
    params.push(gender)
  }
  if (dateFrom) {
    filters.push('prescriptions.created_at >= ?')
    params.push(dateFrom)
  }
  if (dateTo) {
    filters.push(`prescriptions.created_at <= ? || ' 23:59:59'`)
    params.push(dateTo)
  }

  const sortColumns: Record<PrescriptionSortField, string> = {
    id: 'prescriptions.prescription_id',
    patientName: 'patients.name',
    patientCode: 'patients.patient_code',
    visitNo: 'prescriptions.visit_no',
    createdAt: 'prescriptions.created_at'
  }
  const column = sortColumns[sortBy as PrescriptionSortField] ?? 'prescriptions.prescription_id'
  const orderDir = (sortDir as SortDirection) === 'asc' ? 'ASC' : 'DESC'
  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  const sql = `
SELECT
  prescriptions.prescription_id AS id,
  patients.patient_id AS patientId,
  patients.patient_code AS patientCode,
  patients.name AS patientName,
  patients.phone AS phone,
  patients.age AS age,
  patients.gender AS gender,
  prescriptions.visit_no AS visitNo,
  prescriptions.created_at AS createdAt,
  prescriptions.updated_at AS updatedAt,
  ${SECTION_CONTENT_SUBQUERY} AS chiefComplaint,
  ${SECTION_CONTENT_SUBQUERY} AS provisionalDiagnosis
FROM prescriptions
INNER JOIN patients ON prescriptions.patient_id = patients.patient_id
${whereClause}
ORDER BY ${column} ${orderDir}
`

  return db.prepare(sql).all(...params) as PrescriptionListItem[]
}

export function getPrescription(id: number): PrescriptionDetail | undefined {
  const db = getDb()

  const row = db
    .prepare(
      `
SELECT
  prescriptions.prescription_id AS id,
  patients.patient_id AS patientId,
  patients.patient_code AS patientCode,
  patients.name AS patientName,
  patients.age AS age,
  patients.gender AS gender,
  patients.phone AS phone,
  patients.address AS address,
  prescriptions.template_id AS templateId,
  prescriptions.visit_no AS visitNo,
  prescriptions.created_at AS createdAt,
  prescriptions.updated_at AS updatedAt,
  ${SECTION_CONTENT_SUBQUERY} AS chiefComplaint,
  ${SECTION_CONTENT_SUBQUERY} AS provisionalDiagnosis
FROM prescriptions
INNER JOIN patients ON prescriptions.patient_id = patients.patient_id
WHERE prescriptions.prescription_id = ?
`
    )
    .get('Chief Complaint', 'Provisional Diagnosis', id) as
    | Omit<PrescriptionDetail, 'sections' | 'medicines'>
    | undefined

  if (!row) return undefined

  const sections = db
    .prepare(
      `SELECT section_id AS id, section_type AS sectionType, content, position FROM prescription_sections WHERE prescription_id = ? ORDER BY position`
    )
    .all(id) as PrescriptionDetail['sections']

  const medicines = db
    .prepare(
      `SELECT medicine_id AS id, medicine_name AS medicineName, dosage, frequency, duration, notes, position FROM prescription_medicines WHERE prescription_id = ? ORDER BY position`
    )
    .all(id) as PrescriptionDetail['medicines']

  return {
    ...row,
    sections: sections.map((section) => ({
      ...section,
      sectionType: section.sectionType as (typeof PRESCRIPTION_SECTION_TYPES)[number],
      content: section.content ?? ''
    })),
    medicines: medicines.map((medicine) => ({
      ...medicine,
      dosage: medicine.dosage ?? '',
      frequency: medicine.frequency ?? '',
      duration: medicine.duration ?? '',
      notes: medicine.notes ?? ''
    }))
  }
}

export function createPrescription(input: PrescriptionFormValues): PrescriptionDetail {
  const db = getDb()
  const values = normalize(input)

  const id = db.transaction(() => {
    const visitNo = nextVisitNo(values.patientId, db)
    const info = db
      .prepare(`INSERT INTO prescriptions (patient_id, template_id, visit_no) VALUES (?, ?, ?)`)
      .run(values.patientId, values.templateId ?? null, visitNo)
    const prescriptionId = Number(info.lastInsertRowid)
    replacePrescriptionContent(prescriptionId, values, db)
    return prescriptionId
  })()

  const detail = getPrescription(id)
  if (!detail) throw new Error('Could not load created prescription.')
  return detail
}

export function updatePrescription(id: number, input: PrescriptionFormValues): PrescriptionDetail {
  const db = getDb()
  const values = normalize(input)
  const existing = getPrescription(id)
  if (!existing) throw new Error(`Prescription ${id} not found`)

  if (values.patientId !== existing.patientId) {
    throw new Error('Patient cannot be changed for an existing prescription.')
  }

  const valuesForUpdate = { ...values, patientId: existing.patientId }

  db.transaction(() => {
    db.prepare(
      `UPDATE prescriptions SET template_id = ?, updated_at = (CURRENT_TIMESTAMP) WHERE prescription_id = ?`
    ).run(values.templateId ?? null, id)
    replacePrescriptionContent(id, valuesForUpdate, db)
  })()

  const detail = getPrescription(id)
  if (!detail) throw new Error('Could not load updated prescription.')
  return detail
}

export function duplicatePrescription(id: number): PrescriptionDetail {
  const source = getPrescription(id)
  if (!source) throw new Error(`Prescription ${id} not found`)

  return createPrescription({
    patientId: source.patientId,
    templateId: source.templateId,
    sections: source.sections.map((section) => ({
      sectionType: section.sectionType,
      content: section.content ?? '',
      position: section.position
    })),
    medicines: source.medicines.map((medicine) => ({
      medicineName: medicine.medicineName,
      dosage: medicine.dosage ?? '',
      frequency: medicine.frequency ?? '',
      duration: medicine.duration ?? '',
      notes: medicine.notes ?? '',
      position: medicine.position
    }))
  })
}

export function listPresets(category?: string): PresetRecord[] {
  const db = getDb()
  const rows = (
    category
      ? db
          .prepare(
            `SELECT preset_id AS id, category, title, content FROM presets WHERE category = ? ORDER BY category, title`
          )
          .all(category)
      : db
          .prepare(
            `SELECT preset_id AS id, category, title, content FROM presets ORDER BY category, title`
          )
          .all()
  ) as PresetRecord[]

  const mapped = rows.map((preset) => ({ ...preset, category: preset.category as PresetCategory }))
  return attachPresetLinks(mapped, db)
}

export function getPreset(id: number): PresetRecord | undefined {
  const db = getDb()
  const preset = db
    .prepare(`SELECT preset_id AS id, category, title, content FROM presets WHERE preset_id = ?`)
    .get(id) as PresetRecord | undefined

  if (!preset) return undefined
  return attachPresetLinks([{ ...preset, category: preset.category as PresetCategory }], db)[0]
}

function attachPresetLinks(rows: PresetRecord[], db: Database.Database): PresetRecord[] {
  const bundleIds = rows.filter((row) => BUNDLE_CATEGORIES.has(row.category)).map((row) => row.id)
  if (bundleIds.length === 0) return rows

  const placeholders = bundleIds.map(() => '?').join(', ')
  const links = db
    .prepare(
      `SELECT link_id AS id, owner_preset_id AS ownerPresetId, target_kind AS targetKind, target_preset_id AS targetPresetId, label, dosage, frequency, duration, position FROM preset_links WHERE owner_preset_id IN (${placeholders}) ORDER BY owner_preset_id, position`
    )
    .all(...bundleIds) as PresetLinkRecord[]

  const linksByOwner = new Map<number, PresetLinkRecord[]>()
  for (const link of links) {
    const ownerLinks = linksByOwner.get(link.ownerPresetId) ?? []
    ownerLinks.push({ ...link, targetKind: link.targetKind as PresetLinkKind })
    linksByOwner.set(link.ownerPresetId, ownerLinks)
  }

  return rows.map((row) =>
    BUNDLE_CATEGORIES.has(row.category) ? { ...row, links: linksByOwner.get(row.id) ?? [] } : row
  )
}

function normalizePreset(input: PresetFormValues): PresetFormValues {
  const parsed = presetFormSchema.parse(input)
  return {
    category: parsed.category,
    title: parsed.title.trim(),
    content: parsed.content?.trim() ? parsed.content.trim() : '',
    links: BUNDLE_CATEGORIES.has(parsed.category)
      ? (parsed.links ?? [])
          .map((link, index) => ({
            targetKind: link.targetKind,
            targetPresetId: link.targetPresetId ?? null,
            label: link.label.trim(),
            dosage: link.dosage?.trim() ?? '',
            frequency: link.frequency?.trim() ?? '',
            duration: link.duration?.trim() ?? '',
            position: link.position ?? index
          }))
          .filter((link) => link.label)
      : []
  }
}

function replacePresetLinks(
  ownerPresetId: number,
  links: PresetFormValues['links'],
  db: Database.Database
): void {
  db.prepare('DELETE FROM preset_links WHERE owner_preset_id = ?').run(ownerPresetId)
  const insert = db.prepare(
    `INSERT INTO preset_links (owner_preset_id, target_kind, target_preset_id, label, dosage, frequency, duration, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const [index, link] of (links ?? []).entries()) {
    insert.run(
      ownerPresetId,
      link.targetKind,
      link.targetPresetId ?? null,
      link.label,
      link.targetKind === 'Medicine' && link.dosage ? link.dosage : null,
      link.targetKind === 'Medicine' && link.frequency ? link.frequency : null,
      link.targetKind === 'Medicine' && link.duration ? link.duration : null,
      link.position ?? index
    )
  }
}

export function createPreset(input: PresetFormValues): PresetRecord {
  const values = normalizePreset(input)
  const db = getDb()
  const id = db.transaction(() => {
    const info = db
      .prepare(`INSERT INTO presets (category, title, content) VALUES (?, ?, ?)`)
      .run(values.category, values.title, values.content || null)
    const presetId = Number(info.lastInsertRowid)
    replacePresetLinks(presetId, values.links, db)
    return presetId
  })()
  const preset = getPreset(id)
  if (!preset) throw new Error('Could not load created preset.')
  return preset
}

export function updatePreset(id: number, input: PresetFormValues): PresetRecord {
  const values = normalizePreset(input)
  const db = getDb()
  db.transaction(() => {
    db.prepare(`UPDATE presets SET category = ?, title = ?, content = ? WHERE preset_id = ?`).run(
      values.category,
      values.title,
      values.content || null,
      id
    )
    replacePresetLinks(id, values.links, db)
  })()
  const preset = getPreset(id)
  if (!preset) throw new Error(`Preset ${id} not found`)
  return preset
}

export function deletePreset(id: number): { id: number } {
  getDb().prepare('DELETE FROM presets WHERE preset_id = ?').run(id)
  return { id }
}

export function listMedicineSuggestions(search = '', limit = 8): MedicineSuggestion[] {
  const term = search.trim()
  const filters = [`prescription_medicines.medicine_name <> ''`]
  const params: unknown[] = []
  if (term) {
    filters.push('prescription_medicines.medicine_name LIKE ?')
    params.push(`%${term}%`)
  }
  params.push(limit)

  const sql = `
SELECT
  prescription_medicines.medicine_name AS medicineName,
  MAX(prescription_medicines.dosage) AS dosage,
  MAX(prescription_medicines.frequency) AS frequency,
  MAX(prescription_medicines.duration) AS duration,
  MAX(prescription_medicines.notes) AS notes,
  COUNT(*) AS useCount,
  MAX(prescriptions.created_at) AS lastUsedAt
FROM prescription_medicines
INNER JOIN prescriptions ON prescription_medicines.prescription_id = prescriptions.prescription_id
WHERE ${filters.join(' AND ')}
GROUP BY prescription_medicines.medicine_name
ORDER BY MAX(prescriptions.created_at) DESC, COUNT(*) DESC
LIMIT ?
`

  return getDb()
    .prepare(sql)
    .all(...params) as MedicineSuggestion[]
}
