import type { Preset } from "../types"

export const PRESETS: Preset[] = [
  {
    id: "gamedev",
    label: "Game Dev",
    categories: [
      { name: "Programming", color: "#3b82f6" },
      { name: "Art", color: "#ec4899" },
      { name: "Design", color: "#a855f7" },
      { name: "Audio", color: "#eab308" },
      { name: "QA", color: "#22c55e" },
    ],
  },
  {
    id: "startup",
    label: "Startup / Product",
    categories: [
      { name: "Engineering", color: "#3b82f6" },
      { name: "Product", color: "#a855f7" },
      { name: "Design", color: "#ec4899" },
      { name: "Marketing", color: "#f97316" },
      { name: "Ops", color: "#22c55e" },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    categories: [
      { name: "Work", color: "#3b82f6" },
      { name: "Personal", color: "#a855f7" },
      { name: "Health", color: "#22c55e" },
      { name: "Learning", color: "#eab308" },
    ],
  },
]

export function getPresetById(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]
}
