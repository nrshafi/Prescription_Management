import { Check, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface SearchMultiSelectProps {
  items: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export function SearchMultiSelect({
  items,
  selected,
  onChange,
  placeholder = 'Search or add...',
  className = ''
}: SearchMultiSelectProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(
    () =>
      items.filter(
        (item) => item.toLowerCase().includes(query.toLowerCase()) && !selected.includes(item)
      ),
    [items, selected, query]
  )

  const toggle = (item: string): void => {
    if (selected.includes(item)) {
      onChange(selected.filter((s) => s !== item))
    } else {
      onChange([...selected, item])
      setQuery('')
    }
  }

  const addCustom = (): void => {
    const trimmed = query.trim()
    if (trimmed && !selected.includes(trimmed)) {
      onChange([...selected, trimmed])
      setQuery('')
    }
  }

  const removeItem = (item: string): void => {
    onChange(selected.filter((s) => s !== item))
  }

  const updatePosition = useCallback((): void => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      const target = e.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()
    const scrollContainer = containerRef.current?.closest('[class*="overflow"]')
    scrollContainer?.addEventListener('scroll', updatePosition, { passive: true })
    window.addEventListener('scroll', updatePosition, { passive: true })
    return () => {
      scrollContainer?.removeEventListener('scroll', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [isOpen, updatePosition])

  const showDropdown = isOpen && (filtered.length > 0 || query.trim().length > 0)
  const canAddCustom =
    query.trim().length > 0 && !items.includes(query.trim()) && !selected.includes(query.trim())

  type Option = { kind: 'item'; label: string } | { kind: 'add'; label: string }
  const options: Option[] = [
    ...filtered.map((item) => ({ kind: 'item' as const, label: item })),
    ...(canAddCustom ? [{ kind: 'add' as const, label: `Add "${query.trim()}"` }] : [])
  ]

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="bg-muted text-foreground border-border inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm"
            >
              {item}
              <button
                onClick={() => removeItem(item)}
                aria-label={`Remove ${item}`}
                className="rounded-full focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none"
                type="button"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightedIndex(0)
          }}
          onFocus={() => {
            setIsOpen(true)
            updatePosition()
          }}
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
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (options.length > 0) {
                const opt = options[highlightedIndex]
                if (opt.kind === 'item') toggle(opt.label)
                else addCustom()
              }
            } else if (e.key === 'Escape') {
              setIsOpen(false)
              inputRef.current?.blur()
            }
          }}
          placeholder={placeholder}
          className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus-visible:ring-[3px] focus-visible:outline-none"
        />
      </div>

      {showDropdown &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            role="listbox"
            tabIndex={0}
            aria-activedescendant={`sms-option-${highlightedIndex}`}
            className="bg-popover text-popover-foreground z-50 max-h-52 overflow-y-auto rounded-lg border shadow-md"
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width
            }}
          >
            {options.map((opt, i) => (
              <button
                key={opt.kind === 'item' ? opt.label : 'add'}
                id={`sms-option-${i}`}
                role="option"
                aria-selected={i === highlightedIndex}
                type="button"
                onMouseEnter={() => setHighlightedIndex(i)}
                onClick={() => (opt.kind === 'item' ? toggle(opt.label) : addCustom())}
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                  i === highlightedIndex && 'bg-accent',
                  opt.kind === 'add' && 'text-primary border-t'
                )}
              >
                {opt.kind === 'item' ? (
                  <Check className="size-4 text-transparent" />
                ) : (
                  <Plus className="size-4" />
                )}
                {opt.kind === 'item' ? opt.label : `Add "${query.trim()}"`}
              </button>
            ))}
            {filtered.length === 0 && !canAddCustom && (
              <div className="text-muted-foreground px-3 py-2 text-sm">No results</div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
