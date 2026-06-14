import type { PatientRecord } from '../../../shared/patient'
import {
  PRESCRIPTION_SECTION_TYPES,
  type PrescriptionDetail,
  type PrescriptionFormValues,
  type PrescriptionMedicineInput,
  type PrescriptionSectionInput,
  type PrescriptionSectionType
} from '../../../shared/prescription'

export interface OeValues {
  bp: string
  pulse: string
  temp: string
  rr: string
  custom: OeCustomEntry[]
}

export interface OeCustomEntry {
  label: string
  value: string
}

export interface PrescriptionUiState {
  patientId: number
  patientName: string
  patientPhone: string
  patientAge: string
  patientGender: string
  patientWeight: string
  patientAddress: string
  chiefComplaints: string[]
  oe: OeValues
  investigations: string[]
  diagnoses: string[]
  advice: string[]
  followUpValue: string
  followUpUnit: string
  medicines: PrescriptionMedicineInput[]
}

const OE_KEYS = ['bp', 'pulse', 'temp', 'rr'] as const
const OE_LABELS: Record<(typeof OE_KEYS)[number], string> = {
  bp: 'BP',
  pulse: 'Pulse',
  temp: 'Temp',
  rr: 'R/R'
}

function chipsFromContent(content: string | null | undefined): string[] {
  return (content ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function contentFromChips(chips: string[]): string {
  return chips
    .map((c) => c.trim())
    .filter(Boolean)
    .join('\n')
}

export function mergeChips(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing.map((item) => item.trim().toLowerCase()))
  const merged = [...existing]
  for (const item of incoming) {
    const trimmed = item.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
  }
  return merged
}

function parseOe(content: string): { oe: OeValues; weight: string } {
  const oe: OeValues = { bp: '', pulse: '', temp: '', rr: '', custom: [] }
  let weight = ''
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const wtMatch = /^Wt:\s*(.+)$/i.exec(trimmed)
    if (wtMatch) {
      weight = wtMatch[1].replace(/\s*kgs?$/i, '').trim()
      continue
    }
    let matchedKnownKey = false
    for (const key of OE_KEYS) {
      const label = OE_LABELS[key]
      const re = new RegExp(`^${label}:\\s*(.+)$`, 'i')
      const m = re.exec(trimmed)
      if (m) {
        oe[key] = m[1].trim()
        matchedKnownKey = true
        break
      }
    }
    if (matchedKnownKey) continue

    const customMatch = /^([^:]+):\s*(.+)$/.exec(trimmed)
    if (customMatch) {
      oe.custom.push({ label: customMatch[1].trim(), value: customMatch[2].trim() })
    }
  }
  return { oe, weight }
}

function serializeOe(oe: OeValues): string {
  const lines: string[] = []
  if (oe.bp.trim()) lines.push(`BP: ${oe.bp.trim()}`)
  if (oe.pulse.trim()) lines.push(`Pulse: ${oe.pulse.trim()}`)
  if (oe.temp.trim()) lines.push(`Temp: ${oe.temp.trim()}`)
  if (oe.rr.trim()) lines.push(`R/R: ${oe.rr.trim()}`)
  const knownLabels = new Set(OE_KEYS.map((key) => OE_LABELS[key].toLowerCase()))
  for (const row of oe.custom) {
    const label = row.label.trim()
    const value = row.value.trim()
    if (!label || !value) continue
    // A custom label that collides with a known O/E key would be re-parsed as
    // that structured field on reload, so skip it to avoid silent mutation.
    if (knownLabels.has(label.toLowerCase())) continue
    lines.push(`${label}: ${value}`)
  }
  return lines.join('\n')
}

function parseWeight(content: string | null | undefined): string {
  return (content ?? '').replace(/\s*kgs?$/i, '').trim()
}

function serializeWeight(weight: string): string {
  return weight.trim().replace(/\s*kgs?$/i, '').trim()
}

function parseFollowUp(content: string): { value: string; unit: string } {
  const trimmed = content.trim()
  // "Follow up: N/A" is the marker for a follow-up value of 0.
  if (/^Follow up:\s*N\/?A$/i.test(trimmed)) return { value: '0', unit: 'Days' }
  // An empty section means the prescription was saved without a follow-up.
  // Returning a default here would silently re-add a follow-up value
  // every time an existing prescription is edited and saved.
  if (!trimmed) return { value: '', unit: 'Days' }
  const after = /^Follow up:\s*After\s+(\d+)\s+(\w+)/i.exec(trimmed)
  if (after) return { value: after[1], unit: after[2] }
  // Legacy formats from previous versions.
  const legacyAfter = /^After:\s*(\d+)\s+(\w+)/i.exec(trimmed)
  if (legacyAfter) return { value: legacyAfter[1], unit: legacyAfter[2] }
  const legacyFollow = /Follow-up after\s+(\d+)\s+(\w+)/i.exec(trimmed)
  if (legacyFollow) return { value: legacyFollow[1], unit: legacyFollow[2] }
  return { value: '', unit: 'Days' }
}

