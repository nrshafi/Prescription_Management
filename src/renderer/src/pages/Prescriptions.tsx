import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Copy,
  Eye,
  FileDown,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { DeletePatientDialog } from '@/components/patients/DeletePatientDialog'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type {
  PatientFormValues,
  PatientListItem,
  PatientRecord,
  PatientSortField,
  PatientVisit,
  SortDirection
} from '../../../shared/patient'
import { GENDERS } from '../../../shared/patient'

const ALL_GENDERS = '__all__'
type ViewMode = 'list' | 'grid'

interface SortableHeaderProps {
  label: string
  field: PatientSortField
  active: boolean
  dir: SortDirection
  onSort: (field: PatientSortField) => void
}

interface VisitState {
  loading: boolean
  error: string | null
  visits: PatientVisit[] | null
}

interface PrescriptionsProps {
  onEdit: (id: number) => void
  onNew: () => void
}

function SortableHeader({
  label,
  field,
  active,
  dir,
  onSort
}: SortableHeaderProps): React.JSX.Element {
  return (
    <TableHead>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="hover:text-foreground -mx-1 flex items-center gap-1 rounded px-1"
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ChevronsUpDown className="size-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  )
}

function formatDate(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function patientSummary(patient: PatientListItem): string {
  return [patient.gender, patient.age && `Age ${patient.age}`, patient.phone].filter(Boolean).join(' · ')
}

export function Prescriptions({ onEdit, onNew }: PrescriptionsProps): React.JSX.Element {
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState<string>(ALL_GENDERS)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<PatientSortField>('id')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(() => new Set())
  const [visitsByPatient, setVisitsByPatient] = useState<Record<number, VisitState>>({})

  const [formOpen, setFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<PatientListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.patients.list({
        search,
        gender: gender === ALL_GENDERS ? undefined : (gender as (typeof GENDERS)[number]),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortDir
      })
      setPatients(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load prescriptions.')
    } finally {
      setLoading(false)
    }
  }, [search, gender, dateFrom, dateTo, sortBy, sortDir])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  async function loadVisits(patientId: number, force = false): Promise<void> {
    const cached = visitsByPatient[patientId]
    if (!force && (cached?.visits || cached?.loading)) return

    setVisitsByPatient((current) => ({
      ...current,
      [patientId]: { loading: true, error: null, visits: cached?.visits ?? null }
    }))

    try {
      const visits = await window.api.patients.visits(patientId)
      setVisitsByPatient((current) => ({
        ...current,
        [patientId]: { loading: false, error: null, visits }
      }))
    } catch (err) {
      setVisitsByPatient((current) => ({
        ...current,
        [patientId]: {
          loading: false,
          error: err instanceof Error ? err.message : 'Could not load prescriptions.',
          visits: null
        }
      }))
    }
  }

  function togglePatient(patientId: number): void {
    const willExpand = !expandedPatients.has(patientId)
    setExpandedPatients((current) => {
      const next = new Set(current)
      if (willExpand) next.add(patientId)
      else next.delete(patientId)
      return next
    })
    if (willExpand) void loadVisits(patientId)
  }

  async function runPrintAction(id: number, action: 'preview' | 'print' | 'pdf'): Promise<void> {
    setStatus(null)
    setError(null)
    try {
      if (action === 'preview') {
        await window.api.printing.preview(id)
        setStatus(`Opened preview for Pres_ID ${id}.`)
        return
      }
      if (action === 'print') {
        const result = await window.api.printing.print(id)
        if (!result.ok) {
          setError(result.message ?? 'Print failed.')
          if (result.fallbackPreview) {
            setStatus('Opened print preview; use Ctrl+P to print from there, or export PDF.')
          }
          return
        }
        setStatus(`Sent Pres_ID ${id} to printer.`)
        return
      }
      const result = await window.api.printing.pdf(id)
      setStatus(result.path ? `Exported PDF: ${result.path}` : 'PDF export cancelled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print action failed.')
    }
  }

  async function duplicatePrescription(id: number): Promise<void> {
    setError(null)
    try {
      const duplicated = await window.api.prescriptions.duplicate(id)
      setStatus(`Duplicated to Pres_ID ${duplicated.id}.`)
      await load()
      if (expandedPatients.has(duplicated.patientId)) await loadVisits(duplicated.patientId, true)
      onEdit(duplicated.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not duplicate prescription.')
    }
  }

  function handleSort(field: PatientSortField): void {
    if (field === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  function openCreatePatient(): void {
    setEditingPatient(null)
    setFormOpen(true)
  }

  function openEditPatient(patient: PatientListItem): void {
    setEditingPatient(patient)
    setFormOpen(true)
  }

  async function handlePatientSubmit(values: PatientFormValues): Promise<void> {
    if (editingPatient) {
      await window.api.patients.update(editingPatient.id, values)
    } else {
      await window.api.patients.create(values)
    }
    await load()
  }

  async function handleDeletePatient(): Promise<void> {
    if (!deletingPatient) return
    await window.api.patients.delete(deletingPatient.id)
    setExpandedPatients((current) => {
      const next = new Set(current)
      next.delete(deletingPatient.id)
      return next
    })
    setVisitsByPatient((current) => {
      const next = { ...current }
      delete next[deletingPatient.id]
      return next
    })
    await load()
  }

  function renderVisitActions(visit: PatientVisit): React.JSX.Element {
    return (
      <div className="flex justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={() => onEdit(visit.id)}>
              <Pencil className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Preview"
              onClick={() => runPrintAction(visit.id, 'preview')}
            >
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Preview</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="PDF"
              onClick={() => runPrintAction(visit.id, 'pdf')}
            >
              <FileDown className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export PDF</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Print"
              onClick={() => runPrintAction(visit.id, 'print')}
            >
              <Printer className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Print</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Duplicate"
              onClick={() => duplicatePrescription(visit.id)}
            >
              <Copy className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Duplicate</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  function renderVisits(patient: PatientListItem, compact = false): React.JSX.Element {
    const state = visitsByPatient[patient.id]

    if (!state || state.loading) {
      return <p className="text-muted-foreground px-3 py-4 text-sm">Loading prescriptions...</p>
    }

    if (state.error) {
      return <p className="text-destructive px-3 py-4 text-sm">{state.error}</p>
    }

    if (!state.visits || state.visits.length === 0) {
      return <p className="text-muted-foreground px-3 py-4 text-sm">No prescriptions yet.</p>
    }

    return (
      <div className={cn('overflow-hidden rounded-lg border bg-background', compact && 'mt-3')}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pres. ID</TableHead>
              <TableHead>Visit</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>C/C</TableHead>
              <TableHead>Diagnosis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.visits.map((visit) => (
              <TableRow key={visit.id}>
                <TableCell className="font-medium">{visit.id}</TableCell>
                <TableCell>#{visit.visitNo}</TableCell>
                <TableCell>{formatDate(visit.createdAt)}</TableCell>
                <TableCell className="max-w-[12rem] truncate" title={visit.complaint ?? ''}>
                  {visit.complaint || '-'}
                </TableCell>
                <TableCell className="max-w-[12rem] truncate" title={visit.diagnosis ?? ''}>
                  {visit.diagnosis || '-'}
                </TableCell>
                <TableCell>{renderVisitActions(visit)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="text-muted-foreground size-8" />
          <div>
            <h2 className="text-lg font-semibold">Prescriptions</h2>
            <p className="text-muted-foreground text-sm">
              {patients.length} patients grouped by prescription history
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <fieldset
            className="flex rounded-md border bg-background p-1"
            aria-label="Prescription view mode"
          >
            <Button
              type="button"
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              <List data-icon="inline-start" /> List
            </Button>
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={viewMode === 'grid'}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid data-icon="inline-start" /> Grid
            </Button>
          </fieldset>
          <Button type="button" variant="outline" onClick={openCreatePatient}>
            <Plus data-icon="inline-start" /> New Patient
          </Button>
          <Button type="button" onClick={onNew}>
            New Prescription
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, ID, phone..."
            className="pl-9"
          />
        </div>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_GENDERS}>All genders</SelectItem>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-36"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-36"
        />
      </div>

      {status ? <p className="text-muted-foreground text-sm">{status}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

      {viewMode === 'list' ? (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <SortableHeader
                  label="ID"
                  field="id"
                  active={sortBy === 'id'}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Name"
                  field="name"
                  active={sortBy === 'name'}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <TableHead>Phone</TableHead>
                <SortableHeader
                  label="Age"
                  field="age"
                  active={sortBy === 'age'}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <SortableHeader
                  label="Gender"
                  field="gender"
                  active={sortBy === 'gender'}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <TableHead>Visits</TableHead>
                <TableHead className="text-right">Patient Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    No prescriptions yet.
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => {
                  const expanded = expandedPatients.has(patient.id)
                  return (
                    <Fragment key={patient.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => togglePatient(patient.id)}
                      >
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" aria-label="Toggle prescriptions">
                            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{patient.patientCode}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
                              {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              {patient.address ? (
                                <p className="text-muted-foreground max-w-[12rem] truncate text-xs" title={patient.address}>
                                  {patient.address}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{patient.phone || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{patient.age || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{patient.gender || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{patient.visitCount}</Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Edit patient"
                                  onClick={() => openEditPatient(patient)}
                                >
                                  <Pencil className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit patient</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  aria-label="Delete patient"
                                  onClick={() => setDeletingPatient(patient)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete patient</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded ? (
                        <TableRow key={`${patient.id}-visits`}>
                          <TableCell colSpan={8} className="bg-muted/30 p-4">
                            <div className="flex flex-col gap-3">
                              {patient.address || patientSummary(patient) ? (
                                <div className="text-muted-foreground text-sm">
                                  {[patientSummary(patient), patient.address].filter(Boolean).join(' · ')}
                                </div>
                              ) : null}
                              {renderVisits(patient)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : loading ? (
        <div className="text-muted-foreground rounded-xl border bg-card py-10 text-center shadow-sm">
          Loading...
        </div>
      ) : patients.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border bg-card py-10 text-center shadow-sm">
          No prescriptions yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {patients.map((patient) => {
            const expanded = expandedPatients.has(patient.id)
            return (
              <Card key={patient.id} className="gap-4 transition-colors hover:bg-accent/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => togglePatient(patient.id)}
                    >
                      <CardTitle className="flex items-center gap-2">
                        {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                        <span className="truncate">{patient.name}</span>
                      </CardTitle>
                      <p className="text-muted-foreground text-xs">
                        {patient.patientCode} · {patient.visitCount} visit{patient.visitCount === 1 ? '' : 's'}
                      </p>
                    </button>
                    <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm font-medium">
                      {patient.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Phone</p>
                    <p>{patient.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Age</p>
                    <p>{patient.age || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Gender</p>
                    <p>{patient.gender || '-'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Visits</p>
                    <Badge variant="secondary">{patient.visitCount}</Badge>
                  </div>
                  {patient.address ? (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Address</p>
                      <p className="truncate" title={patient.address}>{patient.address}</p>
                    </div>
                  ) : null}
                  {expanded ? <div className="col-span-2">{renderVisits(patient, true)}</div> : null}
                </CardContent>
                <CardFooter className="justify-end gap-1">
                  <Button variant="ghost" size="icon" aria-label="Edit patient" onClick={() => openEditPatient(patient)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete patient"
                    onClick={() => setDeletingPatient(patient)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editingPatient}
        onSubmit={handlePatientSubmit}
      />
      <DeletePatientDialog
        patient={deletingPatient}
        onOpenChange={(open) => !open && setDeletingPatient(null)}
        onConfirm={handleDeletePatient}
      />
    </div>
  )
}
