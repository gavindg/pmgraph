/**
 * FilterBar — Top filter controls wired to the Zustand store.
 *
 * Filtering behavior:
 * - Department toggles: multi-select, empty = show all
 * - Priority select: "" = show all
 * - Assignee text: live substring search (case-insensitive)
 * - Nodes NOT matching filters → opacity 0.15 (applied in GraphCanvas)
 */
import { usePMGraphStore } from "../store/usePMGraphStore"
import type { Department, Priority } from "../types"

const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: "", label: "None" },
  { value: "Programming", label: "Programming" },
  { value: "Art", label: "Art" },
  { value: "Design", label: "Design" },
  { value: "Audio", label: "Audio" },
  { value: "QA", label: "QA" },
]
const PRIORITIES: Priority[] = ["low", "medium", "high"]

const DEPT_ACTIVE: Record<Department, string> = {
  "": "bg-gray-500 text-white border-gray-400",
  Programming: "bg-blue-600 text-white border-blue-500",
  Art: "bg-pink-600 text-white border-pink-500",
  Design: "bg-purple-600 text-white border-purple-500",
  Audio: "bg-yellow-600 text-white border-yellow-500",
  QA: "bg-green-600 text-white border-green-500",
}

const DEPT_INACTIVE =
  "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200"

export default function FilterBar() {
  const { filters, setFilters, clearFilters } = usePMGraphStore()

  const toggleDept = (dept: Department) => {
    const current = filters.departments
    const next = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept]
    setFilters({ departments: next })
  }

  const hasActiveFilters =
    filters.departments.length > 0 ||
    filters.priority !== "" ||
    filters.assignee !== ""

  return (
    <header className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0 flex-wrap">
      {/* App title */}
      <span className="text-sm font-bold text-gray-200 mr-1 shrink-0">PMGraph</span>

      {/* Divider */}
      <span className="text-gray-700 text-xs shrink-0">|</span>

      {/* Department toggles */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-gray-500 shrink-0">Dept:</span>
        {DEPARTMENTS.map(({ value, label }) => {
          const active = filters.departments.includes(value)
          return (
            <button
              key={value}
              onClick={() => toggleDept(value)}
              className={[
                "text-xs px-2 py-0.5 rounded border font-medium transition-colors",
                active ? DEPT_ACTIVE[value] : DEPT_INACTIVE,
              ].join(" ")}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Divider */}
      <span className="text-gray-700 text-xs shrink-0 hidden sm:block">|</span>

      {/* Priority select */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-gray-500">Priority:</span>
        <select
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-gray-500"
          value={filters.priority}
          onChange={(e) =>
            setFilters({ priority: e.target.value as Priority | "" })
          }
        >
          <option value="">All</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Assignee search */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-gray-500">Assignee:</span>
        <input
          className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-0.5 w-28 focus:outline-none focus:border-gray-500 placeholder-gray-600"
          placeholder="Search…"
          value={filters.assignee}
          onChange={(e) => setFilters({ assignee: e.target.value })}
        />
      </div>

      {/* Clear button — only shown when filters are active */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="ml-auto text-xs text-gray-400 hover:text-gray-200 border border-gray-700 hover:border-gray-500 px-2 py-0.5 rounded transition-colors"
        >
          Clear filters
        </button>
      )}

      {/* Keyboard hint */}
      <span className="ml-auto text-[10px] text-gray-600 shrink-0 hidden lg:block">
        Double-click canvas or <kbd className="bg-gray-800 px-1 rounded">Ctrl+A</kbd> to add task
      </span>
    </header>
  )
}
