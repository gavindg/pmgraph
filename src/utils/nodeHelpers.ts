import type { Node } from "@xyflow/react"
import type { TaskNodeData, Department } from "../types"

export function generateId(): string {
  return crypto.randomUUID()
}

export function createDefaultNode(
  position: { x: number; y: number },
  title: string,
  department: Department = ""
): Node<TaskNodeData> {
  return {
    id: generateId(),
    type: "task",
    position,
    data: {
      title,
      description: "",
      priority: "medium",
      department,
      labels: [],
      assignee: "",
      dueDate: null,
    },
  }
}
