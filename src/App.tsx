/**
 * App — Root layout component.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │           FilterBar             │  ← top strip
 *   ├──────────────────────┬──────────┤
 *   │                      │          │
 *   │     GraphCanvas      │TaskPanel │  ← TaskPanel always rendered, slides in/out
 *   │     (flex-1)         │ (w-80)   │
 *   │                      │          │
 *   └──────────────────────┴──────────┘
 */
import { ReactFlowProvider } from "@xyflow/react"
import FilterBar from "./components/FilterBar"
import GraphCanvas from "./components/GraphCanvas"
import TaskPanel from "./components/TaskPanel"
import { usePMGraphStore } from "./store/usePMGraphStore"

export default function App() {
  const taskPanelOpen = usePMGraphStore((s) => s.taskPanelOpen)

  return (
    <div className="flex flex-col h-screen bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
      <FilterBar />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <ReactFlowProvider>
          <div className="flex-1 min-w-0">
            <GraphCanvas />
          </div>
        </ReactFlowProvider>
        <TaskPanel isOpen={taskPanelOpen} />
      </div>
    </div>
  )
}
