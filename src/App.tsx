/**
 * App — Root layout component.
 *
 * Layout:
 *   ┌─────────────────────────────────┐
 *   │           FilterBar             │  ← top strip
 *   ├──────────────────────┬──────────┤
 *   │                      │          │
 *   │     GraphCanvas      │TaskPanel │  ← TaskPanel only shown when node selected
 *   │     (flex-1)         │ (w-80)   │
 *   │                      │          │
 *   └──────────────────────┴──────────┘
 *
 * ReactFlowProvider must wrap GraphCanvas so that useReactFlow()
 * works inside it (screenToFlowPosition, getViewport, etc.).
 */
import { ReactFlowProvider } from "@xyflow/react"
import FilterBar from "./components/FilterBar"
import GraphCanvas from "./components/GraphCanvas"
import TaskPanel from "./components/TaskPanel"
import { usePMGraphStore } from "./store/usePMGraphStore"

export default function App() {
  const selectedNodeId = usePMGraphStore((s) => s.selectedNodeId)

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100">
      <FilterBar />
      <div className="flex flex-1 min-h-0">
        <ReactFlowProvider>
          <div className="flex-1 min-w-0">
            <GraphCanvas />
          </div>
        </ReactFlowProvider>
        {selectedNodeId !== null && <TaskPanel />}
      </div>
    </div>
  )
}
