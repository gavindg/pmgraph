/**
 * DatePicker — Calendar popup for selecting a due date.
 *
 * Shows a formatted date button that opens a calendar grid.
 * Supports month navigation, today highlight, and clear.
 */
import { useState, useRef, useEffect } from "react"

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

interface DatePickerProps {
  value: string // "YYYY-MM-DD" or ""
  onChange: (value: string) => void
  className?: string
}

function toDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split("-").map(Number)
  return { year: y, month: m - 1, day: d }
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return ""
  const parts = toDateParts(dateStr)
  if (!parts) return ""
  return new Date(parts.year, parts.month, parts.day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function tryParseDate(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  // Try native Date parsing (handles "Mar 1, 2026", "2026-03-01", "3/1/2026", etc.)
  const d = new Date(trimmed)
  if (!isNaN(d.getTime())) {
    return toISODate(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return null
}

export default function DatePicker({ value, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputText, setInputText] = useState(value ? formatDisplay(value) : "")
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = toDateParts(value)
  const today = new Date()
  const todayISO = toISODate(today.getFullYear(), today.getMonth(), today.getDate())

  // Sync inputText when value changes externally
  useEffect(() => {
    if (!inputRef.current || document.activeElement !== inputRef.current) {
      setInputText(value ? formatDisplay(value) : "")
    }
  }, [value])

  // Calendar view month/year — start at selected date or today
  const [viewYear, setViewYear] = useState(selected?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(selected?.month ?? today.getMonth())

  // Reset view when value changes externally
  useEffect(() => {
    if (selected) {
      setViewYear(selected.year)
      setViewMonth(selected.month)
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // Build calendar grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate()

  const cells: { day: number; month: number; year: number; current: boolean }[] = []

  // Previous month's trailing days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = viewMonth === 0 ? 11 : viewMonth - 1
    const y = viewMonth === 0 ? viewYear - 1 : viewYear
    cells.push({ day: d, month: m, year: y, current: false })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month: viewMonth, year: viewYear, current: true })
  }

  // Next month's leading days to fill grid
  const remaining = 7 - (cells.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1
      const y = viewMonth === 11 ? viewYear + 1 : viewYear
      cells.push({ day: d, month: m, year: y, current: false })
    }
  }

  const selectDate = (cell: typeof cells[0]) => {
    onChange(toISODate(cell.year, cell.month, cell.day))
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        placeholder="No date"
        onClick={() => setOpen(true)}
        onChange={(e) => {
          setInputText(e.target.value)
          const parsed = tryParseDate(e.target.value)
          if (parsed) {
            onChange(parsed)
          }
        }}
        onBlur={() => {
          // Reset display text to match current value
          setInputText(value ? formatDisplay(value) : "")
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const parsed = tryParseDate(inputText)
            if (parsed) {
              onChange(parsed)
              setOpen(false)
            }
            inputRef.current?.blur()
          }
          if (e.key === "Escape") {
            setInputText(value ? formatDisplay(value) : "")
            setOpen(false)
            inputRef.current?.blur()
          }
        }}
        className={className || "w-full text-left bg-transparent outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]"}
      />

      {open && (
        <div className="absolute z-50 left-0 bottom-full mb-1 w-64 bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl shadow-2xl p-3 flex flex-col gap-2">
          {/* Month/year nav */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-xs font-medium text-[var(--color-text-primary)]">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-0">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-[var(--color-text-muted)] py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0">
            {cells.map((cell, i) => {
              const iso = toISODate(cell.year, cell.month, cell.day)
              const isSelected = value === iso
              const isToday = iso === todayISO
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDate(cell)}
                  className={[
                    "w-8 h-8 flex items-center justify-center text-xs rounded-md transition-colors",
                    !cell.current ? "text-[var(--color-text-muted)]/40" : "",
                    isSelected
                      ? "bg-blue-600 text-white font-medium"
                      : isToday
                        ? "ring-1 ring-blue-500/50 text-blue-400 font-medium"
                        : cell.current
                          ? "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-overlay)]"
                          : "hover:bg-[var(--color-surface-overlay)]",
                  ].join(" ")}
                >
                  {cell.day}
                </button>
              )
            })}
          </div>

          {/* Footer: Today + Clear */}
          <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => {
                onChange(todayISO)
                setOpen(false)
              }}
              className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Today
            </button>
            {value && (
              <>
                <span className="text-[var(--color-border-subtle)]">|</span>
                <button
                  type="button"
                  onClick={() => {
                    onChange("")
                    setOpen(false)
                  }}
                  className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
