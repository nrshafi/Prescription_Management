import { Copy, Eye, FileDown, FileText, Pencil, Printer, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PrescriptionListItem } from '../../../shared/prescription'

interface PrescriptionsProps {
  onEdit: (id: number) => void
  onNew: () => void
}

export function Prescriptions({ onEdit, onNew }: PrescriptionsProps): React.JSX.Element {
  const [rows, setRows] = useState<PrescriptionListItem[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await window.api.prescriptions.list(search))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load prescriptions.')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 200)
    return () => clearTimeout(t)
  }, [load])

  async function runPrintAction(id: number, action: 'preview' | 'print' | 'pdf'): Promise<void> {
    setStatus(null)
    try {
      if (action === 'preview') {
        await window.api.printing.preview(id)
        setStatus(`Opened preview for Pres_ID ${id}.`)
        return
      }
      if (action === 'print') {
        const result = await window.api.printing.print(id)
        if (!result.ok) {
          setError(result.message ?? 'Print failed.')
          if (result.fallbackPreview) {
            setStatus('Opened print preview — use Ctrl+P to print from there, or export PDF.')
          }
          return
        }
        setStatus(`Sent Pres_ID ${id} to printer.`)
        return
      }
      const result = await window.api.printing.pdf(id)
      setStatus(result.path ? `Exported PDF: ${result.path}` : 'PDF export cancelled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Print action failed.')
    }
  }

  async function duplicatePrescription(id: number): Promise<void> {
    const duplicated = await window.api.prescriptions.duplicate(id)
    setStatus(`Duplicated to Pres_ID ${duplicated.id}.`)
    await load()
    onEdit(duplicated.id)
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FileText className="text-muted-foreground size-8" />
          <div>
            <h2 className="text-lg font-semibold">Prescriptions</h2>
            <p className="text-muted-foreground text-sm">{rows.length} visits</p>
          </div>
        </div>
        <Button type="button" onClick={onNew}>
          New Prescription
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient, ID, phone..."
          className="pl-9"
        />
      </div>

      {status && <p className="text-muted-foreground text-sm">{status}</p>}
      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b text-left">
              <th className="px-4 py-3 font-medium">Patient</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Diagnosis</th>
              <th className="px-4 py-3 font-medium">Visit</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground px-4 py-10 text-center">
                  No prescriptions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/30 border-b last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex size-8 items-center justify-center rounded-full text-xs font-medium">
                        {row.patientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{row.patientName}</p>
                        <p className="text-muted-foreground text-xs">{row.patientCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground px-4 py-3">
                    {new Date(row.createdAt).toLocaleDateString()}
                  </td>
                  <td
                    className="max-w-[12rem] truncate px-4 py-3"
                    title={row.probationalDiagnosis ?? ''}
                  >
                    {row.probationalDiagnosis || '—'}
                  </td>
                  <td className="px-4 py-3">{row.visitNo}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Edit"
                        onClick={() => onEdit(row.id)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Preview"
                        onClick={() => runPrintAction(row.id, 'preview')}
                      >
                        <Eye className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="PDF"
                        onClick={() => runPrintAction(row.id, 'pdf')}
                      >
                        <FileDown className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Print"
                        onClick={() => runPrintAction(row.id, 'print')}
                      >
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Duplicate"
                        onClick={() => duplicatePrescription(row.id)}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
