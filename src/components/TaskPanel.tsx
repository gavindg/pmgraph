/**
 * TaskPanel — Right-side panel for editing a selected task.
 *
 * Features:
 * - Resizable width via drag handle
 * - Slide-in/out animation via isOpen prop
 * - Inline editable title
 * - Priority as segmented control
 * - Status as chips with add/remove
 * - Department as colored chip buttons (from active preset)
 * - Labels as tag pills with remove
 * - Calendar date picker for due date
 */
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { getPresetById } from "../utils/presets"
import { LABEL_COLORS, PRIORITY_COLORS } from "../utils/colors"
import DropdownInput from "./DropdownInput"
import DatePicker from "./DatePicker"
import { DUMMY_USERS } from "../utils/users"
import type { Priority, TaskNodeData, LabelItem } from "../types"

const PRIORITIES: Priority[] = ["low", "medium", "high"]

const STATUS_COLOR_OPTIONS = [
  "#6b7280", "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
]

export default function TaskPanel({ isOpen }: { isOpen: boolean }) {
  const nodes = usePMGraphStore((s) => s.nodes)
  const selectedNodeId = usePMGraphStore((s) => s.selectedNodeId)
  const updateNode = usePMGraphStore((s) => s.updateNode)
  const deleteNode = usePMGraphStore((s) => s.deleteNode)
  const setTaskPanelOpen = usePMGraphStore((s) => s.setTaskPanelOpen)
  const addStatus = usePMGraphStore((s) => s.addStatus)
  const removeStatus = usePMGraphStore((s) => s.removeStatus)
  const activePresetId = usePMGraphStore((s) => s.activePresetId)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const baseStatusIds = useMemo(() => {
    return new Set(getPresetById(activePresetId).statuses.map((s) => s.id))
  }, [activePresetId])

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const data = selectedNode?.data as TaskNodeData | undefined

  const update = (patch: Partial<TaskNodeData>) => {
    if (selectedNode) updateNode(selectedNode.id, patch)
  }

  // ── Resizable width ──────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(320)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(320)

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = panelWidth
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [panelWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = startXRef.current - e.clientX
      const newWidth = Math.max(280, Math.min(600, startWidthRef.current + delta))
      setPanelWidth(newWidth)
    }
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])

  return (
    <aside
      className={[
        "shrink-0 flex bg-[var(--color-surface-raised)]/95 backdrop-blur-md",
        "border-l border-[var(--color-border-default)] overflow-y-auto overflow-x-hidden",
        "transition-all duration-200 ease-out",
        isOpen ? "" : "w-0 border-l-0",
      ].join(" ")}
      style={isOpen ? { width: panelWidth } : undefined}
    >
      {/* Resize handle */}
      {isOpen && (
        <div
          onMouseDown={onResizeStart}
          className="w-1 shrink-0 cursor-col-resize hover:bg-blue-500/30 active:bg-blue-500/50 transition-colors"
        />
      )}

      {!data ? null : (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              Task Details
            </span>
            <button
              onClick={() => setTaskPanelOpen(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-5 px-4 py-4">
            {/* ── Identity ─────────────────────────────────────── */}
            <EditableTitle
              value={data.title as string}
              onChange={(title) => update({ title })}
            />

            <Field label="Description">
              <textarea
                className={`${inputClass} resize-none h-20`}
                value={data.description as string}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="What needs to be done?"
              />
            </Field>

            <hr className="border-[var(--color-border-subtle)]" />

            {/* ── Classification ────────────────────────────────── */}
            <SectionHeader>Classification</SectionHeader>

            {/* Status — dropdown + add/remove */}
            <Field label="Status">
              <DropdownInput
                value={preset.statuses.find((s) => s.id === (data.status as string))?.label ?? (data.status as string)}
                onChange={(v) => {
                  const match = preset.statuses.find((s) => s.label.toLowerCase() === v.toLowerCase())
                  if (match) update({ status: match.id })
                }}
                onSelect={(v) => {
                  const match = preset.statuses.find((s) => s.label === v)
                  if (match) update({ status: match.id })
                }}
                suggestions={preset.statuses.map((s) => s.label)}
                colors={Object.fromEntries(preset.statuses.map((s) => [s.label, s.color]))}
                placeholder="Select status…"
                className={inputClass}
              />
              <StatusControl
                statuses={preset.statuses}
                baseStatusIds={baseStatusIds}
                onAdd={addStatus}
                onRemove={removeStatus}
              />
            </Field>

            {/* Priority — dropdown */}
            <Field label="Priority">
              <DropdownInput
                value={(data.priority as string).charAt(0).toUpperCase() + (data.priority as string).slice(1)}
                onChange={(v) => {
                  const match = PRIORITIES.find((p) => p.toLowerCase() === v.toLowerCase())
                  if (match) update({ priority: match })
                }}
                onSelect={(v) => {
                  const match = PRIORITIES.find((p) => p === v.toLowerCase())
                  if (match) update({ priority: match })
                }}
                suggestions={PRIORITIES.map((p) => p.charAt(0).toUpperCase() + p.slice(1))}
                colors={{ Low: PRIORITY_COLORS.low.dot, Medium: PRIORITY_COLORS.medium.dot, High: PRIORITY_COLORS.high.dot }}
                placeholder="Select priority…"
                className={inputClass}
              />
            </Field>

            {/* Department — dropdown with colors */}
            <Field label="Department">
              <DropdownInput
                value={data.department as string}
                onChange={(v) => update({ department: v })}
                onSelect={(v) => update({ department: v })}
                suggestions={preset.categories.map((c) => c.name)}
                colors={Object.fromEntries(preset.categories.map((c) => [c.name, c.color]))}
                placeholder="Select department…"
                className={inputClass}
              />
            </Field>

            <hr className="border-[var(--color-border-subtle)]" />

            {/* ── Metadata ──────────────────────────────────────── */}
            <SectionHeader>Metadata</SectionHeader>

            <Field label="Assignee">
              <DropdownInput
                value={data.assignee as string}
                onChange={(v) => update({ assignee: v })}
                onSelect={(v) => update({ assignee: v })}
                suggestions={DUMMY_USERS}
                placeholder="Who owns this?"
                className={inputClass}
              />
            </Field>

            <Field label="Labels">
              <LabelEditor
                labels={data.labels as LabelItem[]}
                onChange={(labels) => update({ labels })}
              />
            </Field>

            <Field label="Due Date">
              <DatePicker
                value={(data.dueDate as string) ?? ""}
                onChange={(v) => update({ dueDate: v || null })}
                className={inputClass}
              />
            </Field>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-[var(--color-border-subtle)]">
            <button
              onClick={() => {
                if (selectedNode) deleteNode(selectedNode.id)
              }}
              className="w-full py-1.5 rounded-md text-xs font-medium bg-red-950/50 text-red-400 hover:bg-red-950/80 border border-red-900/30 transition-colors duration-150"
            >
              Delete Task
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)] -mb-2">
      {children}
    </span>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function EditableTitle({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="text-base font-semibold bg-transparent border-none outline-none text-[var(--color-text-primary)] px-0 py-0 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(false)
        }}
      />
    )
  }

  return (
    <h3
      onClick={() => setEditing(true)}
      className="text-base font-semibold text-[var(--color-text-primary)] cursor-text hover:bg-white/5 rounded px-1 -mx-1 py-0.5 transition-colors duration-150"
    >
      {value || "Untitled"}
    </h3>
  )
}

