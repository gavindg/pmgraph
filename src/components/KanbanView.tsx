/**
 * KanbanView — Three-column board (Todo / In Progress / Done).
 *
 * Cards can be dragged between columns to change status.
 * Click a card to open TaskPanel. "Create Task" switches to graph view.
 */
import { useMemo, useCallback, useState, useRef, useEffect } from "react"
import { usePMGraphStore, getActivePreset, getFilteredNodeIds } from "../store/usePMGraphStore"
import { getPresetById } from "../utils/presets"
import { getCategoryColor, PRIORITY_COLORS } from "../utils/colors"
import type { TaskNodeData, Status, Priority } from "../types"
import type { Node } from "@xyflow/react"

const STATUS_COLOR_OPTIONS = [
  "#6b7280", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
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

export default function KanbanView() {
  const nodes = usePMGraphStore((s) => s.nodes)
  const filters = usePMGraphStore((s) => s.filters)
  const setNodeStatus = usePMGraphStore((s) => s.setNodeStatus)
  const setSelectedNode = usePMGraphStore((s) => s.setSelectedNode)
  const setTaskPanelOpen = usePMGraphStore((s) => s.setTaskPanelOpen)
  const setActiveView = usePMGraphStore((s) => s.setActiveView)
  const updateNode = usePMGraphStore((s) => s.updateNode)
  const addStatus = usePMGraphStore((s) => s.addStatus)
  const removeStatus = usePMGraphStore((s) => s.removeStatus)
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const activePresetId = usePMGraphStore((s) => s.activePresetId)

  const baseStatusIds = useMemo(() => {
    const base = getPresetById(activePresetId)
    return new Set(base.statuses.map((s) => s.id))
  }, [activePresetId])

  const visibleIds = useMemo(() => getFilteredNodeIds(nodes, filters), [nodes, filters])

  const taskNodes = useMemo(() => {
    return nodes.filter((n) => n.type === "task" && visibleIds.has(n.id))
  }, [nodes, visibleIds])

  const columnNodes = useMemo(() => {
    const map: Record<string, Node[]> = {}
    for (const s of preset.statuses) map[s.id] = []
    for (const n of taskNodes) {
      const status = (n.data as TaskNodeData).status ?? preset.statuses[0]?.id ?? "todo"
      if (!map[status]) map[status] = []
      map[status].push(n)
    }
    return map
  }, [taskNodes, preset.statuses])

  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const dragOverRef = useRef<string | null>(null)

  const handleDrop = useCallback(
    (e: React.DragEvent, targetStatus: Status) => {
      e.preventDefault()
      dragOverRef.current = null
      setDragOverColumn(null)
      const nodeId = e.dataTransfer.getData("text/plain")
      if (nodeId) setNodeStatus(nodeId, targetStatus)
    },
    [setNodeStatus]
  )

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    if (dragOverRef.current !== colId) {
      dragOverRef.current = colId
      setDragOverColumn(colId)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent, colId: string) => {
    const related = e.relatedTarget as HTMLElement | null
    const currentTarget = e.currentTarget as HTMLElement
    if (!related || !currentTarget.contains(related)) {
      if (dragOverRef.current === colId) {
        dragOverRef.current = null
        setDragOverColumn(null)
      }
    }
  }, [])

  const handleCardClick = useCallback(
    (nodeId: string) => {
      setSelectedNode(nodeId)
      setTaskPanelOpen(true)
    },
    [setSelectedNode, setTaskPanelOpen]
  )

  const [newStatusForm, setNewStatusForm] = useState<{ label: string; color: string } | null>(null)
  const newStatusInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (newStatusForm) newStatusInputRef.current?.focus()
  }, [newStatusForm])

  const handleAddStatus = () => {
    if (!newStatusForm) return
    const label = newStatusForm.label.trim()
    if (!label) { setNewStatusForm(null); return }
    const id = label.toLowerCase().replace(/\s+/g, "-")
    if (preset.statuses.some((s) => s.id === id)) { setNewStatusForm(null); return }
    addStatus({ id, label, color: newStatusForm.color })
    setNewStatusForm(null)
  }

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
          A
        </kbd>
      </div>
      <div className="flex-1 flex gap-4 p-4 overflow-x-auto">
        {preset.statuses.map((col) => {
          const cards = columnNodes[col.id] ?? []
          const isCustom = !baseStatusIds.has(col.id)
          return (
            <div
              key={col.id}
              className={[
                "w-72 shrink-0 flex flex-col rounded-xl border transition-colors duration-150",
                dragOverColumn === col.id
                  ? "bg-[var(--color-surface-overlay)] border-blue-500/50 ring-1 ring-blue-500/20"
                  : "bg-[var(--color-surface-overlay)] border-[var(--color-border-subtle)]",
              ].join(" ")}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[var(--color-border-subtle)]">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {col.label}
                </span>
                <span className="text-xs text-[var(--color-text-muted)] ml-auto">
                  {cards.length}
                </span>
                {isCustom && (
                  <button
                    onClick={() => removeStatus(col.id)}
                    className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors text-sm leading-none ml-1"
                    title="Remove status"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2 min-h-24">
                {cards.map((node) => (
                  <KanbanCard
                    key={node.id}
                    node={node}
                    preset={preset}
                    onClick={() => handleCardClick(node.id)}
                    onTitleChange={(title) => updateNode(node.id, { title })}
                  />
                ))}
              </div>
            </div>
          )
        })}

        {/* Add status column */}
        {newStatusForm ? (
          <div className="w-72 shrink-0 flex flex-col bg-[var(--color-surface-overlay)] rounded-xl border border-[var(--color-border-subtle)] p-3 gap-3">
            <input
              ref={newStatusInputRef}
              value={newStatusForm.label}
              onChange={(e) => setNewStatusForm({ ...newStatusForm, label: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddStatus()
                if (e.key === "Escape") setNewStatusForm(null)
              }}
              placeholder="Status name…"
              className="text-sm bg-transparent border border-[var(--color-border-default)] rounded-md px-2.5 py-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-text-muted)]"
            />
            <div className="flex flex-wrap gap-1.5">
              {STATUS_COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewStatusForm({ ...newStatusForm, color: c })}
                  className={[
                    "w-4 h-4 rounded-full shrink-0 transition-transform",
                    newStatusForm.color === c ? "scale-125 ring-1 ring-white/50 ring-offset-1 ring-offset-[var(--color-surface-overlay)]" : "opacity-50 hover:opacity-100",
                  ].join(" ")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddStatus}
                className="flex-1 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setNewStatusForm(null)}
                className="flex-1 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setNewStatusForm({ label: "", color: "#6b7280" })}
            className="w-72 shrink-0 flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border-subtle)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-default)] transition-colors text-sm gap-1.5 px-4"
          >
            <span className="text-lg leading-none">+</span> Add Status
          </button>
        )}
      </div>

      
    </div>
  )
}

function KanbanCard({
  node,
  preset,
  onClick,
  onTitleChange,
}: {
  node: Node
  preset: { categories: { name: string; color: string }[] }
  onClick: () => void
  onTitleChange: (title: string) => void
}) {
  const data = node.data as TaskNodeData
  const dept = (data.department as string) ?? ""
  const priority = (data.priority as Priority) ?? "medium"
  const assignee = (data.assignee as string) ?? ""
  const labels = (data.labels as { text: string; color: string }[]) ?? []
  const dueDate = (data.dueDate as string | null) ?? null
  const categoryColor = getCategoryColor(preset.categories, dept)

  const initials = assignee
    ? assignee.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("")
    : ""

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(data.title as string)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commitTitle = () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== data.title) {
      onTitleChange(trimmed)
    } else {
      setEditValue(data.title as string)
    }
    setEditing(false)
  }

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", node.id)
        e.dataTransfer.effectAllowed = "move"
      }}
      onClick={() => {
        if (!editing) onClick()
      }}
      className="bg-[var(--color-surface-raised)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-3 cursor-pointer hover:border-[var(--color-border-default)] transition-colors flex flex-col gap-2"
    >
      {/* Department color bar */}
      {dept && (
        <div className="h-[2px] -mx-3 -mt-3 rounded-t-lg" style={{ backgroundColor: categoryColor }} />
      )}

      {/* Title — click to edit inline */}
      {editing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitTitle()
            if (e.key === "Escape") { setEditValue(data.title as string); setEditing(false) }
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium bg-transparent border-none outline-none text-[var(--color-text-primary)] w-full px-0 py-0"
        />
      ) : (
        <div
          className="text-sm font-medium text-[var(--color-text-primary)] leading-snug cursor-text hover:bg-white/5 rounded px-1 -mx-1 py-0.5 break-words"
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
        >
          {(data.title as string) || "Untitled"}
        </div>
      )}

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

      {/* Meta row */}
      <div className="flex items-center gap-1.5">
        {/* Priority */}
        <span
          className="text-[10px] font-bold leading-none"
          style={{ color: PRIORITY_COLORS[priority].dot }}
        >
          !
        </span>

        {/* Due date */}
        {dueDate && (
          <span className="text-[10px] text-white/35">
            {new Date(dueDate + "T00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}

        <div className="flex-1" />

        {/* Assignee initials */}
        {initials ? (
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-semibold text-white shrink-0"
            style={{ backgroundColor: stringToColor(assignee) }}
          >
            {initials}
          </div>
        ) : (
          <span className="text-white/25 text-[10px]">Unassigned</span>
        )}
      </div>
    </div>
  )
}
