/**
 * GraphCanvas — React Flow canvas wired to the Zustand store.
 *
 * Responsibilities:
 * - Render all nodes/edges from the store (with filter opacity applied)
 * - Handle double-click on canvas → show creation panel at cursor
 * - Ctrl+A → show creation panel at canvas center
 * - Node click → select node (opens TaskPanel)
 * - Edge connect → add edge to store
 * - Edge double-click → remove edge from store
 * - Pass React Flow change handlers (drag, resize, etc.) to store
 */
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  MarkerType,
  ConnectionLineType,
  useReactFlow,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Node,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import TaskNode from "./TaskNode"
import NodeCreationPanel from "./NodeCreationPanel"
import { usePMGraphStore, getFilteredNodeIds } from "../store/usePMGraphStore"
import type { TaskNodeData, Department } from "../types"

// Register custom node types — must be defined outside the component
// to keep the reference stable and avoid remounting nodes every render.
const nodeTypes = { task: TaskNode }

const defaultEdgeOptions = {
  type: "default",
  markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
  style: { stroke: "#6b7280", strokeWidth: 2 },
}

// State for the floating creation panel
interface CreationState {
  flowPos: { x: number; y: number }
  screenX: number
  screenY: number
}

export default function GraphCanvas() {
  const {
    nodes,
    edges,
    filters,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    removeEdge,
    setSelectedNode,
  } = usePMGraphStore()

  const { screenToFlowPosition } = useReactFlow()

  const [creation, setCreation] = useState<CreationState | null>(null)

  // ── Filter opacity ─────────────────────────────────────────────────
  const visibleIds = useMemo(
    () => getFilteredNodeIds(nodes, filters),
    [nodes, filters]
  )

  const displayNodes = useMemo<Node<TaskNodeData>[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: visibleIds.has(n.id) ? 1 : 0.15,
          transition: "opacity 0.2s ease",
        },
      })),
    [nodes, visibleIds]
  )

  const displayEdges = useMemo<Edge[]>(
    () =>
      edges.map((e) => {
        const visible = visibleIds.has(e.source) && visibleIds.has(e.target)
        return {
          ...e,
          style: {
            ...e.style,
            opacity: visible ? 1 : 0.1,
            transition: "opacity 0.2s ease",
          },
        }
      }),
    [edges, visibleIds]
  )

  // ── Node creation ──────────────────────────────────────────────────

  const handleCreationSubmit = useCallback(
    (title: string, department: Department) => {
      if (creation) {
        addNode(creation.flowPos, title, department)
        setCreation(null)
      }
    },
    [creation, addNode]
  )

  const handleCreationCancel = useCallback(() => {
    setCreation(null)
  }, [])

  // Double-click on canvas pane → open creation panel at cursor
  const handleCanvasDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.classList.contains("react-flow__pane")) return
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setCreation({ flowPos, screenX: event.clientX, screenY: event.clientY })
    },
    [screenToFlowPosition]
  )

  // Ctrl+A → open creation panel at viewport center
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "a") {
        e.preventDefault()
        const el = document.querySelector(".react-flow__pane") as HTMLElement
        if (!el) return
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const flowPos = screenToFlowPosition({ x: cx, y: cy })
        setCreation({ flowPos, screenX: cx, screenY: cy })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [screenToFlowPosition])

  // ── Selection ──────────────────────────────────────────────────────

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
  }, [setSelectedNode])

  // ── Edge connections ───────────────────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection)
    },
    [addEdge]
  )

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      removeEdge(edge.id)
    },
    [removeEdge]
  )

  return (
    <div className="w-full h-full relative" onDoubleClick={handleCanvasDoubleClick}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onEdgeDoubleClick={onEdgeDoubleClick}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{ stroke: "#6b7280", strokeWidth: 2 }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#374151"
        />
        <MiniMap
          nodeColor={(n) => {
            const dept = (n.data as TaskNodeData)?.department ?? ""
            const colors: Record<string, string> = {
              "": "#6b7280",
              Programming: "#3b82f6",
              Art: "#ec4899",
              Design: "#a855f7",
              Audio: "#eab308",
              QA: "#22c55e",
            }
            return colors[dept] ?? "#6b7280"
          }}
          maskColor="#111827cc"
          style={{ backgroundColor: "#111827", border: "1px solid #374151" }}
        />
        <Controls style={{ backgroundColor: "#1f2937", border: "1px solid #374151" }} />
      </ReactFlow>

      {/* Floating creation panel */}
      {creation && (
        <NodeCreationPanel
          screenX={creation.screenX}
          screenY={creation.screenY}
          onSubmit={handleCreationSubmit}
          onCancel={handleCreationCancel}
        />
      )}
    </div>
  )
}