function LabelEditor({
  labels,
  onChange,
}: {
  labels: LabelItem[]
  onChange: (labels: LabelItem[]) => void
}) {
  const [input, setInput] = useState("")
  const [color, setColor] = useState<string>(LABEL_COLORS[0])

  const addLabel = () => {
    const trimmed = input.trim()
    if (trimmed && !labels.some((l) => l.text === trimmed)) {
      onChange([...labels, { text: trimmed, color }])
    }
    setInput("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          className={`${inputClass} flex-1`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              addLabel()
            }
          }}
          placeholder="Type and press Enter"
        />
        <div className="flex items-center gap-1">
          {LABEL_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={[
                "w-3.5 h-3.5 rounded-full shrink-0 transition-transform duration-100",
                color === c ? "scale-125 ring-1 ring-white/50 ring-offset-1 ring-offset-[var(--color-surface-raised)]" : "opacity-50 hover:opacity-100",
              ].join(" ")}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labels.map((l) => (
            <span
              key={l.text}
              className="inline-flex items-center gap-1 text-white/90 text-[11px] pl-2 pr-1 py-0.5 rounded-full"
              style={{ backgroundColor: l.color + "44" }}
            >
              {l.text}
              <button
                onClick={() => onChange(labels.filter((x) => x.text !== l.text))}
                className="text-white/40 hover:text-white/80 transition-colors w-4 h-4 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusControl({
  statuses,
  baseStatusIds,
  onAdd,
  onRemove,
}: {
  statuses: { id: string; label: string; color: string }[]
  baseStatusIds: Set<string>
  onAdd: (status: { id: string; label: string; color: string }) => void
  onRemove: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState("")
  const [newColor, setNewColor] = useState("#6b7280")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  const handleAdd = () => {
    const label = newLabel.trim()
    if (!label) { setAdding(false); return }
    const id = label.toLowerCase().replace(/\s+/g, "-")
    if (statuses.some((s) => s.id === id)) { setAdding(false); return }
    onAdd({ id, label, color: newColor })
    setNewLabel("")
    setAdding(false)
  }

  const customStatuses = statuses.filter((s) => !baseStatusIds.has(s.id))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {customStatuses.map((s) => (
          <div key={s.id} className="relative group">
            <span
              className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)]"
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              {s.label}
              <button
                onClick={() => onRemove(s.id)}
                className="text-[var(--color-text-muted)] hover:text-red-400 transition-colors text-[10px] leading-none ml-0.5"
              >
                ×
              </button>
            </span>
          </div>
        ))}
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-2 py-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-overlay)] transition-colors"
        >
          + Add Status
        </button>
      </div>
      {adding && (
        <div className="flex flex-col gap-2 p-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-overlay)]">
          <input
            ref={inputRef}
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
              if (e.key === "Escape") setAdding(false)
            }}
            placeholder="Status name…"
            className="text-xs bg-transparent border border-[var(--color-border-default)] rounded-md px-2 py-1 text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none focus:border-[var(--color-text-muted)]"
          />
          <div className="flex gap-1">
            {STATUS_COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={[
                  "w-3.5 h-3.5 rounded-full shrink-0 transition-transform",
                  newColor === c ? "scale-125 ring-1 ring-white/50 ring-offset-1 ring-offset-[var(--color-surface-overlay)]" : "opacity-50 hover:opacity-100",
                ].join(" ")}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleAdd} className="flex-1 py-1 text-[10px] font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors">
              Add
            </button>
            <button onClick={() => setAdding(false)} className="flex-1 py-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const inputClass =
  "bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:border-[var(--color-text-muted)] placeholder-[var(--color-text-muted)] transition-colors duration-150"
