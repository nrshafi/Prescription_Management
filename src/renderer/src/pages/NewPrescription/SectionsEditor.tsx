import { Plus, Trash2 } from 'lucide-react'
import { SearchMultiSelect } from '@/components/SearchMultiSelect'
import { Button } from '@/components/ui/button'
import { createOeCustomEntry, type PrescriptionUiState } from '@/lib/prescription-mapping'

export function SectionCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function BulletSection({
  title,
  items,
  empty,
  className = ''
}: {
  title: string
  items: string[]
  empty?: string
  className?: string
}): React.JSX.Element | null {
  if (!items.length && !empty) return null
  return (
    <div className={className}>
      {title && (
        <p className="text-muted-foreground mb-1.5 text-xs font-bold tracking-wider uppercase">
          {title}
        </p>
      )}
      {items.length > 0 ? (
        <ul className="space-y-0.5">
          {items.map((c) => (
            <li key={c} className="flex items-start gap-1.5">
              <span className="text-muted-foreground mt-0.5">•</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      ) : (
        empty && <p className="text-muted-foreground text-xs italic">{empty}</p>
      )}
    </div>
  )
}

export interface SectionsEditorProps {
  ui: PrescriptionUiState
  complaintItems: string[]
  investigationItems: string[]
  diagnosisItems: string[]
  onPatchUi: (patch: Partial<PrescriptionUiState>) => void
}

export function SectionsEditor({
  ui,
  complaintItems,
  investigationItems,
  diagnosisItems,
  onPatchUi
}: SectionsEditorProps): React.JSX.Element {
  return (
    <>
      <SectionCard title="Chief Complaints (C/C)">
        <SearchMultiSelect
          items={complaintItems}
          selected={ui.chiefComplaints}
          onChange={(chiefComplaints) => onPatchUi({ chiefComplaints })}
          placeholder="Search complaints..."
        />
      </SectionCard>
      <SectionCard title="O/E (Examination)">
        <div className="grid grid-cols-2 gap-3">
          {(['bp', 'pulse', 'temp', 'rr'] as const).map((field) => {
            const labels = {
              bp: 'BP (mmHg)',
              pulse: 'Pulse (/min)',
              temp: 'Temp (°F)',
              rr: 'R/R (/min)'
            }
            const placeholders = { bp: '120/80', pulse: '80', temp: '98.6', rr: '18' }
            return (
              <div key={field}>
                <label
                  htmlFor={`rx-oe-${field}`}
                  className="text-muted-foreground mb-1 block text-xs"
                >
                  {labels[field]}
                </label>
                <input
                  id={`rx-oe-${field}`}
                  type="text"
                  value={ui.oe[field]}
                  onChange={(e) => onPatchUi({ oe: { ...ui.oe, [field]: e.target.value } })}
                  placeholder={placeholders[field]}
                  className="border-input bg-background w-full rounded-lg border px-3 py-2 text-sm"
                />
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Custom O/E</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                onPatchUi({
                  oe: { ...ui.oe, custom: [...ui.oe.custom, createOeCustomEntry()] }
                })
              }
            >
              <Plus className="size-3.5" /> Add row
            </Button>
          </div>
          {ui.oe.custom.map((row, index) => (
            <div key={row.id} className="flex items-center gap-2">
              <input
                type="text"
                value={row.label}
                onChange={(e) => {
                  const custom = ui.oe.custom.map((item) =>
                    item.id === row.id ? { ...item, label: e.target.value } : item
                  )
                  onPatchUi({ oe: { ...ui.oe, custom } })
                }}
                placeholder="Label"
                aria-label={`Custom O/E label ${index + 1}`}
                className="border-input bg-background w-1/3 rounded-lg border px-3 py-2 text-sm"
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => {
                  const custom = ui.oe.custom.map((item) =>
                    item.id === row.id ? { ...item, value: e.target.value } : item
                  )
                  onPatchUi({ oe: { ...ui.oe, custom } })
                }}
                placeholder="Value"
                aria-label={`Custom O/E value ${index + 1}`}
                className="border-input bg-background min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                onClick={() => {
                  const custom = ui.oe.custom.filter((item) => item.id !== row.id)
                  onPatchUi({ oe: { ...ui.oe, custom } })
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Investigation">
        <SearchMultiSelect
          items={investigationItems}
          selected={ui.investigations}
          onChange={(investigations) => onPatchUi({ investigations })}
          placeholder="Search investigations..."
        />
      </SectionCard>
      <SectionCard title="Provisional Diagnosis (Dx)">
        <SearchMultiSelect
          items={diagnosisItems}
          selected={ui.diagnoses}
          onChange={(diagnoses) => onPatchUi({ diagnoses })}
          placeholder="Search diagnoses..."
        />
      </SectionCard>
    </>
  )
}
