import { Pencil, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  PRESET_CATEGORIES,
  type PresetCategory,
  type PresetFormValues,
  type PresetRecord
} from '../../../shared/prescription'

const initialForm: PresetFormValues = {
  category: 'Medicine',
  title: '',
  content: ''
}

export function PresetsManager(): React.JSX.Element {
  const [rows, setRows] = useState<PresetRecord[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<PresetFormValues>(initialForm)
  const [status, setStatus] = useState<string | null>(null)
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

  function startCreate(): void {
    setEditingId(null)
    setForm(initialForm)
    setStatus(null)
    setError(null)
  }

  function startEdit(row: PresetRecord): void {
    setEditingId(row.id)
    setForm({ category: row.category, title: row.title, content: row.content ?? '' })
    setStatus(null)
    setError(null)
  }

  async function save(): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      if (editingId) {
        await window.api.presets.update(editingId, form)
        setStatus('Preset updated.')
      } else {
        await window.api.presets.create(form)
        setStatus('Preset added.')
      }
      setEditingId(null)
      setForm(initialForm)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save preset.')
    }
  }

  async function remove(id: number): Promise<void> {
    setError(null)
    setStatus(null)
    try {
      await window.api.presets.delete(id)
      if (editingId === id) startCreate()
      setStatus('Preset deleted.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete preset.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Presets Manager</h1>
          <p className="text-muted-foreground text-sm">Maintain reusable Rx, advice, investigation, and diagnosis text.</p>
        </div>
        <Button variant="outline" onClick={startCreate}>
          <Plus className="size-4" /> New Preset
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[24rem_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? `Edit preset #${editingId}` : 'Add preset'}</CardTitle>
            <CardDescription>Presets appear in the prescription insert menu.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) => setForm((current) => ({ ...current, category: value as PresetCategory }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Content</Label>
              <Textarea
                value={form.content ?? ''}
                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                rows={7}
                placeholder="Leave empty to insert the title."
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            {status && <p className="text-muted-foreground text-sm">{status}</p>}
            <Button onClick={save} className="w-full">
              <Save className="size-4" /> {editingId ? 'Save Changes' : 'Add Preset'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preset Library</CardTitle>
            <CardDescription>{rows.length} saved presets across 4 categories.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                        No presets yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.category}</TableCell>
                        <TableCell className="font-medium">{row.title}</TableCell>
                        <TableCell className="max-w-md truncate" title={row.content ?? ''}>
                          {row.content || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" aria-label="Edit preset" onClick={() => startEdit(row)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Delete preset" onClick={() => remove(row.id)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
