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
}

export interface PrescriptionUiState {
  patientId: number
  patientName: string
  patientPhone: string
  patientAge: string
  patientGender: string
  patientWeight: string
  chiefComplaints: string[]
  oe: OeValues
  investigations: string[]
  diagnoses: string[]
  advice: string[]
  followUpValue: string
  followUpUnit: string
  medicines: PrescriptionMedicineInput[]
  templateId: number | null
}

const OE_KEYS = ['bp', 'pulse', 'temp', 'rr'] as const
const OE_LABELS: Record<(typeof OE_KEYS)[number], string> = {
  bp: 'BP',
  pulse: 'Pulse',
  temp: 'Temp',
  rr: 'R/R'
}

export function chipsFromContent(content: string | null | undefined): string[] {
  return (content ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function contentFromChips(chips: string[]): string {
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

export function parseOe(content: string): { oe: OeValues; weight: string } {
  const oe: OeValues = { bp: '', pulse: '', temp: '', rr: '' }
  let weight = ''
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const wtMatch = /^Wt:\s*(.+)$/i.exec(trimmed)
    if (wtMatch) {
      weight = wtMatch[1].replace(/\s*kg$/i, '').trim()
      continue
    }
    for (const key of OE_KEYS) {
      const label = OE_LABELS[key]
      const re = new RegExp(`^${label}:\\s*(.+)$`, 'i')
      const m = re.exec(trimmed)
      if (m) {
        oe[key] = m[1].trim()
        break
      }
    }
  }
  return { oe, weight }
}

export function serializeOe(oe: OeValues, weight: string): string {
  const lines: string[] = []
  if (oe.bp) lines.push(`BP: ${oe.bp}`)
  if (oe.pulse) lines.push(`Pulse: ${oe.pulse}`)
  if (oe.temp) lines.push(`Temp: ${oe.temp}`)
  if (oe.rr) lines.push(`R/R: ${oe.rr}`)
  if (weight.trim()) lines.push(`Wt: ${weight.trim()} kg`)
  return lines.join('\n')
}

export function parseFollowUp(content: string): { value: string; unit: string } {
  const trimmed = content.trim()
  // "N/A" is the marker for a follow-up value of 0 (or no follow-up set).
  if (/^n\/?a$/i.test(trimmed)) return { value: '0', unit: 'Days' }
  // An empty section means the prescription was saved without a follow-up.
  // Returning a default here would silently re-add "Follow-up after 7 Days"
  // every time an existing prescription is edited and saved.
  if (!trimmed) return { value: '', unit: 'Days' }
  const after = /^After:\s*(\d+)\s+(\w+)/i.exec(trimmed)
  if (after) return { value: after[1], unit: after[2] }
  const follow = /Follow-up after\s+(\d+)\s+(\w+)/i.exec(trimmed)
  if (follow) return { value: follow[1], unit: follow[2] }
  return { value: '', unit: 'Days' }
}

export function serializeFollowUp(value: string, unit: string): string {
  const trimmed = value.trim()
  // 0 (or empty) renders as "N/A" so the section stays visible but is
  // clearly indicating there is no scheduled follow-up.
  if (!trimmed || trimmed === '0') return 'N/A'
  return `Follow-up after ${trimmed} ${unit}`
}

function emptySections(): PrescriptionSectionInput[] {
  return PRESCRIPTION_SECTION_TYPES.map((sectionType, position) => ({
    sectionType,
    content: '',
    position
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
          content: s.content ?? '',
          position: s.position
        }))
      : emptySections()
  )
  const examContent = map.get('Examination') ?? ''
  const { oe, weight } = parseOe(examContent)
  const follow = parseFollowUp(map.get('Follow Up') ?? '')

  return {
    patientId: detail.patientId,
    patientName: detail.patientName,
    patientPhone: detail.phone ?? '',
    patientAge: detail.age ?? '',
    patientGender: detail.gender ?? 'Male',
    patientWeight: weight,
    chiefComplaints: chipsFromContent(map.get('Chief Complaint')),
    oe,
    investigations: chipsFromContent(map.get('Investigations')),
    diagnoses: chipsFromContent(map.get('Provisional Diagnosis')),
    advice: chipsFromContent(map.get('Advice')),
    followUpValue: follow.value,
    followUpUnit: follow.unit,
    medicines: detail.medicines.map((m, position) => ({
      medicineName: m.medicineName ?? '',
      dosage: m.dosage ?? '',
      frequency: m.frequency ?? '',
      duration: m.duration ?? '',
      notes: m.notes ?? '',
      position
    })),
    templateId: detail.templateId
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
        content = serializeOe(ui.oe, ui.patientWeight)
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
      default:
        break
    }
    return { ...section, content }
  })

  const medicines = ui.medicines
    .map((medicine, position) => ({
      medicineName: medicine.medicineName?.trim() ?? '',
      dosage: medicine.dosage?.trim() ?? '',
      frequency: medicine.frequency?.trim() ?? '',
      duration: medicine.duration?.trim() ?? '',
      notes: medicine.notes?.trim() ?? '',
      position
    }))
    .filter((m) => m.medicineName || m.dosage || m.frequency || m.duration || m.notes)

  return {
    patientId: ui.patientId,
    templateId: ui.templateId,
    sections,
    medicines: medicines.length
      ? medicines
      : [{ medicineName: '', dosage: '', frequency: '', duration: '', notes: '', position: 0 }]
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
    chiefComplaints: [],
    oe: { bp: '', pulse: '', temp: '', rr: '' },
    investigations: [],
    diagnoses: [],
    advice: [],
    followUpValue: '0',
    followUpUnit: 'Days',
    medicines: [],
    templateId: null
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
