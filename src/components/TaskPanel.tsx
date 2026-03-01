/**
 * TaskPanel — Polished right-side panel for editing a selected task.
 *
 * Features:
 * - Slide-in/out animation via isOpen prop
 * - Inline editable title
 * - Priority as segmented control
 * - Department as colored chip buttons (from active preset)
 * - Labels as tag pills with remove
 * - Clean section grouping
 */
import { useState, useRef, useEffect } from "react"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { PRIORITY_COLORS, LABEL_COLORS } from "../utils/colors"
import type { Priority, TaskNodeData, LabelItem } from "../types"

const PRIORITIES: Priority[] = ["low", "medium", "high"]

export default function TaskPanel({ isOpen }: { isOpen: boolean }) {
  const nodes = usePMGraphStore((s) => s.nodes)
  const selectedNodeId = usePMGraphStore((s) => s.selectedNodeId)
  const updateNode = usePMGraphStore((s) => s.updateNode)
  const deleteNode = usePMGraphStore((s) => s.deleteNode)
  const setTaskPanelOpen = usePMGraphStore((s) => s.setTaskPanelOpen)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  const data = selectedNode?.data as TaskNodeData | undefined

  const update = (patch: Partial<TaskNodeData>) => {
    if (selectedNode) updateNode(selectedNode.id, patch)
  }

  return (
    <aside
      className={[
        "w-80 shrink-0 flex flex-col bg-[var(--color-surface-raised)]/95 backdrop-blur-md",
        "border-l border-[var(--color-border-default)] overflow-y-auto overflow-x-hidden",
        "transform transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "translate-x-full",
      ].join(" ")}
    >
      {!data ? null : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
            <span className="text-[10px] uppercase tracking-widest text-text-muted">
              Task Details
            </span>
            <button
              onClick={() => setTaskPanelOpen(false)}
              className="text-text-muted hover:text-text-primary transition-colors text-lg leading-none"
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

            {/* Priority — segmented control */}
            <Field label="Priority">
              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                {PRIORITIES.map((p) => {
                  const active = data.priority === p
                  return (
                    <button
                      key={p}
                      onClick={() => update({ priority: p })}
                      className={[
                        "flex-1 py-1.5 text-xs font-medium transition-colors duration-150",
                        active
                          ? "text-white"
                          : "bg-[var(--color-surface-overlay)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                      ].join(" ")}
                      style={active ? { backgroundColor: PRIORITY_COLORS[p].bg } : {}}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Department — color chips */}
            <Field label="Department">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => update({ department: "" })}
                  className={[
                    "text-xs px-2.5 py-1 rounded-full border transition-colors duration-150",
                    data.department === ""
                      ? "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
                      : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
                  ].join(" ")}
                >
                  None
                </button>
                {preset.categories.map((cat) => {
                  const active = data.department === cat.name
                  return (
                    <button
                      key={cat.name}
                      onClick={() => update({ department: cat.name })}
                      className={[
                        "text-xs px-2.5 py-1 rounded-full border transition-colors duration-150",
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
            </Field>

            <hr className="border-[var(--color-border-subtle)]" />

            {/* ── Metadata ──────────────────────────────────────── */}
            <SectionHeader>Metadata</SectionHeader>

            <Field label="Assignee">
              <input
                className={inputClass}
                value={data.assignee as string}
                onChange={(e) => update({ assignee: e.target.value })}
                placeholder="Who owns this?"
              />
            </Field>

            <Field label="Labels">
              <LabelEditor
                labels={data.labels as LabelItem[]}
                onChange={(labels) => update({ labels })}
              />
            </Field>

            <Field label="Due Date">
              <input
                type="date"
                className={inputClass}
                value={(data.dueDate as string) ?? ""}
                onChange={(e) => update({ dueDate: e.target.value || null })}
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
        </>
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

const inputClass =
  "bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:border-[var(--color-text-muted)] placeholder-[var(--color-text-muted)] transition-colors duration-150"
