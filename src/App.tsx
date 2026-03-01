/**
 * App — Root layout component.
 *
 * Switches between GraphCanvas and KanbanView based on activeView state.
 * TaskPanel and CommandBar are shared across both views.
 */
import { useState, useEffect } from "react"
import { ReactFlowProvider } from "@xyflow/react"
import FilterBar from "./components/FilterBar"
import GraphCanvas from "./components/GraphCanvas"
import KanbanView from "./components/KanbanView"
import TaskPanel from "./components/TaskPanel"
import CommandBar from "./components/CommandBar"
import { usePMGraphStore } from "./store/usePMGraphStore"

export default function App() {
  const taskPanelOpen = usePMGraphStore((s) => s.taskPanelOpen)
  const activeView = usePMGraphStore((s) => s.activeView)
  const setActiveView = usePMGraphStore((s) => s.setActiveView)
  const [commandBarOpen, setCommandBarOpen] = useState(false)
  // Signal to GraphCanvas to open create panel after switching from kanban
  const [pendingCreate, setPendingCreate] = useState(false)
  // Signal to GraphCanvas to focus on a node after command bar navigation
  const [pendingFocusNode, setPendingFocusNode] = useState<string | null>(null)

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setCommandBarOpen((prev) => !prev)
        return
      }

      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
      if (isInput) return

      // T → toggle view
      if (e.key === "t" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setActiveView(activeView === "graph" ? "kanban" : "graph")
        return
      }

      // A → create node (from kanban, switch to graph first)
      if (e.key === "a" && !e.ctrlKey && !e.metaKey && activeView === "kanban") {
        e.preventDefault()
        setPendingCreate(true)
        setActiveView("graph")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [activeView, setActiveView])

  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
      <FilterBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {activeView === "graph" ? (
          <ReactFlowProvider>
            <div className="flex-1 min-w-0">
              <GraphCanvas
                pendingCreate={pendingCreate}
                onPendingCreateHandled={() => setPendingCreate(false)}
                pendingFocusNode={pendingFocusNode}
                onPendingFocusHandled={() => setPendingFocusNode(null)}
              />
            </div>
          </ReactFlowProvider>
        ) : (
          <KanbanView />
        )}
        <TaskPanel isOpen={taskPanelOpen} />
      </div>

      {/* Command Bar (Ctrl+K) */}
      {commandBarOpen && (
        <CommandBar
          onClose={() => setCommandBarOpen(false)}
          onCreateTask={() => {
            setCommandBarOpen(false)
            setActiveView("graph")
          }}
          onNavigateToNode={(nodeId) => {
            setCommandBarOpen(false)
            setActiveView("graph")
            setPendingFocusNode(nodeId)
          }}
        />
      )}
    </div>
  )
}
