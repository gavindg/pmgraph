/**
 * TaskNode — Premium custom React Flow node.
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │ [●]  Title                  [●]  │  colored header (preset category)
 *   │      Department (italic)         │
 *   ├──────────────────────────────────┤
 *   │ ▌  assignee  ·  due date        │  neutral body, priority bar on left
 *   └──────────────────────────────────┘
 *
 * Handles are inside the header (left=target, right=source).
 * Colors are driven by the active preset via getCategoryColor().
 */
import { memo } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import type { TaskNodeData, Priority } from "../types"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { getCategoryColor, PRIORITY_COLORS } from "../utils/colors"

function TaskNode({ data, selected, dragging }: NodeProps<Node<TaskNodeData>>) {
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const dept = (data.department as string) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const categoryColor = getCategoryColor(preset.categories, dept)

  return (
    <div
      className={[
        "min-w-48 max-w-64 overflow-hidden",
        "border border-white/6",
        "transition-all duration-150 ease-out",
        dragging
          ? "scale-[1.03] shadow-node-drag"
          : "shadow-node hover:shadow-node-hover hover:scale-[1.02]",
        selected
          ? "ring-2 ring-offset-2 ring-offset-surface-base"
          : "",
      ].join(" ")}
      style={{
        borderRadius: "var(--radius-node)",
        ...(selected ? { "--tw-ring-color": categoryColor + "66" } as React.CSSProperties : {}),
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div
        className="relative px-3 py-2"
        style={{ backgroundColor: categoryColor }}
      >
        

        <div className="text-sm font-semibold text-white leading-snug pl-2 pr-3 break-words">
          {data.title || "Untitled"}
        </div>

        {dept && (
          <div className="text-[11px] italic text-white/50 pl-2 mt-0.5">
            {dept}
          </div>
        )}


      </div>

      {/* ── Body ───────────────────────────────────────────────── */}
      <div className="flex bg-[var(--color-surface-raised)] border-t border-white/5">

        {/* Input handle — left */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-2! h-2! rounded-full! bg-white/30! border-0! left-1! top-1/2! -translate-y-1/2!"
        />
        {/* Priority bar */}
        <div
          className="w-0.75 shrink-0"
          style={{ backgroundColor: PRIORITY_COLORS[priority].dot }}
        />

        <div className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-text-muted min-h-7">
          {data.assignee ? (
            <span className="text-text-secondary truncate max-w-24">
              {data.assignee as string}
            </span>
          ) : (
            <span className="text-text-muted">Unassigned</span>
          )}

          {data.dueDate && (
            <>
              <span className="opacity-40">·</span>
              <span>{data.dueDate as string}</span>
            </>
          )}

          {/* Output handle — right */}
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="w-2! h-2! rounded-full! bg-white/30! border-0! right-1! top-1/2! -translate-y-1/2!"
          />
        </div>
      </div>
    </div>
  )
}

export default memo(TaskNode)
