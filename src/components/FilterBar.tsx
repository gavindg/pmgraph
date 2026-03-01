/**
 * FilterBar — Compact top filter strip with search, preset selector,
 * department toggles, and priority segmented buttons.
 */
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { PRIORITY_COLORS } from "../utils/colors"
import { PRESETS } from "../utils/presets"
import type { Priority } from "../types"

const PRIORITIES: Priority[] = ["low", "medium", "high"]

export default function FilterBar() {
  const filters = usePMGraphStore((s) => s.filters)
  const setFilters = usePMGraphStore((s) => s.setFilters)
  const clearFilters = usePMGraphStore((s) => s.clearFilters)
  const activePresetId = usePMGraphStore((s) => s.activePresetId)
  const setPreset = usePMGraphStore((s) => s.setPreset)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const toggleDept = (dept: string) => {
    const current = filters.departments
    const next = current.includes(dept)
      ? current.filter((d) => d !== dept)
      : [...current, dept]
    setFilters({ departments: next })
  }

  const hasActiveFilters =
    filters.departments.length > 0 ||
    filters.priority !== "" ||
    filters.assignee !== "" ||
    filters.search !== ""

  return (
    <header className="flex items-center gap-2.5 px-4 py-1.5 bg-surface-raised border-b border-border-default shrink-0 flex-wrap">
      {/* App title */}
      <span className="text-sm font-bold text-text-primary shrink-0">
        PMGraph
      </span>

      {/* Preset selector */}
      <select
        className="bg-surface-overlay border border-border-default text-text-secondary text-[11px] rounded-md px-1.5 py-0.5 focus:outline-none"
        value={activePresetId}
        onChange={(e) => setPreset(e.target.value)}
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      <span className="text-border-default text-xs shrink-0">|</span>

      {/* Search */}
      <input
        className="bg-surface-overlay border border-border-default text-text-primary text-xs rounded-md px-2 py-0.5 w-36 focus:outline-none focus:border--text-muted placeholder-text-muted transition-colors"
        placeholder="Search tasks..."
        value={filters.search}
        onChange={(e) => setFilters({ search: e.target.value })}
      />

      <span className="text-[var(--color-border-default)] text-xs shrink-0 hidden sm:block">|</span>

      {/* Department toggles — dynamic from preset */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* None toggle */}
        <button
          onClick={() => toggleDept("")}
          className={[
            "text-[11px] px-2 py-0.5 rounded-full border transition-colors duration-150",
            filters.departments.includes("")
              ? "text-white border-transparent"
              : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
          ].join(" ")}
          style={
            filters.departments.includes("")
              ? { backgroundColor: "#6b7280" }
              : {}
          }
        >
          None
        </button>
        {preset.categories.map((cat) => {
          const active = filters.departments.includes(cat.name)
          return (
            <button
              key={cat.name}
              onClick={() => toggleDept(cat.name)}
              className={[
                "text-[11px] px-2 py-0.5 rounded-full border transition-colors duration-150",
                active
                  ? "text-white border-transparent"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
              ].join(" ")}
              style={active ? { backgroundColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          )
        })}
      </div>

      <span className="text-[var(--color-border-default)] text-xs shrink-0 hidden md:block">|</span>

      {/* Priority — small segmented buttons */}
      <div className="flex items-center rounded-md overflow-hidden border border-[var(--color-border-default)]">
        <button
          onClick={() => setFilters({ priority: "" })}
          className={[
            "text-[11px] px-2 py-0.5 transition-colors duration-150",
            filters.priority === ""
              ? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
          ].join(" ")}
        >
          All
        </button>
        {PRIORITIES.map((p) => {
          const active = filters.priority === p
          return (
            <button
              key={p}
              onClick={() => setFilters({ priority: active ? "" : p })}
              className={[
                "text-[11px] px-2 py-0.5 transition-colors duration-150",
                active
                  ? "text-white"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
              ].join(" ")}
              style={active ? { backgroundColor: PRIORITY_COLORS[p].bg } : {}}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          )
        })}
      </div>

      {/* Clear */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors ml-auto"
        >
          Clear
        </button>
      )}

      {/* Hint */}
      <span className="ml-auto text-[10px] text-[var(--color-text-muted)] shrink-0 hidden lg:block">
        Double-click or <kbd className="bg-[var(--color-surface-overlay)] px-1 rounded text-[9px]">Ctrl+A</kbd>
      </span>
    </header>
  )
}
