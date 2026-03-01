/**
 * TaskNode — Custom React Flow node.
 *
 * Features:
 * - Trello-style circular checkbox for marking done
 * - Done nodes are faded
 * - Right handle turns green when done
 * - Left handle turns green when all dependencies are done (or no deps)
 */
import { memo, useMemo, useState, useRef, useEffect } from "react"
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react"
import type { TaskNodeData, Priority, Status } from "../types"
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

function TaskNode({ id, data, selected, dragging }: NodeProps<Node<TaskNodeData>>) {
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const edges = usePMGraphStore((s) => s.edges)
  const nodes = usePMGraphStore((s) => s.nodes)
  const setNodeStatus = usePMGraphStore((s) => s.setNodeStatus)
  const updateNode = usePMGraphStore((s) => s.updateNode)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(data.title as string)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editingTitle])

  // Sync local state when data changes externally
  useEffect(() => {
    if (!editingTitle) setTitleValue(data.title as string)
  }, [data.title, editingTitle])

  const commitTitle = () => {
    const trimmed = titleValue.trim()
    if (trimmed && trimmed !== data.title) {
      updateNode(id, { title: trimmed })
    } else {
      setTitleValue(data.title as string)
    }
    setEditingTitle(false)
  }

  const dept = (data.department as string) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const status = (data.status as Status) ?? "todo"
  const labels = (data.labels as { text: string; color: string }[]) ?? []
  const assignee = (data.assignee as string) ?? ""
  const dueDate = (data.dueDate as string | null) ?? null
  const categoryColor = getCategoryColor(preset.categories, dept)
  const isDone = status === "done"

  const initials = assignee
    ? assignee.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : ""

  // Check if all dependencies (incoming edges to this node) are done
  const allDepsComplete = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id)
    if (incomingEdges.length === 0) return true
    return incomingEdges.every((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source)
      if (!sourceNode || sourceNode.type !== "task") return true
      return (sourceNode.data as TaskNodeData).status === "done"
    })
  }, [id, edges, nodes])

  // Check if handles have connections
  const hasIncoming = useMemo(() => edges.some((e) => e.target === id), [edges, id])
  const hasOutgoing = useMemo(() => edges.some((e) => e.source === id), [edges, id])

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNodeStatus(id, isDone ? "todo" : "done")
  }

  return (
    <div
      className={[
        "node-drag-handle min-w-44 max-w-60 cursor-grab active:cursor-grabbing",
        "border border-white/[0.06] rounded-xl",
        "transition-all duration-150 ease-out",
        dragging
          ? "scale-[1.00] shadow-[var(--shadow-node-drag)]"
          : "shadow-[var(--shadow-node)] hover:shadow-node-hover hover:scale-[1.0]",
        selected ? "ring-2 ring-offset-2 ring-offset-[var(--color-surface-base)]" : "",
      ].join(" ")}
      style={{
        opacity: isDone ? 0.55 : 1,
        ...(selected ? { "--tw-ring-color": categoryColor + "55" } as React.CSSProperties : {}),
      }}
    >
      {/* ── Header ───────────────────────────────────────── */}
      <div className="px-3 pt-2.5 pb-2 bg-[var(--color-surface-raised)] rounded-t-xl flex items-start gap-2">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleCheckboxClick}
          className={[
            "w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors duration-150",
            isDone
              ? "bg-green-500 border-green-500"
              : "border-white/30 hover:border-white/50",
          ].join(" ")}
        >
          {isDone && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle()
                if (e.key === "Escape") { setTitleValue(data.title as string); setEditingTitle(false) }
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              className="text-sm font-semibold leading-snug bg-transparent border-none outline-none text-white w-full px-0 py-0"
            />
          ) : (
            <div
              className={[
                "text-sm font-semibold leading-snug break-words cursor-text hover:bg-white/5 rounded px-0.5 -mx-0.5",
                isDone ? "text-white/60 line-through" : "text-white",
              ].join(" ")}
              onClick={(e) => { e.stopPropagation(); setEditingTitle(true) }}
            >
              {(data.title as string) || "Untitled"}
            </div>
          )}
          {dept && (
            <div className="text-[11px] italic text-white/40 mt-0.5">{dept}</div>
          )}
        </div>
      </div>

      {/* ── Department color separator ────────────────────── */}
      <div className="h-[2px]" style={{ backgroundColor: categoryColor }} />

      {/* ── Body ─────────────────────────────────────────── */}
      <div className="bg-surface-raised px-3 pt-2.5 pb-1.5 rounded-b-xl flex flex-col gap-3">
        {/* Handle row — inline handles with Blocked/Ready between them */}
        <div className="flex items-center gap-1.5">
          <Handle
            type="target"
            position={Position.Left}
            id="in"
            className={[
              "task-handle w-3! h-3! rounded-full! shrink-0!",
              allDepsComplete ? "handle-green" : hasIncoming ? "handle-filled" : "handle-ring",
            ].join(" ")}
          />
          <span className={[
            "text-[12px] font-medium leading-none",
            allDepsComplete ? "text-green-400/70" : "text-red-400/70",
          ].join(" ")}>
            {allDepsComplete ? "Ready" : "Blocked"}
          </span>
          <div className="flex-1" />
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className={[
              "task-handle w-3! h-3! rounded-full! shrink-0!",
              isDone ? "handle-green" : hasOutgoing ? "handle-filled" : "handle-ring",
            ].join(" ")}
          />
        </div>

        {/* Labels */}
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
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
        <div className="flex items-center gap-1.5 text-[11px]">
          {/* Assignee initials or "Not assigned" */}
          {initials ? (
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0 tracking-tight"
              style={{ backgroundColor: stringToColor(assignee) }}
            >
              {initials}
            </div>
          ) : (
            <span className="text-white/25 text-[10px]">Not assigned</span>
          )}

          {/* Spacer to push date + priority right */}
          <div className="flex-1" />

          {/* Due date — right aligned */}
          {dueDate && (
            <span className="text-white/35 truncate">{formatDueDate(dueDate)}</span>
          )}

          {/* Priority exclamation — right aligned, after date */}
          <span
            className="font-bold leading-none shrink-0"
            style={{ color: PRIORITY_COLORS[priority].dot }}
          >
            !
          </span>
        </div>
      </div>
    </div>
  )
}

export default memo(TaskNode)
