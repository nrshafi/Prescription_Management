import { Link2, Pencil, Plus, Save, Search, Sliders, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  PRESET_BUNDLE_CATEGORIES,
  PRESET_CATEGORIES,
  type PresetCategory,
  type PresetFormValues,
  type PresetLinkFormValues,
  type PresetLinkKind,
  type PresetRecord
} from '../../../shared/prescription'

const TAB_CATEGORIES: PresetCategory[] = [
  'Chief Complaint',
  'Provisional Diagnosis',
  'Investigations',
  'Advice'
]

const TAB_COLORS: Record<string, string> = {
  'Chief Complaint': 'border-orange-400',
  'Provisional Diagnosis': 'border-green-500',
  Investigations: 'border-purple-400',
  Advice: 'border-blue-500'
}

const BUNDLE_CATEGORIES = new Set<string>(PRESET_BUNDLE_CATEGORIES)
const MEDICINE_DEFAULTS = { dosage: '1+1+1', frequency: 'After Meal', duration: '5 Days' }

function targetKindsFor(category: PresetCategory): PresetLinkKind[] {
  if (category === 'Chief Complaint') {
    return ['Provisional Diagnosis', 'Medicine', 'Investigations', 'Advice']
  }
  if (category === 'Provisional Diagnosis') return ['Medicine', 'Investigations', 'Advice']
  return []
}

function emptyLink(kind: PresetLinkKind, position: number): PresetLinkFormValues {
  return {
    targetKind: kind,
    targetPresetId: null,
    label: '',
    dosage: kind === 'Medicine' ? MEDICINE_DEFAULTS.dosage : '',
    frequency: kind === 'Medicine' ? MEDICINE_DEFAULTS.frequency : '',
    duration: kind === 'Medicine' ? MEDICINE_DEFAULTS.duration : '',
    position
  }
}

function toLinkInput(link: NonNullable<PresetRecord['links']>[number]): PresetLinkFormValues {
  return {
    targetKind: link.targetKind,
    targetPresetId: link.targetPresetId,
    label: link.label,
    dosage: link.dosage ?? '',
    frequency: link.frequency ?? '',
    duration: link.duration ?? '',
    position: link.position
  }
}

interface BundleEditorProps {
  open: boolean
  category: PresetCategory
  row: PresetRecord | null
  presets: PresetRecord[]
  onOpenChange: (open: boolean) => void
  onSave: (input: PresetFormValues, id?: number) => Promise<void>
}

