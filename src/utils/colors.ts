import type { PresetCategory } from "../types"

/**
 * Look up the hex color for a category name within a preset's categories.
 * Returns neutral gray if the category is not found or is empty.
 */
export function getCategoryColor(
  categories: PresetCategory[],
  name: string
): string {
  if (!name) return "#6b7280"
  const cat = categories.find((c) => c.name === name)
  return cat?.color ?? "#6b7280"
}

/**
 * Build a Tailwind-compatible bg class from a hex color.
 * For dynamic preset colors we use inline styles instead of Tailwind classes,
 * but this helper generates a low-opacity background CSS value.
 */
export function categoryBgStyle(color: string, opacity = 1): React.CSSProperties {
  return { backgroundColor: opacity < 1 ? hexToRgba(color, opacity) : color }
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// ── Edge type styles ─────────────────────────────────────────────────

export const EDGE_TYPE_STYLES = {
  blocks:   { stroke: "#ef4444", dash: "",        markerColor: "#ef4444", label: "Blocks" },
  relates:  { stroke: "#6b7280", dash: "6 3",     markerColor: "#6b7280", label: "Relates" },
  triggers: { stroke: "#3b82f6", dash: "8 4 2 4", markerColor: "#3b82f6", label: "Triggers" },
} as const

// ── Label colors ────────────────────────────────────────────────────

export const LABEL_COLORS = [
  "#6b7280", // gray
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
] as const

export const PRIORITY_COLORS = {
  low: { dot: "#4ade80", bg: "#166534", text: "text-green-400" },
  medium: { dot: "#facc15", bg: "#854d0e", text: "text-yellow-400" },
  high: { dot: "#f87171", bg: "#991b1b", text: "text-red-400" },
} as const
