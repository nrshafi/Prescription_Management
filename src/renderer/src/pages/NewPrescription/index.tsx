import type { PatientFormValues, PatientListItem } from '@shared/patient'
import type { PresetRecord } from '@shared/prescription'
import type { DoctorProfileRecord } from '@shared/print'
import { UserCheck, X } from 'lucide-react'
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
  uiStateFromPatient,
  uiToFormValues
} from '@/lib/prescription-mapping'
import { FOLLOWUP_UNITS, MEDICINE_DEFAULTS } from './constants'
import { buildUiForSave, formatDate, nextMedKey, toErrorMessage } from './helpers'
import { MedicinesEditor } from './MedicinesEditor'
import { PresetBundles } from './PresetBundles'
import { BulletSection, SectionsEditor } from './SectionsEditor'
import type {
  ApplicableBundle,
  MedicineAddHandler,
  MedicineRow,
  NewPrescriptionProps
} from './types'

export type { PrescriptionPageActions } from './types'

export function NewPrescription({
  editId,
  seedPatient,
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
  // Address as loaded for the current patient, used to detect whether the user
  // actually changed it before issuing a patient update on save. Without this,
  // edit mode (where foundPatient is null) always sees a "change" and fires an
  // unnecessary patients.update that can fail and abort the save.
  const loadedAddressRef = useRef<string | null>(null)
  const adviceSectionRef = useRef<HTMLDivElement>(null)
  // Only user-driven advice additions (via the advice selector) trigger auto-scroll.
  // Programmatic growth from loadEdit/applyBundle is intentionally ignored.
  const shouldScrollAdviceRef = useRef(false)
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
        if (preset.title.trim()) map.set(preset.title.trim(), preset)
        if (preset.content?.trim()) map.set(preset.content.trim(), preset)
      }
    }
    return map
  }, [presets])

  const diagnosisPresetByTitle = useMemo(() => {
    const map = new Map<string, PresetRecord>()
    for (const preset of presets) {
      if (preset.category === 'Provisional Diagnosis') {
        if (preset.title.trim()) map.set(preset.title.trim(), preset)
        if (preset.content?.trim()) map.set(preset.content.trim(), preset)
      }
    }
    return map
  }, [presets])

  const applicableBundles = useMemo<ApplicableBundle[]>(() => {
    const seenPresetIds = new Set<number>()
    const bundles: ApplicableBundle[] = []

    const addBundle = (label: string, bundle: PresetRecord | undefined): void => {
      if (!bundle || (bundle.links ?? []).length === 0 || seenPresetIds.has(bundle.id)) return
      seenPresetIds.add(bundle.id)
      bundles.push({ key: `${bundle.id}-${label}`, label, bundle })
    }

    for (const complaint of ui.chiefComplaints) {
      addBundle(complaint, complaintPresetByTitle.get(complaint.trim()))
    }
    for (const diagnosis of ui.diagnoses) {
      addBundle(diagnosis, diagnosisPresetByTitle.get(diagnosis.trim()))
    }

    return bundles
  }, [ui.chiefComplaints, ui.diagnoses, complaintPresetByTitle, diagnosisPresetByTitle])

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
      loadedAddressRef.current = parsed.patientAddress
      setUi(parsed)
      setMedicines(
        parsed.medicines
          .filter((m) => m.medicineName)
          .map((m) => ({
            key: nextMedKey(),
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
    else if (seedPatient) {
      loadedAddressRef.current = seedPatient.address ?? ''
      setUi(uiStateFromPatient(seedPatient))
      setMedicines([])
    } else {
      loadedAddressRef.current = null
      setUi(emptyUiState())
      setMedicines([])
    }
  }, [editId, loadEdit, seedPatient])

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

  const patchUi = useCallback((patch: Partial<PrescriptionUiState>): void => {
    setUi((prev) => ({ ...prev, ...patch }))
  }, [])

  const loadPatientData = (): void => {
    if (!foundPatient) return
    loadedAddressRef.current = foundPatient.address ?? ''
    patchUi({
      patientId: foundPatient.id,
      patientName: foundPatient.name,
      patientAge: foundPatient.age ?? '',
      patientGender: foundPatient.gender ?? 'Male',
      patientAddress: foundPatient.address ?? ''
    })
  }

  const addMedicine: MedicineAddHandler = (name, defaults) => {
    setMedicines((prev) => [
      ...prev,
      {
        key: nextMedKey(),
        medicineName: name,
        dosage: defaults?.dosage || MEDICINE_DEFAULTS.dosage,
        frequency: defaults?.frequency || MEDICINE_DEFAULTS.frequency,
        duration: defaults?.duration || MEDICINE_DEFAULTS.duration,
        notes: defaults?.notes || ''
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
          key: nextMedKey(),
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

  const handleApplyBundle = (bundle: PresetRecord): void => {
    applyBundle(bundle)
    onStatus?.(`Applied preset "${bundle.title}".`)
  }

  const handleApplyAllBundles = (): void => {
    for (const { bundle } of applicableBundles) {
      applyBundle(bundle)
    }
    onStatus?.(`Applied ${applicableBundles.length} presets.`)
  }

  const handleAdviceChange = (advice: string[]): void => {
    shouldScrollAdviceRef.current = advice.length > ui.advice.length
    patchUi({ advice })
  }

  const updateMedicine = useCallback((key: string, field: keyof MedicineRow, val: string): void => {
    setMedicines((prev) => prev.map((m) => (m.key === key ? { ...m, [field]: val } : m)))
  }, [])

  const removeMedicine = useCallback((key: string): void => {
    setMedicines((prev) => prev.filter((m) => m.key !== key))
  }, [])

  const moveMedicine = useCallback((key: string, dir: 'up' | 'down'): void => {
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
  }, [])

  const moveMedicineUp = useCallback((key: string): void => moveMedicine(key, 'up'), [moveMedicine])
  const moveMedicineDown = useCallback(
    (key: string): void => moveMedicine(key, 'down'),
    [moveMedicine]
  )

  const handleClear = (): void => {
    loadedAddressRef.current = null
    setUi(emptyUiState())
    setMedicines([])
    setFoundPatient(null)
    setSaveError(null)
    onEditIdChange(null)
    onStatus?.(null)
  }

  const resolvePatientId = async (): Promise<number> => {
    if (ui.patientId > 0) {
      // Only persist a patient update when the address actually changed from
      // what was loaded. loadedAddressRef is null only when we have no known
      // baseline; in that case fall back to comparing against an empty string.
      const baseline = (loadedAddressRef.current ?? '').trim()
      if (ui.patientAddress.trim() !== baseline) {
        const values: PatientFormValues = {
          name: ui.patientName.trim(),
          age: ui.patientAge,
          gender: (ui.patientGender as PatientFormValues['gender']) || '',
          phone: ui.patientPhone.trim(),
          address: ui.patientAddress
        }
        await api.patients.update(ui.patientId, values)
        loadedAddressRef.current = ui.patientAddress
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
    loadedAddressRef.current = ui.patientAddress
    patchUi({ patientId: created.id })
    return created.id
  }

  const persist = async () => {
    setSaveError(null)
    const patientId = await resolvePatientId()
    const formValues = uiToFormValues(buildUiForSave(ui, medicines, patientId))
    const currentId = editingIdRef.current
    if (currentId) return api.prescriptions.update(currentId, formValues)
    return api.prescriptions.create(formValues)
  }

  const saveAndGetId = async (): Promise<number | null> => {
    try {
      const saved = await persist()
      onEditIdChange(saved.id)
      editingIdRef.current = saved.id
      onStatus?.(`Saved as Pres_ID ${saved.id}.`)
      return saved.id
    } catch (err) {
      setSaveError(toErrorMessage(err, 'Could not save prescription.'))
      return null
    }
  }

  const savePrescription = async (): Promise<void> => {
    try {
      const saved = await persist()
      onEditIdChange(saved.id)
      editingIdRef.current = saved.id
      onStatus?.(`Saved as Pres_ID ${saved.id}.`)
    } catch (err) {
      setSaveError(toErrorMessage(err, 'Could not save prescription.'))
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
      setSaveError(toErrorMessage(err, 'Could not export PDF.'))
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
      setSaveError(toErrorMessage(err, 'Print failed.'))
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

  useEffect(() => {
    // ui.advice is read so the effect re-runs whenever the advice list changes.
    void ui.advice
    if (shouldScrollAdviceRef.current) {
      adviceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      shouldScrollAdviceRef.current = false
    }
  }, [ui.advice])

  const doc = doctor
  const customOePreviewRows = ui.oe.custom.filter((row) => row.label.trim() && row.value.trim())

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto xl:overflow-hidden">
      <div className="print:hidden mx-6 mt-3 mb-2 shrink-0 rounded-xl border bg-card p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
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

        {foundPatient && !editId && seedPatient?.id !== foundPatient.id && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border p-2.5 text-sm bg-muted/50">
            <UserCheck className="text-foreground size-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">Existing Patient Found</span>
              <span className="text-muted-foreground ml-2">
                {foundPatient.visitCount} visit{foundPatient.visitCount !== 1 ? 's' : ''}
              </span>
            </div>
            <Button type="button" size="sm" className="shrink-0" onClick={loadPatientData}>
              Load Data
            </Button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
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
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
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
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
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
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            />
          </div>
          <div>
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
          <div>
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
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
            />
          </div>
          <div className="col-span-2 md:col-span-3 xl:col-span-3">
            <label
              htmlFor="rx-patient-address"
              className="text-muted-foreground mb-1 block text-xs font-medium"
            >
              Address
            </label>
            <input
              id="rx-patient-address"
              type="text"
              value={ui.patientAddress}
              onChange={(e) => patchUi({ patientAddress: e.target.value })}
              className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
              placeholder="Patient address"
            />
          </div>
        </div>
        {saveError && <p className="text-destructive mt-2 text-sm">{saveError}</p>}
      </div>

      <div className="flex flex-col gap-4 px-6 pb-4 xl:min-h-0 xl:flex-1 xl:flex-row xl:overflow-hidden">
        <div className="print:hidden flex w-full shrink-0 flex-col gap-3 pr-1 xl:w-[40%] xl:overflow-y-auto">
          <SectionsEditor
            ui={ui}
            complaintItems={complaintItems}
            investigationItems={investigationItems}
            diagnosisItems={diagnosisItems}
            onPatchUi={patchUi}
          />
          <PresetBundles
            bundles={applicableBundles}
            onApplyBundle={handleApplyBundle}
            onApplyAll={handleApplyAllBundles}
          />
        </div>

        <div className="min-w-0 flex-1 print:w-full xl:overflow-y-auto">
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

            <div className="flex min-h-[360px] flex-col divide-x lg:flex-row lg:divide-x lg:divide-y-0">
              <div className="shrink-0 space-y-4 px-5 py-4 text-sm lg:w-[38%]">
                <BulletSection
                  title="C/C"
                  items={ui.chiefComplaints}
                  empty="No complaints entered"
                />
                {(ui.oe.bp ||
                  ui.oe.pulse ||
                  ui.oe.temp ||
                  ui.oe.rr ||
                  customOePreviewRows.length > 0) && (
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
                      {customOePreviewRows.map((row) => (
                        <span key={row.id}>
                          {row.label.trim()}: <strong>{row.value.trim()}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <BulletSection title="Investigation" items={ui.investigations} />
                <BulletSection title="Dx" items={ui.diagnoses} />
              </div>
              <div className="flex-1 px-5 py-4">
                <span className="text-4xl leading-none font-bold">Rx</span>
                {medicines.length === 0 && (
                  <p className="text-muted-foreground mt-2 text-xs italic">
                    No medicines added yet
                  </p>
                )}
                <MedicinesEditor
                  medicines={medicines}
                  presets={medicinePresets}
                  onChange={updateMedicine}
                  onAdd={addMedicine}
                  onRemove={removeMedicine}
                  onMoveUp={moveMedicineUp}
                  onMoveDown={moveMedicineDown}
                />
              </div>
            </div>

            <div ref={adviceSectionRef} className="border-t px-8 py-4">
              <div className="flex items-start gap-6">
                <div className="flex-1">
                  <p className="text-muted-foreground mb-2 text-xs font-bold tracking-wider uppercase">
                    Advice
                  </p>
                  <div className="print:hidden">
                    <SearchMultiSelect
                      items={adviceItems}
                      selected={ui.advice}
                      onChange={handleAdviceChange}
                      placeholder="Search or add advice..."
                    />
                  </div>
                  <BulletSection title="" items={ui.advice} className="mt-2" />
                </div>
                <div className="w-full xl:w-48 shrink-0">
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
