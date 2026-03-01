/**
 * TaskNode — Custom React Flow node.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │  Title                           │  header: dark bg, white text
 *   │  Department (italic)             │
 *   ├━━━━━━ dept color separator ━━━━━━┤  2px line colored by department
 *   │  [label] [label]                 │  label pills (if any)
 *   │  !  [AB]  Jan 15       ◉──────◉ │  metadata row + handles
 *   └──────────────────────────────────┘
 */
import { memo } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import type { TaskNodeData, Priority } from "../types"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { getCategoryColor, PRIORITY_COLORS } from "../utils/colors"

function stringToColor(str: string): string {
  if (!str) return "#6b7280"
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const palette = ["#3b82f6", "#ec4899", "#a855f7", "#eab308", "#22c55e", "#f97316", "#14b8a6"]
  return palette[Math.abs(hash) % palette.length]
}

function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function TaskNode({ data, selected, dragging }: NodeProps<Node<TaskNodeData>>) {
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const dept = (data.department as string) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const labels = (data.labels as { text: string; color: string }[]) ?? []
  const assignee = (data.assignee as string) ?? ""
  const dueDate = (data.dueDate as string | null) ?? null
  const categoryColor = getCategoryColor(preset.categories, dept)

  const initials = assignee
    ? assignee.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : ""

  return (
    <div
      className={[
        "min-w-44 max-w-60",
        "border border-white/[0.06] rounded-xl",
        "transition-all duration-150 ease-out",
        dragging
          ? "scale-[1.00] shadow-[var(--shadow-node-drag)]"
          : "shadow-[var(--shadow-node)] hover:shadow-node-hover hover:scale-[1.0]",
        selected ? "ring-2 ring-offset-2 ring-offset-[var(--color-surface-base)]" : "",
      ].join(" ")}
      style={selected ? { "--tw-ring-color": categoryColor + "55" } as React.CSSProperties : {}}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="node-drag-handle px-3 pt-2.5 pb-2 bg-[var(--color-surface-raised)] rounded-t-xl cursor-grab active:cursor-grabbing">
        <div className="text-sm font-semibold text-white leading-snug break-words">
          {(data.title as string) || "Untitled"}
        </div>
        {dept && (
          <div className="text-[11px] italic text-white/40 mt-0.5">{dept}</div>
        )}
      </div>

      {/* ── Department color separator ────────────────────── */}
      <div className="h-[2px]" style={{ backgroundColor: categoryColor }} />

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="relative bg-surface-raised px-3 pt-2 pb-2.5 rounded-b-xl min-h-[44px]">
        {/* Input handle — left edge of body */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-2! h-2! rounded-full! bg-white/25! border-0! left-0! top-1/2! -translate-y-1/2!"
        />

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {labels.map((l) => (
              <span
                key={l.text}
                className="text-[10px] px-1.5 py-0.5 rounded-full leading-none text-white/90"
                style={{ backgroundColor: l.color + "33" }}
              >
                {l.text}
              </span>
            ))}
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-1.5 text-[11px] pr-4">
          {/* Priority exclamation */}
          <span
            className="font-bold leading-none shrink-0"
            style={{ color: PRIORITY_COLORS[priority].dot }}
          >
            !
          </span>

          {/* Assignee initials */}
          {initials && (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0 tracking-tight"
              style={{ backgroundColor: stringToColor(assignee) }}
            >
              {initials}
            </div>
          )}

          {/* Due date */}
          {dueDate && (
            <span className="text-white/35 truncate">{formatDueDate(dueDate)}</span>
          )}
        </div>

        {/* Output handle — right edge of body */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-2! h-2! rounded-full! bg-white/25! border-0! right-0! top-1/2! -translate-y-1/2!"
        />
      </div>
    </div>
  )
}

export default memo(TaskNode)
