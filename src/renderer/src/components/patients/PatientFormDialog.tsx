import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  GENDERS,
  type PatientFormValues,
  type PatientRecord,
  patientFormSchema
} from '../../../../shared/patient'

interface PatientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  patient?: PatientRecord | null
  onSubmit: (values: PatientFormValues) => Promise<void>
}

const emptyValues: PatientFormValues = {
  name: '',
  age: '',
  gender: '',
  phone: '',
  address: ''
}

export function PatientFormDialog({
  open,
  onOpenChange,
  patient,
  onSubmit
}: PatientFormDialogProps): React.JSX.Element {
  const isEdit = Boolean(patient)

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting }
  } = useForm<PatientFormValues>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: emptyValues
  })

  useEffect(() => {
    if (open) {
      reset(
        patient
          ? {
              name: patient.name ?? '',
              age: patient.age ?? '',
              gender: (patient.gender as PatientFormValues['gender']) ?? '',
              phone: patient.phone ?? '',
              address: patient.address ?? ''
            }
          : emptyValues
      )
    }
  }, [open, patient, reset])

  async function submit(values: PatientFormValues): Promise<void> {
    await onSubmit(values)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(submit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Patient' : 'New Patient'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Update details for ${patient?.patientCode}.`
                : 'A patient code is generated automatically.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" autoFocus {...register('name')} aria-invalid={!!errors.name} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="age">Age</Label>
              <Input id="age" placeholder="e.g. 34 / 8 mo" {...register('age')} />
              {errors.age && <p className="text-destructive text-xs">{errors.age.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gender">Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) => field.onChange(v as PatientFormValues['gender'])}
                  >
                    <SelectTrigger id="gender" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && <p className="text-destructive text-xs">{errors.phone.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" rows={2} {...register('address')} />
            {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? 'Save Changes' : 'Create Patient'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
