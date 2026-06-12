import { ArrowDown, ArrowUp, Plus, Search, Trash2, UserCheck, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SearchMultiSelect } from '@/components/SearchMultiSelect'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { api } from '@/lib/api'
import {
  detailToUi,
  emptyUiState,
  mergeChips,
  type PrescriptionUiState,
  presetTitlesByCategory,
  uiToFormValues
} from '@/lib/prescription-mapping'
import type { PatientFormValues, PatientListItem } from '../../../shared/patient'
import type { MedicineSuggestion, PresetRecord } from '../../../shared/prescription'
import type { DoctorProfileRecord } from '../../../shared/print'

const DOSAGE_OPTIONS = ['1+0+1', '1+1+1', '0+0+1', '1+0+0', '0+1+0', '1+1+0', '0+0+2', '1+1+2']
const INSTRUCTION_OPTIONS = [
  'After Meal',
  'Before Meal',
  'Night Only',
  'Morning Only',
  'Empty Stomach',
  'With Water',
  'As Directed'
]
const DURATION_OPTIONS = [
  '1 Day',
  '3 Days',
  '5 Days',
  '7 Days',
  '10 Days',
  '15 Days',
  '1 Month',
  '2 Months',
  '3 Months',
  'Ongoing'
]
const FOLLOWUP_UNITS = ['Days', 'Weeks', 'Months']
const MEDICINE_DEFAULTS = { dosage: '1+1+1', frequency: 'After Meal', duration: '5 Days' }

export interface PrescriptionPageActions {
  savePrescription: () => Promise<void>
  exportPdf: () => Promise<void>
  print: () => Promise<void>
}

interface NewPrescriptionProps {
  editId: number | null
  onEditIdChange: (id: number | null) => void
  onBindActions: (actions: PrescriptionPageActions | null) => void
  onStatus?: (message: string | null) => void
}

interface MedicineRow {
  key: string
  medicineName: string
  dosage: string
  frequency: string
  duration: string
  notes: string
}

let medKey = 0

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
}

