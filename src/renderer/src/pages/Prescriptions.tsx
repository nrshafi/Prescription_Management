import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Copy,
  Eye,
  FileDown,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Printer,
  Search
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
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
import type {
  PrescriptionListItem,
  PrescriptionQuery,
  PrescriptionSortField,
  SortDirection
} from '../../../shared/prescription'
import { GENDERS } from '../../../shared/prescription'

const ALL_GENDERS = '__all__'
type ViewMode = 'list' | 'grid'

interface SortableHeaderProps {
  label: string
  field: PrescriptionSortField
  active: boolean
  dir: SortDirection
  onSort: (field: PrescriptionSortField) => void
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

interface PrescriptionsProps {
  onEdit: (id: number) => void
  onNew: () => void
}

export function Prescriptions({ onEdit, onNew }: PrescriptionsProps): React.JSX.Element {
  const [rows, setRows] = useState<PrescriptionListItem[]>([])
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState<string>(ALL_GENDERS)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState<PrescriptionSortField>('createdAt')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query: PrescriptionQuery = {
        search,
        gender: gender === ALL_GENDERS ? undefined : (gender as (typeof GENDERS)[number]),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortBy,
        sortDir
      }
      setRows(await window.api.prescriptions.list(query))
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

  async function runPrintAction(id: number, action: 'preview' | 'print' | 'pdf'): Promise<void> {
    setStatus(null)
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
            setStatus('Opened print preview — use Ctrl+P to print from there, or export PDF.')
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
    const duplicated = await window.api.prescriptions.duplicate(id)
    setStatus(`Duplicated to Pres_ID ${duplicated.id}.`)
    await load()
    onEdit(duplicated.id)
  }

  function handleSort(field: PrescriptionSortField): void {
    if (field === sortBy) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="text-muted-foreground size-8" />
          <div>
            <h2 className="text-lg font-semibold">Prescriptions</h2>
            <p className="text-muted-foreground text-sm">{rows.length} visits</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border bg-background p-1" aria-label="Prescription view mode">
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
          </div>
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

      {status && <p className="text-muted-foreground text-sm">{status}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      {viewMode === 'list' ? (
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
                  field="patientName"
                  active={sortBy === 'patientName'}
                  dir={sortDir}
                  onSort={handleSort}
                />
                <TableHead>Phone</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>C/C</TableHead>
                <TableHead>Diagnosis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-muted-foreground py-10 text-center">
                    No prescriptions yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="px-4 py-3 font-medium">{row.id}</TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
                          {row.patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{row.patientName}</p>
                          <p className="text-muted-foreground text-xs">{row.patientCode}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3">{row.phone || '—'}</TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3">{row.age || '—'}</TableCell>
                    <TableCell className="text-muted-foreground px-4 py-3">{row.gender || '—'}</TableCell>
                    <TableCell
                      className="max-w-[12rem] truncate px-4 py-3"
                      title={row.chiefComplaint ?? ''}
                    >
                      {row.chiefComplaint || '—'}
                    </TableCell>
                    <TableCell
                      className="max-w-[12rem] truncate px-4 py-3"
                      title={row.provisionalDiagnosis ?? ''}
                    >
                      {row.provisionalDiagnosis || '—'}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Edit"
                              onClick={() => onEdit(row.id)}
                            >
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
                              onClick={() => runPrintAction(row.id, 'preview')}
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
                              onClick={() => runPrintAction(row.id, 'pdf')}
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
                              onClick={() => runPrintAction(row.id, 'print')}
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
                              onClick={() => duplicatePrescription(row.id)}
                            >
                              <Copy className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Duplicate</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      ) : loading ? (
        <div className="text-muted-foreground rounded-xl border bg-card py-10 text-center shadow-sm">
          Loading...
        </div>
      ) : rows.length === 0 ? (
        <div className="text-muted-foreground rounded-xl border bg-card py-10 text-center shadow-sm">
          No prescriptions yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <Card key={row.id} className="gap-4 transition-colors hover:bg-accent/40">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{row.patientName}</CardTitle>
                    <p className="text-muted-foreground text-xs">
                      Pres_ID {row.id} · {row.patientCode}
                    </p>
                  </div>
                  <div className="bg-muted flex size-10 items-center justify-center rounded-full text-sm font-medium">
                    {row.patientName.charAt(0).toUpperCase()}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p>{row.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Age</p>
                  <p>{row.age || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Gender</p>
                  <p>{row.gender || '—'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">C/C</p>
                  <p className="truncate" title={row.chiefComplaint ?? ''}>
                    {row.chiefComplaint || '—'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Diagnosis</p>
                  <p className="truncate" title={row.provisionalDiagnosis ?? ''}>
                    {row.provisionalDiagnosis || '—'}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-end gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Edit"
                      onClick={() => onEdit(row.id)}
                    >
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
                      onClick={() => runPrintAction(row.id, 'preview')}
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
                      onClick={() => runPrintAction(row.id, 'pdf')}
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
                      onClick={() => runPrintAction(row.id, 'print')}
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
                      onClick={() => duplicatePrescription(row.id)}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate</TooltipContent>
                </Tooltip>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
