import { useCallback, useEffect, useRef, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import type { AppPage } from '@/lib/navigation'
import { Dashboard } from '@/pages/Dashboard'
import { MedicinesManager } from '@/pages/MedicinesManager'
import { NewPrescription, type PrescriptionPageActions } from '@/pages/NewPrescription'
import { Prescriptions } from '@/pages/Prescriptions'
import { PresetsManager } from '@/pages/PresetsManager'
import { PrintRenderer } from '@/pages/PrintRenderer'
import { Settings } from '@/pages/Settings'
import type { PatientListItem } from '../../shared/patient'

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  )
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches)
    mql.addEventListener('change', onChange)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', onChange)
  }, [query])
  return matches
}

function App(): React.JSX.Element {
  const [page, setPage] = useState<AppPage>('new-prescription')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rxEditId, setRxEditId] = useState<number | null>(null)
  const [rxSeedPatient, setRxSeedPatient] = useState<PatientListItem | null>(null)
  const [rxStatus, setRxStatus] = useState<string | null>(null)
  const rxActionsRef = useRef<PrescriptionPageActions | null>(null)

  const isMdUp = useMediaQuery('(min-width: 768px)')
  const effectiveCollapsed = !isMdUp || sidebarCollapsed

  const printPrescriptionId = new URLSearchParams(window.location.search).get('printPrescriptionId')

  useEffect(() => {
    const theme = localStorage.getItem('theme') ?? 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark' || (theme === 'system' && prefersDark)
    )
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      if (e.key === 's') {
        e.preventDefault()
        rxActionsRef.current?.savePrescription()
      } else if (e.key === 'p') {
        e.preventDefault()
        rxActionsRef.current?.print()
      } else if (e.key === 'e' && e.shiftKey) {
        e.preventDefault()
        rxActionsRef.current?.exportPdf()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const bindRxActions = useCallback((actions: PrescriptionPageActions | null) => {
    rxActionsRef.current = actions
  }, [])

  const openEditPrescription = useCallback((id: number) => {
    setRxSeedPatient(null)
    setRxStatus(null)
    setRxEditId(id)
    setPage('new-prescription')
  }, [])

  if (printPrescriptionId) {
    const prescriptionId = Number(printPrescriptionId)
    return (
      <PrintRenderer prescriptionId={Number.isFinite(prescriptionId) ? prescriptionId : null} />
    )
  }

  function renderPage(): React.JSX.Element {
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={setPage} />
      case 'new-prescription':
        return (
          <NewPrescription
            editId={rxEditId}
            seedPatient={rxSeedPatient}
            onEditIdChange={setRxEditId}
            onBindActions={bindRxActions}
            onStatus={setRxStatus}
          />
        )
      case 'prescriptions':
        return (
          <Prescriptions
            onEdit={openEditPrescription}
            onNew={() => {
              setRxSeedPatient(null)
              setRxStatus(null)
              setRxEditId(null)
              setPage('new-prescription')
            }}
            onNewForPatient={(patient) => {
              setRxSeedPatient(patient)
              setRxStatus(null)
              setRxEditId(null)
              setPage('new-prescription')
            }}
          />
        )
      case 'presets':
        return <PresetsManager />
      case 'medicines':
        return <MedicinesManager />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={setPage} />
    }
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground focus:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <Sidebar
        currentPage={page}
        onNavigate={(p) => {
          setRxSeedPatient(null)
          setRxStatus(null)
          setRxEditId(null)
          setPage(p)
        }}
        collapsed={effectiveCollapsed}
        onToggle={() => {
          if (!isMdUp) return
          setSidebarCollapsed((v) => !v)
        }}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          currentPage={page}
          showPrescriptionActions={page === 'new-prescription'}
          onSavePrescription={() => rxActionsRef.current?.savePrescription()}
          onExportPdf={() => rxActionsRef.current?.exportPdf()}
          onPrint={() => rxActionsRef.current?.print()}
        />
        {rxStatus && page === 'new-prescription' && (
          <p className="text-muted-foreground border-b px-6 py-1 text-xs">{rxStatus}</p>
        )}
        <main id="main-content" tabIndex={-1} className="min-h-0 flex-1 overflow-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  )
}

export default App