function EditableSelectCell({
  value,
  options,
  onChange,
  placeholder,
  listId
}: {
  value: string
  options: string[]
  onChange: (val: string) => void
  placeholder: string
  listId: string
}): React.JSX.Element {
  return (
    <div className="relative print:contents">
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-input bg-muted text-foreground focus:ring-ring print:border-0 print:bg-transparent rounded border py-0.5 pr-4 pl-2 text-xs focus:ring-1 focus:outline-none print:p-0"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  )
}

function MedRow({
  med,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  med: MedicineRow
  index: number
  total: number
  onChange: (key: string, field: keyof MedicineRow, val: string) => void
  onRemove: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
}): React.JSX.Element {
  return (
    <div className="group flex items-start gap-2 border-b py-2 last:border-0">
      <span className="text-muted-foreground w-5 shrink-0 pt-1.5 text-sm print:block">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm font-medium">{med.medicineName}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <EditableSelectCell
            value={med.dosage}
            options={DOSAGE_OPTIONS}
            onChange={(v) => onChange(med.key, 'dosage', v)}
            placeholder="Dosage"
            listId={`dosage-options-${med.key}`}
          />
          <EditableSelectCell
            value={med.frequency}
            options={INSTRUCTION_OPTIONS}
            onChange={(v) => onChange(med.key, 'frequency', v)}
            placeholder="Instruction"
            listId={`frequency-options-${med.key}`}
          />
          <EditableSelectCell
            value={med.duration}
            options={DURATION_OPTIONS}
            onChange={(v) => onChange(med.key, 'duration', v)}
            placeholder="Duration"
            listId={`duration-options-${med.key}`}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100 print:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={index === 0}
          onClick={() => onMoveUp(med.key)}
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={index === total - 1}
          onClick={() => onMoveDown(med.key)}
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive size-7"
          onClick={() => onRemove(med.key)}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}

function MedSearch({
  presets,
  onAdd
}: {
  presets: string[]
  onAdd: (
    name: string,
    defaults?: { dosage?: string; frequency?: string; duration?: string }
  ) => void
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([])
  const ref = useRef<HTMLDivElement>(null)
  const filtered = presets.filter((p) => p.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const t = setTimeout(() => {
      api.prescriptions
        .medicineSuggestions(query)
        .then((rows) => setSuggestions(rows))
        .catch(() => setSuggestions([]))
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const handleAdd = (
    name: string,
    defaults?: { dosage?: string; frequency?: string; duration?: string }
  ): void => {
    onAdd(name, defaults)
    setQuery('')
    setIsOpen(false)
    setSuggestions([])
  }

  const suggestionNames = new Set(suggestions.map((s) => s.medicineName.toLowerCase()))
  const mergedPresets = filtered.filter((p) => !suggestionNames.has(p.toLowerCase()))

  return (
    <div ref={ref} className="relative print:hidden">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (suggestions.length > 0) {
                const s = suggestions[0]
                handleAdd(s.medicineName, {
                  dosage: s.dosage ?? undefined,
                  frequency: s.frequency ?? undefined,
                  duration: s.duration ?? undefined
                })
              } else if (mergedPresets.length > 0) handleAdd(mergedPresets[0])
              else if (query.trim()) handleAdd(query.trim())
            }
            if (e.key === 'Escape') setIsOpen(false)
          }}
          placeholder="Search medicine to add..."
          className="border-primary/30 bg-primary/5 focus:ring-ring w-full rounded-lg border border-dashed py-1.5 pr-3 pl-8 text-sm focus:ring-2 focus:outline-none"
        />
      </div>
      {isOpen && (query || suggestions.length > 0 || mergedPresets.length > 0) && (
        <div className="bg-popover absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.medicineName}
              type="button"
              onClick={() =>
                handleAdd(s.medicineName, {
                  dosage: s.dosage ?? undefined,
                  frequency: s.frequency ?? undefined,
                  duration: s.duration ?? undefined
                })
              }
              className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
            >
              <div className="font-medium">{s.medicineName}</div>
              <div className="text-muted-foreground flex gap-2 text-xs">
                {s.dosage && <span>{s.dosage}</span>}
                {s.frequency && <span>{s.frequency}</span>}
                {s.duration && <span>{s.duration}</span>}
                <span className="ml-auto">Used {s.useCount}x</span>
              </div>
            </button>
          ))}
          {mergedPresets.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => handleAdd(item)}
              className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
            >
              {item}
            </button>
          ))}
          {query.trim() &&
            !suggestions.find((s) => s.medicineName.toLowerCase() === query.trim().toLowerCase()) &&
            !mergedPresets.find((f) => f.toLowerCase() === query.trim().toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleAdd(query.trim())}
                className="text-primary hover:bg-accent flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm"
              >
                <Plus className="size-4" />
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
        </div>
      )}
    </div>
  )
}

