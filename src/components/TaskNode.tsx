/**
 * TaskNode — Custom React Flow node for a single task.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │ [pin] Title             [pin]   │  ← colored header (dept color)
 *   │       Department (italic)       │
 *   ├─────────────────────────────────┤
 *   │ ● priority   assignee   date   │  ← neutral dark body
 *   └─────────────────────────────────┘
 *
 * Pins are inside the node, flush with the left/right edges.
 */
import { memo } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import type { TaskNodeData, Department, Priority } from "../types"

// Department → header background color
const DEPT_HEADER_BG: Record<Department, string> = {
  "": "bg-gray-700",
  Programming: "bg-blue-600",
  Art: "bg-pink-600",
  Design: "bg-purple-600",
  Audio: "bg-yellow-600",
  QA: "bg-green-600",
}

// Priority → dot color
const PRIORITY_DOT: Record<Priority, string> = {
  high: "bg-red-500",
  medium: "bg-yellow-400",
  low: "bg-green-400",
}

function TaskNode({ data, selected }: NodeProps<Node<TaskNodeData>>) {
  const dept = (data.department as Department) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const headerBg = DEPT_HEADER_BG[dept]

  return (
    <div
      className={[
        "min-w-45 max-w-65 rounded-lg overflow-hidden shadow-lg border border-gray-700",
        "transition-all duration-150",
        selected ? "ring-2 ring-white/30 ring-offset-1 ring-offset-transparent" : "",
      ].join(" ")}
    >
      {/* ── Header (colored by department) ──────────────────────── */}
      <div className={`relative px-3 py-2 ${headerBg}`}>
        {/* Input pin — inside left edge */}
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          className="w-3! h-3! rounded-full! bg-white/40! border-0! left-0! top-1/2! -translate-y-1/2!"
        />

        {/* Title */}
        <div className="text-sm font-semibold text-white leading-snug wrap-break-word pr-4 pl-3">
          {data.title || "Untitled"}
        </div>

        {/* Department subheading (hidden when empty) */}
        {dept && (
          <div className="text-[11px] italic text-white/60 pl-3 mt-0.5">
            {dept}
          </div>
        )}

        {/* Output pin — inside right edge */}
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          className="w-3! h-3! rounded-full! bg-white/40! border-0! right-0! top-1/2! -translate-y-1/2!"
        />
      </div>

      {/* ── Body (neutral dark) ─────────────────────────────────── */}
      <div className="bg-gray-900 px-3 py-2 flex items-center gap-2 text-[11px] text-gray-400">
        {/* Priority dot */}
        <span
          className={`shrink-0 w-2 h-2 rounded-full ${PRIORITY_DOT[priority]}`}
          title={`Priority: ${priority}`}
        />
        <span className="capitalize">{priority}</span>

        {data.assignee && (
          <>
            <span className="text-gray-600">·</span>
            <span className="truncate max-w-20">{data.assignee}</span>
          </>
        )}

        {data.dueDate && (
          <>
            <span className="text-gray-600">·</span>
            <span className="text-gray-500">{data.dueDate}</span>
          </>
        )}
      </div>
    </div>
  )
}

export default memo(TaskNode)
