import { Calendar, Clock, FilePlus, FileText, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { AppPage } from '@/lib/navigation'
import type { PrescriptionListItem } from '../../../shared/prescription'
import type { DoctorProfileRecord } from '../../../shared/print'

interface DashboardProps {
  onNavigate: (page: AppPage) => void
}

export function Dashboard({ onNavigate }: DashboardProps): React.JSX.Element {
  const [doctor, setDoctor] = useState<DoctorProfileRecord | null>(null)
  const [totalPatients, setTotalPatients] = useState(0)
  const [todaysRx, setTodaysRx] = useState(0)
  const [totalRx, setTotalRx] = useState(0)
  const [medicinePresetCount, setMedicinePresetCount] = useState(0)
  const [recent, setRecent] = useState<PrescriptionListItem[]>([])

  useEffect(() => {
    Promise.all([
      api.dashboard.stats(),
      api.prescriptions.list(),
      api.presets.list('Medicine'),
      api.settings.get()
    ]).then(([stats, allRx, medPresets, settings]) => {
      setTotalPatients(stats.totalPatients)
      setTodaysRx(stats.todaysPrescriptions)
      setTotalRx(allRx.length)
      setMedicinePresetCount(medPresets.length)
      setRecent(allRx.slice(0, 8))
      setDoctor(settings.doctorProfile)
    })
  }, [])

  const stats = [
    { label: 'Total Prescriptions', value: totalRx, icon: FileText, hint: 'All time' },
    { label: 'Total Patients', value: totalPatients, icon: Users, hint: 'Registered' },
    {
      label: "Today's Prescriptions",
      value: todaysRx,
      icon: Calendar,
      hint: new Date().toLocaleDateString('en-BD', { day: '2-digit', month: 'short' })
    },
    { label: 'Medicine Presets', value: medicinePresetCount, icon: TrendingUp, hint: 'Saved' }
  ]

  return (
    <div className="space-y-6 p-6">
      <div className="from-primary to-primary/80 text-primary-foreground rounded-2xl bg-gradient-to-r p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Welcome back,</h2>
            <h1 className="mt-0.5 text-2xl font-bold">{doctor?.name || 'Doctor'}</h1>
            <p className="mt-1 text-sm opacity-80">{doctor?.speciality}</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-80">
              {new Date().toLocaleDateString('en-BD', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => onNavigate('new-prescription')}
            >
              <FilePlus className="size-4" />
              New Prescription
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                  <p className="mt-1 text-3xl font-bold">{stat.value}</p>
                  <p className="text-muted-foreground mt-1 text-xs">{stat.hint}</p>
                </div>
                <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                  <Icon className="text-foreground size-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground size-4" />
            <h3 className="font-medium">Recent Prescriptions</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('prescriptions')}
            className="text-primary text-sm hover:underline"
          >
            View all
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center">
            <FileText className="text-muted-foreground/30 mx-auto mb-2 size-10" />
            <p className="text-muted-foreground text-sm">No prescriptions yet</p>
            <Button type="button" variant="link" onClick={() => onNavigate('new-prescription')}>
              Create your first prescription
            </Button>
          </div>
        ) : (
          <ul className="divide-y">
            {recent.map((rx) => (
              <li key={rx.id} className="flex items-center gap-4 px-5 py-3">
                <div className="bg-muted flex size-9 items-center justify-center rounded-full text-sm font-medium">
                  {rx.patientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{rx.patientName}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {rx.provisionalDiagnosis || rx.chiefComplaint || '—'}
                  </p>
                </div>
                <div className="text-muted-foreground shrink-0 text-xs">
                  {new Date(rx.createdAt).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
