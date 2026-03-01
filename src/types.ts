export type Priority = "low" | "medium" | "high"

// Department is now a dynamic string (driven by the active preset's categories).
// Empty string means uncategorized.
export type Department = string

export type LabelItem = {
  text: string
  color: string // hex, e.g. "#3b82f6"
}

export type TaskNodeData = {
  title: string
  description: string
  priority: Priority
  department: Department
  labels: LabelItem[]
  assignee: string
  dueDate: string | null
  // Allows React Flow to treat this as a Record<string, unknown>
  [key: string]: unknown
}

export type Filters = {
  departments: Department[]
  priority: Priority | ""
  assignee: string
  search: string
}

// ── Edges ────────────────────────────────────────────────────────────

export type EdgeType = "blocks" | "relates" | "triggers"

export type PMEdgeData = {
  edgeType: EdgeType
  synthetic?: boolean
  count?: number
  [key: string]: unknown
}

// ── Groups ───────────────────────────────────────────────────────────

export type GroupNodeData = {
  title: string
  color: string
  collapsed: boolean
  [key: string]: unknown
}

// ── Presets ──────────────────────────────────────────────────────────

export interface PresetCategory {
  name: string
  color: string // hex, e.g. "#3b82f6"
}

export interface Preset {
  id: string
  label: string
  categories: PresetCategory[]
}
