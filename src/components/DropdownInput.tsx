/**
 * DropdownInput — Reusable text input with dropdown suggestions.
 *
 * Supports keyboard navigation: Arrow Up/Down to highlight, Enter/Tab to select,
 * Escape to close dropdown.
 *
 * When `onCommit` is provided, pressing Enter with no highlighted suggestion
 * calls `onCommit(value)` (useful for label creation).
 */
import { useState, useRef, useCallback, useEffect } from "react"

interface DropdownInputProps {
  value: string
  onChange: (v: string) => void
  onSelect?: (v: string) => void
  onCommit?: (v: string) => void
  suggestions: string[]
  placeholder?: string
  className?: string
}

export default function DropdownInput({
  value,
  onChange,
  onSelect,
  onCommit,
  suggestions,
  placeholder,
  className,
}: DropdownInputProps) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter suggestions by input value
  const filtered = (() => {
    if (!value) return suggestions
    const q = value.toLowerCase()
    return suggestions.filter((s) => s.toLowerCase().includes(q))
  })()

  const select = useCallback(
    (item: string) => {
      if (onSelect) {
        onSelect(item)
      } else {
        onChange(item)
      }
      setOpen(false)
      setHighlightIdx(-1)
    },
    [onChange, onSelect]
  )

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIdx < 0 || !listRef.current) return
    const items = listRef.current.children
    if (items[highlightIdx]) {
      ;(items[highlightIdx] as HTMLElement).scrollIntoView({ block: "nearest" })
    }
  }, [highlightIdx])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setOpen(true)
        setHighlightIdx(0)
        e.preventDefault()
        return
      }
      // Enter with no dropdown → commit raw value
      if (e.key === "Enter" && onCommit && value.trim()) {
        e.preventDefault()
        onCommit(value.trim())
        return
      }
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightIdx((i) => (i + 1) % filtered.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightIdx((i) => (i <= 0 ? filtered.length - 1 : i - 1))
        break
      case "Enter":
        e.preventDefault()
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          select(filtered[highlightIdx])
        } else if (onCommit && value.trim()) {
          onCommit(value.trim())
        }
        break
      case "Tab":
        if (highlightIdx >= 0 && highlightIdx < filtered.length) {
          e.preventDefault()
          select(filtered[highlightIdx])
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        setHighlightIdx(-1)
        break
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setHighlightIdx(-1)
        }}
        onFocus={() => {
          setOpen(true)
          setHighlightIdx(-1)
        }}
        onBlur={() => setTimeout(() => { setOpen(false); setHighlightIdx(-1) }, 150)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] rounded-md shadow-lg max-h-36 overflow-y-auto"
        >
          {filtered.map((item, i) => (
            <button
              key={item}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(item)}
              className={[
                "w-full text-left px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors",
                i === highlightIdx
                  ? "bg-[var(--color-surface-raised)]"
                  : "hover:bg-[var(--color-surface-raised)]",
              ].join(" ")}
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
