import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import type { PatientListItem } from '../../../../shared/patient'

interface DeletePatientDialogProps {
  patient: PatientListItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeletePatientDialog({
  patient,
  onOpenChange,
  onConfirm
}: DeletePatientDialogProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete patient.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={Boolean(patient)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete patient?</DialogTitle>
          <DialogDescription>
            This permanently removes <strong>{patient?.name}</strong> ({patient?.patientCode})
            {patient && patient.visitCount > 0
              ? ` and ${patient.visitCount} prescription${patient.visitCount > 1 ? 's' : ''}`
              : ''}
            . This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
