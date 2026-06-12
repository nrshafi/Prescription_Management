import { Check, Plus, Search, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
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
  const [dropdownPos, setDropdownPos] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = items.filter(
    (item) => item.toLowerCase().includes(query.toLowerCase()) && !selected.includes(item)
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
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((item) => (
            <span
              key={item}
              className="bg-primary/10 text-primary border-primary/20 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm"
            >
              {item}
              <button onClick={() => removeItem(item)} className="focus:outline-none" type="button">
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsOpen(true)
            updatePosition()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length > 0) toggle(filtered[0])
              else if (canAddCustom) addCustom()
            }
            if (e.key === 'Escape') {
              setIsOpen(false)
              inputRef.current?.blur()
            }
          }}
          placeholder={placeholder}
          className="border-input bg-background focus:ring-ring w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:outline-none"
        />
      </div>

      {showDropdown &&
        dropdownPos &&
        createPortal(
          <div
            className="bg-popover text-popover-foreground z-50 max-h-52 overflow-y-auto rounded-lg border shadow-md"
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width
            }}
          >
            {filtered.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => toggle(item)}
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors"
              >
                <Check className="size-4 text-transparent" />
                {item}
              </button>
            ))}
            {canAddCustom && (
              <button
                type="button"
                onClick={addCustom}
                className="text-primary hover:bg-accent flex w-full items-center gap-2 border-t px-3 py-2 text-left text-sm"
              >
                <Plus className="size-4" />
                Add &ldquo;{query.trim()}&rdquo;
              </button>
            )}
            {filtered.length === 0 && !canAddCustom && (
              <div className="text-muted-foreground px-3 py-2 text-sm">No results</div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
