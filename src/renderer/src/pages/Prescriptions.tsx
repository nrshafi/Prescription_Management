import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FilePlus,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useState } from 'react'
import { DeletePatientDialog } from '@/components/patients/DeletePatientDialog'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
import { PatientVisitsTable, type VisitState } from '@/components/prescriptions/PatientVisitsTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { api } from '@/lib/api'
import type {
  PatientFormValues,
  PatientListItem,
  PatientRecord,
  PatientSortField,
  SortDirection
} from '@shared/patient'
import { GENDERS } from '@shared/patient'

const ALL_GENDERS = '__all__'

interface SortableHeaderProps {
  label: string
  field: PatientSortField
  active: boolean
  dir: SortDirection
  onSort: (field: PatientSortField) => void
}

interface PrescriptionsProps {
  onEdit: (id: number) => void
  onNew: () => void
  onNewForPatient: (patient: PatientListItem) => void
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

function patientSummary(patient: PatientListItem): string {
  return [patient.gender, patient.age && `Age ${patient.age}`, patient.phone]
    .filter(Boolean)
    .join(' · ')
}

export function Prescriptions({
  onEdit,
  onNew,
  onNewForPatient
}: PrescriptionsProps): React.JSX.Element {
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
  const [expandedPatients, setExpandedPatients] = useState<Set<number>>(() => new Set())
  const [visitsByPatient, setVisitsByPatient] = useState<Record<number, VisitState>>({})

  const [formOpen, setFormOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null)
  const [deletingPatient, setDeletingPatient] = useState<PatientListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.patients.list({
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
      const visits = await api.patients.visits(patientId)
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
        await api.printing.preview(id)
        setStatus(`Opened preview for Pres_ID ${id}.`)
        return
      }
      if (action === 'print') {
        const result = await api.printing.print(id)
        if (!result.ok) {
          setError(result.message ?? 'Print failed.')
          return
        }
        setStatus(`Sent Pres_ID ${id} to printer.`)
        return
      }
      const result = await api.printing.pdf(id)
      if (!result.ok) {
        setError(result.message ?? 'PDF export failed.')
        return
      }
      setStatus(
        result.path
          ? `Exported PDF: ${result.path}`
          : (result.message ?? `Opened print dialog for Pres_ID ${id}.`)
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print action failed.')
    }
  }

  async function duplicatePrescription(id: number): Promise<void> {
    setError(null)
    try {
      const duplicated = await api.prescriptions.duplicate(id)
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
      await api.patients.update(editingPatient.id, values)
    } else {
      await api.patients.create(values)
    }
    await load()
  }

  async function handleDeletePatient(acknowledgedPrescriptions: number): Promise<void> {
    if (!deletingPatient) return
    await api.patients.delete(deletingPatient.id, { acknowledgedPrescriptions })
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

  function renderVisits(patient: PatientListItem): React.JSX.Element {
    return (
      <PatientVisitsTable
        state={visitsByPatient[patient.id]}
        onEdit={onEdit}
        onPrintAction={(id, action) => void runPrintAction(id, action)}
        onDuplicate={(id) => void duplicatePrescription(id)}
      />
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
          <Button type="button" variant="outline" onClick={openCreatePatient}>
            <Plus data-icon="inline-start" /> New Patient
          </Button>
          <Button type="button" onClick={onNew}>
            New Prescription
          </Button>
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="sr-only">Filter prescriptions</legend>
        <div className="relative flex-1 max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, ID, phone..."
            className="pl-9"
          />
        </div>
        <Select value={gender} onValueChange={setGender}>
          <SelectTrigger className="w-full sm:w-36">
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
          className="w-full sm:w-36"
          aria-label="From date"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-36"
          aria-label="To date"
        />
      </fieldset>

      {status ? <p className="text-muted-foreground text-sm">{status}</p> : null}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}

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
          <TableBody aria-busy={loading}>
            {loading ? (
              ['sk-a', 'sk-b', 'sk-c', 'sk-d', 'sk-e'].map((skeletonKey) => (
                <TableRow key={skeletonKey}>
                  <TableCell>
                    <div className="bg-muted size-7 animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-muted h-4 w-10 animate-pulse rounded font-mono text-xs" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-muted size-8 shrink-0 animate-pulse rounded-full" />
                      <div className="space-y-1.5">
                        <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                        <div className="bg-muted h-3 w-20 animate-pulse rounded" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-muted h-4 w-8 animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-muted h-4 w-12 animate-pulse rounded" />
                  </TableCell>
                  <TableCell>
                    <div className="bg-muted h-5 w-6 animate-pulse rounded-md" />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <div className="bg-muted size-8 animate-pulse rounded" />
                      <div className="bg-muted size-8 animate-pulse rounded" />
                      <div className="bg-muted size-8 animate-pulse rounded" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          togglePatient(patient.id)
                        }
                      }}
                    >
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Toggle prescriptions"
                        >
                          {expanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
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
                              <p
                                className="text-muted-foreground max-w-[12rem] truncate text-xs"
                                title={patient.address}
                              >
                                {patient.address}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {patient.phone || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{patient.age || '-'}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {patient.gender || '-'}
                      </TableCell>
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
                                aria-label="New prescription"
                                onClick={() => onNewForPatient(patient)}
                              >
                                <FilePlus className="size-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>New prescription</TooltipContent>
                          </Tooltip>
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
                                {[patientSummary(patient), patient.address]
                                  .filter(Boolean)
                                  .join(' · ')}
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
