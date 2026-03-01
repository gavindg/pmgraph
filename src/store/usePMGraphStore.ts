/**
 * usePMGraphStore — Zustand store (single source of truth)
 *
 * All nodes, edges, selection, and filters live here.
 * React Flow's change handlers (onNodesChange/onEdgesChange) are
 * wired directly to this store so ReactFlow's internal drag/resize
 * mutations stay in sync.
 */
import { create } from "zustand"
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react"
import { createDefaultNode } from "../utils/nodeHelpers"
import type { TaskNodeData, Filters, Department, Priority } from "../types"

interface PMGraphState {
  // ── Data ──────────────────────────────────────────────────────────
  nodes: Node<TaskNodeData>[]
  edges: Edge[]
  selectedNodeId: string | null
  filters: Filters

  // ── Node actions ──────────────────────────────────────────────────
  addNode: (position: { x: number; y: number }, title: string, department?: Department) => void
  updateNode: (id: string, data: Partial<TaskNodeData>) => void
  deleteNode: (id: string) => void
  setSelectedNode: (id: string | null) => void

  // ── Edge actions ──────────────────────────────────────────────────
  addEdge: (connection: Connection | Edge) => void
  removeEdge: (id: string) => void

  // ── Filter actions ────────────────────────────────────────────────
  setFilters: (filters: Partial<Filters>) => void
  clearFilters: () => void

  // ── React Flow internal change handlers ───────────────────────────
  // These must be passed directly to the <ReactFlow> component so that
  // built-in interactions (drag, select, delete key) update the store.
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}

const defaultFilters: Filters = {
  departments: [],
  priority: "",
  assignee: "",
}

export const usePMGraphStore = create<PMGraphState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  filters: defaultFilters,

  // ── Node actions ──────────────────────────────────────────────────

  addNode: (position, title, department) => {
    const node = createDefaultNode(position, title, department)
    set((s) => ({ nodes: [...s.nodes, node] }))
  },

  updateNode: (id, data) => {
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }))
  },

  deleteNode: (id) => {
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      // Also remove any edges connected to this node
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }))
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id })
  },

  // ── Edge actions ──────────────────────────────────────────────────

  addEdge: (connection) => {
    // Prevent self-connections and duplicate edges
    if (connection.source === connection.target) return
    set((s) => {
      const duplicate = s.edges.some(
        (e) =>
          e.source === connection.source &&
          e.target === connection.target &&
          e.sourceHandle === connection.sourceHandle &&
          e.targetHandle === connection.targetHandle
      )
      if (duplicate) return s

      const newEdge: Edge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
      }
      return { edges: [...s.edges, newEdge] }
    })
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }))
  },

  // ── Filter actions ────────────────────────────────────────────────

  setFilters: (partial) => {
    set((s) => ({ filters: { ...s.filters, ...partial } }))
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
  },

  // ── React Flow change handlers ────────────────────────────────────
  // Called by ReactFlow on drag, resize, selection, delete-key, etc.

  onNodesChange: (changes) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes) as Node<TaskNodeData>[],
    }))
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }))
  },
}))

// ── Selectors ─────────────────────────────────────────────────────────────────
// Use these with useShallow or direct access in components.

/**
 * Returns the set of node IDs that pass the current filters.
 * A node is VISIBLE when ALL active filters match.
 * When no filters are active, all nodes are visible.
 */
export function getFilteredNodeIds(
  nodes: Node<TaskNodeData>[],
  filters: Filters
): Set<string> {
  const { departments, priority, assignee } = filters
  const noFilters =
    departments.length === 0 && priority === "" && assignee === ""

  if (noFilters) {
    return new Set(nodes.map((n) => n.id))
  }

  const visible = new Set<string>()
  for (const node of nodes) {
    const d = node.data
    const matchDept =
      departments.length === 0 ||
      departments.includes(d.department as Department)
    const matchPriority = priority === "" || d.priority === (priority as Priority)
    const matchAssignee =
      assignee === "" ||
      d.assignee.toLowerCase().includes(assignee.toLowerCase())

    if (matchDept && matchPriority && matchAssignee) {
      visible.add(node.id)
    }
  }
  return visible
}
