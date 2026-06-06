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

  async function handleConfirm(): Promise<void> {
    setBusy(true)
    try {
      await onConfirm()
      onOpenChange(false)
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
