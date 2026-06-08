import { ArrowDown, ArrowUp, ChevronsUpDown, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DeletePatientDialog } from '@/components/patients/DeletePatientDialog'
import { PatientDetailDialog } from '@/components/patients/PatientDetailDialog'
import { PatientFormDialog } from '@/components/patients/PatientFormDialog'
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
import {
  GENDERS,
  type PatientFormValues,
  type PatientListItem,
  type PatientRecord,
  type PatientSortField,
  type SortDirection
} from '../../../shared/patient'

const ALL_GENDERS = '__all__'

interface SortableHeaderProps {
  label: string
  field: PatientSortField
  active: boolean
  dir: SortDirection
  onSort: (field: PatientSortField) => void
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

export function Patients(): React.JSX.Element {
  const [rows, setRows] = useState<PatientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState<string>(ALL_GENDERS)
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [minVisits, setMinVisits] = useState('')
  const [sortBy, setSortBy] = useState<PatientSortField>('id')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PatientRecord | null>(null)
  const [deleting, setDeleting] = useState<PatientListItem | null>(null)
  const [viewing, setViewing] = useState<PatientListItem | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.api.patients.list({
        search,
        gender: gender === ALL_GENDERS ? undefined : (gender as (typeof GENDERS)[number]),
        ageMin: ageMin ? Number.parseInt(ageMin, 10) : undefined,
        ageMax: ageMax ? Number.parseInt(ageMax, 10) : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        minVisits: minVisits ? Number.parseInt(minVisits, 10) : undefined,
        sortBy,
        sortDir
      })
      setRows(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load patients.')
    } finally {
      setLoading(false)
    }
  }, [search, gender, ageMin, ageMax, dateFrom, dateTo, minVisits, sortBy, sortDir])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  function handleSort(field: PatientSortField): void {
    if (field === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  function openCreate(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(row: PatientListItem): void {
    setEditing(row)
    setFormOpen(true)
  }

  async function handleSubmit(values: PatientFormValues): Promise<void> {
    if (editing) {
      await window.api.patients.update(editing.id, values)
    } else {
      await window.api.patients.create(values)
    }
    await load()
  }

  async function handleDelete(): Promise<void> {
    if (!deleting) return
    await window.api.patients.delete(deleting.id)
    await load()
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground text-sm">{rows.length} patients</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> New Patient
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, Pres. ID, name, phone…"
            className="pl-8"
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
          type="number"
          value={ageMin}
          onChange={(e) => setAgeMin(e.target.value)}
          placeholder="Min age"
          className="w-20"
          min="0"
          max="200"
        />
        <Input
          type="number"
          value={ageMax}
          onChange={(e) => setAgeMax(e.target.value)}
          placeholder="Max age"
          className="w-20"
          min="0"
          max="200"
        />
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
        <Input
          type="number"
          value={minVisits}
          onChange={(e) => setMinVisits(e.target.value)}
          placeholder="Min visits"
          className="w-24"
          min="0"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
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
              <SortableHeader
                label="C/C"
                field="complaint"
                active={sortBy === 'complaint'}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Diagnosis"
                field="diagnosis"
                active={sortBy === 'diagnosis'}
                dir={sortDir}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  Loading…
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-destructive py-8 text-center">
                  {error}
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
                  {search ? 'No patients match your search.' : 'No patients yet.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => setViewing(row)}>
                  <TableCell className="font-mono text-xs">{row.patientCode}</TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell>{row.age || '—'}</TableCell>
                  <TableCell>{row.gender || '—'}</TableCell>
                  <TableCell className="max-w-[14rem] truncate" title={row.lastComplaint ?? ''}>
                    {row.lastComplaint || '—'}
                  </TableCell>
                  <TableCell className="max-w-[14rem] truncate" title={row.lastDiagnosis ?? ''}>
                    {row.lastDiagnosis || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEdit(row)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleting(row)
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PatientFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        patient={editing}
        onSubmit={handleSubmit}
      />
      <DeletePatientDialog
        patient={deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        onConfirm={handleDelete}
      />
      <PatientDetailDialog patient={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  )
}
