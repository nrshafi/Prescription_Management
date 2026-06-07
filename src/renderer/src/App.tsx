import { FileText, LayoutDashboard, SettingsIcon, Sparkles, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Patients } from '@/pages/Patients'
import { PrintRenderer } from '@/pages/PrintRenderer'
import { Prescriptions } from '@/pages/Prescriptions'
import { PresetsManager } from '@/pages/PresetsManager'
import { Settings } from '@/pages/Settings'
import type { PatientListItem } from '../../shared/patient'

interface Stats {
  totalPatients: number
  todaysPrescriptions: number
  recentPatients: PatientListItem[]
}

type View = 'dashboard' | 'patients' | 'prescriptions' | 'presets' | 'settings'

function Dashboard(): React.JSX.Element {
  const [dbPath, setDbPath] = useState<string>('')
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    window.api.health().then((res) => setDbPath(res.dbPath))
    window.api.dashboard.stats().then(setStats)
  }, [])

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-sm">Overview of your practice.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total Patients</CardDescription>
            <CardTitle className="text-4xl">{stats?.totalPatients ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Today&apos;s Prescriptions</CardDescription>
            <CardTitle className="text-4xl">{stats?.todaysPrescriptions ?? '—'}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>IPC + Database</CardTitle>
            <CardDescription className="break-all">{dbPath || 'connecting…'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.api.dashboard.stats().then(setStats)}>Refresh</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Patients</CardTitle>
          <CardDescription>Latest registrations available for quick follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {(stats?.recentPatients ?? []).map((patient) => (
              <div key={patient.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{patient.name}</p>
                    <p className="text-muted-foreground text-xs">{patient.patientCode}</p>
                  </div>
                  <Badge variant="outline">{patient.visitCount} visits</Badge>
                </div>
                <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">
                  {patient.lastComplaint || patient.lastDiagnosis || 'No visits recorded yet.'}
                </p>
              </div>
            ))}
            {stats && stats.recentPatients.length === 0 && (
              <p className="text-muted-foreground text-sm">No patients yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

const NAV: { id: View; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'presets', label: 'Presets', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: SettingsIcon }
]

function renderView(view: View): React.JSX.Element {
  if (view === 'patients') return <Patients />
  if (view === 'prescriptions') return <Prescriptions />
  if (view === 'presets') return <PresetsManager />
  if (view === 'settings') return <Settings />
  return <Dashboard />
}

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')
  const printPrescriptionId = new URLSearchParams(window.location.search).get('printPrescriptionId')

  useEffect(() => {
    const theme = localStorage.getItem('theme') ?? 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle('dark', theme === 'dark' || (theme === 'system' && prefersDark))
  }, [])

  if (window.location.pathname === '/print' || printPrescriptionId) {
    const id = new URLSearchParams(window.location.search).get('id') ?? printPrescriptionId
    const prescriptionId = id ? Number(id) : Number.NaN
    return <PrintRenderer prescriptionId={Number.isFinite(prescriptionId) ? prescriptionId : null} />
  }

  return (
    <div className="bg-background flex min-h-screen">
      <aside className="bg-card w-56 shrink-0 border-r p-3">
        <div className="mb-4 px-2">
          <h2 className="text-sm font-semibold">Prescription Mgmt</h2>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                view === id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto p-8">{renderView(view)}</main>
    </div>
  )
}

export default App
