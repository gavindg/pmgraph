/**
 * NodeCreationPanel — Floating panel for creating a new task node.
 *
 * Replaces browser prompt with an inline dark card that shows
 * a title input and department select. Positioned at the click
 * coordinates on the canvas.
 */
import { useState, useEffect, useRef } from "react"
import type { Department } from "../types"

const DEPARTMENTS: { value: Department; label: string }[] = [
  { value: "", label: "None" },
  { value: "Programming", label: "Programming" },
  { value: "Art", label: "Art" },
  { value: "Design", label: "Design" },
  { value: "Audio", label: "Audio" },
  { value: "QA", label: "QA" },
]

interface NodeCreationPanelProps {
  screenX: number
  screenY: number
  onSubmit: (title: string, department: Department) => void
  onCancel: () => void
}

export default function NodeCreationPanel({
  screenX,
  screenY,
  onSubmit,
  onCancel,
}: NodeCreationPanelProps) {
  const [title, setTitle] = useState("")
  const [department, setDepartment] = useState<Department>("")
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Auto-focus the title input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [onCancel])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(title.trim() || "Untitled", department)
  }

  // Clamp position so the panel doesn't overflow the viewport
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(screenX, window.innerWidth - 260),
    top: Math.min(screenY, window.innerHeight - 200),
    zIndex: 1000,
  }

  return (
    <>
      {/* Backdrop — click to cancel */}
      <div className="fixed inset-0 z-[999]" onClick={onCancel} />

      {/* Panel */}
      <div
        ref={panelRef}
        style={style}
        className="w-56 bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-3"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
          <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            New Task
          </div>

          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title…"
            className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-gray-500 placeholder-gray-600"
          />

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value as Department)}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2.5 py-1.5 w-full focus:outline-none focus:border-gray-500"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded px-3 py-1.5 transition-colors"
          >
            Create
          </button>
        </form>
      </div>
    </>
  )
}
