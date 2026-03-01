/**
 * KanbanView — Three-column board (Todo / In Progress / Done).
 *
 * Cards can be dragged between columns to change status.
 * Click a card to open TaskPanel. "Create Task" switches to graph view.
 */
import { useMemo, useCallback } from "react"
import { usePMGraphStore, getActivePreset, getFilteredNodeIds } from "../store/usePMGraphStore"
import { getCategoryColor, PRIORITY_COLORS, STATUS_COLORS } from "../utils/colors"
import type { TaskNodeData, Status, Priority } from "../types"
import type { Node } from "@xyflow/react"

const COLUMNS: { status: Status; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "in-progress", label: "In Progress" },
  { status: "done", label: "Done" },
]

function stringToColor(str: string): string {
  if (!str) return "#6b7280"
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const palette = ["#3b82f6", "#ec4899", "#a855f7", "#eab308", "#22c55e", "#f97316", "#14b8a6"]
  return palette[Math.abs(hash) % palette.length]
}

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

export default function KanbanView() {
  const nodes = usePMGraphStore((s) => s.nodes)
  const filters = usePMGraphStore((s) => s.filters)
  const setNodeStatus = usePMGraphStore((s) => s.setNodeStatus)
  const setSelectedNode = usePMGraphStore((s) => s.setSelectedNode)
  const setTaskPanelOpen = usePMGraphStore((s) => s.setTaskPanelOpen)
  const setActiveView = usePMGraphStore((s) => s.setActiveView)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const visibleIds = useMemo(() => getFilteredNodeIds(nodes, filters), [nodes, filters])

  const taskNodes = useMemo(() => {
    return nodes.filter((n) => n.type === "task" && visibleIds.has(n.id))
  }, [nodes, visibleIds])

  const columnNodes = useMemo(() => {
    const map: Record<Status, Node[]> = { "todo": [], "in-progress": [], "done": [] }
    for (const n of taskNodes) {
      const status = (n.data as TaskNodeData).status ?? "todo"
      map[status]?.push(n)
    }
    return map
  }, [taskNodes])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: Status) => {
      e.preventDefault()
      const nodeId = e.dataTransfer.getData("text/plain")
      if (nodeId) setNodeStatus(nodeId, targetStatus)
    },
    [setNodeStatus]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleCardClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId)
      setTaskPanelOpen(true)
    },
    [setSelectedNode, setTaskPanelOpen]
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Create button */}
      <div className="px-4 pt-4 flex items-center gap-2">
        <button
          onClick={() => setActiveView("graph")}
          className="py-2 px-4 rounded-lg text-sm font-medium bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] border border-[var(--color-border-default)] hover:border-[var(--color-border-default)] transition-colors"
        >
          + Create Task
        </button>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] font-mono">
          {isMac ? "⌘" : "Ctrl"}+A
        </kbd>
      </div>
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {COLUMNS.map((col) => {
          const cards = columnNodes[col.status]
          return (
            <div
              key={col.status}
              className="flex-1 min-w-56 flex flex-col bg-[var(--color-surface-base)] rounded-xl border border-[var(--color-border-subtle)]"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[col.status].dot }}
                />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {col.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                  {cards.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
                {cards.map((node) => (
                  <KanbanCard
                    key={node.id}
                    node={node}
                    preset={preset}
                    onClick={() => handleCardClick(node.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      
    </div>
  )
}

function KanbanCard({
  node,
  preset,
  onClick,
}: {
  node: Node
  preset: { categories: { name: string; color: string }[] }
  onClick: () => void
}) {
  const data = node.data as TaskNodeData
  const dept = (data.department as string) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const assignee = (data.assignee as string) ?? ""
  const categoryColor = getCategoryColor(preset.categories, dept)

  const initials = assignee
    ? assignee.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : ""

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", node.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={onClick}
      className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2.5 cursor-pointer hover:border-[var(--color-border-default)] transition-colors"
    >
      {/* Title */}
      <div className="text-sm font-medium text-[var(--color-text-primary)] leading-snug mb-1.5">
        {(data.title as string) || "Untitled"}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-1.5">
        {/* Department dot */}
        {dept && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: categoryColor }}
          />
        )}

        {/* Priority */}
        <span
          className="text-[10px] font-bold leading-none"
          style={{ color: PRIORITY_COLORS[priority].dot }}
        >
          !
        </span>

        {/* Assignee initials */}
        {initials && (
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-semibold text-white shrink-0 ml-auto"
            style={{ backgroundColor: stringToColor(assignee) }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  )
}
