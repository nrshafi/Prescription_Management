import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import type { PatientListItem } from '@shared/patient'

interface DeletePatientDialogProps {
  patient: PatientListItem | null
  onOpenChange: (open: boolean) => void
  // Receives the prescription count shown to the user, so the caller can pass
  // it to the delete API as the acknowledged cascade size.
  onConfirm: (acknowledgedPrescriptions: number) => Promise<void>
}

export function DeletePatientDialog({
  patient,
  onOpenChange,
  onConfirm
}: DeletePatientDialogProps): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prescriptionCount, setPrescriptionCount] = useState<number | null>(null)

  useEffect(() => {
    if (!patient) {
      setPrescriptionCount(null)
      setError(null)
      return
    }
    let cancelled = false
    api.patients.prescriptionCount(patient.id).then((count) => {
      if (!cancelled) setPrescriptionCount(count)
    })
    return () => {
      cancelled = true
    }
  }, [patient])

  async function handleConfirm(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await onConfirm(prescriptionCount ?? 0)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete patient.')
    } finally {
      setBusy(false)
    }
  }

  const count = prescriptionCount ?? 0
  const countLoaded = prescriptionCount !== null

  return (
    <Dialog open={Boolean(patient)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete patient?</DialogTitle>
          <DialogDescription>
            This permanently removes <strong>{patient?.name}</strong> ({patient?.patientCode})
            {count > 0 ? ` and ${count} prescription${count > 1 ? 's' : ''}` : ''}. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={busy || !countLoaded}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
