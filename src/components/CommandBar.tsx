/**
 * CommandBar — Linear-style command palette (Ctrl+K).
 *
 * Fuzzy search for existing tasks (top 5 results).
 * Select a task → close bar, zoom to it in the canvas.
 * "Create Task" command opens NodeFocusPanel.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useReactFlow } from "@xyflow/react"
import { usePMGraphStore } from "../store/usePMGraphStore"
import { getCategoryColor } from "../utils/colors"
import { getActivePreset } from "../store/usePMGraphStore"
import type { TaskNodeData } from "../types"

interface CommandBarProps {
  onClose: () => void
  onCreateTask: () => void
}

interface ResultItem {
  type: "task" | "command"
  id: string
  label: string
  subtitle?: string
  color?: string
}

export default function CommandBar({ onClose, onCreateTask }: CommandBarProps) {
  const nodes = usePMGraphStore((s) => s.nodes)
  const setSelectedNode = usePMGraphStore((s) => s.setSelectedNode)
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const { setCenter, getNode } = useReactFlow()

  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo<ResultItem[]>(() => {
    const items: ResultItem[] = []
    const q = query.toLowerCase()

    // Commands
    if (!q || "create task".includes(q)) {
      items.push({ type: "command", id: "create-task", label: "Create Task", subtitle: "Ctrl+A" })
    }

    // Task search
    const taskNodes = nodes.filter((n) => n.type === "task")
    const matched = q
      ? taskNodes.filter((n) => {
          const d = n.data as TaskNodeData
          const title = (d.title as string).toLowerCase()
          const assignee = (d.assignee as string).toLowerCase()
          const dept = (d.department as string).toLowerCase()
          return title.includes(q) || assignee.includes(q) || dept.includes(q)
        })
      : taskNodes

    for (const n of matched.slice(0, 5)) {
      const d = n.data as TaskNodeData
      const dept = d.department as string
      items.push({
        type: "task",
        id: n.id,
        label: (d.title as string) || "Untitled",
        subtitle: dept || (d.assignee as string) || undefined,
        color: dept ? getCategoryColor(preset.categories, dept) : undefined,
      })
    }

    return items
  }, [query, nodes, preset.categories])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = useCallback(
    (item: ResultItem) => {
      if (item.type === "command" && item.id === "create-task") {
        onCreateTask()
      } else if (item.type === "task") {
        setSelectedNode(item.id)
        const node = getNode(item.id)
        if (node) {
          const x = node.position.x + (node.measured?.width ?? 180) / 2
          const y = node.position.y + (node.measured?.height ?? 80) / 2
          setCenter(x, y, { zoom: 1.5, duration: 300 })
        }
      }
      onClose()
    },
    [onClose, onCreateTask, setSelectedNode, getNode, setCenter]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    } else if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[998] bg-black/40" onClick={onClose} />

      {/* Bar */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[999] w-full max-w-md">
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <svg
              className="w-4 h-4 text-[var(--color-text-muted)] shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search tasks or type a command…"
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)]"
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] font-mono">
              Esc
            </kbd>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={[
                    "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === selectedIndex
                      ? "bg-[var(--color-surface-overlay)]"
                      : "",
                  ].join(" ")}
                >
                  {item.type === "command" ? (
                    <span className="text-[var(--color-text-muted)] text-sm">+</span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color ?? "var(--color-text-muted)" }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[var(--color-text-primary)] truncate">
                      {item.label}
                    </div>
                  </div>

                  {item.subtitle && (
                    <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-24">
                      {item.subtitle}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {results.length === 0 && query && (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
              No results found
            </div>
          )}
        </div>
      </div>
    </>
  )
}
