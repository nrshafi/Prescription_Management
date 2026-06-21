import type { PresetRecord } from '@shared/prescription'
import { Button } from '@/components/ui/button'
import { SectionCard } from './SectionsEditor'
import type { ApplicableBundle } from './types'

export interface PresetBundlesProps {
  bundles: ApplicableBundle[]
  onApplyBundle: (bundle: PresetRecord) => void
  onApplyAll: () => void
}

export function PresetBundles({
  bundles,
  onApplyBundle,
  onApplyAll
}: PresetBundlesProps): React.JSX.Element | null {
  if (bundles.length === 0) return null
  return (
    <SectionCard title="Linked Presets">
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground text-xs">
          Apply linked medicines, investigations, advice, or diagnoses when needed.
        </div>
        {bundles.map(({ key, label, bundle }) => (
          <div
            key={key}
            className="border-border bg-muted/30 flex items-center gap-2 rounded-lg border p-2"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{label}</div>
              {bundle.title !== label && (
                <div className="text-muted-foreground truncate text-xs">{bundle.title}</div>
              )}
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onApplyBundle(bundle)}>
              Apply
            </Button>
          </div>
        ))}
        {bundles.length > 1 && (
          <Button type="button" size="sm" onClick={onApplyAll}>
            Apply all
          </Button>
        )}
      </div>
    </SectionCard>
  )
}
