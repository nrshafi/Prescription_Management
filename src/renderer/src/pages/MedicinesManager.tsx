import { Pencil, Pill, Plus, Save, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import type { PresetFormValues, PresetRecord } from '../../../shared/prescription'

export function MedicinesManager(): React.JSX.Element {
  const [rows, setRows] = useState<PresetRecord[]>([])
  const [search, setSearch] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await api.presets.list('Medicine'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load medicines.')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) => r.title.toLowerCase().includes(q) || (r.content ?? '').toLowerCase().includes(q)
    )
  }, [rows, search])

  async function addMedicine(): Promise<void> {
    const title = newTitle.trim()
    if (!title) return
    const input: PresetFormValues = { category: 'Medicine', title, content: title }
    await api.presets.create(input)
    setNewTitle('')
    await load()
  }

  async function saveEdit(id: number): Promise<void> {
    const title = editTitle.trim()
    if (!title) return
    const row = rows.find((r) => r.id === id)
    if (!row) return
    await api.presets.update(id, { category: 'Medicine', title, content: title })
    setEditingId(null)
    await load()
  }

  async function remove(id: number): Promise<void> {
    await api.presets.delete(id)
    if (editingId === id) setEditingId(null)
    await load()
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
          <Pill className="text-foreground size-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Medicines</h2>
          <p className="text-muted-foreground text-sm">{rows.length} medicine presets</p>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search medicines..."
          className="mb-4"
        />
        {error && <p className="text-destructive mb-2 text-sm">{error}</p>}
        <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
          {filtered.map((row) => (
            <li
              key={row.id}
              className="group hover:bg-muted/50 flex items-center gap-2 rounded-lg px-2 py-2"
            >
              <Pill className="text-muted-foreground size-4 shrink-0" />
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
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add new medicine..."
            onKeyDown={(e) => e.key === 'Enter' && addMedicine()}
          />
          <Button type="button" onClick={addMedicine}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  )
}
