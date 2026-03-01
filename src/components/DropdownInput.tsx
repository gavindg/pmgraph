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
  /** Optional map of suggestion → hex color to show a colored dot */
  colors?: Record<string, string>
  placeholder?: string
  className?: string
}

export default function DropdownInput({
  value,
  onChange,
  onSelect,
  onCommit,
  suggestions,
  colors,
  placeholder,
  className,
}: DropdownInputProps) {
  const [open, setOpen] = useState(false)
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [isEditing, setIsEditing] = useState(false)
  const [confirmed, setConfirmed] = useState(!!value)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only filter when the user is actively typing; otherwise show all
  const filtered = (() => {
    if (!isEditing || !value) return suggestions
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
      setIsEditing(false)
      setConfirmed(true)
      inputRef.current?.blur()
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
    // Tab cycles through options when dropdown is open
    if (e.key === "Tab" && filtered.length > 0) {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setHighlightIdx(0)
      } else {
        setHighlightIdx((i) => (i + 1) % filtered.length)
      }
      return
    }

    if (!open || filtered.length === 0) {
      if (e.key === "ArrowDown" && filtered.length > 0) {
        setOpen(true)
        setHighlightIdx(0)
        e.preventDefault()
        return
      }
      // Enter confirms current value
      if (e.key === "Enter") {
        e.preventDefault()
        if (onCommit && value.trim()) {
          onCommit(value.trim())
        } else {
          setConfirmed(true)
          inputRef.current?.blur()
        }
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
        } else if (filtered.length > 0) {
          select(filtered[0])
        } else if (onCommit && value.trim()) {
          onCommit(value.trim())
        }
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        setHighlightIdx(-1)
        setConfirmed(true)
        inputRef.current?.blur()
        break
    }
  }

  const selectedColor = value && colors?.[value] ? colors[value] : null

  const confirmedClass = confirmed && value
    ? "bg-transparent border-transparent hover:bg-[var(--color-surface-overlay)] hover:border-[var(--color-border-default)] cursor-text"
    : ""

  return (
    <div className="relative">
      <div className="relative flex items-center">
        {selectedColor && (
          <span
            className="absolute left-2.5 w-2 h-2 rounded-full shrink-0 pointer-events-none z-10"
            style={{ backgroundColor: selectedColor }}
          />
        )}
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsEditing(true)
            setConfirmed(false)
            setOpen(true)
            setHighlightIdx(-1)
          }}
          onFocus={() => {
            setConfirmed(false)
            setIsEditing(false)
            setOpen(true)
            setHighlightIdx(-1)
          }}
          onBlur={() => setTimeout(() => { setOpen(false); setHighlightIdx(-1); setIsEditing(false); if (value) setConfirmed(true) }, 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`${className} ${confirmedClass} transition-colors duration-150`}
          style={selectedColor ? { paddingLeft: "1.75rem" } : undefined}
        />
      </div>
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
                "w-full text-left px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] transition-colors flex items-center gap-2",
                i === highlightIdx
                  ? "bg-[var(--color-surface-raised)]"
                  : "hover:bg-[var(--color-surface-raised)]",
              ].join(" ")}
            >
              {colors?.[item] && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colors[item] }} />
              )}
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