function BundleEditor({
  open,
  category,
  row,
  presets,
  onOpenChange,
  onSave
}: BundleEditorProps): React.JSX.Element {
  const [title, setTitle] = useState('')
  const [links, setLinks] = useState<PresetLinkFormValues[]>([])
  const [saving, setSaving] = useState(false)
  const linkKeys = useRef<string[]>([])
  const nextKey = useRef(0)
  const targetKinds = targetKindsFor(category)

  useEffect(() => {
    if (!open) return
    setTitle(row?.title ?? '')
    setLinks((row?.links ?? []).map(toLinkInput))
    linkKeys.current = (row?.links ?? []).map(() => `lk-${++nextKey.current}`)
  }, [open, row])

  function updateLink(index: number, patch: Partial<PresetLinkFormValues>): void {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)))
  }

  function addLink(kind: PresetLinkKind): void {
    linkKeys.current = [...linkKeys.current, `lk-${++nextKey.current}`]
    setLinks((prev) => [...prev, emptyLink(kind, prev.length)])
  }

  function removeLink(index: number): void {
    linkKeys.current = linkKeys.current.filter((_, i) => i !== index)
    setLinks((prev) =>
      prev.filter((_, i) => i !== index).map((link, position) => ({ ...link, position }))
    )
  }

  async function save(): Promise<void> {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const cleanLinks = links
      .map((link, position) => ({ ...link, label: link.label.trim(), position }))
      .filter((link) => link.label)
    setSaving(true)
    try {
      await onSave(
        {
          category,
          title: trimmedTitle,
          content: trimmedTitle,
          links: cleanLinks
        },
        row?.id
      )
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{row ? 'Edit preset bundle' : 'Create preset bundle'}</DialogTitle>
          <DialogDescription>
            Selecting this {category} preset can append linked Rx, investigations, advice, and Dx
            items to a prescription.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="preset-bundle-title" className="text-sm font-medium">
              Preset title
            </label>
            <Input
              id="preset-bundle-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`e.g. ${category} preset`}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {targetKinds.map((kind) => (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addLink(kind)}
              >
                <Plus data-icon="inline-start" />
                Add {kind === 'Medicine' ? 'Rx' : kind}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {links.length === 0 ? (
              <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                No linked items yet. Add Rx, investigations, advice, or Dx to make this a bundle.
              </div>
            ) : (
              links.map((link, index) => {
                const options = presets.filter((preset) => preset.category === link.targetKind)
                return (
                  <div
                    key={linkKeys.current[index] ?? `lk-${index}`}
                    className="rounded-lg border p-3"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <Badge variant="secondary">
                        {link.targetKind === 'Medicine' ? 'Rx' : link.targetKind}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {link.targetPresetId ? 'Linked preset' : 'Snapshot/custom'}
                      </span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive ml-auto size-8"
                        onClick={() => removeLink(index)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                      <Select
                        value={link.targetPresetId != null ? String(link.targetPresetId) : '__custom'}
                        onValueChange={(val) => {
                          if (val === '__custom') {
                            updateLink(index, { targetPresetId: null, label: link.label })
                            return
                          }
                          const presetId = Number(val)
                          const selected = options.find((preset) => preset.id === presetId)
                          updateLink(index, {
                            targetPresetId: presetId,
                            label: selected?.title ?? link.label
                          })
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Custom / deleted preset" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__custom">Custom / deleted preset</SelectItem>
                          {options.map((preset) => (
                            <SelectItem key={preset.id} value={String(preset.id)}>
                              {preset.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={link.label}
                        onChange={(e) =>
                          updateLink(index, { label: e.target.value, targetPresetId: null })
                        }
                        placeholder="Snapshot text to apply"
                      />
                    </div>
                    {link.targetKind === 'Medicine' && (
                      <div className="mt-2 grid gap-2 md:grid-cols-3">
                        <Input
                          value={link.dosage ?? ''}
                          onChange={(e) => updateLink(index, { dosage: e.target.value })}
                          placeholder="Dosage"
                        />
                        <Input
                          value={link.frequency ?? ''}
                          onChange={(e) => updateLink(index, { frequency: e.target.value })}
                          placeholder="Frequency"
                        />
                        <Input
                          value={link.duration ?? ''}
                          onChange={(e) => updateLink(index, { duration: e.target.value })}
                          placeholder="Duration"
                        />
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving || !title.trim()}>
            <Save data-icon="inline-start" />
            Save bundle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function PresetsManager(): React.JSX.Element {
  const [rows, setRows] = useState<PresetRecord[]>([])
  const [tab, setTab] = useState<PresetCategory>('Chief Complaint')
  const [search, setSearch] = useState('')
  const [addVal, setAddVal] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [bundleRow, setBundleRow] = useState<PresetRecord | null>(null)
  const [bundleOpen, setBundleOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isBundleTab = BUNDLE_CATEGORIES.has(tab)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await api.presets.list())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load presets.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const categoryRows = useMemo(() => rows.filter((r) => r.category === tab), [rows, tab])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categoryRows
    return categoryRows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.content ?? '').toLowerCase().includes(q) ||
        (r.links ?? []).some((link) => link.label.toLowerCase().includes(q))
    )
  }, [categoryRows, search])

  function openBundle(row: PresetRecord | null): void {
    setBundleRow(row)
    setBundleOpen(true)
    setEditingId(null)
  }

  async function saveBundle(input: PresetFormValues, id?: number): Promise<void> {
    if (id) await api.presets.update(id, input)
    else await api.presets.create(input)
    await load()
  }

  async function addPreset(): Promise<void> {
    if (isBundleTab) {
      openBundle(null)
      return
    }
    const title = addVal.trim()
    if (!title) return
    const input: PresetFormValues = { category: tab, title, content: title }
    await api.presets.create(input)
    setAddVal('')
    await load()
  }

  async function saveEdit(id: number): Promise<void> {
    const title = editTitle.trim()
    if (!title) return
    await api.presets.update(id, { category: tab, title, content: title })
    setEditingId(null)
    await load()
  }

  async function remove(id: number): Promise<void> {
    await api.presets.delete(id)
    if (editingId === id) setEditingId(null)
    await load()
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-3">
        <Sliders className="text-muted-foreground size-8" />
        <div>
          <h2 className="text-lg font-semibold">Presets</h2>
          <p className="text-muted-foreground text-sm">Reusable clinical text for prescriptions</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap gap-1 border-b px-4 pt-3">
          {TAB_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setTab(cat)
                setSearch('')
                setEditingId(null)
              }}
              className={cn(
                'border-b-2 px-4 pb-2 text-sm font-medium transition-colors',
                tab === cat
                  ? `${TAB_COLORS[cat]} text-foreground`
                  : 'text-muted-foreground hover:text-foreground border-transparent'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="mb-4 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search presets..."
                className="pl-9"
              />
            </div>
            <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs font-medium">
              {categoryRows.length} items
            </span>
          </div>

          {error && <p className="text-destructive mb-2 text-sm">{error}</p>}

          <ul className="mb-4 max-h-80 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="text-muted-foreground py-6 text-center text-sm">
                No presets in this category
              </li>
            ) : (
              filtered.map((row) => (
                <li
                  key={row.id}
                  className="group hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-2"
                >
                  {editingId === row.id ? (
                    <>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="h-8 flex-1"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(row.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => saveEdit(row.id)}
                      >
                        <Save />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm">{row.title}</span>
                          {BUNDLE_CATEGORIES.has(row.category) && (row.links ?? []).length > 0 && (
                            <Badge variant="outline" className="shrink-0">
                              <Link2 />
                              {(row.links ?? []).length} linked
                            </Badge>
                          )}
                        </div>
                        {BUNDLE_CATEGORIES.has(row.category) && (row.links ?? []).length > 0 && (
                          <p className="text-muted-foreground mt-1 truncate text-xs">
                            {(row.links ?? []).map((link) => link.label).join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          if (BUNDLE_CATEGORIES.has(row.category)) openBundle(row)
                          else {
                            setEditingId(row.id)
                            setEditTitle(row.title)
                          }
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive size-8 opacity-0 group-hover:opacity-100"
                        onClick={() => remove(row.id)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>

          {isBundleTab ? (
            <Button type="button" onClick={() => openBundle(null)}>
              <Plus data-icon="inline-start" />
              Add {tab} bundle
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                value={addVal}
                onChange={(e) => setAddVal(e.target.value)}
                placeholder={`Add ${tab} preset...`}
                onKeyDown={(e) => e.key === 'Enter' && addPreset()}
              />
              <Button type="button" onClick={addPreset}>
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </div>
          )}
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Medicine presets are managed on the Medicines page. C/C and Dx presets can link Rx,
        investigations, and advice. Categories: {PRESET_CATEGORIES.join(', ')}.
      </p>

      <BundleEditor
        open={bundleOpen}
        category={tab}
        row={bundleRow}
        presets={rows}
        onOpenChange={setBundleOpen}
        onSave={saveBundle}
      />
    </div>
  )
}
