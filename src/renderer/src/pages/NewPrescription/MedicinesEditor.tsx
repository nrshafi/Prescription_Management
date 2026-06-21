import type { MedicineSuggestion } from '@shared/prescription'
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react'
import { memo, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { MedicineAddHandler, MedicineRow, MedSearchOption } from './types'

const DOSAGE_OPTIONS = ['1+0+1', '1+1+1', '0+0+1', '1+0+0', '0+1+0', '1+1+0', '0+0+2', '1+1+2']
const INSTRUCTION_OPTIONS = [
  'After Meal',
  'Before Meal',
  'Night Only',
  'Morning Only',
  'Empty Stomach',
  'With Water',
  'As Directed'
]
const DURATION_OPTIONS = [
  '1 Day',
  '3 Days',
  '5 Days',
  '7 Days',
  '10 Days',
  '15 Days',
  '1 Month',
  '2 Months',
  '3 Months',
  'Ongoing'
]

const MED_SEARCH_LISTBOX_ID = 'med-search-listbox'

function EditableSelectCell({
  value,
  options,
  onChange,
  placeholder,
  listId,
  ariaLabel,
  id
}: {
  value: string
  options: string[]
  onChange: (val: string) => void
  placeholder: string
  listId: string
  ariaLabel: string
  id?: string
}): React.JSX.Element {
  return (
    <div className="relative print:contents">
      <input
        id={id}
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="border-input bg-muted text-foreground focus-visible:ring-ring/50 focus-visible:border-ring print:border-0 print:bg-transparent rounded border py-0.5 pr-4 pl-2 text-xs focus-visible:ring-[3px] focus-visible:outline-none print:p-0"
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </div>
  )
}

const MedRow = memo(function MedRow({
  med,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown
}: {
  med: MedicineRow
  index: number
  total: number
  onChange: (key: string, field: keyof MedicineRow, val: string) => void
  onRemove: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
}): React.JSX.Element {
  return (
    <div className="group flex items-start gap-2 border-b py-2 last:border-0">
      <span className="text-muted-foreground w-5 shrink-0 pt-1.5 text-sm print:block">
        {index + 1}.
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-sm font-medium">{med.medicineName}</div>
        <div className="flex flex-wrap items-center gap-1.5">
          <EditableSelectCell
            value={med.dosage}
            options={DOSAGE_OPTIONS}
            onChange={(v) => onChange(med.key, 'dosage', v)}
            placeholder="Dosage"
            listId={`dosage-options-${med.key}`}
            ariaLabel={`Dosage for ${med.medicineName}`}
          />
          <EditableSelectCell
            value={med.frequency}
            options={INSTRUCTION_OPTIONS}
            onChange={(v) => onChange(med.key, 'frequency', v)}
            placeholder="Instruction"
            listId={`frequency-options-${med.key}`}
            ariaLabel={`Instruction for ${med.medicineName}`}
          />
          <EditableSelectCell
            value={med.duration}
            options={DURATION_OPTIONS}
            onChange={(v) => onChange(med.key, 'duration', v)}
            placeholder="Duration"
            listId={`duration-options-${med.key}`}
            ariaLabel={`Duration for ${med.medicineName}`}
          />
        </div>
        <input
          type="text"
          value={med.notes}
          onChange={(e) => onChange(med.key, 'notes', e.target.value)}
          placeholder="Notes (optional)"
          className="border-input bg-muted text-foreground focus:ring-ring/50 focus:border-ring mt-1.5 w-full rounded border px-2 py-0.5 text-xs focus:ring-[3px] focus:outline-none print:hidden"
        />
      </div>
      <div className="flex shrink-0 items-center gap-0.5 pt-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 print:hidden motion-reduce:transition-none">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={index === 0}
          onClick={() => onMoveUp(med.key)}
          aria-label="Move up"
        >
          <ArrowUp className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={index === total - 1}
          onClick={() => onMoveDown(med.key)}
          aria-label="Move down"
        >
          <ArrowDown className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-destructive size-7"
          onClick={() => onRemove(med.key)}
          aria-label="Remove medicine"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  )
})

function MedSearch({
  presets,
  onAdd
}: {
  presets: string[]
  onAdd: MedicineAddHandler
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<MedicineSuggestion[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const ref = useRef<HTMLDivElement>(null)
  const inputWrapperRef = useRef<HTMLDivElement>(null)
  const filtered = presets.filter((p) => p.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    const h = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([])
      return
    }
    const t = setTimeout(() => {
      api.prescriptions
        .medicineSuggestions(query)
        .then((rows) => setSuggestions(rows))
        .catch(() => setSuggestions([]))
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  const handleAdd = (
    name: string,
    defaults?: { dosage?: string; frequency?: string; duration?: string; notes?: string }
  ): void => {
    onAdd(name, defaults)
    setQuery('')
    setIsOpen(false)
    setSuggestions([])
    setHighlightedIndex(0)
  }

  const suggestionNames = new Set(suggestions.map((s) => s.medicineName.toLowerCase()))
  const mergedPresets = filtered.filter((p) => !suggestionNames.has(p.toLowerCase()))
  const trimmedQuery = query.trim()
  const showAddCustom =
    trimmedQuery.length > 0 &&
    !suggestions.find((s) => s.medicineName.toLowerCase() === trimmedQuery.toLowerCase()) &&
    !mergedPresets.find((p) => p.toLowerCase() === trimmedQuery.toLowerCase())

  const options: MedSearchOption[] = [
    ...suggestions.map((s) => ({
      type: 'suggestion' as const,
      name: s.medicineName,
      suggestion: s
    })),
    ...mergedPresets.map((p) => ({ type: 'preset' as const, name: p })),
    ...(showAddCustom ? [{ type: 'add' as const, name: trimmedQuery }] : [])
  ]

  useLayoutEffect(() => {
    if (!isOpen || options.length === 0 || !inputWrapperRef.current) return
    const update = (): void => {
      const el = inputWrapperRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      })
    }
    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [isOpen, options.length])

  const selectOption = (opt: MedSearchOption): void => {
    if (opt.type === 'suggestion') {
      const s = opt.suggestion
      handleAdd(s.medicineName, {
        dosage: s.dosage ?? undefined,
        frequency: s.frequency ?? undefined,
        duration: s.duration ?? undefined,
        notes: s.notes ?? undefined
      })
    } else {
      handleAdd(opt.name)
    }
  }

  return (
    <div ref={ref} className="relative print:hidden">
      <div className="relative" ref={inputWrapperRef}>
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          role="combobox"
          aria-expanded={isOpen && options.length > 0}
          aria-autocomplete="list"
          aria-controls={MED_SEARCH_LISTBOX_ID}
          aria-activedescendant={
            isOpen && options.length > 0 ? `med-option-${highlightedIndex}` : undefined
          }
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightedIndex(0)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (options.length > 0) {
                setHighlightedIndex((i) => (i + 1) % options.length)
              }
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              if (options.length > 0) {
                setHighlightedIndex((i) => (i - 1 + options.length) % options.length)
              }
            } else if (e.key === 'Home') {
              e.preventDefault()
              if (options.length > 0) setHighlightedIndex(0)
            } else if (e.key === 'End') {
              e.preventDefault()
              if (options.length > 0) setHighlightedIndex(options.length - 1)
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (options.length > 0 && options[highlightedIndex]) {
                selectOption(options[highlightedIndex])
              } else if (trimmedQuery) {
                handleAdd(trimmedQuery)
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false)
            }
          }}
          placeholder="Search medicine to add..."
          className="border-input bg-background focus-visible:ring-ring/50 focus-visible:border-ring w-full rounded-lg border py-1.5 pr-3 pl-8 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
        />
      </div>
      {isOpen && options.length > 0 && (
        <div
          id={MED_SEARCH_LISTBOX_ID}
          role="listbox"
          tabIndex={0}
          style={dropdownStyle}
          className="bg-popover z-50 max-h-56 overflow-y-auto rounded-lg border shadow-lg"
        >
          {options.map((opt, i) => {
            const isHighlighted = i === highlightedIndex
            if (opt.type === 'suggestion') {
              const s = opt.suggestion
              return (
                <button
                  key={`s-${s.medicineName}`}
                  id={`med-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectOption(opt)}
                  className={`hover:bg-accent w-full px-3 py-2 text-left text-sm ${isHighlighted ? 'bg-accent' : ''}`}
                >
                  <div className="font-medium">{s.medicineName}</div>
                  <div className="text-muted-foreground flex gap-2 text-xs">
                    {s.dosage && <span>{s.dosage}</span>}
                    {s.frequency && <span>{s.frequency}</span>}
                    {s.duration && <span>{s.duration}</span>}
                    <span className="ml-auto">Used {s.useCount}x</span>
                  </div>
                </button>
              )
            }
            if (opt.type === 'preset') {
              return (
                <button
                  key={`p-${opt.name}`}
                  id={`med-option-${i}`}
                  type="button"
                  role="option"
                  aria-selected={isHighlighted}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => selectOption(opt)}
                  className={`hover:bg-accent w-full px-3 py-2 text-left text-sm ${isHighlighted ? 'bg-accent' : ''}`}
                >
                  {opt.name}
                </button>
              )
            }
            return (
              <button
                key={`a-${opt.name}`}
                id={`med-option-${i}`}
                type="button"
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => selectOption(opt)}
                className={`text-primary hover:bg-accent flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm ${isHighlighted ? 'bg-accent' : ''}`}
              >
                <Plus className="size-4" />
                Add &ldquo;{opt.name}&rdquo;
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export interface MedicinesEditorProps {
  medicines: MedicineRow[]
  presets: string[]
  onChange: (key: string, field: keyof MedicineRow, val: string) => void
  onAdd: MedicineAddHandler
  onRemove: (key: string) => void
  onMoveUp: (key: string) => void
  onMoveDown: (key: string) => void
}

export function MedicinesEditor({
  medicines,
  presets,
  onChange,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown
}: MedicinesEditorProps): React.JSX.Element {
  return (
    <>
      {medicines.map((med, idx) => (
        <MedRow
          key={med.key}
          med={med}
          index={idx}
          total={medicines.length}
          onChange={onChange}
          onRemove={onRemove}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
      <div className="mt-3">
        <MedSearch presets={presets} onAdd={onAdd} />
      </div>
    </>
  )
}
