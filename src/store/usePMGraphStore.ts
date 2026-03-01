/**
 * usePMGraphStore — Zustand store (single source of truth)
 *
 * Manages nodes, edges, selection, filters, presets, and group state.
 * React Flow's change handlers are wired directly so built-in
 * interactions (drag, select, delete key) stay in sync.
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
import { createDefaultNode, createGroupNode } from "../utils/nodeHelpers"
import { getPresetById } from "../utils/presets"
import type {
  TaskNodeData,
  Filters,
  Priority,
  Preset,
  EdgeType,
  PMEdgeData,
} from "../types"

const EDGE_TYPE_CYCLE: EdgeType[] = ["blocks", "relates", "triggers"]

interface PMGraphState {
  // ── Data ──────────────────────────────────────────────────────────
  nodes: Node[]
  edges: Edge[]
  selectedNodeId: string | null
  filters: Filters
  activePresetId: string
  collapsedGroups: Set<string>

  // ── Node actions ──────────────────────────────────────────────────
  addNode: (position: { x: number; y: number }, data?: Partial<TaskNodeData>) => string
  updateNode: (id: string, data: Partial<TaskNodeData>) => void
  deleteNode: (id: string) => void
  setSelectedNode: (id: string | null) => void

  // ── Group actions ─────────────────────────────────────────────────
  addGroupNode: (position: { x: number; y: number }, title: string, color: string) => string
  toggleGroupCollapse: (groupId: string) => void
  moveNodeToGroup: (nodeId: string, groupId: string | undefined) => void

  // ── Edge actions ──────────────────────────────────────────────────
  addEdge: (connection: Connection | Edge) => void
  removeEdge: (id: string) => void
  cycleEdgeType: (edgeId: string) => void
  setEdgeType: (edgeId: string, edgeType: EdgeType) => void

  // ── Filter actions ────────────────────────────────────────────────
  setFilters: (filters: Partial<Filters>) => void
  clearFilters: () => void

  // ── Preset actions ────────────────────────────────────────────────
  setPreset: (presetId: string) => void

  // ── React Flow change handlers ────────────────────────────────────
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}

const defaultFilters: Filters = {
  departments: [],
  priority: "",
  assignee: "",
  search: "",
}

export const usePMGraphStore = create<PMGraphState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  filters: defaultFilters,
  activePresetId: "gamedev",
  collapsedGroups: new Set<string>(),

  // ── Node actions ──────────────────────────────────────────────────

  addNode: (position, data) => {
    const node = createDefaultNode(position, data)
    set((s) => ({ nodes: [...s.nodes, node] }))
    return node.id
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
      edges: s.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    }))
  },

  setSelectedNode: (id) => {
    set({ selectedNodeId: id })
  },

  // ── Group actions ─────────────────────────────────────────────────

  addGroupNode: (position, title, color) => {
    const node = createGroupNode(position, title, color)
    set((s) => ({ nodes: [...s.nodes, node] }))
    return node.id
  },

  toggleGroupCollapse: (groupId) => {
    set((s) => {
      const collapsed = new Set(s.collapsedGroups)
      const isCollapsed = collapsed.has(groupId)

      if (isCollapsed) {
        collapsed.delete(groupId)
      } else {
        collapsed.add(groupId)
      }

      const nodes = s.nodes.map((n) => {
        // Toggle group's own collapsed data
        if (n.id === groupId && n.type === "group") {
          return { ...n, data: { ...n.data, collapsed: !isCollapsed } }
        }
        // Toggle visibility of children
        if (n.parentId === groupId) {
          return { ...n, hidden: !isCollapsed }
        }
        return n
      })

      return { nodes, collapsedGroups: collapsed }
    })
  },

  moveNodeToGroup: (nodeId, groupId) => {
    set((s) => {
      const node = s.nodes.find((n) => n.id === nodeId)
      if (!node || node.type === "group") return s

      if (groupId) {
        const group = s.nodes.find((n) => n.id === groupId)
        if (!group) return s
        // Convert position to relative to group
        const relX = node.position.x - group.position.x
        const relY = node.position.y - group.position.y
        return {
          nodes: s.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, parentId: groupId, position: { x: Math.max(10, relX), y: Math.max(40, relY) } }
              : n
          ),
        }
      } else {
        // Remove from group — convert back to absolute position
        const parent = s.nodes.find((n) => n.id === node.parentId)
        const absX = node.position.x + (parent?.position.x ?? 0)
        const absY = node.position.y + (parent?.position.y ?? 0)
        return {
          nodes: s.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, parentId: undefined, position: { x: absX, y: absY } }
              : n
          ),
        }
      }
    })
  },

  // ── Edge actions ──────────────────────────────────────────────────

  addEdge: (connection) => {
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
        type: "typed",
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle ?? null,
        targetHandle: connection.targetHandle ?? null,
        data: { edgeType: "blocks" } as PMEdgeData,
      }
      return { edges: [...s.edges, newEdge] }
    })
  },

  removeEdge: (id) => {
    set((s) => ({ edges: s.edges.filter((e) => e.id !== id) }))
  },

  cycleEdgeType: (edgeId) => {
    set((s) => ({
      edges: s.edges.map((e) => {
        if (e.id !== edgeId) return e
        const current = (e.data as PMEdgeData)?.edgeType ?? "blocks"
        const idx = EDGE_TYPE_CYCLE.indexOf(current)
        const next = EDGE_TYPE_CYCLE[(idx + 1) % EDGE_TYPE_CYCLE.length]
        return { ...e, data: { ...e.data, edgeType: next } }
      }),
    }))
  },

  setEdgeType: (edgeId, edgeType) => {
    set((s) => ({
      edges: s.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...e.data, edgeType } } : e
      ),
    }))
  },

  // ── Filter actions ────────────────────────────────────────────────

  setFilters: (partial) => {
    set((s) => ({ filters: { ...s.filters, ...partial } }))
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
  },

  // ── Preset actions ────────────────────────────────────────────────

  setPreset: (presetId) => {
    const preset = getPresetById(presetId)
    const categoryNames = new Set(preset.categories.map((c) => c.name))

    set((s) => ({
      activePresetId: presetId,
      filters: { ...s.filters, departments: [] },
      nodes: s.nodes.map((n) => {
        if (n.type !== "task") return n
        const dept = n.data.department as string
        if (dept === "" || categoryNames.has(dept)) return n
        return { ...n, data: { ...n.data, department: "" } }
      }),
    }))
  },

  // ── React Flow change handlers ────────────────────────────────────

  onNodesChange: (changes) => {
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
    }))
  },

  onEdgesChange: (changes) => {
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) }))
  },
}))

// ── Selectors ─────────────────────────────────────────────────────────────────

/** Returns the active Preset object. */
export function getActivePreset(state: PMGraphState): Preset {
  return getPresetById(state.activePresetId)
}

/**
 * Returns the set of node IDs that pass the current filters.
 * A node passes when ALL active filters match.
 */
export function getFilteredNodeIds(
  nodes: Node[],
  filters: Filters
): Set<string> {
  const { departments, priority, assignee, search } = filters
  const noFilters =
    departments.length === 0 && priority === "" && assignee === "" && search === ""

  if (noFilters) {
    return new Set(nodes.map((n) => n.id))
  }

  const searchLower = search.toLowerCase()
  const visible = new Set<string>()

  for (const node of nodes) {
    if (node.type !== "task") {
      visible.add(node.id)
      continue
    }
    const d = node.data as TaskNodeData
    const matchDept =
      departments.length === 0 || departments.includes(d.department as string)
    const matchPriority = priority === "" || d.priority === (priority as Priority)
    const matchAssignee =
      assignee === "" ||
      (d.assignee as string).toLowerCase().includes(assignee.toLowerCase())
    const matchSearch =
      search === "" ||
      (d.title as string).toLowerCase().includes(searchLower) ||
      (d.assignee as string).toLowerCase().includes(searchLower)

    if (matchDept && matchPriority && matchAssignee && matchSearch) {
      visible.add(node.id)
    }
  }
  return visible
}
