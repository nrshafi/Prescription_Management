import { FileDown, Printer, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { type AppPage, PAGE_TITLES } from '@/lib/navigation'

interface HeaderProps {
  currentPage: AppPage
  onSaveDraft?: () => void
  onExportPdf?: () => void
  onPrint?: () => void
  showPrescriptionActions: boolean
}

export function Header({
  currentPage,
  onSaveDraft,
  onExportPdf,
  onPrint,
  showPrescriptionActions
}: HeaderProps): React.JSX.Element {
  return (
    <header className="bg-card print:hidden flex h-16 shrink-0 items-center justify-between border-b px-6">
      <h1 className="text-xl font-semibold">{PAGE_TITLES[currentPage]}</h1>
      {showPrescriptionActions && (
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onSaveDraft}>
            <Save className="size-4" />
            Save Draft
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onExportPdf}>
            <FileDown className="size-4" />
            Export PDF
          </Button>
          <Button type="button" size="sm" onClick={onPrint}>
            <Printer className="size-4" />
            Print Prescription
          </Button>
        </div>
      )}
    </header>
  )
}
