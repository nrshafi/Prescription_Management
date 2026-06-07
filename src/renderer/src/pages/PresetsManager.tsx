import { Pencil, Plus, Save, Search, Sliders, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  PRESET_CATEGORIES,
  type PresetCategory,
  type PresetFormValues,
  type PresetRecord
} from '../../../shared/prescription'

const TAB_CATEGORIES: PresetCategory[] = [
  'Chief Complaint',
  'Probational Diagnosis',
  'Investigations',
  'Advice'
]

const TAB_COLORS: Record<string, string> = {
  'Chief Complaint': 'border-orange-400',
  'Probational Diagnosis': 'border-green-500',
  Investigations: 'border-purple-400',
  Advice: 'border-blue-500'
}

export function PresetsManager(): React.JSX.Element {
  const [rows, setRows] = useState<PresetRecord[]>([])
  const [tab, setTab] = useState<PresetCategory>('Chief Complaint')
  const [search, setSearch] = useState('')
  const [addVal, setAddVal] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await window.api.presets.list())
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
      (r) => r.title.toLowerCase().includes(q) || (r.content ?? '').toLowerCase().includes(q)
    )
  }, [categoryRows, search])

  async function addPreset(): Promise<void> {
    const title = addVal.trim()
    if (!title) return
    const input: PresetFormValues = { category: tab, title, content: title }
    await window.api.presets.create(input)
    setAddVal('')
    await load()
  }

  async function saveEdit(id: number): Promise<void> {
    const title = editTitle.trim()
    if (!title) return
    await window.api.presets.update(id, { category: tab, title, content: title })
    setEditingId(null)
    await load()
  }

  async function remove(id: number): Promise<void> {
    await window.api.presets.delete(id)
    if (editingId === id) setEditingId(null)
    await load()
  }

  return (
    <div className="space-y-4 p-6">
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

          <ul className="mb-4 max-h-80 space-y-1 overflow-y-auto">
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
                        <Save className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{row.title}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-8 opacity-0 group-hover:opacity-100"
                        onClick={() => {
                          setEditingId(row.id)
                          setEditTitle(row.title)
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive size-8 opacity-0 group-hover:opacity-100"
                        onClick={() => remove(row.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </li>
              ))
            )}
          </ul>

          <div className="flex gap-2">
            <Input
              value={addVal}
              onChange={(e) => setAddVal(e.target.value)}
              placeholder={`Add ${tab} preset...`}
              onKeyDown={(e) => e.key === 'Enter' && addPreset()}
            />
            <Button type="button" onClick={addPreset}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        Medicine presets are managed on the Medicines page. Categories:{' '}
        {PRESET_CATEGORIES.join(', ')}.
      </p>
    </div>
  )
}
