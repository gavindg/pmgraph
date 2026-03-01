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
      // Tab with no dropdown → select first match only if user was typing
      if (e.key === "Tab" && isEditing && value && filtered.length > 0) {
        select(filtered[0])
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
          select(filtered[highlightIdx])
        } else if (isEditing && filtered.length > 0 && value) {
          // Tab with typed text but no highlight → select first match
          select(filtered[0])
        }
        // Don't preventDefault — let browser move focus to next field
        setOpen(false)
        setHighlightIdx(-1)
        break
      case "Escape":
        e.preventDefault()
        setOpen(false)
        setHighlightIdx(-1)
        break
    }
  }

  const selectedColor = value && colors?.[value] ? colors[value] : null

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
            setOpen(true)
            setHighlightIdx(-1)
          }}
          onFocus={() => {
            setIsEditing(false)
            setOpen(true)
            setHighlightIdx(-1)
          }}
          onBlur={() => setTimeout(() => { setOpen(false); setHighlightIdx(-1); setIsEditing(false) }, 150)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={className}
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
