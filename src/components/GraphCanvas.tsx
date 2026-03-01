/**
 * GraphCanvas — React Flow canvas wired to the Zustand store.
 *
 * Responsibilities:
 * - Render nodes/edges with filter opacity + synthetic group edges
 * - Typed edges (blocks/relates/triggers) with click-to-cycle
 * - Double-click canvas → instant create node at cursor
 * - Ctrl+A → instant create node at viewport center
 * - Wire-to-create: drag from output handle to empty space → NodeFocusPanel (create)
 * - F key → NodeFocusPanel (edit) for selected node
 * - Ctrl+Z / Ctrl+Shift+Z → undo / redo
 * - Ctrl+G → create group node at viewport center
 * - Double-click node → open TaskPanel
 * - Escape → close panels | Delete → remove selected node
 * - Group collapse → synthetic edge computation
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Controls,
  ConnectionLineType,
  useReactFlow,
  type Connection,
  type NodeMouseHandler,
  type EdgeMouseHandler,
  type Edge,
  type Node,
  type OnConnectStart,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import TaskNode from "./TaskNode"
import GroupNode from "./GroupNode"
import TypedEdge, { EdgeArrowDefs } from "./TypedEdge"
import NodeFocusPanel from "./NodeFocusPanel"
import { usePMGraphStore, getActivePreset, getFilteredNodeIds } from "../store/usePMGraphStore"
import { getCategoryColor } from "../utils/colors"
import type { TaskNodeData, PMEdgeData, EdgeType } from "../types"

// Stable references — defined outside component to avoid remounts
const nodeTypes = { task: TaskNode, group: GroupNode }
const edgeTypes = { typed: TypedEdge }
const defaultEdgeOptions = { type: "typed" }

// Edge type strength for synthetic edge aggregation (higher = stronger)
const EDGE_STRENGTH: Record<EdgeType, number> = { blocks: 3, triggers: 2, relates: 1 }

interface FocusPanelState {
  mode: "create" | "edit"
  nodeId?: string
  flowPos?: { x: number; y: number }
  pendingConnection?: { source: string; sourceHandle: string | null }
}

export default function GraphCanvas() {
  const nodes = usePMGraphStore((s) => s.nodes)
  const edges = usePMGraphStore((s) => s.edges)
  const filters = usePMGraphStore((s) => s.filters)
  const selectedNodeId = usePMGraphStore((s) => s.selectedNodeId)
  const taskPanelOpen = usePMGraphStore((s) => s.taskPanelOpen)
  const collapsedGroups = usePMGraphStore((s) => s.collapsedGroups)
  const onNodesChange = usePMGraphStore((s) => s.onNodesChange)
  const onEdgesChange = usePMGraphStore((s) => s.onEdgesChange)
  const addNode = usePMGraphStore((s) => s.addNode)
  const updateNode = usePMGraphStore((s) => s.updateNode)
  const addEdge = usePMGraphStore((s) => s.addEdge)
  const removeEdge = usePMGraphStore((s) => s.removeEdge)
  const setSelectedNode = usePMGraphStore((s) => s.setSelectedNode)
  const setTaskPanelOpen = usePMGraphStore((s) => s.setTaskPanelOpen)
  const deleteNode = usePMGraphStore((s) => s.deleteNode)
  const cycleEdgeType = usePMGraphStore((s) => s.cycleEdgeType)
  const addGroupNode = usePMGraphStore((s) => s.addGroupNode)
  const undo = usePMGraphStore((s) => s.undo)
  const redo = usePMGraphStore((s) => s.redo)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const { screenToFlowPosition } = useReactFlow()
  const [focusPanel, setFocusPanel] = useState<FocusPanelState | null>(null)

  // connectingRef: tracks the source node/handle for wire-to-create
  // connectionMadeRef: set true when onConnect fires (real connection), so
  // onConnectEnd knows NOT to open the creation panel
  const connectingRef = useRef<{ nodeId: string; handleId: string | null } | null>(null)
  const connectionMadeRef = useRef(false)

  // ── Filter opacity ─────────────────────────────────────────────────
  const visibleIds = useMemo(
    () => getFilteredNodeIds(nodes, filters),
    [nodes, filters]
  )

  const displayNodes = useMemo<Node[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        style: {
          ...n.style,
          opacity: n.hidden ? 0 : visibleIds.has(n.id) ? 1 : 0.15,
          transition: "opacity 0.2s ease",
        },
      })),
    [nodes, visibleIds]
  )

  // ── Synthetic edges for collapsed groups ───────────────────────────
  const displayEdges = useMemo<Edge[]>(() => {
    // Build child→group mapping for collapsed groups
    const childToGroup = new Map<string, string>()
    for (const node of nodes) {
      if (node.parentId && collapsedGroups.has(node.parentId)) {
        childToGroup.set(node.id, node.parentId)
      }
    }

    const hasSynthetics = childToGroup.size > 0
    const syntheticMap = new Map<string, Edge>()
    const realEdges: Edge[] = []

    for (const e of edges) {
      const remappedSource = childToGroup.get(e.source)
      const remappedTarget = childToGroup.get(e.target)

      if (!hasSynthetics || (!remappedSource && !remappedTarget)) {
        // Normal edge — apply filter opacity, but blockers always visible
        const edgeType = (e.data as PMEdgeData)?.edgeType ?? "blocks"
        const visible = visibleIds.has(e.source) && visibleIds.has(e.target)
        const isBlocker = edgeType === "blocks"
        realEdges.push({
          ...e,
          style: {
            ...e.style,
            opacity: isBlocker ? 1 : visible ? 1 : 0.1,
            transition: "opacity 0.2s ease",
          },
        })
        continue
      }

      // Edge involves a collapsed child — create or merge synthetic
      const synSource = remappedSource ?? e.source
      const synTarget = remappedTarget ?? e.target
      if (synSource === synTarget) continue // internal group edge

      const key = `${synSource}-${synTarget}`
      const edgeType = (e.data as PMEdgeData)?.edgeType ?? "blocks"
      const existing = syntheticMap.get(key)

      if (existing) {
        const existingData = existing.data as PMEdgeData
        const existingStrength = EDGE_STRENGTH[existingData.edgeType]
        const newStrength = EDGE_STRENGTH[edgeType]
        syntheticMap.set(key, {
          ...existing,
          data: {
            ...existingData,
            count: (existingData.count ?? 1) + 1,
            edgeType: newStrength > existingStrength ? edgeType : existingData.edgeType,
          },
        })
      } else {
        syntheticMap.set(key, {
          id: `synthetic-${key}`,
          type: "typed",
          source: synSource,
          target: synTarget,
          sourceHandle: null,
          targetHandle: null,
          data: { edgeType, synthetic: true, count: 1 } as PMEdgeData,
          style: { opacity: 1, transition: "opacity 0.2s ease" },
        })
      }
    }

    return [...realEdges, ...Array.from(syntheticMap.values())]
  }, [edges, nodes, collapsedGroups, visibleIds])

  // ── NodeFocusPanel callbacks ────────────────────────────────────────

  const handleFocusPanelSubmit = useCallback(
    (data: Partial<TaskNodeData>) => {
      if (!focusPanel) return
      if (focusPanel.mode === "edit" && focusPanel.nodeId) {
        updateNode(focusPanel.nodeId, data)
      } else if (focusPanel.flowPos) {
        const newId = addNode(focusPanel.flowPos, data)
        if (focusPanel.pendingConnection) {
          addEdge({
            source: focusPanel.pendingConnection.source,
            target: newId,
            sourceHandle: focusPanel.pendingConnection.sourceHandle,
            targetHandle: "in",
          } as Connection)
        }
      }
      setFocusPanel(null)
    },
    [focusPanel, updateNode, addNode, addEdge]
  )

  const handleFocusPanelClose = useCallback(() => setFocusPanel(null), [])

  // ── Canvas double-click → open NodeFocusPanel at cursor ─────────────
  const handleCanvasDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.classList.contains("react-flow__pane")) return
      const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setFocusPanel({ mode: "create", flowPos })
    },
    [screenToFlowPosition]
  )

  // ── Wire-to-create ────────────────────────────────────────────────

  // Only track source handles — target handles should not trigger wire-to-create
  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    if (params.handleType !== "source") return
    connectingRef.current = {
      nodeId: params.nodeId!,
      handleId: params.handleId ?? null,
    }
  }, [])

  const onConnect = useCallback(
    (connection: Connection) => {
      connectionMadeRef.current = true
      addEdge(connection)
    },
    [addEdge]
  )

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      // Open creation panel only when:
      // 1. No real connection was made (connectionMadeRef is false)
      // 2. Dropped directly on the pane (not a node or handle)
      if (
        !connectionMadeRef.current &&
        connectingRef.current &&
        target.classList.contains("react-flow__pane")
      ) {
        const clientX = "clientX" in event ? event.clientX : event.changedTouches[0].clientX
        const clientY = "clientY" in event ? event.clientY : event.changedTouches[0].clientY
        const flowPos = screenToFlowPosition({ x: clientX, y: clientY })
        setFocusPanel({
          mode: "create",
          flowPos,
          pendingConnection: {
            source: connectingRef.current.nodeId,
            sourceHandle: connectingRef.current.handleId,
          },
        })
      }
      connectingRef.current = null
      connectionMadeRef.current = false
    },
    [screenToFlowPosition]
  )

  // ── Keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

      if (e.key === "Escape") {
        if (focusPanel) {
          setFocusPanel(null)
        } else if (taskPanelOpen) {
          setTaskPanelOpen(false)
        } else if (selectedNodeId) {
          setSelectedNode(null)
        }
        return
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !isInput && selectedNodeId) {
        e.preventDefault()
        deleteNode(selectedNodeId)
        return
      }

      if (e.ctrlKey && e.shiftKey && e.key === "Z" && !isInput) {
        e.preventDefault()
        redo()
        return
      }

      if (e.ctrlKey && e.key === "z" && !isInput) {
        e.preventDefault()
        undo()
        return
      }

      if (e.ctrlKey && e.key === "a" && !isInput) {
        e.preventDefault()
        const el = document.querySelector(".react-flow__pane") as HTMLElement
        if (!el) return
        const rect = el.getBoundingClientRect()
        const flowPos = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        setFocusPanel({ mode: "create", flowPos })
        return
      }

      if (e.key === "f" && !isInput && selectedNodeId) {
        e.preventDefault()
        setFocusPanel({ mode: "edit", nodeId: selectedNodeId })
        return
      }

      if (e.ctrlKey && e.key === "g" && !isInput) {
        e.preventDefault()
        const el = document.querySelector(".react-flow__pane") as HTMLElement
        if (!el) return
        const rect = el.getBoundingClientRect()
        const flowPos = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
        addGroupNode(flowPos, "New Group", "#6b7280")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [
    focusPanel, taskPanelOpen, selectedNodeId,
    screenToFlowPosition, setSelectedNode, setTaskPanelOpen,
    deleteNode, addNode, addGroupNode, undo, redo,
  ])

  // ── Selection ──────────────────────────────────────────────────────

  const onNodeClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node.id)
    },
    [setSelectedNode]
  )

  const onNodeDoubleClick: NodeMouseHandler = useCallback(
    (_, node) => {
      setSelectedNode(node.id)
      setTaskPanelOpen(true)
    },
    [setSelectedNode, setTaskPanelOpen]
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    setTaskPanelOpen(false)
  }, [setSelectedNode, setTaskPanelOpen])

  // ── Edge interactions ──────────────────────────────────────────────

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (edge.id.startsWith("synthetic-")) return
      cycleEdgeType(edge.id)
    },
    [cycleEdgeType]
  )

  const onEdgeDoubleClick: EdgeMouseHandler = useCallback(
    (_, edge) => {
      if (edge.id.startsWith("synthetic-")) return
      removeEdge(edge.id)
    },
    [removeEdge]
  )

  // ── MiniMap node color ─────────────────────────────────────────────
  const minimapNodeColor = useCallback(
    (n: Node) => {
      if (n.type === "group") return (n.data as { color?: string })?.color ?? "#6b7280"
      const dept = (n.data as TaskNodeData)?.department ?? ""
      return getCategoryColor(preset.categories, dept as string)
    },
    [preset.categories]
  )

  return (
    <div className="w-full h-full relative" onDoubleClick={handleCanvasDoubleClick}>
      <EdgeArrowDefs />
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
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
          nodeColor={minimapNodeColor}
          maskColor="#111827cc"
          style={{
            backgroundColor: "#111827",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-panel)",
          }}
        />
        <Controls />
      </ReactFlow>

      {/* Empty state */}
      {nodes.length === 0 && !focusPanel && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[var(--color-text-muted)] text-sm">
              No tasks yet. Double-click or{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-xs font-mono">
                Ctrl+A
              </kbd>{" "}
              to create one.
            </p>
          </div>
        </div>
      )}

      {/* NodeFocusPanel — create or edit */}
      {focusPanel && (
        <NodeFocusPanel
          mode={focusPanel.mode}
          nodeId={focusPanel.nodeId}
          onSubmit={handleFocusPanelSubmit}
          onClose={handleFocusPanelClose}
        />
      )}
    </div>
  )
}
