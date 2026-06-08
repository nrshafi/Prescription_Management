import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import type { PatientListItem, PatientVisit } from '../../../../shared/patient'

interface PatientDetailDialogProps {
  patient: PatientListItem | null
  onOpenChange: (open: boolean) => void
}

function formatDate(value: string): string {
  const d = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function PatientDetailDialog({
  patient,
  onOpenChange
}: PatientDetailDialogProps): React.JSX.Element {
  const [loaded, setLoaded] = useState<{ patientId: number; visits: PatientVisit[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const patientId = patient?.id

  useEffect(() => {
    if (patientId === undefined) return
    let active = true
    setError(null)
    window.api.patients
      .visits(patientId)
      .then((visits) => {
        if (active) setLoaded({ patientId, visits })
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Could not load visits.')
      })
    return () => {
      active = false
    }
  }, [patientId])

  const visits = loaded && loaded.patientId === patientId ? loaded.visits : null

  return (
    <Dialog open={Boolean(patient)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {patient?.name}
            <Badge variant="secondary">{patient?.patientCode}</Badge>
          </DialogTitle>
          <DialogDescription>
            {[patient?.gender, patient?.age && `Age ${patient.age}`, patient?.phone]
              .filter(Boolean)
              .join(' · ') || 'No additional details'}
          </DialogDescription>
        </DialogHeader>

        {patient?.address && <p className="text-muted-foreground text-sm">{patient.address}</p>}

        <div>
          <h3 className="mb-2 text-sm font-medium">Visit History</h3>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : visits === null ? (
            <p className="text-muted-foreground text-sm">Loading…</p>
          ) : visits.length === 0 ? (
            <p className="text-muted-foreground text-sm">No prescriptions yet.</p>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Visit</TableHead>
                    <TableHead>Pres. ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>C/C</TableHead>
                    <TableHead>Diagnosis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell>#{v.visitNo}</TableCell>
                      <TableCell className="text-muted-foreground">{v.id}</TableCell>
                      <TableCell>{formatDate(v.createdAt)}</TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={v.complaint ?? ''}>
                        {v.complaint || '—'}
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={v.diagnosis ?? ''}>
                        {v.diagnosis || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
