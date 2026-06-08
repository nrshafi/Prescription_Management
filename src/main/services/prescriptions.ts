import { and, asc, desc, eq, inArray, like, or, type SQL, sql } from 'drizzle-orm'
import {
  type MedicineSuggestion,
  PRESET_BUNDLE_CATEGORIES,
  type PRESCRIPTION_SECTION_TYPES,
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
import {
  patients,
  prescriptionMedicines,
  prescriptionSections,
  prescriptions,
  presetLinks,
  presets
} from '../db/schema'

type Db = ReturnType<typeof getDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

const BUNDLE_CATEGORIES = new Set<string>(PRESET_BUNDLE_CATEGORIES)

function sectionContentExpr(sectionType: string): SQL<string> {
  return sql<string>`(
    SELECT ps.content FROM prescription_sections ps
    WHERE ps.prescription_id = ${prescriptions.prescriptionId}
      AND ps.section_type = ${sectionType}
    ORDER BY ps.position LIMIT 1
  )`
}

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

function nextVisitNo(patientId: number, db: Db | Tx = getDb()): number {
  const row = db
    .select({ maxVisitNo: sql<number>`COALESCE(MAX(${prescriptions.visitNo}), 0)` })
    .from(prescriptions)
    .where(eq(prescriptions.patientId, patientId))
    .get()
  return (row?.maxVisitNo ?? 0) + 1
}

function replacePrescriptionContent(
  prescriptionId: number,
  values: PrescriptionFormValues,
  db: Db | Tx = getDb()
): void {
  db.delete(prescriptionSections)
    .where(eq(prescriptionSections.prescriptionId, prescriptionId))
    .run()
  db.delete(prescriptionMedicines)
    .where(eq(prescriptionMedicines.prescriptionId, prescriptionId))
    .run()

  const sections = values.sections.map((section) => ({
    prescriptionId,
    sectionType: section.sectionType,
    content: section.content || null,
    position: section.position
  }))
  if (sections.length) {
    db.insert(prescriptionSections).values(sections).run()
  }

  const medicines = values.medicines.map((medicine) => ({
    prescriptionId,
    medicineName: medicine.medicineName || 'Medicine',
    dosage: medicine.dosage || null,
    frequency: medicine.frequency || null,
    duration: medicine.duration || null,
    notes: medicine.notes || null,
    position: medicine.position
  }))
  if (medicines.length) {
    db.insert(prescriptionMedicines).values(medicines).run()
  }
}

export function listPrescriptions(query: PrescriptionQuery = {}): PrescriptionListItem[] {
  const db = getDb()
  const { search, gender, dateFrom, dateTo, sortBy, sortDir } = prescriptionQuerySchema.parse(query)
  const chiefComplaint = sectionContentExpr('Chief Complaint')
  const provisionalDiagnosis = sectionContentExpr('Provisional Diagnosis')
  const filters: SQL[] = []

  if (search) {
    const term = `%${search}%`
    filters.push(
      or(
        like(patients.patientCode, term),
        like(patients.name, term),
        like(patients.phone, term),
        sql`CAST(${patients.patientId} AS TEXT) = ${search}`,
        sql`CAST(${prescriptions.prescriptionId} AS TEXT) = ${search}`
      )!
    )
  }
  if (gender) {
    filters.push(eq(patients.gender, gender)!)
  }
  if (dateFrom) {
    filters.push(sql`${prescriptions.createdAt} >= ${dateFrom}`)
  }
  if (dateTo) {
    filters.push(sql`${prescriptions.createdAt} <= ${dateTo} || ' 23:59:59'`)
  }

  const sortColumns = {
    id: prescriptions.prescriptionId,
    patientName: patients.name,
    patientCode: patients.patientCode,
    visitNo: prescriptions.visitNo,
    createdAt: prescriptions.createdAt
  }
  const column = sortColumns[sortBy as PrescriptionSortField]
  const orderBy = (sortDir as SortDirection) === 'asc' ? asc(column) : desc(column)

  return db
    .select({
      id: prescriptions.prescriptionId,
      patientId: patients.patientId,
      patientCode: patients.patientCode,
      patientName: patients.name,
      phone: patients.phone,
      age: patients.age,
      gender: patients.gender,
      visitNo: prescriptions.visitNo,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
      chiefComplaint,
      provisionalDiagnosis
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.patientId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(orderBy)
    .all()
}

export function getPrescription(id: number): PrescriptionDetail | undefined {
  const db = getDb()
  const chiefComplaint = sectionContentExpr('Chief Complaint')
  const provisionalDiagnosis = sectionContentExpr('Provisional Diagnosis')
  const row = db
    .select({
      id: prescriptions.prescriptionId,
      patientId: patients.patientId,
      patientCode: patients.patientCode,
      patientName: patients.name,
      age: patients.age,
      gender: patients.gender,
      phone: patients.phone,
      address: patients.address,
      templateId: prescriptions.templateId,
      visitNo: prescriptions.visitNo,
      createdAt: prescriptions.createdAt,
      updatedAt: prescriptions.updatedAt,
      chiefComplaint,
      provisionalDiagnosis
    })
    .from(prescriptions)
    .innerJoin(patients, eq(prescriptions.patientId, patients.patientId))
    .where(eq(prescriptions.prescriptionId, id))
    .get()

  if (!row) return undefined

  const sections = db
    .select({
      id: prescriptionSections.sectionId,
      sectionType: prescriptionSections.sectionType,
      content: prescriptionSections.content,
      position: prescriptionSections.position
    })
    .from(prescriptionSections)
    .where(eq(prescriptionSections.prescriptionId, id))
    .orderBy(prescriptionSections.position)
    .all()

  const medicines = db
    .select({
      id: prescriptionMedicines.medicineId,
      medicineName: prescriptionMedicines.medicineName,
      dosage: prescriptionMedicines.dosage,
      frequency: prescriptionMedicines.frequency,
      duration: prescriptionMedicines.duration,
      notes: prescriptionMedicines.notes,
      position: prescriptionMedicines.position
    })
    .from(prescriptionMedicines)
    .where(eq(prescriptionMedicines.prescriptionId, id))
    .orderBy(prescriptionMedicines.position)
    .all()

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

  const id = db.transaction((tx) => {
    const created = tx
      .insert(prescriptions)
      .values({
        patientId: values.patientId,
        templateId: values.templateId ?? null,
        visitNo: nextVisitNo(values.patientId, tx)
      })
      .returning({ id: prescriptions.prescriptionId })
      .get()
    replacePrescriptionContent(created.id, values, tx)
    return created.id
  })

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

  db.transaction((tx) => {
    tx.update(prescriptions)
      .set({ templateId: values.templateId ?? null, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(prescriptions.prescriptionId, id))
      .run()
    replacePrescriptionContent(id, valuesForUpdate, tx)
  })

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
  const rows = db
    .select({
      id: presets.presetId,
      category: presets.category,
      title: presets.title,
      content: presets.content
    })
    .from(presets)
    .where(category ? eq(presets.category, category) : undefined)
    .orderBy(presets.category, presets.title)
    .all()
    .map((preset) => ({ ...preset, category: preset.category as PresetCategory }))

  return attachPresetLinks(rows, db)
}

export function getPreset(id: number): PresetRecord | undefined {
  const db = getDb()
  const preset = db
    .select({
      id: presets.presetId,
      category: presets.category,
      title: presets.title,
      content: presets.content
    })
    .from(presets)
    .where(eq(presets.presetId, id))
    .get()

  if (!preset) return undefined
  return attachPresetLinks([{ ...preset, category: preset.category as PresetCategory }], db)[0]
}

function attachPresetLinks(rows: PresetRecord[], db: Db | Tx = getDb()): PresetRecord[] {
  const bundleIds = rows.filter((row) => BUNDLE_CATEGORIES.has(row.category)).map((row) => row.id)
  if (bundleIds.length === 0) return rows

  const links = db
    .select({
      id: presetLinks.linkId,
      ownerPresetId: presetLinks.ownerPresetId,
      targetKind: presetLinks.targetKind,
      targetPresetId: presetLinks.targetPresetId,
      label: presetLinks.label,
      dosage: presetLinks.dosage,
      frequency: presetLinks.frequency,
      duration: presetLinks.duration,
      position: presetLinks.position
    })
    .from(presetLinks)
    .where(inArray(presetLinks.ownerPresetId, bundleIds))
    .orderBy(presetLinks.ownerPresetId, presetLinks.position)
    .all()

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
  db: Db | Tx
): void {
  db.delete(presetLinks).where(eq(presetLinks.ownerPresetId, ownerPresetId)).run()
  const rows = (links ?? []).map((link, index) => ({
    ownerPresetId,
    targetKind: link.targetKind,
    targetPresetId: link.targetPresetId ?? null,
    label: link.label,
    dosage: link.targetKind === 'Medicine' && link.dosage ? link.dosage : null,
    frequency: link.targetKind === 'Medicine' && link.frequency ? link.frequency : null,
    duration: link.targetKind === 'Medicine' && link.duration ? link.duration : null,
    position: link.position ?? index
  }))
  if (rows.length) db.insert(presetLinks).values(rows).run()
}

export function createPreset(input: PresetFormValues): PresetRecord {
  const values = normalizePreset(input)
  const db = getDb()
  const id = db.transaction((tx) => {
    const created = tx
      .insert(presets)
      .values({ category: values.category, title: values.title, content: values.content || null })
      .returning({ id: presets.presetId })
      .get()
    replacePresetLinks(created.id, values.links, tx)
    return created.id
  })
  const preset = getPreset(id)
  if (!preset) throw new Error('Could not load created preset.')
  return preset
}

export function updatePreset(id: number, input: PresetFormValues): PresetRecord {
  const values = normalizePreset(input)
  const db = getDb()
  db.transaction((tx) => {
    tx.update(presets)
      .set({ category: values.category, title: values.title, content: values.content || null })
      .where(eq(presets.presetId, id))
      .run()
    replacePresetLinks(id, values.links, tx)
  })
  const preset = getPreset(id)
  if (!preset) throw new Error(`Preset ${id} not found`)
  return preset
}

export function deletePreset(id: number): { id: number } {
  getDb().delete(presets).where(eq(presets.presetId, id)).run()
  return { id }
}

export function listMedicineSuggestions(search = '', limit = 8): MedicineSuggestion[] {
  const term = search.trim()
  const filters: SQL[] = [sql`${prescriptionMedicines.medicineName} <> ''`]
  if (term) filters.push(like(prescriptionMedicines.medicineName, `%${term}%`))

  return getDb()
    .select({
      medicineName: prescriptionMedicines.medicineName,
      dosage: sql<string | null>`MAX(${prescriptionMedicines.dosage})`,
      frequency: sql<string | null>`MAX(${prescriptionMedicines.frequency})`,
      duration: sql<string | null>`MAX(${prescriptionMedicines.duration})`,
      notes: sql<string | null>`MAX(${prescriptionMedicines.notes})`,
      useCount: sql<number>`COUNT(*)`,
      lastUsedAt: sql<string | null>`MAX(${prescriptions.createdAt})`
    })
    .from(prescriptionMedicines)
    .innerJoin(
      prescriptions,
      eq(prescriptionMedicines.prescriptionId, prescriptions.prescriptionId)
    )
    .where(and(...filters))
    .groupBy(prescriptionMedicines.medicineName)
    .orderBy(sql`MAX(${prescriptions.createdAt}) DESC`, sql`COUNT(*) DESC`)
    .limit(limit)
    .all()
}
