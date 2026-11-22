import { Calendar, Clock, FilePlus, FileText, TrendingUp, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { AppPage } from '@/lib/navigation'
import type { PrescriptionListItem } from '@shared/prescription'
import type { DoctorProfileRecord } from '@shared/print'

interface DashboardProps {
  onNavigate: (page: AppPage) => void
}

const dateLocale = 'en-BD'

function formatRecordDate(value: string): string {
  return new Date(value).toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export function Dashboard({ onNavigate }: DashboardProps): React.JSX.Element {
  const [doctor, setDoctor] = useState<DoctorProfileRecord | null>(null)
  const [totalPatients, setTotalPatients] = useState(0)
  const [todaysRx, setTodaysRx] = useState(0)
  const [totalRx, setTotalRx] = useState(0)
  const [medicinePresetCount, setMedicinePresetCount] = useState(0)
  const [recent, setRecent] = useState<PrescriptionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.dashboard.stats(),
      api.prescriptions.list({ limit: 8 }),
      api.presets.list('Medicine'),
      api.settings.get()
    ])
      .then(([stats, recentRx, medPresets, settings]) => {
        if (cancelled) return
        setTotalPatients(stats.totalPatients)
        setTotalRx(stats.totalPrescriptions)
        setTodaysRx(stats.todaysPrescriptions)
        setMedicinePresetCount(medPresets.length)
        setRecent(recentRx)
        setDoctor(settings.doctorProfile)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load dashboard.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const stats = [
    { label: 'Total Prescriptions', value: totalRx, icon: FileText },
    { label: 'Total Patients', value: totalPatients, icon: Users },
    { label: "Today's Prescriptions", value: todaysRx, icon: Calendar },
    { label: 'Medicine Presets', value: medicinePresetCount, icon: TrendingUp }
  ]

  const today = new Date().toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return (
    <div className="flex flex-col p-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">Welcome back</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-tight">
            {doctor?.name || 'Doctor'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {doctor?.speciality ? `${doctor.speciality} · ${today}` : today}
          </p>
        </div>
        <Button type="button" onClick={() => onNavigate('new-prescription')}>
          <FilePlus className="size-4" />
          New Prescription
        </Button>
      </header>

      {error && <p className="text-destructive mt-4 text-sm">{error}</p>}

      <dl
        className="mt-px grid grid-cols-2 divide-x divide-y border-b xl:grid-cols-4 xl:divide-y-0"
        aria-busy={loading}
      >
        {loading
          ? stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="px-5 py-4">
                  <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <Icon className="size-3.5" />
                    {stat.label}
                  </dt>
                  <dd className="bg-muted mt-2 h-8 w-16 animate-pulse rounded tabular-nums" />
                </div>
              )
            })
          : stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="px-5 py-4">
                  <dt className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
                    <Icon className="size-3.5" />
                    {stat.label}
                  </dt>
                  <dd className="mt-2 text-2xl font-bold tabular-nums">{stat.value}</dd>
                </div>
              )
            })}
      </dl>

      <section className="mt-6">
        <div className="flex items-center justify-between pb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Clock className="text-muted-foreground size-4" />
            Recent Prescriptions
          </h2>
          {recent.length > 0 && (
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto px-0"
              onClick={() => onNavigate('prescriptions')}
            >
              View all
            </Button>
          )}
        </div>

        {loading ? (
          <ul className="divide-y rounded-xl border" aria-busy={loading}>
            {['sk-1', 'sk-2', 'sk-3', 'sk-4'].map((skeletonKey) => (
              <li key={skeletonKey} className="flex items-center gap-4 px-5 py-3">
                <div className="bg-muted size-9 shrink-0 animate-pulse rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="bg-muted h-4 w-32 animate-pulse rounded" />
                  <div className="bg-muted h-3.5 w-48 animate-pulse rounded" />
                </div>
                <div className="bg-muted h-3.5 w-20 shrink-0 animate-pulse rounded" />
              </li>
            ))}
          </ul>
        ) : recent.length === 0 ? (
          <div className="rounded-xl border py-14 text-center">
            <FileText className="text-muted-foreground/40 mx-auto mb-3 size-10" />
            <p className="text-sm font-medium">No prescriptions yet</p>
            <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
              Capture a visit and print it on your letterhead to see it here.
            </p>
            <Button type="button" className="mt-4" onClick={() => onNavigate('new-prescription')}>
              <FilePlus className="size-4" />
              Create your first prescription
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {recent.map((rx, index) => (
              <li
                key={rx.id}
                style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                className="animate-in fade-in-0 slide-in-from-bottom-1 fill-mode-both flex items-center gap-4 px-5 py-3 duration-300 ease-out motion-reduce:animate-none"
              >
                <div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">
                  {rx.patientName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{rx.patientName}</p>
                  <p className="text-muted-foreground truncate text-sm">
                    {rx.provisionalDiagnosis || rx.chiefComplaint || '—'}
                  </p>
                </div>
                <time className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatRecordDate(rx.createdAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