export function NewPrescription({
  editId,
  onEditIdChange,
  onBindActions,
  onStatus
}: NewPrescriptionProps): React.JSX.Element {
  const today = useMemo(() => new Date(), [])
  const [ui, setUi] = useState<PrescriptionUiState>(() => emptyUiState())
  const [medicines, setMedicines] = useState<MedicineRow[]>([])
  const [presets, setPresets] = useState<PresetRecord[]>([])
  const [doctor, setDoctor] = useState<DoctorProfileRecord | null>(null)
  const [foundPatient, setFoundPatient] = useState<PatientListItem | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const editingIdRef = useRef(editId)
  editingIdRef.current = editId

  const complaintItems = useMemo(
    () => presetTitlesByCategory(presets, 'Chief Complaint'),
    [presets]
  )
  const investigationItems = useMemo(
    () => presetTitlesByCategory(presets, 'Investigations'),
    [presets]
  )
  const diagnosisItems = useMemo(
    () => presetTitlesByCategory(presets, 'Provisional Diagnosis'),
    [presets]
  )
  const adviceItems = useMemo(() => presetTitlesByCategory(presets, 'Advice'), [presets])
  const medicinePresets = useMemo(() => presetTitlesByCategory(presets, 'Medicine'), [presets])

  const complaintPresetByTitle = useMemo(() => {
    const map = new Map<string, PresetRecord>()
    for (const preset of presets) {
      if (preset.category === 'Chief Complaint') {
        map.set(preset.content?.trim() ? preset.content.trim() : preset.title, preset)
      }
    }
    return map
  }, [presets])

  const diagnosisPresetByTitle = useMemo(() => {
    const map = new Map<string, PresetRecord>()
    for (const preset of presets) {
      if (preset.category === 'Provisional Diagnosis') {
        map.set(preset.content?.trim() ? preset.content.trim() : preset.title, preset)
      }
    }
    return map
  }, [presets])

  const loadMeta = useCallback(async () => {
    const [presetRows, settings] = await Promise.all([api.presets.list(), api.settings.get()])
    setPresets(presetRows)
    setDoctor(settings.doctorProfile)
  }, [])

  const loadEdit = useCallback(
    async (id: number) => {
      const detail = await api.prescriptions.get(id)
      if (!detail) {
        setSaveError('Prescription not found.')
        return
      }
      const parsed = detailToUi(detail)
      setUi(parsed)
      setMedicines(
        parsed.medicines
          .filter((m) => m.medicineName)
          .map((m) => ({
            key: `m-${++medKey}`,
            medicineName: m.medicineName ?? '',
            dosage: m.dosage ?? '1+1+1',
            frequency: m.frequency ?? 'After Meal',
            duration: m.duration ?? '5 Days',
            notes: m.notes ?? ''
          }))
      )
      onStatus?.(`Editing Pres_ID ${detail.id}`)
    },
    [onStatus]
  )

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  useEffect(() => {
    if (editId) loadEdit(editId)
    else {
      setUi(emptyUiState())
      setMedicines([])
    }
  }, [editId, loadEdit])

  useEffect(() => {
    const phone = ui.patientPhone.trim()
    if (phone.length < 6) {
      setFoundPatient(null)
      return
    }
    const t = setTimeout(() => {
      api.patients.list({ search: phone }).then((rows) => {
        const match = rows.find((p) => p.phone === phone)
        setFoundPatient(match ?? null)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [ui.patientPhone])

  const patchUi = (patch: Partial<PrescriptionUiState>): void => {
    setUi((prev) => ({ ...prev, ...patch }))
  }

  const loadPatientData = (): void => {
    if (!foundPatient) return
    patchUi({
      patientId: foundPatient.id,
      patientName: foundPatient.name,
      patientAge: foundPatient.age ?? '',
      patientGender: foundPatient.gender ?? 'Male',
      patientAddress: foundPatient.address ?? ''
    })
  }

  const addMedicine = (
    name: string,
    defaults?: { dosage?: string; frequency?: string; duration?: string }
  ): void => {
    setMedicines((prev) => [
      ...prev,
      {
        key: `m-${++medKey}`,
        medicineName: name,
        dosage: defaults?.dosage || MEDICINE_DEFAULTS.dosage,
        frequency: defaults?.frequency || MEDICINE_DEFAULTS.frequency,
        duration: defaults?.duration || MEDICINE_DEFAULTS.duration,
        notes: ''
      }
    ])
  }

  const addBundleMedicines = (bundle: PresetRecord): void => {
    const medicineLinks = (bundle.links ?? []).filter((link) => link.targetKind === 'Medicine')
    if (medicineLinks.length === 0) return
    setMedicines((prev) => {
      const seen = new Set(prev.map((medicine) => medicine.medicineName.trim().toLowerCase()))
      const additions = medicineLinks
        .map((link) => ({
          key: `m-${++medKey}`,
          medicineName: link.label.trim(),
          dosage: link.dosage?.trim() || MEDICINE_DEFAULTS.dosage,
          frequency: link.frequency?.trim() || MEDICINE_DEFAULTS.frequency,
          duration: link.duration?.trim() || MEDICINE_DEFAULTS.duration,
          notes: ''
        }))
        .filter((medicine) => {
          const key = medicine.medicineName.toLowerCase()
          if (!medicine.medicineName || seen.has(key)) return false
          seen.add(key)
          return true
        })
      return additions.length ? [...prev, ...additions] : prev
    })
  }

  const applyBundle = (bundle: PresetRecord): void => {
    const links = bundle.links ?? []
    if (links.length === 0) return
    setUi((prev) => ({
      ...prev,
      diagnoses: mergeChips(
        prev.diagnoses,
        links
          .filter((link) => link.targetKind === 'Provisional Diagnosis')
          .map((link) => link.label)
      ),
      investigations: mergeChips(
        prev.investigations,
        links.filter((link) => link.targetKind === 'Investigations').map((link) => link.label)
      ),
      advice: mergeChips(
        prev.advice,
        links.filter((link) => link.targetKind === 'Advice').map((link) => link.label)
      )
    }))
    addBundleMedicines(bundle)
  }

  const handleComplaintChange = (chiefComplaints: string[]): void => {
    const added = chiefComplaints.filter((item) => !ui.chiefComplaints.includes(item))
    patchUi({ chiefComplaints })
    for (const item of added) {
      const bundle = complaintPresetByTitle.get(item)
      if (bundle) applyBundle(bundle)
    }
  }

  const handleDiagnosisChange = (diagnoses: string[]): void => {
    const added = diagnoses.filter((item) => !ui.diagnoses.includes(item))
    patchUi({ diagnoses })
    for (const item of added) {
      const bundle = diagnosisPresetByTitle.get(item)
      if (bundle) applyBundle(bundle)
    }
  }

  const updateMedicine = (key: string, field: keyof MedicineRow, val: string): void => {
    setMedicines((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: val } : m)))
  }

  const removeMedicine = (key: string): void => {
    setMedicines((prev) => prev.filter((m) => m.key !== key))
  }

  const moveMedicine = (key: string, dir: 'up' | 'down'): void => {
    setMedicines((prev) => {
      const idx = prev.findIndex((m) => m.key === key)
      if (idx < 0) return prev
      if (dir === 'up' && idx === 0) return prev
      if (dir === 'down' && idx === prev.length - 1) return prev
      const arr = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      ;[arr[idx], arr[swap]] = [arr[swap], arr[idx]]
      return arr
    })
  }

  const handleClear = (): void => {
    setUi(emptyUiState())
    setMedicines([])
    setFoundPatient(null)
    setSaveError(null)
    onEditIdChange(null)
    onStatus?.(null)
  }

  const resolvePatientId = async (): Promise<number> => {
    if (ui.patientId > 0) {
      if (ui.patientAddress.trim() !== (foundPatient?.address ?? '').trim()) {
        const values: PatientFormValues = {
          name: ui.patientName.trim(),
          age: ui.patientAge,
          gender: (ui.patientGender as PatientFormValues['gender']) || '',
          phone: ui.patientPhone.trim(),
          address: ui.patientAddress
        }
        await api.patients.update(ui.patientId, values)
      }
      return ui.patientId
    }
    const name = ui.patientName.trim()
    if (!name) throw new Error('Patient name is required.')
    const phone = ui.patientPhone.trim()
    if (phone) {
      const rows = await api.patients.list({ search: phone })
      const existing = rows.find((p) => p.phone === phone)
      if (existing) return existing.id
    }
    const values: PatientFormValues = {
      name,
      age: ui.patientAge,
      gender: (ui.patientGender as PatientFormValues['gender']) || '',
      phone,
      address: ui.patientAddress
    }
    const created = await api.patients.create(values)
    patchUi({ patientId: created.id })
    return created.id
  }

  const buildUiForSave = (patientId: number): PrescriptionUiState => ({
    ...ui,
    patientId,
    medicines: medicines.map((m, position) => ({
      medicineName: m.medicineName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration,
      notes: m.notes,
      position
    }))
  })

  const persist = async (mode: 'draft' | 'save') => {
    setSaveError(null)
    const patientId = await resolvePatientId()
    const formValues = uiToFormValues(buildUiForSave(patientId))
    const currentId = editingIdRef.current
    if (currentId) return api.prescriptions.update(currentId, formValues)
    if (mode === 'draft') return api.prescriptions.saveDraft(formValues)
    return api.prescriptions.create(formValues)
  }

  const saveAndGetId = async (): Promise<number | null> => {
    try {
      const saved = await persist('save')
      onEditIdChange(saved.id)
      editingIdRef.current = saved.id
      onStatus?.(`Saved as Pres_ID ${saved.id}.`)
      return saved.id
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save prescription.')
      return null
    }
  }

  const savePrescription = async (): Promise<void> => {
    try {
      const saved = await persist('draft')
      onEditIdChange(saved.id)
      editingIdRef.current = saved.id
      onStatus?.(`Saved as Pres_ID ${saved.id}.`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save prescription.')
    }
  }

  const exportPdf = async (): Promise<void> => {
    let id = editingIdRef.current
    if (!id) id = await saveAndGetId()
    if (!id) return
    try {
      const result = await api.printing.pdf(id)
      onStatus?.(result.path ? `Exported PDF: ${result.path}` : 'PDF export cancelled.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not export PDF.')
    }
  }

  const printRx = async (): Promise<void> => {
    let id = editingIdRef.current
    if (!id) id = await saveAndGetId()
    if (!id) return
    try {
      const result = await api.printing.print(id)
      if (!result.ok) {
        setSaveError(result.message ?? 'Print failed.')
        return
      }
      onStatus?.(`Sent Pres_ID ${id} to printer.`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Print failed.')
    }
  }

  const actionsRef = useRef({ savePrescription, exportPdf, print: printRx })
  actionsRef.current = { savePrescription, exportPdf, print: printRx }

  useEffect(() => {
    onBindActions({
      savePrescription: () => actionsRef.current.savePrescription(),
      exportPdf: () => actionsRef.current.exportPdf(),
      print: () => actionsRef.current.print()
    })
    return () => onBindActions(null)
  }, [onBindActions])

  const doc = doctor

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="print:hidden mx-6 mt-4 mb-3 shrink-0 rounded-xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            Patient Information
          </h2>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
          >
            <X className="size-3" /> Clear Form
          </button>
        </div>

        {foundPatient && !editId && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-2.5 text-sm dark:border-green-900 dark:bg-green-950/40">
            <UserCheck className="size-4 shrink-0 text-green-600" />
            <div className="min-w-0 flex-1">
              <span className="font-medium text-green-800 dark:text-green-200">
                Existing Patient Found
              </span>
              <span className="ml-2 text-green-700 dark:text-green-300">
                {foundPatient.visitCount} visit{foundPatient.visitCount !== 1 ? 's' : ''}
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              className="shrink-0 bg-green-600 hover:bg-green-700"
              onClick={loadPatientData}
            >
              Load Data
            </Button>
          </div>
        )}

        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-2">
            <label
              htmlFor="rx-patient-name"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              Patient Name
            </label>
            <input
              id="rx-patient-name"
              type="text"
              value={ui.patientName}
              onChange={(e) => patchUi({ patientName: e.target.value })}
              disabled={Boolean(editId)}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
              placeholder="Full name"
            />
          </div>
          <div>
            <label
              htmlFor="rx-patient-phone"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              Phone
            </label>
            <input
              id="rx-patient-phone"
              type="tel"
              value={ui.patientPhone}
              onChange={(e) => patchUi({ patientPhone: e.target.value })}
              disabled={Boolean(editId)}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="rx-patient-age"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              Age
            </label>
            <input
              id="rx-patient-age"
              type="text"
              value={ui.patientAge}
              onChange={(e) => patchUi({ patientAge: e.target.value })}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label
                htmlFor="rx-patient-gender"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                Gender
              </label>
              <Select
                value={ui.patientGender}
                onValueChange={(val) => patchUi({ patientGender: val })}
              >
                <SelectTrigger id="rx-patient-gender" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="rx-patient-weight"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                Weight (kg)
              </label>
              <input
                id="rx-patient-weight"
                type="text"
                value={ui.patientWeight}
                onChange={(e) => patchUi({ patientWeight: e.target.value })}
                className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="mt-3">
          <label
            htmlFor="rx-patient-address"
            className="text-muted-foreground mb-1 block text-xs font-medium"
          >
            Address
          </label>
          <textarea
            id="rx-patient-address"
            rows={2}
            value={ui.patientAddress}
            onChange={(e) => patchUi({ patientAddress: e.target.value })}
            className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
            placeholder="Patient address"
          />
        </div>
        {saveError && <p className="text-destructive mt-2 text-sm">{saveError}</p>}
      </div>

      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden px-6 pb-4">
        <div className="print:hidden flex w-[40%] shrink-0 flex-col gap-3 overflow-y-auto pr-1">
          <SectionCard accent="bg-orange-400" title="Chief Complaints (C/C)">
            <SearchMultiSelect
              items={complaintItems}
              selected={ui.chiefComplaints}
              onChange={handleComplaintChange}
              placeholder="Search complaints..."
            />
          </SectionCard>
          <SectionCard accent="bg-red-400" title="O/E (Examination)">
            <div className="grid grid-cols-2 gap-3">
              {(['bp', 'pulse', 'temp', 'rr'] as const).map((field) => {
                const labels = {
                  bp: 'BP (mmHg)',
                  pulse: 'Pulse (/min)',
                  temp: 'Temp (°F)',
                  rr: 'R/R (/min)'
                }
                const placeholders = { bp: '120/80', pulse: '80', temp: '98.6', rr: '18' }
                return (
                  <div key={field}>
                    <label
                      htmlFor={`rx-oe-${field}`}
                      className="text-muted-foreground mb-1 block text-xs"
                    >
                      {labels[field]}
                    </label>
                    <input
                      id={`rx-oe-${field}`}
                      type="text"
                      value={ui.oe[field]}
                      onChange={(e) => patchUi({ oe: { ...ui.oe, [field]: e.target.value } })}
                      placeholder={placeholders[field]}
                      className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>
                )
              })}
            </div>
          </SectionCard>
          <SectionCard accent="bg-purple-400" title="Investigation">
            <SearchMultiSelect
              items={investigationItems}
              selected={ui.investigations}
              onChange={(investigations) => patchUi({ investigations })}
              placeholder="Search investigations..."
            />
          </SectionCard>
          <SectionCard accent="bg-green-500" title="Provisional Diagnosis (Dx)">
            <SearchMultiSelect
              items={diagnosisItems}
              selected={ui.diagnoses}
              onChange={handleDiagnosisChange}
              placeholder="Search diagnoses..."
            />
          </SectionCard>
        </div>

        <div className="min-w-0 flex-1 overflow-y-auto print:w-full">
          <div
            id="prescription-sheet"
            className="bg-card rounded-xl border shadow-md print:min-h-screen print:rounded-none print:shadow-none"
          >
            <div className="border-b-2 px-8 pt-6 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-xl leading-tight font-bold">{doc?.name || 'Dr. [Name]'}</h1>
                  <p className="text-primary mt-0.5 text-sm font-medium">
                    {doc?.degrees || 'MBBS'}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {doc?.speciality || '[Speciality]'}
                  </p>
                </div>
                <div className="text-muted-foreground max-w-[45%] text-right text-xs leading-relaxed">
                  <p className="whitespace-pre-line">{doc?.chamber}</p>
                  {doc?.phone && <p className="mt-1">{doc.phone}</p>}
                </div>
              </div>
            </div>

            <div className="bg-muted/50 flex flex-wrap items-center gap-x-6 gap-y-1 border-b px-8 py-2.5 text-sm">
              <span>
                <span className="text-muted-foreground text-xs">Patient: </span>
                <span className="font-medium">{ui.patientName || '—'}</span>
              </span>
              {ui.patientAge && (
                <span>
                  <span className="text-muted-foreground text-xs">Age: </span>
                  {ui.patientAge} yrs
                </span>
              )}
              {ui.patientGender && (
                <span>
                  <span className="text-muted-foreground text-xs">Sex: </span>
                  {ui.patientGender}
                </span>
              )}
              {ui.patientWeight && (
                <span>
                  <span className="text-muted-foreground text-xs">Wt: </span>
                  {ui.patientWeight} kg
                </span>
              )}
              <span className="ml-auto">
                <span className="text-muted-foreground text-xs">Date: </span>
                {formatDate(today)}
              </span>
            </div>

            <div className="flex min-h-[360px] divide-x">
              <div className="w-[38%] shrink-0 space-y-4 px-5 py-4 text-sm">
                <BulletSection
                  title="C/C"
                  items={ui.chiefComplaints}
                  empty="No complaints entered"
                />
                {(ui.oe.bp || ui.oe.pulse || ui.oe.temp || ui.oe.rr) && (
                  <div>
                    <p className="text-muted-foreground mb-1.5 text-xs font-bold tracking-wider uppercase">
                      O/E
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                      {ui.oe.bp && (
                        <span>
                          BP: <strong>{ui.oe.bp}</strong>
                        </span>
                      )}
                      {ui.oe.pulse && (
                        <span>
                          Pulse: <strong>{ui.oe.pulse}/min</strong>
                        </span>
                      )}
                      {ui.oe.temp && (
                        <span>
                          Temp: <strong>{ui.oe.temp}°F</strong>
                        </span>
                      )}
                      {ui.oe.rr && (
                        <span>
                          R/R: <strong>{ui.oe.rr}/min</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <BulletSection title="Investigation" items={ui.investigations} />
                <BulletSection title="Dx" items={ui.diagnoses} />
              </div>
              <div className="flex-1 px-5 py-4">
                <span className="font-serif text-4xl leading-none font-bold">Rx</span>
                {medicines.length === 0 && (
                  <p className="text-muted-foreground mt-2 text-xs italic">
                    No medicines added yet
                  </p>
                )}
                {medicines.map((med, idx) => (
                  <MedRow
                    key={med.key}
                    med={med}
                    index={idx}
                    total={medicines.length}
                    onChange={updateMedicine}
                    onRemove={removeMedicine}
                    onMoveUp={(k) => moveMedicine(k, 'up')}
                    onMoveDown={(k) => moveMedicine(k, 'down')}
                  />
                ))}
                <div className="mt-3">
                  <MedSearch presets={medicinePresets} onAdd={addMedicine} />
                </div>
              </div>
            </div>

            <div className="border-t px-8 py-4">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
                    Advice
                  </p>
                  <div className="print:hidden">
                    <SearchMultiSelect
                      items={adviceItems}
                      selected={ui.advice}
                      onChange={(advice) => patchUi({ advice })}
                      placeholder="Search or add advice..."
                    />
                  </div>
                  <BulletSection title="" items={ui.advice} className="mt-2" />
                </div>
                <div className="w-48 shrink-0">
                  <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
                    Follow-up
                  </p>
                  <div className="print:hidden flex items-center gap-2">
                    <span className="text-sm whitespace-nowrap">After:</span>
                    <input
                      type="number"
                      min={0}
                      value={ui.followUpValue}
                      onChange={(e) => patchUi({ followUpValue: e.target.value })}
                      className="border-input w-16 rounded-lg border px-2 py-1.5 text-center text-sm"
                    />
                    <Select
                      value={ui.followUpUnit}
                      onValueChange={(val) => patchUi({ followUpUnit: val })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FOLLOWUP_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {ui.followUpValue !== '' && (
                    <p className="mt-1 text-sm">
                      <strong>Follow up:</strong>{' '}
                      {ui.followUpValue === '0'
                        ? 'N/A'
                        : `After ${ui.followUpValue} ${ui.followUpUnit}`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionCard({
  accent,
  title,
  children
}: {
  accent: string
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className={`h-4 w-1.5 rounded ${accent}`} />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function BulletSection({
  title,
  items,
  empty,
  className = ''
}: {
  title: string
  items: string[]
  empty?: string
  className?: string
}): React.JSX.Element | null {
  if (!items.length && !empty) return null
  return (
    <div className={className}>
      {title && (
        <p className="text-muted-foreground mb-1.5 text-xs font-bold tracking-wider uppercase">
          {title}
        </p>
      )}
      {items.length > 0 ? (
        <ul className="space-y-0.5">
          {items.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className="text-muted-foreground text-xs italic">{empty}</p>
      )}
    </div>
  )
}
