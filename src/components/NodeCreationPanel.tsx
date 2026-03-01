/**
 * NodeCreationPanel — Full-screen modal for creating a new task node.
 *
 * Inspired by Linear's "New Issue" panel. Center-screen overlay with
 * all task fields. Dimmed backdrop, Escape to cancel, Ctrl+Enter to submit.
 */
import { useState, useEffect, useRef } from "react"
import { usePMGraphStore, getActivePreset } from "../store/usePMGraphStore"
import { PRIORITY_COLORS } from "../utils/colors"
import type { TaskNodeData, Priority } from "../types"

const PRIORITIES: Priority[] = ["low", "medium", "high"]

interface NodeCreationPanelProps {
  onSubmit: (data: Partial<TaskNodeData>) => void
  onCancel: () => void
}

export default function NodeCreationPanel({
  onSubmit,
  onCancel,
}: NodeCreationPanelProps) {
  const preset = usePMGraphStore((s) => getActivePreset(s))
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [department, setDepartment] = useState("")
  const [assignee, setAssignee] = useState("")
  const [priority, setPriority] = useState<Priority>("medium")
  const [labels, setLabels] = useState<string[]>([])
  const [labelInput, setLabelInput] = useState("")
  const [dueDate, setDueDate] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  })

  const handleSubmit = () => {
    onSubmit({
      title: title.trim() || "Untitled",
      description,
      department,
      assignee,
      priority,
      labels,
      dueDate: dueDate || null,
    })
  }

  const addLabel = () => {
    const trimmed = labelInput.trim()
    if (trimmed && !labels.includes(trimmed)) {
      setLabels([...labels, trimmed])
    }
    setLabelInput("")
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[998] bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-lg bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] rounded-xl shadow-2xl pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border-subtle)]">
            <span className="text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
              New Task
            </span>
            <button
              onClick={onCancel}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col gap-4 px-5 py-4">
            {/* Title */}
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title…"
              className="text-base font-semibold bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] w-full"
            />

            {/* Description */}
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description…"
              className={`${inputClass} resize-none h-20`}
            />

            <hr className="border-[var(--color-border-subtle)]" />

            {/* Department chips */}
            <Field label="Department">
              <div className="flex flex-wrap gap-1.5">
                <ChipButton
                  active={department === ""}
                  onClick={() => setDepartment("")}
                >
                  None
                </ChipButton>
                {preset.categories.map((cat) => (
                  <ChipButton
                    key={cat.name}
                    active={department === cat.name}
                    color={cat.color}
                    onClick={() => setDepartment(cat.name)}
                  >
                    {cat.name}
                  </ChipButton>
                ))}
              </div>
            </Field>

            {/* Priority segmented control */}
            <Field label="Priority">
              <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
                {PRIORITIES.map((p) => {
                  const active = priority === p
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
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

            <div className="grid grid-cols-2 gap-3">
              {/* Assignee */}
              <Field label="Assignee">
                <input
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="Who owns this?"
                  className={inputClass}
                />
              </Field>

              {/* Due Date */}
              <Field label="Due Date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            {/* Labels */}
            <Field label="Labels">
              <input
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addLabel()
                  }
                }}
                placeholder="Type and press Enter"
                className={inputClass}
              />
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {labels.map((l) => (
                    <span
                      key={l}
                      className="inline-flex items-center gap-1 bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-[11px] pl-2 pr-1 py-0.5 rounded-full"
                    >
                      {l}
                      <button
                        type="button"
                        onClick={() => setLabels(labels.filter((x) => x !== l))}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors w-4 h-4 flex items-center justify-center"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </Field>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--color-border-subtle)]">
            <span className="text-[11px] text-[var(--color-text-muted)]">
              <kbd className="px-1 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[10px] font-mono">Ctrl+Enter</kbd> to create
            </span>
            <div className="flex gap-2">
              <button
                onClick={onCancel}
                className="px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors duration-150"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  )
}

function ChipButton({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean
  color?: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "text-xs px-2.5 py-1 rounded-full border transition-colors duration-150",
        active
          ? color
            ? "text-white border-transparent"
            : "bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] border-[var(--color-border-default)]"
          : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]",
      ].join(" ")}
      style={active && color ? { backgroundColor: color } : {}}
    >
      {children}
    </button>
  )
}

const inputClass =
  "bg-[var(--color-surface-overlay)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm rounded-md px-2.5 py-1.5 w-full focus:outline-none focus:border-[var(--color-text-muted)] placeholder-[var(--color-text-muted)] transition-colors duration-150"
