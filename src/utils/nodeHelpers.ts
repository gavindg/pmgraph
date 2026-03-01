import type { Node } from "@xyflow/react"
import type { TaskNodeData, GroupNodeData } from "../types"

export function generateId(): string {
  return crypto.randomUUID()
}

export function createDefaultNode(
  position: { x: number; y: number },
  data: Partial<TaskNodeData> = {}
): Node<TaskNodeData> {
  return {
    id: generateId(),
    type: "task",
    position,
    dragHandle: ".node-drag-handle",
    data: {
      title: "Untitled",
      description: "",
      priority: "medium",
      department: "",
      labels: [],
      assignee: "",
      dueDate: null,
      ...data,
    },
  }
}

export function createGroupNode(
  position: { x: number; y: number },
  title: string,
  color: string
): Node<GroupNodeData> {
  return {
    id: generateId(),
    type: "group",
    position,
    dragHandle: ".node-drag-handle",
    style: { width: 400, height: 300 },
    data: {
      title,
      color,
      collapsed: false,
    },
  }
}
