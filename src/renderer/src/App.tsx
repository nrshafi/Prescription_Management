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

function App(): React.JSX.Element {
  const [page, setPage] = useState<AppPage>('new-prescription')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [rxEditId, setRxEditId] = useState<number | null>(null)
  const [rxStatus, setRxStatus] = useState<string | null>(null)
  const rxActionsRef = useRef<PrescriptionPageActions | null>(null)

  const printPrescriptionId = new URLSearchParams(window.location.search).get('printPrescriptionId')

  useEffect(() => {
    const theme = localStorage.getItem('theme') ?? 'system'
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.classList.toggle(
      'dark',
      theme === 'dark' || (theme === 'system' && prefersDark)
    )
  }, [])

  const bindRxActions = useCallback((actions: PrescriptionPageActions | null) => {
    rxActionsRef.current = actions
  }, [])

  const openEditPrescription = useCallback((id: number) => {
    setRxEditId(id)
    setPage('new-prescription')
  }, [])

  if (window.location.pathname === '/print' || printPrescriptionId) {
    const id = new URLSearchParams(window.location.search).get('id') ?? printPrescriptionId
    const prescriptionId = id ? Number(id) : Number.NaN
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
      <Sidebar
        currentPage={page}
        onNavigate={(p) => {
          if (p !== 'new-prescription') setRxEditId(null)
          setPage(p)
        }}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
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
        <main className="min-h-0 flex-1 overflow-auto">{renderPage()}</main>
      </div>
    </div>
  )
}

export default App
