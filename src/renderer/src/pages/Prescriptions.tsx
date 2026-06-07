import { Copy, Eye, FileDown, FileText, Minus, Pencil, Plus, Printer, Search, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import type { PatientFormValues, PatientListItem, PatientRecord } from '../../../shared/patient'
import {
  PRESET_CATEGORIES,
  type PresetRecord,
  type PrescriptionDetail,
  type PrescriptionListItem,
  type PrescriptionMedicineInput,
  PRESCRIPTION_SECTION_TYPES,
  type PrescriptionSectionInput,
  type PrescriptionSectionType
} from '../../../shared/prescription'

interface MedicineRow extends PrescriptionMedicineInput {
  _key: string
}

interface PrescriptionFormState {
  patientId: number
  templateId: number | null
  sections: PrescriptionSectionInput[]
  medicines: MedicineRow[]
}

const SECTION_LABELS: Record<PrescriptionSectionType, string> = {
  'Chief Complaint': 'Chief Complaint (C/C)',
  Examination: 'Examination (O/E)',
  Investigations: 'Investigations (Inv)',
  'Probational Diagnosis': 'Probational Diagnosis (Dia)',
  Advice: 'Advice',
  'Follow Up': 'Follow Up'
}

let nextMedicineKey = 0

const emptyMedicine = (): MedicineRow => ({
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  notes: '',
  position: 0,
  _key: `m-${++nextMedicineKey}`
})

function emptySections(): PrescriptionSectionInput[] {
  return PRESCRIPTION_SECTION_TYPES.map((sectionType, position) => ({
    sectionType,
    content: '',
    position
  }))
}

function emptyForm(patientId = 0): PrescriptionFormState {
  return {
    patientId,
    templateId: null,
    sections: emptySections(),
    medicines: [emptyMedicine()]
  }
}

function toForm(detail: PrescriptionDetail): PrescriptionFormState {
  const sections = emptySections().map((section) => {
    const saved = detail.sections.find((item) => item.sectionType === section.sectionType)
    return saved
      ? { sectionType: saved.sectionType, content: saved.content ?? '', position: section.position }
      : section
  })

  return {
    patientId: detail.patientId,
    templateId: detail.templateId,
    sections,
    medicines: detail.medicines.length
      ? detail.medicines.map((medicine, position) => ({
          medicineName: medicine.medicineName,
          dosage: medicine.dosage ?? '',
          frequency: medicine.frequency ?? '',
          duration: medicine.duration ?? '',
          notes: medicine.notes ?? '',
          position,
          _key: `m-${++nextMedicineKey}`
        }))
      : [emptyMedicine()]
  }
}

function patientSummary(patient: PatientListItem | null): string {
  if (!patient) return 'Select patient'
  return `${patient.patientCode} - ${patient.name}${patient.age ? `, ${patient.age}` : ''}${patient.gender ? `, ${patient.gender}` : ''}`
}

function detailPatientSummary(detail: PrescriptionDetail): string {
  return `${detail.patientCode} - ${detail.patientName}${detail.age ? `, ${detail.age}` : ''}${detail.gender ? `, ${detail.gender}` : ''}`
}

export function Prescriptions(): React.JSX.Element {
  const [rows, setRows] = useState<PrescriptionListItem[]>([])
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [presets, setPresets] = useState<PresetRecord[]>([])
  const [search, setSearch] = useState('')
  const [patientSearch, setPatientSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [lockedPatientLabel, setLockedPatientLabel] = useState<string | null>(null)
  const [form, setForm] = useState<PrescriptionFormState>(() => emptyForm())
  const [quickPatientOpen, setQuickPatientOpen] = useState(false)

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patientId) ?? null,
    [patients, form.patientId]
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [prescriptionRows, patientRows, presetRows] = await Promise.all([
        window.api.prescriptions.list(search),
        window.api.patients.list({ search: patientSearch, sortBy: 'id', sortDir: 'desc' }),
        window.api.presets.list()
      ])
      setRows(prescriptionRows)
      setPatients(patientRows)
      setPresets(presetRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load prescriptions.')
    } finally {
      setLoading(false)
    }
  }, [search, patientSearch])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  function updateSection(sectionType: PrescriptionSectionType, content: string): void {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.sectionType === sectionType ? { ...section, content } : section
      )
    }))
  }

  function updateMedicine(
    index: number,
    field: keyof Omit<PrescriptionMedicineInput, 'position'>,
    value: string
  ): void {
    setForm((current) => ({
      ...current,
      medicines: current.medicines.map((medicine, i) =>
        i === index ? { ...medicine, [field]: value } : medicine
      )
    }))
  }

  function addMedicine(): void {
    setForm((current) => ({
      ...current,
      medicines: [...current.medicines, emptyMedicine()]
    }))
  }

  function removeMedicine(index: number): void {
    setForm((current) => ({
      ...current,
      medicines: current.medicines
        .filter((_, i) => i !== index)
        .map((medicine, position) => ({ ...medicine, position }))
    }))
  }

  function startNew(): void {
    setEditingId(null)
    setLockedPatientLabel(null)
    setSaveError(null)
    setStatus(null)
    setForm(emptyForm())
  }

  async function editPrescription(id: number): Promise<void> {
    setSaveError(null)
    const detail = await window.api.prescriptions.get(id)
    if (!detail) {
      setSaveError('Prescription not found.')
      return
    }
    setEditingId(detail.id)
    setLockedPatientLabel(detailPatientSummary(detail))
    setForm(toForm(detail))
    setStatus(`Editing Pres_ID ${detail.id}, visit ${detail.visitNo}`)
  }

  async function duplicatePrescription(id: number): Promise<void> {
    setSaveError(null)
    const duplicated = await window.api.prescriptions.duplicate(id)
    setEditingId(duplicated.id)
    setLockedPatientLabel(detailPatientSummary(duplicated))
    setForm(toForm(duplicated))
    setStatus(`Duplicated to Pres_ID ${duplicated.id}, visit ${duplicated.visitNo}`)
    await load()
  }

  async function runPrintAction(
    id: number | null,
    action: 'preview' | 'print' | 'pdf'
  ): Promise<void> {
    setSaveError(null)
    setStatus(null)
    if (!id) {
      setSaveError('Save the prescription before printing.')
      return
    }

    try {
      if (action === 'preview') {
        await window.api.printing.preview(id)
        setStatus(`Opened print preview for Pres_ID ${id}.`)
        return
      }

      if (action === 'print') {
        await window.api.printing.print(id)
        setStatus(`Sent Pres_ID ${id} to printer.`)
        return
      }

      const result = await window.api.printing.pdf(id)
      setStatus(result.path ? `Exported PDF: ${result.path}` : 'PDF export cancelled.')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not complete print action.')
    }
  }

  async function save(isDraft: boolean): Promise<void> {
    setSaveError(null)
    setStatus(null)
    if (!form.patientId) {
      setSaveError('Select a patient or create New P. first.')
      return
    }

    try {
      const normalized = {
        patientId: form.patientId,
        templateId: form.templateId,
        sections: form.sections.map((section, position) => ({ ...section, position })),
        medicines: form.medicines.map(({ _key, ...medicine }, position) => ({ ...medicine, position }))
      }
      const saved = editingId
        ? await window.api.prescriptions.update(editingId, normalized)
        : isDraft
          ? await window.api.prescriptions.saveDraft(normalized)
          : await window.api.prescriptions.create(normalized)
      setEditingId(saved.id)
      setLockedPatientLabel(detailPatientSummary(saved))
      setForm(toForm(saved))
      setStatus(`${isDraft ? 'Draft saved' : 'Prescription saved'} as Pres_ID ${saved.id}.`)
      await load()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save prescription.')
    }
  }

  async function createQuickPatient(values: PatientFormValues): Promise<void> {
    if (editingId) return
    const created: PatientRecord = await window.api.patients.create(values)
    setForm((current) => ({ ...current, patientId: created.id }))
    setPatientSearch(created.name)
    setPatients((current) => [
      {
        ...created,
        lastComplaint: null,
        lastDiagnosis: null,
        visitCount: 0
      },
      ...current.filter((patient) => patient.id !== created.id)
    ])
  }

  function insertPreset(presetId: string): void {
    const preset = presets.find((item) => item.id === Number(presetId))
    if (!preset) return
    if (preset.category === 'Medicine') {
      setForm((current) => ({
        ...current,
        medicines: [
          ...current.medicines,
          { ...emptyMedicine(), medicineName: preset.content || preset.title, position: current.medicines.length }
        ]
      }))
      return
    }

    const map: Record<string, PrescriptionSectionType> = {
      Advice: 'Advice',
      Investigation: 'Investigations',
      Investigations: 'Investigations',
      Diagnosis: 'Probational Diagnosis',
      'Probational Diagnosis': 'Probational Diagnosis'
    }
    const sectionType = map[preset.category]
    if (sectionType) {
      const content = preset.content || preset.title
      updateSection(sectionType, content)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prescriptions</h1>
          <p className="text-muted-foreground text-sm">Create, edit, draft, and duplicate visits.</p>
        </div>
        <Button onClick={startNew}>
          <Plus className="size-4" /> New Prescription
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Visits</CardTitle>
            <CardDescription>{rows.length} prescriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search ID, Pres_ID, name, phone"
                className="pl-8"
              />
            </div>
            <div className="max-h-[34rem] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pres_ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-destructive py-8 text-center">
                        {error}
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        No prescriptions yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id} className="cursor-pointer" onClick={() => editPrescription(row.id)}>
                        <TableCell className="font-mono text-xs">{row.id}</TableCell>
                        <TableCell>
                          <div className="font-medium">{row.patientName}</div>
                          <div className="text-muted-foreground text-xs">
                            {row.patientCode} · Visit {row.visitNo}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[9rem] truncate" title={row.probationalDiagnosis ?? ''}>
                          {row.probationalDiagnosis || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="inline-flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Preview"
                              onClick={(event) => {
                                event.stopPropagation()
                                runPrintAction(row.id, 'preview')
                              }}
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Export PDF"
                              onClick={(event) => {
                                event.stopPropagation()
                                runPrintAction(row.id, 'pdf')
                              }}
                            >
                              <FileDown className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Print"
                              onClick={(event) => {
                                event.stopPropagation()
                                runPrintAction(row.id, 'print')
                              }}
                            >
                              <Printer className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                              onClick={(event) => {
                                event.stopPropagation()
                                editPrescription(row.id)
                              }}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Duplicate"
                              onClick={(event) => {
                                event.stopPropagation()
                                duplicatePrescription(row.id)
                              }}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5" /> {editingId ? `Edit Pres_ID ${editingId}` : 'New Prescription'}
            </CardTitle>
            <CardDescription>{selectedPatient ? patientSummary(selectedPatient) : 'Choose a patient to begin.'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label>Patient</Label>
                {editingId ? (
                  <p className="bg-muted rounded-md border px-3 py-2 text-sm">
                    {lockedPatientLabel ?? patientSummary(selectedPatient)}
                  </p>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={patientSearch}
                        onChange={(event) => setPatientSearch(event.target.value)}
                        placeholder="Search patient before selecting"
                      />
                      <Button variant="outline" onClick={() => setQuickPatientOpen(true)}>
                        New P.
                      </Button>
                    </div>
                    <Select
                      value={form.patientId ? String(form.patientId) : undefined}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, patientId: Number(value) }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={String(patient.id)}>
                            {patientSummary(patient)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Insert from presets</Label>
                <Select onValueChange={insertPreset}>
                  <SelectTrigger className="lg:w-64">
                    <SelectValue placeholder="Choose preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_CATEGORIES.map((category) =>
                      presets
                        .filter((preset) => preset.category === category)
                        .map((preset) => (
                          <SelectItem key={preset.id} value={String(preset.id)}>
                            {category}: {preset.title}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              {form.sections.map((section) => (
                <div key={section.sectionType} className="grid gap-2">
                  <Label htmlFor={section.sectionType}>{SECTION_LABELS[section.sectionType]}</Label>
                  <Textarea
                    id={section.sectionType}
                    value={section.content ?? ''}
                    onChange={(event) => updateSection(section.sectionType, event.target.value)}
                    rows={section.sectionType === 'Advice' ? 4 : 3}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rx</Label>
                <Button type="button" variant="outline" size="sm" onClick={addMedicine}>
                  <Plus className="size-4" /> Add Medicine
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicine</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.medicines.map((medicine, index) => (
                      <TableRow key={medicine._key}>
                        <TableCell>
                          <Input
                            value={medicine.medicineName ?? ''}
                            onChange={(event) => updateMedicine(index, 'medicineName', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={medicine.dosage ?? ''}
                            onChange={(event) => updateMedicine(index, 'dosage', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={medicine.frequency ?? ''}
                            onChange={(event) => updateMedicine(index, 'frequency', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={medicine.duration ?? ''}
                            onChange={(event) => updateMedicine(index, 'duration', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={medicine.notes ?? ''}
                            onChange={(event) => updateMedicine(index, 'notes', event.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remove medicine"
                            onClick={() => removeMedicine(index)}
                            disabled={form.medicines.length === 1}
                          >
                            <Minus className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {saveError && <p className="text-destructive text-sm">{saveError}</p>}
            {status && <p className="text-muted-foreground text-sm">{status}</p>}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => runPrintAction(editingId, 'preview')} disabled={!editingId}>
                <Eye className="size-4" /> Preview
              </Button>
              <Button variant="outline" onClick={() => runPrintAction(editingId, 'pdf')} disabled={!editingId}>
                <FileDown className="size-4" /> PDF
              </Button>
              <Button variant="outline" onClick={() => runPrintAction(editingId, 'print')} disabled={!editingId}>
                <Printer className="size-4" /> Print
              </Button>
              <Button variant="outline" onClick={() => save(true)}>
                <Save className="size-4" /> Save Draft
              </Button>
              <Button onClick={() => save(false)}>
                <Save className="size-4" /> {editingId ? 'Save Changes' : 'Create Prescription'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PatientFormDialog
        open={quickPatientOpen}
        onOpenChange={setQuickPatientOpen}
        onSubmit={createQuickPatient}
      />
    </div>
  )
}
