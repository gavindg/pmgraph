/**
 * GraphCanvas — React Flow canvas wired to the Zustand store.
 *
 * Responsibilities:
 * - Render nodes/edges with filter opacity + synthetic group edges
 * - Typed edges (blocks/relates/triggers) with click-to-cycle
 * - Double-click canvas → creation modal | Ctrl+A → creation modal at center
 * - Wire-to-create: drag from handle to empty space → creation modal
 * - Ctrl+G → create group node at viewport center
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
import TypedEdge from "./TypedEdge"
import NodeCreationPanel from "./NodeCreationPanel"
import { usePMGraphStore, getActivePreset, getFilteredNodeIds } from "../store/usePMGraphStore"
import { getCategoryColor } from "../utils/colors"
import type { TaskNodeData, PMEdgeData, EdgeType } from "../types"

// Stable references — defined outside component to avoid remounts
const nodeTypes = { task: TaskNode, group: GroupNode }
const edgeTypes = { typed: TypedEdge }
const defaultEdgeOptions = { type: "typed" }

// Edge type strength for synthetic edge aggregation (higher = stronger)
const EDGE_STRENGTH: Record<EdgeType, number> = { blocks: 3, triggers: 2, relates: 1 }

interface CreationState {
  flowPos: { x: number; y: number }
  pendingConnection?: { source: string; sourceHandle: string | null }
}

export default function GraphCanvas() {
  const nodes = usePMGraphStore((s) => s.nodes)
  const edges = usePMGraphStore((s) => s.edges)
  const filters = usePMGraphStore((s) => s.filters)
  const selectedNodeId = usePMGraphStore((s) => s.selectedNodeId)
  const collapsedGroups = usePMGraphStore((s) => s.collapsedGroups)
  const onNodesChange = usePMGraphStore((s) => s.onNodesChange)
  const onEdgesChange = usePMGraphStore((s) => s.onEdgesChange)
  const addNode = usePMGraphStore((s) => s.addNode)
  const addEdge = usePMGraphStore((s) => s.addEdge)
  const removeEdge = usePMGraphStore((s) => s.removeEdge)
  const setSelectedNode = usePMGraphStore((s) => s.setSelectedNode)
  const deleteNode = usePMGraphStore((s) => s.deleteNode)
  const cycleEdgeType = usePMGraphStore((s) => s.cycleEdgeType)
  const addGroupNode = usePMGraphStore((s) => s.addGroupNode)
  const preset = usePMGraphStore((s) => getActivePreset(s))

  const { screenToFlowPosition } = useReactFlow()
  const [creation, setCreation] = useState<CreationState | null>(null)
  const connectingRef = useRef<{ nodeId: string; handleId: string | null } | null>(null)

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

  // ── Node creation ──────────────────────────────────────────────────

  const handleCreationSubmit = useCallback(
    (data: Partial<TaskNodeData>) => {
      if (!creation) return
      const newId = addNode(creation.flowPos, data)
      // Wire-to-create: auto-connect if pending connection
      if (creation.pendingConnection) {
        addEdge({
          source: creation.pendingConnection.source,
          target: newId,
          sourceHandle: creation.pendingConnection.sourceHandle,
          targetHandle: "in",
        } as Connection)
      }
      setCreation(null)
    },
    [creation, addNode, addEdge]
  )

  const handleCreationCancel = useCallback(() => {
    setCreation(null)
  }, [])

  // Double-click canvas pane → open creation modal
  const handleCanvasDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement
      if (!target.classList.contains("react-flow__pane")) return
      const flowPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })
      setCreation({ flowPos })
    },
    [screenToFlowPosition]
  )

  // ── Wire-to-create ────────────────────────────────────────────────

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectingRef.current = {
      nodeId: params.nodeId!,
      handleId: params.handleId ?? null,
    }
  }, [])

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement
      // Check if dropped on empty space (not a handle or node)
      if (
        target.classList.contains("react-flow__pane") ||
        target.closest(".react-flow__pane")?.classList.contains("react-flow__pane")
      ) {
        if (!connectingRef.current) return
        const clientX = "clientX" in event ? event.clientX : event.changedTouches[0].clientX
        const clientY = "clientY" in event ? event.clientY : event.changedTouches[0].clientY
        const flowPos = screenToFlowPosition({ x: clientX, y: clientY })
        setCreation({
          flowPos,
          pendingConnection: {
            source: connectingRef.current.nodeId,
            sourceHandle: connectingRef.current.handleId,
          },
        })
      }
      connectingRef.current = null
    },
    [screenToFlowPosition]
  )

  // ── Keyboard shortcuts ─────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

      if (e.key === "Escape") {
        if (creation) {
          setCreation(null)
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

      if (e.ctrlKey && e.key === "a" && !isInput) {
        e.preventDefault()
        const el = document.querySelector(".react-flow__pane") as HTMLElement
        if (!el) return
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const flowPos = screenToFlowPosition({ x: cx, y: cy })
        setCreation({ flowPos })
      }

      if (e.ctrlKey && e.key === "g" && !isInput) {
        e.preventDefault()
        const el = document.querySelector(".react-flow__pane") as HTMLElement
        if (!el) return
        const rect = el.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const flowPos = screenToFlowPosition({ x: cx, y: cy })
        addGroupNode(flowPos, "New Group", "#6b7280")
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [screenToFlowPosition, creation, selectedNodeId, setSelectedNode, deleteNode, addGroupNode])

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

  // ── Edge interactions ──────────────────────────────────────────────

  const onConnect = useCallback(
    (connection: Connection) => {
      addEdge(connection)
    },
    [addEdge]
  )

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
      {nodes.length === 0 && !creation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-[var(--color-text-muted)] text-sm">
              No tasks yet. Double-click or <kbd className="px-1.5 py-0.5 rounded bg-[var(--color-surface-overlay)] text-[var(--color-text-secondary)] text-xs font-mono">Ctrl+A</kbd> to create one.
            </p>
          </div>
        </div>
      )}

      {/* Creation modal */}
      {creation && (
        <NodeCreationPanel
          onSubmit={handleCreationSubmit}
          onCancel={handleCreationCancel}
        />
      )}
    </div>
  )
}
