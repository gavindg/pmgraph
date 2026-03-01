export type Priority = "low" | "medium" | "high"

export type Department = "" | "Programming" | "Art" | "Design" | "Audio" | "QA"

export type TaskNodeData = {
  title: string
  description: string
  priority: Priority
  department: Department
  labels: string[]
  assignee: string
  dueDate: string | null
  // Allows React Flow to treat this as a Record<string, unknown>
  [key: string]: unknown
}

export type Filters = {
  departments: Department[]
  priority: Priority | ""
  assignee: string
}