function serializeFollowUp(value: string, unit: string): string {
  const trimmed = value.trim()
  // 0 (or empty) renders as "Follow up: N/A" so the section stays visible
  // but is clearly indicating there is no scheduled follow-up.
  if (!trimmed || trimmed === '0') return 'Follow up: N/A'
  return `Follow up: After ${trimmed} ${unit}`
}

function emptySections(): PrescriptionSectionInput[] {
  return PRESCRIPTION_SECTION_TYPES.map((sectionType) => ({
    sectionType,
    content: ''
  }))
}

function sectionMap(sections: PrescriptionSectionInput[]): Map<PrescriptionSectionType, string> {
  const map = new Map<PrescriptionSectionType, string>()
  for (const s of sections) {
    map.set(s.sectionType, s.content ?? '')
  }
  return map
}

export function detailToUi(detail: PrescriptionDetail): PrescriptionUiState {
  const map = sectionMap(
    detail.sections.length
      ? detail.sections.map((s) => ({
          sectionType: s.sectionType,
          content: s.content ?? ''
        }))
      : emptySections()
  )
  const examContent = map.get('Examination') ?? ''
  const { oe, weight: legacyWeight } = parseOe(examContent)
  const weight = parseWeight(map.get('Weight')) || legacyWeight
  const follow = parseFollowUp(map.get('Follow Up') ?? '')

  return {
    patientId: detail.patientId,
    patientName: detail.patientName,
    patientPhone: detail.phone ?? '',
    patientAge: detail.age ?? '',
    patientGender: detail.gender ?? 'Male',
    patientWeight: weight,
    patientAddress: detail.address ?? '',
    chiefComplaints: chipsFromContent(map.get('Chief Complaint')),
    oe,
    investigations: chipsFromContent(map.get('Investigations')),
    diagnoses: chipsFromContent(map.get('Provisional Diagnosis')),
    advice: chipsFromContent(map.get('Advice')),
    followUpValue: follow.value,
    followUpUnit: follow.unit,
    medicines: detail.medicines.map((m) => ({
      medicineName: m.medicineName ?? '',
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      duration: m.duration ?? '',
      notes: m.notes ?? ''
    }))
  }
}

export function uiToFormValues(ui: PrescriptionUiState): PrescriptionFormValues {
  const sections = emptySections().map((section) => {
    let content = ''
    switch (section.sectionType) {
      case 'Chief Complaint':
        content = contentFromChips(ui.chiefComplaints)
        break
      case 'Examination':
        content = serializeOe(ui.oe)
        break
      case 'Investigations':
        content = contentFromChips(ui.investigations)
        break
      case 'Provisional Diagnosis':
        content = contentFromChips(ui.diagnoses)
        break
      case 'Advice':
        content = contentFromChips(ui.advice)
        break
      case 'Follow Up':
        content = serializeFollowUp(ui.followUpValue, ui.followUpUnit)
        break
      case 'Weight':
        content = serializeWeight(ui.patientWeight)
        break
      default:
        break
    }
    return { ...section, content }
  })

  const medicines = ui.medicines
    .map((medicine) => ({
      medicineName: medicine.medicineName?.trim() ?? '',
      dosage: medicine.dosage?.trim() ?? '',
      frequency: medicine.frequency?.trim() ?? '',
      duration: medicine.duration?.trim() ?? '',
      notes: medicine.notes?.trim() ?? ''
    }))
    .filter((m) => m.medicineName || m.dosage || m.frequency || m.duration || m.notes)

  return {
    patientId: ui.patientId,
    sections,
    medicines: medicines.length
      ? medicines
      : [{ medicineName: '', dosage: '', frequency: '', duration: '', notes: '' }]
  }
}

export function emptyUiState(): PrescriptionUiState {
  return {
    patientId: 0,
    patientName: '',
    patientPhone: '',
    patientAge: '',
    patientGender: 'Male',
    patientWeight: '',
    patientAddress: '',
    chiefComplaints: [],
    oe: { bp: '', pulse: '', temp: '', rr: '', custom: [] },
    investigations: [],
    diagnoses: [],
    advice: [],
    followUpValue: '0',
    followUpUnit: 'Days',
    medicines: []
  }
}

export function uiStateFromPatient(patient: PatientRecord): PrescriptionUiState {
  return {
    ...emptyUiState(),
    patientId: patient.id,
    patientName: patient.name,
    patientPhone: patient.phone ?? '',
    patientAge: patient.age ?? '',
    patientGender: patient.gender ?? 'Male',
    patientAddress: patient.address ?? ''
  }
}

export function presetTitlesByCategory(
  presets: { category: string; title: string; content: string | null }[],
  category: string
): string[] {
  return presets
    .filter((p) => p.category === category)
    .map((p) => (p.content?.trim() ? p.content.trim() : p.title))
    .filter(Boolean)
}
