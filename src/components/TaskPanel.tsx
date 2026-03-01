/**
 * TaskPanel — Right-side panel for editing a selected task node.
 *
 * Opens when a node is selected (selectedNodeId !== null).
 * All field changes call updateNode immediately for live updates.
 */
import { usePMGraphStore } from "../store/usePMGraphStore"
import type { Department, Priority, TaskNodeData } from "../types"

const DEPARTMENTS: Department[] = ["", "Programming", "Art", "Design", "Audio", "QA"]
const PRIORITIES: Priority[] = ["low", "medium", "high"]

const DEPT_COLOR: Record<Department, string> = {
  "": "text-gray-400",
  Programming: "text-blue-400",
  Art: "text-pink-400",
  Design: "text-purple-400",
  Audio: "text-yellow-400",
  QA: "text-green-400",
}

const PRIORITY_COLOR: Record<Priority, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-red-400",
}

export default function TaskPanel() {
  const { nodes, selectedNodeId, updateNode, deleteNode, setSelectedNode } =
    usePMGraphStore()

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  if (!selectedNode) return null

  const data = selectedNode.data as TaskNodeData

  // Generic field updater
  const update = (patch: Partial<TaskNodeData>) => updateNode(selectedNode.id, patch)

  const handleDelete = () => {
    deleteNode(selectedNode.id)
    // setSelectedNode(null) is handled inside deleteNode
  }

  return (
    <aside className="w-80 shrink-0 flex flex-col bg-gray-900 border-l border-gray-700 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <h2 className="text-sm font-semibold text-gray-200">Task Details</h2>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-gray-400 hover:text-gray-200 transition-colors text-lg leading-none"
          title="Close panel"
        >
          ×
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 flex flex-col gap-4 px-4 py-4">
        {/* Title */}
        <Field label="Title">
          <input
            className={inputClass}
            value={data.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Task title"
          />
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            className={`${inputClass} resize-none h-20`}
            value={data.description}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="What needs to be done?"
          />
        </Field>

        {/* Priority */}
        <Field label="Priority">
          <select
            className={inputClass}
            value={data.priority}
            onChange={(e) => update({ priority: e.target.value as Priority })}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
          <span className={`text-xs mt-1 ${PRIORITY_COLOR[data.priority]}`}>
            {data.priority}
          </span>
        </Field>

        {/* Department */}
        <Field label="Department">
          <select
            className={inputClass}
            value={data.department}
            onChange={(e) => update({ department: e.target.value as Department })}
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d || "None"}
              </option>
            ))}
          </select>
          <span className={`text-xs mt-1 ${DEPT_COLOR[data.department]}`}>
            {data.department || "None"}
          </span>
        </Field>

        {/* Assignee */}
        <Field label="Assignee">
          <input
            className={inputClass}
            value={data.assignee}
            onChange={(e) => update({ assignee: e.target.value })}
            placeholder="Who owns this?"
          />
        </Field>

        {/* Labels */}
        <Field label="Labels" hint="comma-separated">
          <input
            className={inputClass}
            value={data.labels.join(", ")}
            onChange={(e) =>
              update({
                labels: e.target.value
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean),
              })
            }
            placeholder="bug, blocking, art-pass"
          />
          {data.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {data.labels.map((l) => (
                <span
                  key={l}
                  className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </Field>

        {/* Due Date */}
        <Field label="Due Date">
          <input
            type="date"
            className={inputClass}
            value={data.dueDate ?? ""}
            onChange={(e) =>
              update({ dueDate: e.target.value || null })
            }
          />
        </Field>
      </div>

      {/* Footer actions */}
      <div className="px-4 py-3 border-t border-gray-700">
        <button
          onClick={handleDelete}
          className="w-full py-1.5 rounded text-sm font-medium bg-red-900/40 text-red-400 hover:bg-red-900/70 border border-red-800/50 transition-colors"
        >
          Delete Task
        </button>
        <p className="text-[10px] text-gray-600 mt-2 text-center">
          ID: {selectedNode.id.slice(0, 8)}…
        </p>
      </div>
    </aside>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {label}
        {hint && <span className="ml-1 normal-case text-gray-600">({hint})</span>}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  "bg-gray-800 border border-gray-700 text-gray-100 text-sm rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-gray-500 placeholder-gray-600"
