import { Copy, Eye, FileDown, Pencil, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { PatientVisit } from '../../../../shared/patient'

export interface VisitState {
  loading: boolean
  error: string | null
  visits: PatientVisit[] | null
}

interface PrescriptionVisitActionsProps {
  visit: PatientVisit
  onEdit: (id: number) => void
  onPrintAction: (id: number, action: 'preview' | 'print' | 'pdf') => void
  onDuplicate: (id: number) => void
}

interface PatientVisitsTableProps {
  state: VisitState | undefined
  onEdit: (id: number) => void
  onPrintAction: (id: number, action: 'preview' | 'print' | 'pdf') => void
  onDuplicate: (id: number) => void
}

function formatDate(value: string): string {
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function PrescriptionVisitActions({
  visit,
  onEdit,
  onPrintAction,
  onDuplicate
}: PrescriptionVisitActionsProps): React.JSX.Element {
  return (
    <div className="flex justify-end gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Edit"
            onClick={() => onEdit(visit.id)}
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
            onClick={() => onPrintAction(visit.id, 'preview')}
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
            onClick={() => onPrintAction(visit.id, 'pdf')}
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
            onClick={() => onPrintAction(visit.id, 'print')}
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
            onClick={() => onDuplicate(visit.id)}
          >
            <Copy className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicate</TooltipContent>
      </Tooltip>
    </div>
  )
}

export function PatientVisitsTable({
  state,
  onEdit,
  onPrintAction,
  onDuplicate
}: PatientVisitsTableProps): React.JSX.Element {
  if (!state || state.loading) {
    return (
      <div className="overflow-hidden rounded-lg border bg-background">
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
            {['sk-x', 'sk-y', 'sk-z'].map((skeletonKey) => (
              <TableRow key={skeletonKey}>
                <TableCell>
                  <div className="bg-muted h-4 w-8 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="bg-muted h-4 w-6 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="bg-muted h-4 w-24 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="bg-muted h-4 w-28 animate-pulse rounded" />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <div className="bg-muted size-8 animate-pulse rounded" />
                    <div className="bg-muted size-8 animate-pulse rounded" />
                    <div className="bg-muted size-8 animate-pulse rounded" />
                    <div className="bg-muted size-8 animate-pulse rounded" />
                    <div className="bg-muted size-8 animate-pulse rounded" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (state.error) {
    return <p className="text-destructive px-3 py-4 text-sm">{state.error}</p>
  }

  if (!state.visits || state.visits.length === 0) {
    return <p className="text-muted-foreground px-3 py-4 text-sm">No prescriptions yet.</p>
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background">
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
              <TableCell>
                <PrescriptionVisitActions
                  visit={visit}
                  onEdit={onEdit}
                  onPrintAction={onPrintAction}
                  onDuplicate={onDuplicate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
