import { useEffect, useState } from 'react'
import { LayoutDashboard, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Patients } from '@/pages/Patients'

interface Stats {
  totalPatients: number
  todaysPrescriptions: number
}

type View = 'dashboard' | 'patients'

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
    </div>
  )
}

const NAV: { id: View; label: string; icon: typeof Users }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', icon: Users }
]

function App(): React.JSX.Element {
  const [view, setView] = useState<View>('dashboard')

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

      <main className="flex-1 overflow-auto p-8">
        {view === 'dashboard' ? <Dashboard /> : <Patients />}
      </main>
    </div>
  )
}

export default App
